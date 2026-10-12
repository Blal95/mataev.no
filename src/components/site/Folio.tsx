"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { CHAPTERS, DOOR_ID, type StopId } from "@/config/chapters"
import { placeRestored, takePlace } from "@/lib/folioResume"
import { WarmImages } from "./WarmImages"

/**
 * Where the folio runs sideways: a wide, tall enough window with a real
 * pointer, and a reader who has not asked for less motion. Everywhere else
 * (and without JS) it is the same document, top to bottom.
 */
export const FOLIO_QUERY =
  "(min-width: 1024px) and (min-height: 600px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"

/** Runs before first paint so the page is laid out in the right mode from the
 *  first frame, and arms the hero's arrival (`data-intro`) where motion is
 *  allowed. Without JS it never runs: the vertical page, already arrived. An
 *  inline script does not re-run on a client navigation, so switching
 *  language never replays the arrival. */
export const FOLIO_BOOT = `document.documentElement.dataset.folio=matchMedia(${JSON.stringify(FOLIO_QUERY)}).matches?"h":"v";if(matchMedia("(prefers-reduced-motion: no-preference)").matches)document.documentElement.dataset.intro=""`

export type FolioMode = "h" | "v"
export type Tone = "day" | "blue" | "night"

/**
 * The stretch of the pan a scrub runs over, 0 → 1, for its anchor:
 * - `enter`: its left edge crosses the frame, right to left;
 * - `cross`: from its left edge entering on the right to its right edge leaving on the left;
 * - `leave`: its right edge crosses the frame, right to left;
 * - `pin`: from its left edge at mid-frame to its right edge reaching the right.
 */
export type ScrubRange = "enter" | "cross" | "leave" | "pin"

/** The pan `x`, the anchor's left edge `L` and width `W` on the track, and the
 *  frame's width `V`, all in px. */
export interface ScrubGeometry {
  x: number
  L: number
  W: number
  V: number
}
export type ScrubApply = (t: number, g: ScrubGeometry | null) => void

export interface Stop {
  id: StopId
  /** Where the stop starts along the whole journey, 0–1. */
  p: number
}

/** The corners the chrome sits in, whose tone it has to match. */
export interface ChromeTones {
  left: Tone
  right: Tone
}

/** The whole track in miniature, for the sheet in the corner. In px. */
export interface SheetPlan {
  length: number
  /** The frame's width. */
  view: number
  panels: { left: number; right: number; tone: Tone }[]
  stops: { id: StopId; left: number }[]
}

interface FolioValue {
  mode: FolioMode
  current: StopId
  /** The chapters. */
  stops: Stop[]
  /** The cabin door after the last chapter, when the folio has one. */
  door: Stop | null
  tones: ChromeTones
  /** Sideways only: the track in miniature. */
  sheet: SheetPlan | null
  go: (id: string, opts?: { instant?: boolean }) => void
  /** Sideways only: pan to `x` px along the track. */
  seek: (x: number, behavior: ScrollBehavior) => void
  /** Progress 0–1 along the journey, the pan and the frame width in px, every
   *  frame, without re-rendering. */
  onProgress: (fn: (p: number, x: number, vw: number) => void) => () => void
  /** The tone of the panel under a point of the screen. */
  toneAt: (x: number, y: number) => Tone
  /** Sideways only: runs `apply` whenever the anchor's progress through
   *  `range` moves. Returns the way out. */
  registerScrub: (anchor: Element, range: ScrubRange, apply: ScrubApply) => () => void
  /** The stop the reader is in, and how far into it in screens. */
  capturePlace: () => { id: StopId; dx: number } | null
}

const FolioContext = createContext<FolioValue | null>(null)

export function useFolio() {
  const ctx = useFolioMaybe()
  if (!ctx) throw new Error("useFolio() must be used inside <Folio>")
  return ctx
}

