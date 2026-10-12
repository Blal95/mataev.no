/**
 * The reader's place in the folio, carried across a language switch: held
 * just before the switch, restored once the other language's folio has
 * measured itself. A client navigation keeps it in memory; a hard load finds
 * it in sessionStorage. Storage can be blocked (private windows, cleared site
 * data), so every access is allowed to fail and the page just starts at the top.
 */

export interface Place {
  id: string
  /** How far into that stop, in screens: widths sideways, heights down the page. */
  dx: number
  at: number
}

const KEY = "folio:place"

let pending: Place | null = null
let settle: (() => void) | null = null

export function holdPlace(p: { id: string; dx: number }) {
  pending = { ...p, at: Date.now() }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending))
  } catch {}
}

/** The held place, once: a place older than `maxAge` ms is stale and dropped. */
export function takePlace(maxAge = 8000): Place | null {
  let p = pending
  if (!p) {
    try {
      const raw = sessionStorage.getItem(KEY)
      p = raw ? (JSON.parse(raw) as Place) : null
    } catch {
      p = null
    }
  }
  pending = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {}
  return p && Date.now() - p.at < maxAge ? p : null
}

/** Resolves when the folio has restored the place, or after `ms` at most. */
export function waitForPlace(ms: number) {
  return new Promise<void>((resolve) => {
    settle = resolve
    setTimeout(resolve, ms)
  })
}

export function placeRestored() {
  settle?.()
  settle = null
}
