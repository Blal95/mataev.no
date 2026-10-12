import { NextResponse } from "next/server"

// Goodreads has no public JSON API anymore, but every shelf still exposes an
// RSS feed. We read the "currently-reading" shelf and return the first book.
// Set GOODREADS_USER_ID (the number in your profile URL, e.g.
// goodreads.com/user/show/12345678-name → 12345678). Falls back to null, and
// the NowStrip then uses the cabin bookshelf instead.
export const runtime = "nodejs"

// Public Goodreads numeric id (goodreads.com/user/show/<id>-name). Env can
// override; the hardcoded default keeps it working with zero config.
const USER_ID = process.env.GOODREADS_USER_ID ?? "201457615"

interface Reading {
  title: string
  author: string | null
  url: string | null
}

function extract(block: string, tag: string): string | null {
  const m = block.match(
    new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`),
  )
  return m ? m[1].trim() : null
}

export async function GET() {
  if (!USER_ID) return NextResponse.json({ reading: null })
  try {
    const url = `https://www.goodreads.com/review/list_rss/${USER_ID}?shelf=currently-reading`
    const res = await fetch(url, {
      next: { revalidate: 1800 }, // 30 min
      headers: { "User-Agent": "mataev.no" },
    })
    if (!res.ok) return NextResponse.json({ reading: null })
    const xml = await res.text()
    const firstItem = xml.split("<item>")[1]?.split("</item>")[0]
    if (!firstItem) return NextResponse.json({ reading: null })

    const title = extract(firstItem, "title")
    if (!title) return NextResponse.json({ reading: null })
    // Goodreads appends the edition, e.g. "Crime and Punishment (Chartwell Deluxe Editions)".
    const clean = title.replace(/\s*\([^)]*\)\s*$/, "").trim()

    const reading: Reading = {
      title: clean,
      author: extract(firstItem, "author_name"),
      url: extract(firstItem, "link"),
    }
    return NextResponse.json({ reading })
  } catch {
    return NextResponse.json({ reading: null })
  }
}
