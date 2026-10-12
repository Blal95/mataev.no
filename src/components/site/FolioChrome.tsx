"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import { useTranslations } from "next-intl"
import { DoorOpen } from "lucide-react"
import { DOOR_ID, chapterNumeral, type StopId } from "@/config/chapters"
import { TowerMark } from "@/components/ui/TowerMark"
import { LocaleSwitch } from "@/components/layout/LocaleSwitch"
import { cn } from "@/lib/cn"
import { CabinSwitch } from "./CabinSwitch"
import { CVButton } from "./CVButton"
import { useFolio, useScrub, type Tone } from "./Folio"

const toneClass = (t: Tone) => (t === "blue" ? "tone-blue" : t === "night" ? "tone-night" : "tone-day")

/** How far the pointer has to move on the sheet before a press is a drag. */
const DRAG_PX = 3

/**
 * The folio's only chrome, and none of it is a bar: the mark in one corner,
 * the cabin, the other language and the CV in the other, and the sheet in
 * the bottom-left — the whole folio in miniature, with a frame for the screen
 * riding along it. Each piece takes the tone of whatever it is floating over,
 * so it stays readable over paper, blue and the cabin's night.
 *
 * Sideways, the mark is not there on the first screen: the M of the name is
 * the mark there. It traces itself as Home leaves, the valley that makes the
 * M last, in ultramarine. Down the page (phones, reduced motion) it is always
 * drawn, the corners scroll away with the top of the page, and there is no
 * sheet: on a page you scroll, the chapters are its headings.
 */