/** The folio, or null outside it (a shared panel in the cabin dialog). */
export function useFolioMaybe() {
  return useContext(FolioContext)
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Scrubs `apply` along the pan while its anchor passes through `range`.
 */
export function useScrub(
  getAnchor: () => Element | null | undefined,
  range: ScrubRange,
  apply: ScrubApply,
) {
  const ctx = useFolioMaybe()
  const mode = ctx?.mode
  const registerScrub = ctx?.registerScrub
  const applyRef = useRef(apply)
  const getAnchorRef = useRef(getAnchor)
  useIsoLayoutEffect(() => {
    applyRef.current = apply
    getAnchorRef.current = getAnchor
  })

  useEffect(() => {
    // apply(1, null) means "finished: clear any inline style you wrote". That
    // is how shared panels sit finished in the cabin dialog and down the page.
    if (!registerScrub || mode !== "h") {
      applyRef.current(1, null)
      return
    }
    const el = getAnchorRef.current()
    if (!el) {
      applyRef.current(1, null)
      return
    }
    return registerScrub(el, range, (t, g) => applyRef.current(t, g))
  }, [mode, registerScrub, range])
}

/** A chapter counts as current once its leading edge crosses this share of
 *  the frame: the left edge sideways, the top edge down. */
const CURRENT_LINE = 0.5
/** How far ← and → move, as a share of the frame. */
const KEY_STEP = 0.45
/** How long the hero's arrival runs under `data-intro`, in ms. */
const INTRO_MS = 2400
/** The smallest move of a scrub's progress worth a write. */
const SCRUB_STEP = 0.001

const STOP_IDS: readonly StopId[] = [...CHAPTERS.map((c) => c.id), DOOR_ID]
const DAY: ChromeTones = { left: "day", right: "day" }

const PROGRESS: Record<ScrubRange, (x: number, L: number, W: number, V: number) => number> = {
  enter: (x, L, W, V) => (x - (L - V)) / V,
  cross: (x, L, W, V) => (x - (L - V)) / (V + W),
  leave: (x, L, W, V) => (x - (L + W - V)) / V,
  pin: (x, L, W, V) => (x - (L - V / 2)) / Math.max(1, W - V / 2),
}

interface Scrub {
  anchor: Element
  range: ScrubRange
  apply: ScrubApply
  L: number
  W: number
  /** The progress last applied; null until the next run must apply. */
  last: number | null
  /** The pan it was last applied at, and whether its anchor was on screen. */
  lastX: number
  inside: boolean
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

const toneOf = (el: HTMLElement): Tone => {
  const t = el.dataset.tone
  return t === "blue" || t === "night" ? t : "day"
}

/** The tone a panel has once the reader is in it (`data-arrives`, for one
 *  that changes as it comes on screen), which the sheet shows. */
const arrivedToneOf = (el: HTMLElement): Tone => {
  const t = el.dataset.arrives ?? el.dataset.tone
  return t === "blue" || t === "night" ? t : "day"
}

const sameStop = (a: Stop | null, b: Stop | null) =>
  a === b || (!!a && !!b && a.id === b.id && Math.round(a.p * 1e4) === Math.round(b.p * 1e4))
const sameStops = (a: Stop[], b: Stop[]) => a.length === b.length && a.every((s, i) => sameStop(s, b[i]))

function runScrub(s: Scrub, x: number, V: number) {
  const t = clamp(PROGRESS[s.range](x, s.L, s.W, V), 0, 1)
  const inside = x > s.L - V && x < s.L + s.W
  if (s.last !== null) {
    // A pinned thing rides every pixel of the pan while its anchor is on
    // screen, including past the end of its progress, and once more as it
    // leaves; everything else only when its progress moves.
    if (s.range === "pin") {
      if (x === s.lastX || (!inside && !s.inside)) return
    } else if (Math.abs(t - s.last) < SCRUB_STEP) return
  }
  s.last = t
  s.lastX = x
  s.inside = inside
  s.apply(t, { x, L: s.L, W: s.W, V })
}

/**
 * The folio: every chapter on one track. Sideways, the document's vertical
 * scroll pans the track from left to right one pixel for one pixel, so a
 * wheel, a trackpad, the space bar and the scrollbar all simply work and
 * nothing lags behind the hand. ← → and horizontal swipes move along it too,
 * tabbing to an off-screen control brings it into frame, and #work style
 * links arrive at their chapter.
 */
export function Folio({ children, chrome }: { children: ReactNode; chrome: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<FolioMode>("v")
  const [measuredIn, setMeasuredIn] = useState<FolioMode | null>(null)
  const [distance, setDistance] = useState(0)
  const [stops, setStops] = useState<Stop[]>([])
  const [door, setDoor] = useState<Stop | null>(null)
  const [current, setCurrent] = useState<StopId>(CHAPTERS[0].id)
  const [tones, setTones] = useState<ChromeTones>(DAY)
  const [sheet, setSheet] = useState<SheetPlan | null>(null)
  const modeRef = useRef<FolioMode>("v")
  const dist = useRef(0)
  const listeners = useRef(new Set<(p: number, x: number, vw: number) => void>())
  const scrubs = useRef(new Set<Scrub>())
  // Measured at rest, in track pixels, so a sideways frame reads nothing from
  // layout but the scroll position.
  const outerTop = useRef(0)
  const view = useRef({ w: 0, h: 0 })
  const panels = useRef<{ el: HTMLElement; left: number; right: number }[]>([])
  const stopGeo = useRef<{ id: StopId; left: number }[]>([])
  const pan = useRef(0)
  const shownStop = useRef<StopId>(CHAPTERS[0].id)
  const shownTones = useRef<ChromeTones>(DAY)
  const raf = useRef(0)
  const printing = useRef(false)
  const arrived = useRef(false)

  const toneAt = useCallback((x: number, y: number): Tone => {
    if (modeRef.current === "h") {
      const at = pan.current + x
      for (const p of panels.current) if (p.left <= at && at < p.right) return toneOf(p.el)
      return "day"
    }
    const els = track.current?.querySelectorAll<HTMLElement>("[data-panel]") ?? []
    for (const p of els) {
      const r = p.getBoundingClientRect()
      if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return toneOf(p)
    }
    return "day"
  }, [])

  const onProgress = useCallback((fn: (p: number, x: number, vw: number) => void) => {
    listeners.current.add(fn)
    return () => {
      listeners.current.delete(fn)
    }
  }, [])

  /* The track's length and where each stop, panel and scrub anchor sits on
     it; down the page, where each chapter starts. */
  const measure = useCallback(() => {
    const el = track.current
    const o = outer.current
    if (!el || !o || printing.current) return
    if (modeRef.current !== "h") {
      dist.current = 0
      pan.current = 0
      setDistance(0)
      el.style.transform = ""
      const span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const next = CHAPTERS.flatMap((c) => {
        const node = document.getElementById(c.id)
        if (!node) return []
        const top = node.getBoundingClientRect().top + window.scrollY
        return [{ id: c.id, p: clamp(top / span, 0, 1) }]
      })
      setStops((prev) => (sameStops(prev, next) ? prev : next))
      setDoor(null)
      setSheet(null)
      setMeasuredIn("v")
      return
    }
    // The track's rect includes the current translate, so every left below is
    // on the track itself.
    const trackLeft = el.getBoundingClientRect().left
    const d = Math.max(0, el.scrollWidth - window.innerWidth)
    stopGeo.current = STOP_IDS.flatMap((id) => {
      const node = document.getElementById(id)
      return node ? [{ id, left: node.getBoundingClientRect().left - trackLeft }] : []
    })
    panels.current = Array.from(el.querySelectorAll<HTMLElement>("[data-panel]"), (p) => {
      const r = p.getBoundingClientRect()
      return { el: p, left: r.left - trackLeft, right: r.right - trackLeft }
    })
    for (const s of scrubs.current) {
      const r = s.anchor.getBoundingClientRect()
      s.L = r.left - trackLeft
      s.W = r.width
      s.last = null
    }
    outerTop.current = o.getBoundingClientRect().top + window.scrollY
    view.current = { w: window.innerWidth, h: window.innerHeight }
    pan.current = clamp(window.scrollY - outerTop.current, 0, d)
    dist.current = d
    setDistance(d)
    const at = (g: { id: StopId; left: number }): Stop => ({ id: g.id, p: clamp(g.left / d, 0, 1) })
    const next = d ? stopGeo.current.filter((g) => g.id !== DOOR_ID).map(at) : []
    const doorGeo = stopGeo.current.find((g) => g.id === DOOR_ID)
    const nextDoor = d && doorGeo ? at(doorGeo) : null
    setStops((prev) => (sameStops(prev, next) ? prev : next))
    setDoor((prev) => (sameStop(prev, nextDoor) ? prev : nextDoor))
    const plan: SheetPlan | null = d
      ? {
          length: el.scrollWidth,
          view: window.innerWidth,
          panels: panels.current.map((p) => ({ left: p.left, right: p.right, tone: arrivedToneOf(p.el) })),
          stops: stopGeo.current,
        }
      : null
    setSheet((prev) => (JSON.stringify(prev) === JSON.stringify(plan) ? prev : plan))
    setMeasuredIn(d > 0 ? "h" : null)
  }, [])

  /* One frame of the journey: pan the track, run the scrubs, tell the
     listeners, find the current stop and the tone under each piece of
     chrome. Sideways, all of it comes from the measured geometry. */
  const frame = useCallback(() => {
    raf.current = 0
    const el = track.current
    if (!el || printing.current) return
    const sideways = modeRef.current === "h"
    const vw = sideways ? view.current.w : window.innerWidth
    const vh = sideways ? view.current.h : window.innerHeight
    let now: StopId = CHAPTERS[0].id
    if (sideways) {
      const x = clamp(window.scrollY - outerTop.current, 0, dist.current)
      pan.current = x
      el.style.transform = `translate3d(${-x}px, 0, 0)`
      for (const s of scrubs.current) runScrub(s, x, vw)
      const p = dist.current ? x / dist.current : 0
      listeners.current.forEach((fn) => fn(p, x, vw))
      for (const g of stopGeo.current) if (g.left - x <= vw * CURRENT_LINE) now = g.id
    } else {
      const span = document.documentElement.scrollHeight - vh
      const p = span > 0 ? window.scrollY / span : 0
      listeners.current.forEach((fn) => fn(p, 0, vw))
      for (const c of CHAPTERS) {
        const node = document.getElementById(c.id)
        if (node && node.getBoundingClientRect().top <= vh * CURRENT_LINE) now = c.id
      }
    }
    if (now !== shownStop.current) {
      shownStop.current = now
      setCurrent(now)
    }

    const next: ChromeTones = { left: toneAt(40, 36), right: toneAt(vw - 40, 36) }
    const last = shownTones.current
    if (next.left !== last.left || next.right !== last.right) {
      shownTones.current = next
      setTones(next)
    }
  }, [toneAt])

  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(frame)
  }, [frame])

  const registerScrub = useCallback(
    (anchor: Element, range: ScrubRange, apply: ScrubApply) => {
      const s: Scrub = { anchor, range, apply, L: 0, W: 0, last: null, lastX: 0, inside: false }
      scrubs.current.add(s)
      measure()
      runScrub(s, pan.current, view.current.w)
      return () => {
        scrubs.current.delete(s)
      }
    },
    [measure],
  )

  const capturePlace = useCallback((): { id: StopId; dx: number } | null => {
    if (modeRef.current === "h") {
      const x = pan.current
      let at: { id: StopId; left: number } | null = null
      for (const g of stopGeo.current) if (g.left <= x) at = g
      return at ? { id: at.id, dx: (x - at.left) / window.innerWidth } : null
    }
    const y = window.scrollY
    let place: { id: StopId; dx: number } | null = null
    for (const id of STOP_IDS) {
      const node = document.getElementById(id)
      // A stop that is not laid out down the page (the sideways-only door)
      // reports a top of 0, which would always count as passed.
      if (!node?.getClientRects().length) continue
      const top = node.getBoundingClientRect().top + y
      if (top <= y + 1) place = { id, dx: (y - top) / window.innerHeight }
    }
    return place
  }, [])

  /* Where an element sits along the journey, as a document scroll offset. */
  const scrollTopFor = useCallback((node: Element, inset = 0) => {
    const o = outer.current
    const t = track.current
    if (!o || !t) return 0
    const left = node.getBoundingClientRect().left - t.getBoundingClientRect().left
    const top = o.getBoundingClientRect().top + window.scrollY
    // A chapter's spine stays pinned at the left edge while its chapter pans,
    // so anything in the chapter scrolled to x = 0 would sit under it. The
    // chapter's panels already pad for the spine, so they are not offset.
    const chapter = node.matches("[data-panel], [data-chapter]") ? null : node.closest("[data-chapter]")
    const spine = chapter?.querySelector<HTMLElement>(".spine-box")?.offsetWidth ?? 0
    return top + clamp(left - inset - spine, 0, dist.current)
  }, [])

  /* The mode lives on <html> (set before paint by FOLIO_BOOT) so CSS lays the
     page out from the first frame; this keeps it in sync. */
  useIsoLayoutEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia(FOLIO_QUERY)
    const apply = () => {
      const next: FolioMode = mq.matches ? "h" : "v"
      root.dataset.folio = next
      setMode(next)
    }
    apply()
    mq.addEventListener("change", apply)
    return () => {
      mq.removeEventListener("change", apply)
      delete root.dataset.folio
    }
  }, [])

  /* The hero's arrival plays once, on a hard load. */
  useEffect(() => {
    const id = setTimeout(() => {
      delete document.documentElement.dataset.intro
    }, INTRO_MS)
    return () => clearTimeout(id)
  }, [])

  useIsoLayoutEffect(() => {
    modeRef.current = mode
    const el = track.current
    if (!el) return
    const remeasure = () => {
      // A resize reflows every panel sized by the screen: keep the reader at
      // the same share of the same panel, not at the same pixel.
      const x = pan.current
      const at = modeRef.current === "h" && arrived.current ? panels.current.find((p) => p.left <= x && x < p.right) : undefined
      const share = at ? (x - at.left) / Math.max(1, at.right - at.left) : 0
      measure()
      const now = at && modeRef.current === "h" ? panels.current.find((p) => p.el === at.el) : undefined
      if (now) {
        const top = outerTop.current + clamp(now.left + share * (now.right - now.left), 0, dist.current)
        if (Math.abs(top - window.scrollY) >= 1) window.scrollTo({ top, behavior: "instant" })
      }
      schedule()
    }
    measure()
    const ro = new ResizeObserver(remeasure)
    ro.observe(el)
    window.addEventListener("resize", remeasure)
    let live = true
    document.fonts.ready.then(() => {
      if (live) remeasure()
    })
    return () => {
      live = false
      ro.disconnect()
      window.removeEventListener("resize", remeasure)
    }
  }, [mode, measure, schedule])

  useEffect(() => {
    frame()
    window.addEventListener("scroll", schedule, { passive: true })
    return () => {
      cancelAnimationFrame(raf.current)
      raf.current = 0
      window.removeEventListener("scroll", schedule)
    }
  }, [mode, distance, frame, schedule])

  /* Printing (and Save as PDF) takes the document down the page. React does
     not render around a print, so this writes the DOM directly, and nothing
     measures or pans until it is over. */
  useEffect(() => {
    const root = document.documentElement
    const before = () => {
      printing.current = true
      root.dataset.folio = "v"
      if (track.current) track.current.style.transform = ""
      if (outer.current) outer.current.style.height = ""
      // What the pan armed is finished on paper: the styles it wrote are
      // inline, and no print stylesheet outranks them.
      for (const s of scrubs.current) s.apply(1, null)
    }
    const after = () => {
      printing.current = false
      root.dataset.folio = window.matchMedia(FOLIO_QUERY).matches ? "h" : "v"
      if (outer.current) {
        outer.current.style.height = modeRef.current === "h" ? `calc(${dist.current}px + 100svh)` : ""
      }
      measure()
      frame()
    }
    window.addEventListener("beforeprint", before)
    window.addEventListener("afterprint", after)
    return () => {
      window.removeEventListener("beforeprint", before)
      window.removeEventListener("afterprint", after)
    }
  }, [measure, frame])

  const go = useCallback(
    (id: string, opts?: { instant?: boolean }) => {
      const node = document.getElementById(id)
      if (!node) return
      const behavior: ScrollBehavior =
        opts?.instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
      if (document.documentElement.dataset.folio === "h") {
        window.scrollTo({ top: scrollTopFor(node), behavior })
      } else {
        node.scrollIntoView({ behavior, block: "start" })
      }
      history.replaceState(null, "", id === CHAPTERS[0].id ? window.location.pathname : `#${id}`)
    },
    [scrollTopFor],
  )

  const seek = useCallback((x: number, behavior: ScrollBehavior) => {
    if (modeRef.current !== "h") return
    window.scrollTo({ top: outerTop.current + clamp(x, 0, dist.current), behavior })
  }, [])

  /* In-page links. Captured before React sees the click, so a hash link is
     always a trip along the folio and never a native jump to the sticky
     frame's top. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.("a")
      if (!a || !a.hash) return
      const url = new URL(a.href, window.location.href)
      if (url.pathname !== window.location.pathname) return
      const id = decodeURIComponent(url.hash.slice(1))
      if (!document.getElementById(id)) return
      e.preventDefault()
      e.stopPropagation()
      go(id)
    }
    // A hash typed into the address bar jumps natively, to the wrong place.
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (id && document.getElementById(id)) go(id)
    }
    document.addEventListener("click", onClick, true)
    window.addEventListener("hashchange", onHash)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("hashchange", onHash)
    }
  }, [go])

  /* Arrive once, and only when the folio is measured in the mode <html> is
     laid out in: back at the reader's place after a language switch, or at a
     #hash deep link. On a desktop hard load the first commit measures down
     the page while <html> already says sideways, the second measures
     sideways, and the third has the tall box to land in. */
  useIsoLayoutEffect(() => {
    if (arrived.current || !measuredIn) return
    if (document.documentElement.dataset.folio !== measuredIn) return
    arrived.current = true
    const place = takePlace()
    const node = place ? document.getElementById(place.id) : null
    if (place && node) {
      const top =
        measuredIn === "h"
          ? scrollTopFor(node) + place.dx * window.innerWidth
          : node.getBoundingClientRect().top + window.scrollY + place.dx * window.innerHeight
      window.scrollTo({ top, behavior: "instant" })
      placeRestored()
      return
    }
    placeRestored()
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id && document.getElementById(id)) go(id, { instant: true })
  }, [measuredIn, distance, scrollTopFor, go])

  /* Sideways input: ← → and horizontal trackpad swipes move along the folio
     too; vertical input already does, natively. */
  useEffect(() => {
    if (mode !== "h") return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
      if (document.querySelector("[role='dialog']")) return
      const t = e.target as HTMLElement | null
      if (t?.closest("input, textarea, select, [contenteditable], [role='slider']")) return
      e.preventDefault()
      const step = window.innerWidth * KEY_STEP
      window.scrollBy({ top: e.key === "ArrowRight" ? step : -step, behavior: "smooth" })
    }
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) window.scrollBy(0, e.deltaX)
    }
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null
      if (!t || !track.current?.contains(t)) return
      const r = t.getBoundingClientRect()
      if (r.left >= 0 && r.right <= window.innerWidth) return
      window.scrollTo({ top: scrollTopFor(t, window.innerWidth * 0.3), behavior: "instant" })
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("wheel", onWheel, { passive: true })
    document.addEventListener("focusin", onFocus)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("wheel", onWheel)
      document.removeEventListener("focusin", onFocus)
    }
  }, [mode, scrollTopFor])

  const value = useMemo<FolioValue>(
    () => ({ mode, current, stops, door, tones, sheet, go, seek, onProgress, toneAt, registerScrub, capturePlace }),
    [mode, current, stops, door, tones, sheet, go, seek, onProgress, toneAt, registerScrub, capturePlace],
  )

  return (
    <FolioContext.Provider value={value}>
      <div
        ref={outer}
        className="relative"
        style={mode === "h" ? { height: `calc(${distance}px + 100svh)` } : undefined}
      >
        <div className="folio-frame">
          <div ref={track} className="folio-track">
            {children}
          </div>
        </div>
      </div>
      {chrome}
      <WarmImages />
    </FolioContext.Provider>
  )
}
