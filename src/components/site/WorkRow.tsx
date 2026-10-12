"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * The project columns, and the one listener that runs their hover.
 *
 * Pointer in (a real mouse) or keyboard focus: the column's print is pulled
 * through the screen again into Borzik's action frame (`data-art`), and a column
 * that links somewhere floods from the top. Out: the ink leaves through the
 * bottom (`data-exit`), then snaps back up unseen (`proj-reset`), so the next
 * pass comes from the top again. The action frames' masks load only once the
 * row is within a screen of the viewport (`data-warm`). Phones get none of
 * it: a tap simply follows the link.
 *
 * `.proj-row` owns its display and grid in CSS: no layout utilities on it.
 */
export function WorkRow({ children }: { children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = row.current
    if (!el) return
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches
    const warm = () => {
      el.dataset.warm = ""
    }
    const project = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>(".proj") : null)
    const show = (a: HTMLElement) => {
      delete a.dataset.exit
      a.classList.remove("proj-reset")
      if (a.dataset.art !== "alt") a.dataset.art = "alt"
    }
    const hide = (a: HTMLElement) => {
      if (a.dataset.art !== "alt") return
      a.dataset.art = "rest"
      if (a.dataset.link !== undefined) a.dataset.exit = ""
    }

    const onOver = (e: PointerEvent) => {
      const a = project(e.target)
      if (a) show(a)
    }
    const onOut = (e: PointerEvent) => {
      const a = project(e.target)
      if (a && !a.contains(e.relatedTarget as Node | null)) hide(a)
    }
    const onFocusIn = (e: FocusEvent) => {
      warm()
      const a = project(e.target)
      if (a && (e.target as Element).matches(":focus-visible")) show(a)
    }
    const onFocusOut = (e: FocusEvent) => {
      const a = project(e.target)
      if (a && !a.contains(e.relatedTarget as Node | null)) hide(a)
    }
    const onEnd = (e: TransitionEvent) => {
      const a = project(e.target)
      if (!a || e.target !== a || e.pseudoElement !== "::before" || e.propertyName !== "clip-path") return
      if (a.dataset.exit === undefined) return
      delete a.dataset.exit
      a.classList.add("proj-reset")
      requestAnimationFrame(() => a.classList.remove("proj-reset"))
    }

    let io: IntersectionObserver | undefined
    if (hover) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          warm()
          io?.disconnect()
        },
        { rootMargin: "0px 100% 0px 100%" },
      )
      io.observe(el)
      el.addEventListener("pointerover", onOver)
      el.addEventListener("pointerout", onOut)
    }
    el.addEventListener("focusin", onFocusIn)
    el.addEventListener("focusout", onFocusOut)
    el.addEventListener("transitionend", onEnd)
    return () => {
      io?.disconnect()
      el.removeEventListener("pointerover", onOver)
      el.removeEventListener("pointerout", onOut)
      el.removeEventListener("focusin", onFocusIn)
      el.removeEventListener("focusout", onFocusOut)
      el.removeEventListener("transitionend", onEnd)
    }
  }, [])

  return (
    <div ref={row} className="proj-row border-b border-line folio:border-b-0">
      {children}
    </div>
  )
}
