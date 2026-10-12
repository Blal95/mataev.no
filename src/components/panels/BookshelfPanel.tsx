"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Star, ChevronLeft } from "lucide-react"
import { useGameStore } from "@/hooks/useGameStore"
import { cn } from "@/lib/cn"
import type { BookEntry, BookStatus } from "@/types/books"

const STATUS_KEY: Record<BookStatus, string> = {
  read: "statusRead",
  "currently-reading": "statusReading",
}

export function BookshelfPanel() {
  const t = useTranslations("panel.books")
  const selectedBook = useGameStore((s) => s.selectedBook)
  const bookDetailId = useGameStore((s) => s.bookDetailId)
  const setBookDetailId = useGameStore((s) => s.setBookDetailId)
  const booksData = useGameStore((s) => s.booksData)
  const [sel, setSel] = useState(() => {
    // Pre-select the book the player was looking at in the 3D shelf.
    if (!booksData || !selectedBook) return 0
    const i = booksData.findIndex((b) => b.id === selectedBook)
    return i >= 0 ? i : 0
  })

  // Still loading (DataPrefetcher hasn't resolved yet).
  if (booksData === null) {
    return (
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="h-40 animate-pulse rounded-lg border border-border/40 bg-panel/50" />
        <div className="h-40 animate-pulse rounded-lg border border-border/40 bg-panel/50" />
      </div>
    )
  }
  if (booksData.length === 0) {
    return <p className="text-sm text-muted">{t("empty")}</p>
  }

  // Single-book "open book" spread: interacting with a specific spine in 3D.
  const detailBook = bookDetailId
    ? booksData.find((b) => b.id === bookDetailId) ?? null
    : null

  if (detailBook) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setBookDetailId(null)}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-cyan"
        >
          <ChevronLeft className="size-3" />
          {t("viewAll")}
        </button>
        <OpenBook book={detailBook} t={t} />
      </div>
    )
  }

  const book = booksData[Math.min(sel, booksData.length - 1)]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("intro")}</p>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        {/* List */}
        <ul className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
          {booksData.map((b, i) => (
            <li key={b.id} className="shrink-0 md:shrink">
              <button
                type="button"
                onClick={() => setSel(i)}
                className={cn(
                  "flex w-full items-stretch gap-3 rounded-lg border p-2 text-left transition-colors",
                  i === sel
                    ? "border-cyan/50 bg-panel-2/70"
                    : "border-border/60 bg-panel/50 hover:border-border"
                )}
              >
                <span
                  aria-hidden
                  className="w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">
                    {b.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {b.author}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Detail */}
        <BookDetail book={book} t={t} />
      </div>
    </div>
  )
}

/** Compact detail used inside the list (master-detail) view. */
function BookDetail({
  book,
  t,
}: {
  book: BookEntry
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <article className="space-y-3">
      <div className="flex gap-4">
        <Cover book={book} className="h-36 w-24" />
        <div className="min-w-0 space-y-1.5">
          <h3 className="display text-lg leading-tight text-text text-balance">
            {book.title}
          </h3>
          <p className="text-sm text-muted">
            {t("by")} {book.author}
          </p>
          <Meta book={book} t={t} />
        </div>
      </div>
      <Thoughts book={book} t={t} />
    </article>
  )
}

/** Two-page "open book" spread for a single selected book. */
function OpenBook({
  book,
  t,
}: {
  book: BookEntry
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-border/60 bg-panel shadow-[0_20px_60px_-25px_rgba(0,0,0,0.8)] md:grid-cols-2">
      {/* Left page — the cover */}
      <div className="grid place-items-center border-border/40 bg-panel-2 p-6 md:border-r">
        <Cover book={book} className="h-56 w-40" />
      </div>
      {/* Right page — title + thoughts ("review and comments") */}
      <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto p-6">
        <div className="space-y-1.5">
          <h3 className="display text-xl leading-tight text-text text-balance">
            {book.title}
          </h3>
          <p className="text-sm text-muted">
            {t("by")} {book.author}
          </p>
          <Meta book={book} t={t} />
        </div>
        <div className="h-px bg-border/50" />
        <Thoughts book={book} t={t} />
      </div>
    </div>
  )
}

function Cover({ book, className }: { book: BookEntry; className?: string }) {
  if (book.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={book.cover}
        alt={book.title}
        className={cn("shrink-0 rounded-md object-cover shadow-lg", className)}
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
    )
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-end rounded-md p-2 shadow-lg",
        className
      )}
      style={{ background: book.color }}
    >
      <span className="line-clamp-4 text-[11px] font-semibold leading-tight text-midnight/90">
        {book.title}
      </span>
    </div>
  )
}

function Meta({
  book,
  t,
}: {
  book: BookEntry
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="rounded-full border border-border/70 bg-panel/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
        {t(STATUS_KEY[book.status])}
      </span>
      {book.rating > 0 && (
        <span className="flex items-center gap-0.5">
          {/* The rating used to be legible only as a contrast difference
              between a filled and an unfilled star, and the unfilled one sat at
              1.50:1. It now separates on fill AND temperature — solid warm
              against hollow cold — and carries the number in text so it does
              not depend on either. */}
          <span className="sr-only">{`${book.rating}/5`}</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              aria-hidden
              className={cn(
                "size-3.5",
                i < book.rating ? "fill-signal text-signal" : "text-muted"
              )}
            />
          ))}
        </span>
      )}
      <a
        href={book.link}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] uppercase tracking-widest text-cyan/80 hover:text-cyan"
      >
        Goodreads ↗
      </a>
    </div>
  )
}

function Thoughts({
  book,
  t,
}: {
  book: BookEntry
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {t("thoughts")}
      </p>
      {book.review ? (
        <p className="whitespace-pre-line text-pretty leading-relaxed text-text/90">
          {book.review}
        </p>
      ) : (
        <p className="text-sm italic text-muted">{t("reviewComing")}</p>
      )}
    </div>
  )
}
