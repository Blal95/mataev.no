"use client"

import { useEffect, useRef, type ReactNode } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useFolioMaybe } from "@/components/site/Folio"
import { Reveal } from "@/components/site/Reveal"
import { site } from "@/config/site"
import { cn } from "@/lib/cn"

const LEAD = "/bilal4.webp"
const LEAD_SIZES = "(min-width: 1024px) 26rem, 90vw"
/** How much of the portrait must be on screen before it develops, without a pointer. */
const IN_VIEW = 0.6

interface DossierRow {
  k: string
  v: string
}

/**
 * About — one portrait, the bio, and what he builds with. Shared by the About
 * chapter and the cabin's photo board, so it takes all its colour from the
 * tone around it.
 *
 * Sideways on the page it is a spread that fits one screen: the portrait,
 * and beside it the bio over the facts. Everywhere else it lays itself out
 * by the room it has: down the page, and in the cabin's dialog (`compact`).
 *
 * The portrait is a grey print with the colour print over it, pulled down
 * top to bottom under the pointer (without one, once it is in view): the one
 * reminder that this is a person, not an illustration. In the folio three
 * phrases of the bio are links to the proof: the studio, the product and
 * the jobs; in the cabin they are plain words.
 */
export function AboutPanel({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("about")
  const tSite = useTranslations("site.about")
  const dossier = t.raw("dossier") as DossierRow[]
  const folio = useFolioMaybe()
  const portrait = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = portrait.current?.querySelector<HTMLElement>(".portrait")
    if (!el || !window.matchMedia("(hover: none)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.developed = ""
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.dataset.developed = ""
        io.disconnect()
      },
      { threshold: IN_VIEW },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const proof = (href: string) =>
    function Proof(chunks: ReactNode) {
      if (!folio) return chunks
      return (
        <a
          href={href}
          className="underline decoration-fg-3 decoration-1 underline-offset-4 transition-colors hover:decoration-act hover:decoration-2"
        >
          {chunks}
        </a>
      )
    }
  const rich = {
    strong: (chunks: ReactNode) => <strong className="font-semibold">{chunks}</strong>,
    mash: proof("#mash-partners"),
    loyvetmitt: proof("#loyvetmitt"),
    background: proof("#background"),
  }

  return (
    // Sideways the panel is as wide as its content, and inline-size
    // containment would collapse it to nothing: the spread needs no queries.
    <div className="@container folio:h-full folio:[container-type:normal]">
      <div className="grid gap-10 @2xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] @2xl:gap-x-12 @5xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] @5xl:gap-x-20 folio:h-full folio:grid-cols-[auto_min(34rem,42vw)] folio:grid-rows-[auto_1fr] folio:content-center folio:items-start folio:gap-x-[4vw] folio:gap-y-8">
        <div ref={portrait} className="@2xl:row-span-2 folio:row-span-2">
          <Reveal
            kind="wipe"
            as="figure"
            className={cn(
              "portrait relative aspect-[4/5] w-full max-w-sm overflow-hidden bg-ground-2 folio:h-[min(36rem,calc(100svh-9rem),42vw)] folio:w-auto folio:max-w-none",
              compact && "max-w-[14rem]",
            )}
          >
            <Image
              src={LEAD}
              alt={site.ownerName}
              fill
              sizes={LEAD_SIZES}
              className="object-cover object-[50%_30%] grayscale"
            />
            <div aria-hidden className="portrait-colour absolute inset-0">
              <Image src={LEAD} alt="" fill sizes={LEAD_SIZES} className="object-cover object-[50%_30%]" />
            </div>
          </Reveal>
        </div>

        <div className="min-w-0">
          {[0, 1].map((i) => (
            <p
              key={i}
              className={cn(
                "max-w-[60ch] text-pretty",
                i === 0
                  ? "text-[clamp(1.25rem,1.8vw,1.6rem)] leading-[1.3] tracking-[-0.015em]"
                  : "mt-4 text-[17px] leading-relaxed text-fg-2",
              )}
            >
              {tSite.rich(`bio.${i}`, rich)}
            </p>
          ))}
        </div>

        <dl className="border-t border-fg @2xl:col-start-2 folio:col-start-2">
          {dossier.map((row) => (
            <div key={row.k} className="border-b border-line py-3">
              <dt className="label text-fg-3">{row.k}</dt>
              <dd className="mt-1 text-[15px] leading-snug">{row.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
