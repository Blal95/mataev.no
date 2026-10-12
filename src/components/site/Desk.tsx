"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { AskBorzik } from "./AskBorzik"
import { useScrub } from "./Folio"
import { InkArt } from "./InkArt"

/** Where each thing lies on the desk (md and up): position as a share of the
 *  stage, width as a share of it (`w`) or, in the sideways folio, of the
 *  screen's height (`wh`, so everything fits whatever the window's shape),
 *  and a tilt. Below md the desk is a plain stack. */
type Spot = { x: string; y: string; w: string; wh: string; r: string }

const SPOTS = {
  night: { x: "3%", y: "8%", w: "19%", wh: "34svh", r: "-4deg" },
  note: { x: "22%", y: "5%", w: "20%", wh: "36svh", r: "2.5deg" },
  baby: { x: "23%", y: "54%", w: "20%", wh: "34svh", r: "5deg" },
  chess: { x: "46%", y: "9%", w: "15%", wh: "26svh", r: "-3deg" },
  bowl: { x: "64%", y: "4%", w: "14%", wh: "24svh", r: "4deg" },
  look: { x: "58%", y: "56%", w: "14%", wh: "25svh", r: "-6deg" },
  borzik: { x: "76%", y: "38%", w: "18%", wh: "30svh", r: "0deg" },
} satisfies Record<string, Spot>

/** How long the things glide home when the desk is tidied, in ms. */
const TIDY_MS = 420

/** A spot, plus what the deal-out needs: where the thing lies as numbers,
 *  which way it tilts in the pile, and its place in the deal (`k`). */
const spot = (s: Spot, k: number) =>
  ({
    "--x": s.x,
    "--y": s.y,
    "--w": s.w,
    "--wh": s.wh,
    "--r": s.r,
    "--xn": parseFloat(s.x),
    "--yn": parseFloat(s.y),
    "--pr": k % 2 ? "8deg" : "-7deg",
    "--k": k,
  }) as CSSProperties

/**
 * The desk: the things on it — photographs, a note, a chess board, Borzik —
 * laid on a blue panel of the About chapter. Sideways they are dealt out of
 * a loose pile as the desk comes on screen. With a mouse they can be picked
 * up and moved, and put back in one go; everywhere else they lie where they
 * were put. Every fact on the desk is also plain text elsewhere on the page,
 * so dragging is only play.
 */
