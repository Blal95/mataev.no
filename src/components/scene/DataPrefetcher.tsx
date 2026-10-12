/**
 * DataPrefetcher — mounts early, waits for `hasBooted`, then fetches each API
 * endpoint (books + gallery) AT MOST ONCE and stores the results in Zustand.
 * Every panel and 3D station reads from the store, never the network.
 *
 * Three layers keep calls to the bare minimum:
 *   1. Store guard      — skip if the data is already in memory.
 *   2. In-flight dedupe — a module-level promise so React StrictMode's
 *                         double-mount (and fast remounts) can't double-fetch.
 *   3. sessionStorage   — a 1 h TTL cache so a page reload in the same tab
 *                         is served from memory with zero network. The TTL
 *                         matches the route's `revalidate`, so it never serves
 *                         staler data than the server would.
 */
"use client"

import { useEffect } from "react"
import { useGameStore } from "@/hooks/useGameStore"
import type { BookEntry, BooksResponse } from "@/types/books"
import type { GalleryImage, GalleryResponse } from "@/types/gallery"

const TTL_MS = 60 * 60 * 1000 // 1 hour — matches the books API route revalidate
const GALLERY_TTL_MS = 5 * 60 * 1000 // 5 min — gallery posts should appear quickly

type Cached<T> = { at: number; data: T }

function readCache<T>(key: string, ttl: number = TTL_MS): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached<T>
    if (Date.now() - parsed.at > ttl) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ at: Date.now(), data } satisfies Cached<T>),
    )
  } catch {
    /* quota / private-mode — non-fatal, just skip caching */
  }
}

// Fisher–Yates shuffle (returns a new array; never mutates the cached source).
function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Module-level in-flight guards: survive component remounts so the network is
// hit once per session even under StrictMode's intentional double-invoke.
let booksInFlight: Promise<void> | null = null
let galleryInFlight: Promise<void> | null = null

export function DataPrefetcher() {
  const hasBooted = useGameStore((s) => s.hasBooted)
  const setBooksData = useGameStore((s) => s.setBooksData)
  const setGalleryData = useGameStore((s) => s.setGalleryData)

  useEffect(() => {
    if (!hasBooted) return

    const store = useGameStore.getState()

    // ---- Books ----
    if (!store.booksData) {
      const cached = readCache<BookEntry[]>("books")
      if (cached) {
        setBooksData(cached)
      } else if (!booksInFlight) {
        booksInFlight = fetch("/api/books")
          .then((r) => (r.ok ? (r.json() as Promise<BooksResponse>) : null))
          .then((d) => {
            const books = d?.books ?? []
            if (d) {
              setBooksData(books)
              writeCache("books", books)
            }
          })
          .catch(() => {})
          .finally(() => {
            booksInFlight = null
          })
      }
    }

    // ---- Gallery ----
    // The wall (and panel) show a *random* slice of the full set, reshuffled on
    // every page load — so a refresh always brings a fresh mix of photos. The
    // cache stores the raw list (cheap network), the shuffle happens per load.
    if (!store.galleryData) {
      const cached = readCache<GalleryImage[]>("gallery", GALLERY_TTL_MS)
      if (cached) {
        setGalleryData(shuffle(cached))
      } else if (!galleryInFlight) {
        galleryInFlight = fetch("/api/gallery")
          .then((r) => (r.ok ? (r.json() as Promise<GalleryResponse>) : null))
          .then((d) => {
            const images = d?.images ?? []
            if (d) {
              setGalleryData(shuffle(images))
              writeCache("gallery", images)
            }
          })
          .catch(() => {})
          .finally(() => {
            galleryInFlight = null
          })
      }
    }
  }, [hasBooted, setBooksData, setGalleryData])

  return null
}
