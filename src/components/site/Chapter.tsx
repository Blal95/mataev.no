"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { chapterNumeral, type ChapterId } from "@/config/chapters"
import { useFolioMaybe, useScrub } from "./Folio"
import { Reveal } from "./Reveal"

/** Archivo's width axis: the spine word's rest, and the widest it may go. */
const WDTH_REST = 62
const WDTH_MAX = 125
/** The word widens in steps of this many percent: each step relays the word
 *  out, so fewer, slightly larger steps keep the pan light. */
const WDTH_STEP = 2

/**
 * A chapter (II–IV) and its spine: the numeral and the chapter's name in the
 * display cut. There is no heading panel and no sentence about the chapter;
 * the spine is the heading.
 *
 * Sideways, the spine stands on the chapter's left edge, set bottom to top,
 * and stays pinned there while the chapter pans past; its word widens along
 * the width axis as you go through the chapter, widest at the chapter's end,
 * until the next chapter's spine pushes it out. It takes the tone of the
 * panel under it, so it turns blue over the desk. Down the page it is a ruled
 * header. The word is pulled in, top to bottom, the first time it is seen.
 */
export function Chapter({ id, children }: { id: Exclude<ChapterId, "home">; children: ReactNode }) {
  const t = useTranslations("site.chapters")
  const folio = useFolioMaybe()
  const section = useRef<HTMLElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  // Measured at rest, never per frame: the spine's width, and how wide the
  // word may stretch before it no longer fits the box.
  const geo = useRef({ spineW: 0, wMax: WDTH_REST })
  const shown = useRef({ wdth: 0, ink: "" })

  const mode = folio?.mode
  useLayoutEffect(() => {
    const b = box.current
    const h = heading.current
    const num = h?.querySelector<HTMLElement>(".spine-num")
    const word = h?.querySelector<HTMLElement>(".spine-word")
    if (!b || !h || !num || !word || mode !== "h") return
    // The length the numeral and the word take along the spine, end to end.
    const length = () => {
      const a = num.getBoundingClientRect()
      const w = word.getBoundingClientRect()
      return Math.max(a.bottom, w.bottom) - Math.min(a.top, w.top)
    }
    const measure = () => {
      const prev = word.style.getPropertyValue("--wdth")
      const room = b.clientHeight
      word.style.setProperty("--wdth", `${WDTH_MAX}%`)
      const atMax = length()
      let wMax = WDTH_MAX
      if (atMax > room) {
        word.style.setProperty("--wdth", `${WDTH_REST}%`)
        const atRest = length()
        const fit = WDTH_REST + ((WDTH_MAX - WDTH_REST) * (room - atRest)) / Math.max(1, atMax - atRest)
        wMax = Math.min(Math.max(Math.floor(fit) - 1, WDTH_REST), WDTH_MAX)
      }
      if (prev) word.style.setProperty("--wdth", prev)
      else word.style.removeProperty("--wdth")
      geo.current = { spineW: b.offsetWidth, wMax }
    }
    measure()
    let live = true
    document.fonts.ready.then(() => {
      if (live) measure()
    })
    window.addEventListener("resize", measure)
    return () => {
      live = false
      window.removeEventListener("resize", measure)
    }
  }, [mode])

  useScrub(
    () => section.current,
    "pin",
    (p, g) => {
      const b = box.current
      const word = heading.current?.querySelector<HTMLElement>(".spine-word")
      if (!b || !word) return
      if (!g) {
        b.style.translate = ""
        word.style.removeProperty("--wdth")
        delete b.dataset.ink
        shown.current = { wdth: 0, ink: "" }
        return
      }
      const { spineW, wMax } = geo.current
      const x = Math.min(Math.max(g.x - g.L, 0), Math.max(0, g.W - spineW))
      b.style.translate = `${x}px 0`
      // Eased in and out, so the word starts and settles gently.
      const eased = WDTH_REST + (wMax - WDTH_REST) * (0.5 - Math.cos(Math.PI * p) / 2)
      const wdth = Math.min(wMax, WDTH_REST + Math.round((eased - WDTH_REST) / WDTH_STEP) * WDTH_STEP)
      if (wdth !== shown.current.wdth) {
        shown.current.wdth = wdth
        word.style.setProperty("--wdth", `${wdth}%`)
      }
      const ink = folio?.toneAt(g.L + x - g.x + spineW / 2, 0) ?? "day"
      if (ink !== shown.current.ink) {
        shown.current.ink = ink
        b.dataset.ink = ink
      }
    },
  )

  return (
    <section ref={section} id={id} data-chapter="" aria-labelledby={`${id}-title`} className="relative">
      <div ref={box} className="spine-box px-4 pt-24 sm:px-8 lg:px-12">
        <h2 ref={heading} id={`${id}-title`} className="spine">
          <span aria-hidden className="spine-num">
            {chapterNumeral(id)}
          </span>
          <Reveal kind="pull" as="span" className="spine-word">
            {t(id)}
          </Reveal>
        </h2>
      </div>
      {children}
    </section>
  )
}
