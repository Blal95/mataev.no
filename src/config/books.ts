export type BookStatus = "read" | "reading" | "want"

export type Book = {
  slug: string
  title: string
  author: string
  year?: number
  /** Optional cover image in /public (e.g. "/books/sapiens.jpg"). */
  cover?: string
  /** Spine accent colour used when there's no cover. */
  color: string
  /** 1–5; omit to hide the stars. */
  rating?: number
  status: BookStatus
  /** Your own thoughts — plain text, a few sentences. Your words, not the book's. */
  review: string
}

// ⬇️ Replace these with the books you've actually read and your own thoughts.
//    Add a `cover: "/books/<file>"` to show a real cover instead of the spine.
export const books: Book[] = [
  {
    slug: "pragmatic-programmer",
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt & David Thomas",
    year: 1999,
    color: "#1CAFC0",
    rating: 5,
    status: "read",
    review:
      "This book sharpened how I write software: small habits, clear names, sharp tools, and ownership. I come back to it often.",
  },
  {
    slug: "clean-code",
    title: "Clean Code",
    author: "Robert C. Martin",
    year: 2008,
    color: "#6BCB77",
    rating: 4,
    status: "read",
    review:
      "I follow some rules and argue with others. It still made me care more about naming, boundaries, and smaller functions.",
  },
  {
    slug: "sapiens",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    year: 2011,
    color: "#EC7A45",
    rating: 4,
    status: "read",
    review:
      "A fast tour through human history. I like it most when it forces an argument about which stories groups choose to believe.",
  },
  {
    slug: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    year: 2018,
    color: "#c83e3e",
    rating: 4,
    status: "reading",
    review:
      "Currently reading. The systems-over-goals idea landed fast: build habits with the same care you use to refactor code.",
  },
]
