/** Months, counted as `year * 12 + (month - 1)`. */
export const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth()

/**
 * A stretch of time. `from` and `to` are the years as printed; no `to` means
 * it is still running. Months are 1–12, where they are known.
 */
export interface Period {
  from: number
  to?: number
  startMonth?: number
  endMonth?: number
}

export interface Study extends Period {
  slug: string
  institution: string
  levelKey: string
  degreeKey: string
  /** The specialisation (studieretning), where there is one. */
  trackKey?: string
  /** The bachelor's thesis was written at Buypass. */
  thesis?: boolean
}

export interface Job extends Period {
  slug: string
  roleKey: string
  companyKey: string
}

/** The years every row's strip is drawn against. */
export const AXIS = { from: 2020, to: 2028 } as const

// An academic year runs August to June.
const academic = (from: number, to?: number): Period => ({
  from,
  to,
  startMonth: 8,
  endMonth: to === undefined ? undefined : 6,
})

/** Studies, newest first. */
export const studies: Study[] = [
  {
    slug: "ntnu-informatics",
    institution: "NTNU",
    levelKey: "education.level.master",
    degreeKey: "education.informatics.degree",
    trackKey: "education.informatics.track",
    ...academic(2026),
  },
  { slug: "uinn", institution: "UINN", levelKey: "education.level.bachelor", degreeKey: "education.uinn.degree", ...academic(2025, 2027) },
  { slug: "ntnu-im", institution: "NTNU", levelKey: "education.level.bachelor", degreeKey: "education.ntnuim.degree", ...academic(2024, 2026) },
  {
    slug: "ntnu-prog",
    institution: "NTNU",
    levelKey: "education.level.bachelor",
    degreeKey: "education.ntnuprog.degree",
    thesis: true,
    ...academic(2023, 2025),
  },
]

/**
 * Jobs alongside the studies, newest first. They are not developer jobs; they
 * are here because they show he has always worked while he studied. Entur is
 * still running; the taxi dispatch ended in July 2026. Start months are not
 * known, so the strips are drawn to the year.
 */
export const jobs: Job[] = [
  { slug: "entur", roleKey: "experience.entur.role", companyKey: "experience.entur.company", from: 2025 },
  { slug: "taxi", roleKey: "experience.taxi.role", companyKey: "experience.taxi.company", from: 2023, to: 2026, endMonth: 7 },
  { slug: "bk-norstat", roleKey: "experience.bknorstat.role", companyKey: "experience.bknorstat.company", from: 2020, to: 2023 },
]

/** The last month of a period, inclusive; a period with no end never ends. */
export const endMonthIndex = (p: Period) => (p.to === undefined ? Infinity : p.to * 12 + (p.endMonth ?? 6) - 1)

/** Still running in month `now` (a `monthIndex`), counting its last month in. */
export const ongoing = (p: Period, now: number) => endMonthIndex(p) >= now

/** Where a period starts and ends, in fractional years. */
export const startDecimal = (p: Period) => p.from + ((p.startMonth ?? 1) - 1) / 12
export const endDecimal = (p: Period) => (p.to === undefined ? Infinity : p.to + (p.endMonth ?? 6) / 12)
