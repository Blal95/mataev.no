export type ChapterId = "home" | "work" | "about" | "contact"

export interface Chapter {
  id: ChapterId
  numeral: string
}

/** The four chapters of the folio, in reading order. The numerals are the
 *  site's structure, not decoration: the chapter heads and the rail at the
 *  bottom both read them from here, and each id is the chapter's anchor. */
export const CHAPTERS: readonly Chapter[] = [
  { id: "home", numeral: "I" },
  { id: "work", numeral: "II" },
  { id: "about", numeral: "III" },
  { id: "contact", numeral: "IV" },
]

/** The door to the cabin: the folio's last, unnumbered stop, after IV. */
export const DOOR_ID = "cabin" as const

/** Everywhere the folio can stop: the four chapters, and the door. */
export type StopId = ChapterId | typeof DOOR_ID

export const chapterNumeral = (id: ChapterId) =>
  CHAPTERS.find((c) => c.id === id)?.numeral ?? ""
