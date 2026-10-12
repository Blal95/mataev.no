"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { m } from "framer-motion"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { InkArt } from "@/components/site/InkArt"
import { Button } from "@/components/ui/Button"
import { TowerMark } from "@/components/ui/TowerMark"
import { Link } from "@/i18n/navigation"

interface Props {
  progress: number
  ready: boolean
  reducedMotion?: boolean
  onEnter: () => void
}

/** Going in: the picture scales up around the doorway while the night lifts. */
const EXIT = { duration: 0.55, delay: 0.45, ease: [0.7, 0, 0.84, 0] } as const

/**
 * BootScreen — the cabin's door, while the cabin loads.
 *
 * The same picture the folio ends on: night, Borzik holding the cabin door
 * open, HYTTA in the display cut. So the page and the cabin are one frame.
 * The wait is printed: Borzik's ink is pulled down over the paper as the cabin
 * loads, and the folio's own rail along the bottom fills with it. When the
 * cabin is ready there is one button (or any key); going in walks through the
 * door — the picture scales up around the doorway while the night lifts off
 * the scene. Transform and opacity only: at that moment the main thread
 * belongs to Three.js compiling shaders.
 *
 * With reduced motion it is the finished print, and going in is a fade.
 */
export function BootScreen({ progress, ready, reducedMotion, onEnter }: Props) {
  const t = useTranslations("boot")
  const tDoor = useTranslations("site.door")
  const [going, setGoing] = useState(false)
  const pct = ready ? 100 : Math.round(Math.min(100, Math.max(0, progress)))

  // `going` and the parent's unmount are set in the same handler, so they
  // commit together: AnimatePresence keeps this instance mounted for its exit
  // while its own state swaps in the zoom.
  const enter = useCallback(() => {
    setGoing(true)
    onEnter()
  }, [onEnter])

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab" || e.key === "Shift") return
      // Enter on the way back to the page follows the link.
      if (e.target instanceof Element && e.target.closest("a")) return
      window.removeEventListener("keydown", onKey)
      enter()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ready, enter])

  return (
    <m.div
      initial={false}
      exit={{ opacity: 0, transition: reducedMotion ? { duration: 0.3 } : EXIT }}
      data-going={going || undefined}
      className="boot tone-night fixed inset-0 z-[60] bg-ground text-fg"
    >
      {/* The corners, as on the page. */}
      <div className="boot-ui absolute inset-x-0 top-0 flex items-start justify-between px-3 pt-3 sm:px-6 sm:pt-4 lg:px-10">
        <span aria-hidden className="grid size-11 place-items-center">
          <TowerMark accent className="size-7" strokeWidth={2.6} />
        </span>
        <Link
          href="/"
          className="label inline-flex min-h-11 items-center px-2 text-fg-2 underline decoration-transparent underline-offset-4 transition-colors hover:text-fg hover:decoration-act focus-visible:decoration-act"
        >
          {t("skip")}
        </Link>
      </div>

      <div className="grid h-full place-items-center px-6">
        <div className="flex flex-col items-center gap-8">
          <div className="boot-art" style={{ "--ink": pct } as CSSProperties}>
            <InkArt pose="door" first className="boot-print w-[min(18rem,32svh)]" />
          </div>
          <h1 className="boot-ui display text-[length:clamp(4rem,min(9vw,16svh),9rem)] [--wdth:112%]">
            {tDoor("title")}
          </h1>
          {/* The button's room is kept while it waits, so nothing moves when it
              arrives. */}
          <div className="boot-ui grid h-14 place-items-center">
            <Button
              onClick={enter}
              size="lg"
              tabIndex={ready ? undefined : -1}
              aria-hidden={ready ? undefined : true}
              className={ready ? "opacity-100 transition-opacity duration-500" : "pointer-events-none opacity-0"}
            >
              {t("enter")}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>

      {/* The folio's rail, filling as the cabin loads. */}
      <div className="boot-ui absolute inset-x-0 bottom-0 px-4 pb-3 sm:px-6 lg:px-10">
        <div className="relative h-11">
          <p aria-hidden className="label absolute bottom-3 left-0 pb-1 tabular">
            {ready ? (
              <span className="text-act-ink">{t("loaded")}</span>
            ) : (
              <span className="text-fg-2">
                {t("loading")} · {pct}%
              </span>
            )}
          </p>
          <span aria-hidden className="absolute inset-x-0 bottom-2 h-px bg-line" />
          <span
            aria-hidden
            className="boot-fill absolute inset-x-0 bottom-[7px] h-[3px] origin-left bg-act"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
          <p role="status" className="sr-only">
            {ready ? t("loaded") : t("loading")}
          </p>
        </div>
      </div>
    </m.div>
  )
}
