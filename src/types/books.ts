export type BookStatus = "read" | "currently-reading"

/** A book resolved from the Goodreads RSS feed + your local review map. */
export interface BookEntry {
  /** Goodreads book id (the number in the book URL / RSS <book_id>). */
  id: string
  title: string
  author: string
  /** Cover image URL (Goodreads CDN) or null. */
  cover: string | null
  /** Your Goodreads star rating, 0–5 (0 = unrated). */
  rating: number
  status: BookStatus
  /** Your on-site review (from bookReviews), or null if you haven't written one. */
  review: string | null
  /** Link to the Goodreads review/book page. */
  link: string
  /** Stable spine accent colour derived from the id. */
  color: string
}

export interface BooksResponse {
  books: BookEntry[]
}
