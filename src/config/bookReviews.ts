// Your own reviews, keyed by Goodreads book id (the number in the book URL
// and in the RSS <book_id>). Goodreads does NOT expose review text via RSS,
// so write yours here. Supports multiple paragraphs — separate with a blank
// line. Edits appear within the API cache window (~1h in prod, instantly in
// dev). Books with no entry here show their ★rating + "review coming".
export const bookReviews: Record<string, string> = {
  // White Nights — Fyodor Dostoevsky
  "1772910": "first review",
}
