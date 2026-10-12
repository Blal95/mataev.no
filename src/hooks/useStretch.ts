"use client"

import { useEffect, type RefObject } from "react"

/** How quickly a letter follows its target, per frame. */
const EASE = 0.16
/** Below this much still to go (in percent of width) a letter has arrived. */
const SETTLED = 0.15
/** The smallest reach, in px, however narrow the window. */
const MIN_REACH = 160

/**
 * Letters near the pointer widen along the font's own width axis and settle
 * back when it leaves: the name's one playful gesture, and the email's. The
 * letters are the `[data-letter]` elements inside `ref`.
 *
 * Only a real mouse with motion allowed gets it. Each letter's centre is
 * measured once at rest (on mount, resize and font load) and the pull is
 * computed against those, so a widening letter never moves its own target and
 * a frame reads the layout once, before it writes anything. Widths are
 * written in half percents, and only when they change. The pointer is only
 * listened to while the text is on screen.
 */
export function useStretch(
  ref: RefObject<HTMLElement | null>,
  { rest = 62, peak = 112, reach = 0.17 }: { rest?: number; peak?: number; reach?: number } = {},
) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const able = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    )
    if (!able.matches) return

    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-letter]"))
    const width = letters.map(() => rest)
    const written = letters.map(() => rest)
    let centres: { x: number; y: number }[] = []
    let px = -1e5
    let py = -1e5
    let raf = 0

    // Every letter back to rest, at once.
    const settle = () => {
      cancelAnimationFrame(raf)
      raf = 0
      letters.forEach((el) => {
        el.style.removeProperty("font-stretch")
        el.style.removeProperty("--s")
      })
      width.fill(rest)
      written.fill(rest)
    }
    const cache = () => {
      settle()
      const r = root.getBoundingClientRect()
      centres = letters.map((el) => {
        const b = el.getBoundingClientRect()
        return { x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top }
      })
    }

    const step = () => {
      const r = root.getBoundingClientRect()
      const span = Math.max(window.innerWidth * reach, MIN_REACH)
      let moving = false
      letters.forEach((el, i) => {
        const c = centres[i]
        if (!c) return
        const d = Math.hypot(px - (r.left + c.x), py - (r.top + c.y))
        const pull = Math.max(0, 1 - d / span)
        const target = rest + (peak - rest) * pull * pull
        width[i] += (target - width[i]) * EASE
        if (Math.abs(target - width[i]) > SETTLED) moving = true
        const q = Math.round(width[i] * 2) / 2
        if (q !== written[i]) {
          written[i] = q
          el.style.fontStretch = `${q}%`
          el.style.setProperty("--s", String(q))
        }
      })
      raf = moving ? requestAnimationFrame(step) : 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step)
    }
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      kick()
    }
    const onLeave = () => {
      px = -1e5
      py = -1e5
      kick()
    }

    let listening = false
    const listen = (on: boolean) => {
      if (on === listening) return
      listening = on
      if (on) window.addEventListener("pointermove", onMove, { passive: true })
      else {
        window.removeEventListener("pointermove", onMove)
        onLeave()
      }
    }
    const io = new IntersectionObserver(([entry]) => listen(entry.isIntersecting))

    cache()
    let live = true
    document.fonts.ready.then(() => {
      if (live) cache()
    })
    io.observe(root)
    window.addEventListener("resize", cache)
    // Paper gets the set type, not a letter caught mid-stretch.
    window.addEventListener("beforeprint", settle)
    window.addEventListener("afterprint", cache)
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      live = false
      cancelAnimationFrame(raf)
      io.disconnect()
      listen(false)
      window.removeEventListener("resize", cache)
      window.removeEventListener("beforeprint", settle)
      window.removeEventListener("afterprint", cache)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [ref, rest, peak, reach])
}
