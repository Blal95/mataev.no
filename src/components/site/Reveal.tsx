"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/cn"

export type RevealKind = "wipe" | "draw" | "pull" | "press"

/**
 * Reveal — how things arrive as you scroll to them.
 *
 *   wipe   a clip opening left → right, the way the page reads. Photographs.
 *   draw   scaleX from the left edge. Rules and timeline strips.
 *   pull   the squeegee: a clip opening top → bottom. Chapter words.
 *   press  the stamp coming down onto the paper. The imprint's seal.
 *
 * The server render, no-JS and reduced motion all get the finished element:
 * nothing is hidden until JS has armed it, and an element already on screen at
 * arming time is left alone, so nothing ever blinks out and back in. The
 * transition itself is CSS (`[data-reveal]` in globals.css).
 */
export function Reveal({
  kind = "wipe",
  delay = 0,
  className,
  children,
  as: Tag = "div",
  margin = "0px -8% -8% 0px",
}: {
  kind?: RevealKind
  /** ms */
  delay?: number
  className?: string
  children?: ReactNode
  as?: "div" | "span" | "li" | "figure"
  /** How far inside the screen it must come before it arrives (IntersectionObserver rootMargin). */
  margin?: string
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<"wait" | "in" | undefined>(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const r = el.getBoundingClientRect()
    const onScreen = r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight
    if (onScreen) return
    setState("wait")
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setState("in")
        io.disconnect()
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin])

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node
      }}
      data-reveal={state}
      data-kind={kind}
      className={cn(className)}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  )
}