export function Desk() {
  const t = useTranslations()
  const tAbout = useTranslations("site.about")
  const stage = useRef<HTMLDivElement>(null)
  const offsets = useRef(new Map<HTMLElement, { dx: number; dy: number }>())
  const [moved, setMoved] = useState(false)
  const [said, setSaid] = useState("")
  const reading = useReading()

  useScrub(
    () => stage.current?.closest("[data-panel]"),
    "enter",
    (p, g) => {
      const el = stage.current
      if (!el) return
      if (!g) {
        el.style.removeProperty("--deal")
        return
      }
      el.style.setProperty("--deal", Math.min(1, Math.max(0, (p - 0.3) / 0.65)).toFixed(3))
    },
  )

  useEffect(() => {
    const root = stage.current
    if (!root) return
    const able = window.matchMedia("(pointer: fine) and (min-width: 768px)")
    if (!able.matches) return

    let z = 10
    const cleanups: Array<() => void> = []
    root.querySelectorAll<HTMLElement>("[data-drag]").forEach((el) => {
      let startX = 0
      let startY = 0
      let dragging = false
      const at = () => offsets.current.get(el) ?? { dx: 0, dy: 0 }

      const down = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest("a, button")) return
        dragging = true
        el.setPointerCapture(e.pointerId)
        el.dataset.lift = ""
        el.style.zIndex = String(++z)
        const { dx, dy } = at()
        startX = e.clientX - dx
        startY = e.clientY - dy
      }
      const move = (e: PointerEvent) => {
        if (!dragging) return
        const dx = e.clientX - startX
        const dy = e.clientY - startY
        offsets.current.set(el, { dx, dy })
        el.style.setProperty("--dx", `${dx}px`)
        el.style.setProperty("--dy", `${dy}px`)
        setMoved(true)
      }
      const up = () => {
        dragging = false
        delete el.dataset.lift
      }

      el.addEventListener("pointerdown", down)
      el.addEventListener("pointermove", move)
      el.addEventListener("pointerup", up)
      el.addEventListener("pointercancel", up)
      cleanups.push(() => {
        el.removeEventListener("pointerdown", down)
        el.removeEventListener("pointermove", move)
        el.removeEventListener("pointerup", up)
        el.removeEventListener("pointercancel", up)
      })
    })
    root.dataset.draggable = ""
    return () => cleanups.forEach((c) => c())
  }, [])

  // Everything back to its spot, gliding, and said out loud.
  const tidy = () => {
    const root = stage.current
    if (!root) return
    root.dataset.tidying = ""
    offsets.current.clear()
    root.querySelectorAll<HTMLElement>("[data-drag]").forEach((el) => {
      el.style.setProperty("--dx", "0px")
      el.style.setProperty("--dy", "0px")
    })
    setMoved(false)
    setSaid(tAbout("tidied"))
    setTimeout(() => delete root.dataset.tidying, TIDY_MS)
  }

  return (
    <div className="flex h-full flex-col px-4 py-16 sm:px-8 lg:px-12 folio:pb-20 folio:pl-[calc(var(--spine-w)+3vw)] folio:pr-[4vw] folio:pt-24">
        <h3 id="desk-title" className="sr-only">
          {tAbout("deskTitle")}
        </h3>

        <div
          ref={stage}
          className="desk grid grid-cols-2 items-start gap-x-4 gap-y-8 md:relative md:block md:h-[clamp(32rem,44vw,42rem)] folio:h-auto folio:flex-1"
        >
          <Polaroid
            k={0}
            spot={SPOTS.night}
            src="/bilal3.webp"
            alt={tAbout("captions.night")}
            caption={tAbout("captions.night")}
            ratio="aspect-[4/5]"
            position="object-[50%_40%]"
          />

          <Polaroid
            k={1}
            spot={SPOTS.baby}
            src="/bilal1.webp"
            alt={tAbout("captions.baby")}
            caption={tAbout("captions.baby")}
            ratio="aspect-[4/3]"
            position="object-[50%_30%]"
          />

          <DeskItem k={2} spot={SPOTS.note} className="col-span-2 md:col-span-1">
            <div className="bg-paper px-5 py-5 text-deep shadow-[0_18px_40px_-16px_rgba(8,12,60,0.55)]">
              <p className="label border-b border-deep/20 pb-2">{tAbout("noteTitle")}</p>
              <dl className="mt-3 space-y-2.5 text-[15px] leading-snug">
                <NoteLine k={t("now.studying.k")} v={t("now.studying.v")} />
                <NoteLine k={t("now.building.k")} v={t("now.building.v")} />
                {reading && <NoteLine k={t("now.reading.k")} v={reading} />}
                <NoteLine k={t("now.playing.k")} v={t("now.playing.v")} />
              </dl>
            </div>
          </DeskItem>

          <DeskItem k={3} spot={SPOTS.chess}>
            <div aria-hidden className="grid aspect-square grid-cols-8 border-[6px] border-paper shadow-[0_18px_40px_-16px_rgba(8,12,60,0.55)]">
              {Array.from({ length: 64 }, (_, i) => {
                const dark = (Math.floor(i / 8) + i) % 2 === 1
                const piece = PIECES.get(i)
                return (
                  <span key={i} className={cn("relative", dark ? "bg-deep" : "bg-paper")}>
                    {piece && (
                      <span
                        className={cn(
                          "absolute inset-[22%] rounded-full",
                          piece === "w" ? "bg-paper ring-2 ring-deep" : "bg-ultra ring-2 ring-paper",
                        )}
                      />
                    )}
                  </span>
                )
              })}
            </div>
            <a
              href="#myboard"
              className="label group mt-3 inline-flex min-h-11 items-start gap-1.5 text-fg underline decoration-line underline-offset-4 hover:decoration-current"
            >
              {tAbout("chess")}
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </DeskItem>

          <Polaroid
            k={4}
            spot={SPOTS.look}
            src="/borzik-looking.webp"
            alt={tAbout("captions.look")}
            caption={t("site.borzik.drawn")}
            ratio="aspect-square"
            position="object-[50%_62%]"
          />
          <Polaroid
            k={5}
            spot={SPOTS.bowl}
            src="/borzik-in-bowl.webp"
            alt={tAbout("captions.bowl")}
            caption={t("site.borzik.name")}
            ratio="aspect-square"
            position="object-[50%_45%]"
          />

          <DeskItem k={6} spot={SPOTS.borzik}>
            <div className="flex flex-col items-start gap-3 md:block">
              <InkArt pose="wave" className="w-full [--art-fill:var(--paper)] [--art-ink:var(--deep)] md:w-[78%]" />
              <AskBorzik
                label={tAbout("ask")}
                title={tAbout("askTitle")}
                intro={t("panel.borzik.intro")}
                className="md:absolute md:left-[62%] md:top-[8%] md:w-max"
              />
            </div>
          </DeskItem>

          {moved && (
            <button
              type="button"
              onClick={tidy}
              className="label absolute bottom-3 right-3 z-[60] min-h-11 border border-fg bg-ground px-4 text-fg transition-colors hover:bg-fg hover:text-ground"
            >
              {tAbout("tidy")}
            </button>
          )}
          <p aria-live="polite" className="sr-only">
            {said}
          </p>
        </div>
    </div>
  )
}

