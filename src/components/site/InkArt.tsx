"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import { preload } from "react-dom"
import { POSES, type Pose } from "@/config/borzik"
import { cn } from "@/lib/cn"

/** How much of him must be on screen before a `view` print is pulled. */
const IN_VIEW = 0.6

/**
 * A one-ink print: Borzik, or a site Bilal designed. Two masks cut from one
 * screenprint — the ink and the paper under it — painted with `--art-ink` and
 * `--art-fill`. Both default to the tone (`act` on `ground`), so a print is
 * ultramarine on the page and paper on a blue flood without a prop; override
 * the vars with a class for anything else. Decorative unless given a `label`.
 *
 * `alt` is a second print in the same box (Borzik doing the job), which a
 * Work column pulls through on hover; its masks load only once the column is
 * near (`data-warm`, globals.css).
 */
type Source =
  | { pose: Pose; print?: undefined }
  | {
      pose?: undefined
      /** A site's front page in `public/art/prints/`: its slug and size in px. */
      print: { slug: string; size: readonly [number, number] }
    }

export function InkArt({
  alt,
  label,
  pull = false,
  pullDelay,
  first = false,
  className,
  ...source
}: Source & {
  alt?: Pose
  label?: string
  /**
   * Print him in, paper first, then the ink dragged down: `true` on mount,
   * `intro` only on a hard load's arrival, `view` the first time he is on
   * screen (a print already on screen stays as it is).
   */
  pull?: boolean | "intro" | "view"
  /** ms */
  pullDelay?: number
  /**
   * On the first screen: its masks are requested with the HTML, at high
   * priority, not when the stylesheet gets round to painting them (behind
   * every other print on the page).
   */
  first?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [dir, name, [w, h]] = source.print
    ? ["prints", source.print.slug, source.print.size]
    : ["borzik", source.pose, POSES[source.pose]]
  if (first) {
    // A mask is fetched with CORS, so the preload has to be too or the
    // stylesheet's own request would not find it.
    for (const kind of ["fill", "ink"]) {
      preload(`/art/${dir}/${name}-${kind}.webp`, {
        as: "image",
        fetchPriority: "high",
        crossOrigin: "anonymous",
      })
    }
  }
  const vars = {
    aspectRatio: `${w} / ${h}`,
    "--ink-mask": `url(/art/${dir}/${name}-ink.webp)`,
    "--fill-mask": `url(/art/${dir}/${name}-fill.webp)`,
    ...(alt
      ? {
          "--alt-ink-mask": `url(/art/borzik/${alt}-ink.webp)`,
          "--alt-fill-mask": `url(/art/borzik/${alt}-fill.webp)`,
        }
      : {}),
    ...(pullDelay ? { "--pull-delay": `${pullDelay}ms` } : {}),
  } as CSSProperties

  useEffect(() => {
    const el = ref.current
    if (pull !== "view" || !el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const r = el.getBoundingClientRect()
    if (r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight) return
    el.dataset.pull = "wait"
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.dataset.pull = "go"
        io.disconnect()
      },
      { threshold: IN_VIEW },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [pull])

  return (
    <span
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-pull={pull === true ? "" : pull === "intro" ? "intro" : undefined}
      className={cn("ink-art", className)}
      style={vars}
    >
      <i className="ink-fill" />
      <i className="ink-line" />
      {alt && (
        <>
          <i className="ink-fill ink-alt" />
          <i className="ink-line ink-alt" />
        </>
      )}
    </span>
  )
}
