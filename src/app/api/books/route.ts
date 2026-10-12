import { NextResponse } from "next/server"
import { bookReviews } from "@/config/bookReviews"
import type { BookEntry, BooksResponse, BookStatus } from "@/types/books"

export const runtime = "nodejs"
export const revalidate = 3600 // auto-refresh the shelf hourly

const USER_ID = "201457615"
// currently-reading first so those books sort/show before finished ones.
const SHELVES: BookStatus[] = ["currently-reading", "read"]
const PALETTE = ["#1CAFC0", "#42B375", "#EC7A45", "#EE7972", "#959BA6", "#A9B1BD"]

function colorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .trim()
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  return m ? clean(m[1]) : ""
}

async function fetchShelf(status: BookStatus): Promise<BookEntry[]> {
  const url = `https://www.goodreads.com/review/list_rss/${USER_ID}?shelf=${status}`
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
  if (!res.ok) return []
  const xml = await res.text()
  // We intentionally read only the reader's own data + factual fields
  // (title/author/cover/rating). We never surface <book_description>
  // (publisher copyright) or scrape review pages.
  const items = xml.split("<item>").slice(1)
  const out: BookEntry[] = []
  for (const raw of items) {
    const block = raw.split("</item>")[0]
    const id = tag(block, "book_id")
    if (!id) continue
    out.push({
      id,
      title: tag(block, "title"),
      author: tag(block, "author_name"),
      cover:
        tag(block, "book_large_image_url") ||
        tag(block, "book_image_url") ||
        null,
      rating: parseInt(tag(block, "user_rating") || "0", 10) || 0,
      status,
      review: bookReviews[id] ?? null,
      link: tag(block, "link"),
      color: colorFor(id),
    })
  }
  return out
}

export async function GET() {
  try {
    const lists = await Promise.all(SHELVES.map(fetchShelf))
    const body: BooksResponse = { books: lists.flat() }
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ books: [] } satisfies BooksResponse)
  }
}