export function FolioChrome() {
  const t = useTranslations("site")
  const { mode, tones, onProgress, toneAt } = useFolio()
  const mark = useRef<HTMLAnchorElement>(null)
  const corner = useRef<HTMLDivElement>(null)
  // Where each word of the right corner sits on the screen, measured when
  // the corner changes size (the cabin arrives after load), not every frame.
  const centres = useRef<number[]>([])

  // The right corner is three words wide, wide enough to straddle the edge
  // between paper and blue: each word takes the tone under itself.
  useEffect(() => {
    const el = corner.current
    if (!el || mode !== "h") return
    const read = () => {
      centres.current = Array.from(el.children, (c) => {
        const r = c.getBoundingClientRect()
        return r.left + r.width / 2
      })
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    const off = onProgress(() => {
      centres.current.forEach((x, i) => {
        const c = el.children[i] as HTMLElement | undefined
        if (!c) return
        const ink = toneAt(x, 36)
        if (c.dataset.ink !== ink) c.dataset.ink = ink
      })
    })
    return () => {
      ro.disconnect()
      off()
      for (const c of Array.from(el.children) as HTMLElement[]) delete c.dataset.ink
    }
  }, [mode, onProgress, toneAt])

  useScrub(
    () => document.getElementById("home"),
    "leave",
    (p, g) => {
      const el = mark.current
      if (!el) return
      const d = g ? p : 1
      el.style.setProperty("--draw-pan", d.toFixed(3))
      const drawn = d < 0.02 ? "0" : "1"
      if (el.dataset.drawn !== drawn) el.dataset.drawn = drawn
    },
  )

  return (
    <>
      <div
        data-print="hide"
        className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between px-3 pt-3 sm:px-6 sm:pt-4 lg:px-10 folio:fixed"
      >
        {/* Folio's link capture turns this into a pan home; without JS it is
            a jump to the top. */}
        <a
          ref={mark}
          href="#home"
          aria-label={t("chrome.home")}
          className={cn(
            toneClass(tones.left),
            "mark-btn pointer-events-auto grid size-11 place-items-center text-fg transition-colors duration-500",
          )}
        >
          <TowerMark accent className="size-7" strokeWidth={2.6} />
        </a>
        <div
          ref={corner}
          className={cn(
            toneClass(tones.right),
            "pointer-events-auto flex items-center gap-1 text-fg transition-colors duration-500 sm:gap-2",
          )}
        >
          <CabinSwitch />
          <LocaleSwitch />
          <CVButton variant="chip" />
        </div>
      </div>
      <FolioSheet label={t("chapters.label")} />
    </>
  )
}

/**
 * The sheet: every panel of the folio as a block in its own tone, left to
 * right, the chapters' numerals under their first block, and a frame for the
 * screen that rides along as the page pans — so where you are, what is left
 * and what is coming (the blue desk, the cabin's night at the end) read at a
 * glance, without a word. Pointing at it names the chapter; a click there
 * goes, and a drag pans the page. The numerals are the buttons a keyboard
 * and a screen reader use. Sideways only.
 */
function FolioSheet({ label }: { label: string }) {
  const t = useTranslations("site.chapters")
  const { mode, sheet, current, go, seek, onProgress, toneAt } = useFolio()
  const nav = useRef<HTMLElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLSpanElement>(null)
  const press = useRef<{ x: number; drag: boolean } | null>(null)
  const [peek, setPeek] = useState<StopId | null>(null)

  // The frame rides every frame of the pan; the sheet takes the tone of what
  // it floats over, sampled at its middle, measured when the window changes.
  useEffect(() => {
    const el = nav.current
    if (!el || !sheet) return
    let mid = { x: 0, y: 0 }
    const read = () => {
      const r = el.getBoundingClientRect()
      mid = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
    read()
    window.addEventListener("resize", read)
    const off = onProgress((_, x) => {
      frame.current?.style.setProperty("--x", String(x / sheet.length))
      const ink = toneAt(mid.x, mid.y)
      if (el.dataset.ink !== ink) el.dataset.ink = ink
    })
    return () => {
      window.removeEventListener("resize", read)
      off()
    }
  }, [sheet, onProgress, toneAt])

  if (mode !== "h" || !sheet) return null

  const at = (clientX: number) => {
    const r = strip.current?.getBoundingClientRect()
    return r ? ((clientX - r.left) / r.width) * sheet.length : 0
  }
  const stopAt = (x: number) => sheet.stops.reduce<StopId>((id, s) => (s.left <= x ? s.id : id), sheet.stops[0].id)
  const name = (id: StopId) => (id === DOOR_ID ? t("cabin") : `${chapterNumeral(id)} ${t(id)}`)

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    press.current = { x: e.clientX, drag: false }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current
    if (!p) return setPeek(stopAt(at(e.clientX)))
    if (!p.drag && Math.abs(e.clientX - p.x) < DRAG_PX) return
    p.drag = true
    seek(at(e.clientX) - sheet.view / 2, "instant")
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current
    press.current = null
    if (p && !p.drag) seek(at(e.clientX) - sheet.view / 2, "smooth")
  }

  return (
    <nav
      ref={nav}
      aria-label={label}
      data-print="hide"
      className="pointer-events-none fixed bottom-0 left-0 z-40 px-4 pb-2 text-fg sm:px-6 lg:px-10"
    >
      <div className="sheet pointer-events-auto relative" onPointerLeave={() => setPeek(null)}>
        <div
          ref={strip}
          aria-hidden
          className="sheet-strip"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            press.current = null
          }}
        >
          {sheet.panels.map((p) => (
            <span
              key={p.left}
              data-tone={p.tone}
              className={toneClass(p.tone)}
              style={{ width: `${((p.right - p.left) / sheet.length) * 100}%` }}
            />
          ))}
          <span ref={frame} className="sheet-frame" style={{ width: `${(sheet.view / sheet.length) * 100}%` }} />
        </div>
        {/* 24px targets are enough here: the sheet only exists for a mouse. */}
        <ol className="relative h-6">
          {sheet.stops.map((s) => (
            <li key={s.id} className="absolute top-0" style={{ left: `${(s.left / sheet.length) * 100}%` }}>
              <button
                type="button"
                onClick={() => go(s.id)}
                onPointerEnter={() => setPeek(s.id)}
                onFocus={() => setPeek(s.id)}
                onBlur={() => setPeek(null)}
                aria-current={current === s.id ? "location" : undefined}
                className={cn(
                  "label -ml-1 inline-flex min-h-6 min-w-6 items-start px-1 pt-1 transition-colors duration-300",
                  current === s.id ? "text-act-ink" : "text-fg-3 hover:text-fg",
                )}
              >
                {s.id === DOOR_ID ? (
                  <DoorOpen aria-hidden className="size-3.5" />
                ) : (
                  <span aria-hidden>{chapterNumeral(s.id)}</span>
                )}
                <span className="sr-only">{name(s.id)}</span>
              </button>
            </li>
          ))}
        </ol>
        {/* What the pointer is on, named beside the sheet. */}
        <p aria-hidden className="label absolute top-0 left-full ml-4 -translate-y-[3px] whitespace-nowrap text-fg">
          {peek && name(peek)}
        </p>
      </div>
    </nav>
  )
}