/** A few pieces mid-game: board index → colour. */
const PIECES = new Map<number, "w" | "b">([
  [2, "b"], [4, "b"], [11, "b"], [13, "b"], [19, "b"], [28, "w"],
  [35, "w"], [42, "w"], [50, "w"], [53, "w"], [60, "w"],
])

function DeskItem({
  spot: s,
  k,
  className,
  children,
}: {
  spot: Spot
  /** Its place in the deal-out: the order it is in on the desk. */
  k: number
  className?: string
  children: ReactNode
}) {
  return (
    <div data-drag style={spot(s, k)} className={cn("desk-item", className)}>
      {children}
    </div>
  )
}

/** A photograph on the desk, captioned on its strip of paper. Borzik's say
 *  who he is: the hamster in every drawing on the site. */
function Polaroid({
  spot: s,
  k,
  src,
  alt,
  caption,
  ratio,
  position,
}: {
  spot: Spot
  k: number
  src: string
  alt: string
  caption?: string
  ratio: string
  position: string
}) {
  return (
    <DeskItem k={k} spot={s}>
      <figure className="bg-paper p-2.5 pb-0 shadow-[0_18px_40px_-16px_rgba(8,12,60,0.55)] md:p-3 md:pb-0">
        <div className={cn("relative overflow-hidden bg-paper-2", ratio)}>
          <Image
            src={src}
            alt={alt}
            fill
            draggable={false}
            sizes="(min-width: 768px) 22vw, 45vw"
            className={cn("object-cover", position)}
          />
        </div>
        {caption ? (
          <figcaption aria-hidden className="label py-2.5 text-deep md:py-3">
            {caption}
          </figcaption>
        ) : (
          <div aria-hidden className="label py-2.5 md:py-3">
            &nbsp;
          </div>
        )}
      </figure>
    </DeskItem>
  )
}

function NoteLine({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <dt className="label text-deep/70">{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}

/** The book Bilal is reading right now, from his Goodreads shelf, or null. */
function useReading() {
  const [reading, setReading] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    fetch("/api/reading")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reading: { title: string; author: string | null } | null } | null) => {
        if (!live || !d?.reading) return
        const { title, author } = d.reading
        setReading(author ? `${title}, ${author}` : title)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return reading
}
