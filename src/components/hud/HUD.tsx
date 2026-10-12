"use client"

import { useEffect, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useGameStore, TRACKED_STATIONS } from "@/hooks/useGameStore"
import { useRouter } from "@/i18n/navigation"
import { AnimatePresence, m } from "framer-motion"
import { Info, MapPin, X } from "lucide-react"
import type { PanelId } from "@/hooks/useGameStore"
import { cn } from "@/lib/cn"
import { Reticle } from "./Reticle"

/** The HUD's chips: the night tone's paper square, the site's micro-label.
 *  Solid, never blurred: a blur behind each chip is re-drawn every frame the
 *  world moves under it. */
const CHIP = "tone-night label border bg-ground"

// Short bilingual labels for the wind guidance chip.
// Kept here (not i18n) because they're supplementary nav info, not content.
const WIND_LABEL: Partial<Record<NonNullable<PanelId>, { nb: string; en: string }>> = {
  contact:   { nb: "Postkassa",    en: "Mailbox" },
  projects:  { nb: "Arbeidsbenk", en: "Workbench" },
  education: { nb: "Steinrøysa",  en: "Cairn" },
  about:     { nb: "Bildeveggen", en: "Photo wall" },
  record:    { nb: "Platespiller",en: "Vinyl" },
  borzik:    { nb: "Borzik",      en: "Borzik" },
  books:     { nb: "Bokhylla",    en: "Bookshelf" },
  gallery:   { nb: "Galleri",     en: "Gallery" },
  heritage:  { nb: "Arvesteiner", en: "Heritage" },
}

export function HUD() {
  const t = useTranslations("hud")
  const locale = useLocale()
  const router = useRouter()
  const paused = useGameStore((s) => s.paused)
  const toggleAudio = useGameStore((s) => s.toggleAudio)
  const secretMode = useGameStore((s) => s.secretMode)
  const visitedCount = useGameStore((s) => s.visitedStations.length)
  const totalStations = TRACKED_STATIONS.length
  const allFound = visitedCount >= totalStations
  const guidedStation = useGameStore((s) => s.guidedStation)
  const setGuidedStation = useGameStore((s) => s.setGuidedStation)
  const otherLocale = locale === "nb" ? "en" : "nb"

  // Controls start expanded, then quietly tuck away so the cabin can breathe
  // ("atmospheric, never busy"). Click the "i" — or press H — to bring them
  // back. The keyboard path matters: while pointer-lock is engaged the cursor
  // is captured, so DOM clicks can't land; H always works.
  const [controlsOpen, setControlsOpen] = useState(true)
  useEffect(() => {
    // Linger longer on a first visit so newcomers can actually read the
    // controls; returning visitors (signpost already seen) get the quick tuck.
    const firstVisit = !useGameStore.getState().signpostSeen
    const id = setTimeout(() => setControlsOpen(false), firstVisit ? 12000 : 6000)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyH" || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      if (typing) return
      setControlsOpen((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // O leaves the 3D cabin for the 2D list view. M mutes/unmutes audio.
  // Both ignored while typing in a field (chat / contact form).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code !== "KeyO" && e.code !== "KeyM") return
      const el = document.activeElement
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      if (typing) return
      if (e.code === "KeyO") router.push("/")
      else toggleAudio()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router, toggleAudio])

  if (paused) return null

  return (
    <>
      <Reticle />

      {/* Toggle stays pinned dead-center at the top; the controls panel drops
          BELOW it (opacity+slide, never a width/reflow animation) so the "i"
          never shifts when it opens or closes. */}
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none fixed top-4 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setControlsOpen((v) => !v)}
          aria-expanded={controlsOpen}
          aria-label={controlsOpen ? t("close") : t("help")}
          className={cn(CHIP, "pointer-events-auto grid size-9 shrink-0 place-items-center border-line text-fg-2 transition-colors hover:border-fg-3 hover:text-fg")}
        >
          {controlsOpen ? <X className="size-3.5" /> : <Info className="size-4" />}
        </button>

        <AnimatePresence initial={false}>
          {controlsOpen && (
            <m.div
              key="controls"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={cn(CHIP, "pointer-events-auto flex max-w-[92vw] flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-line px-3 py-2 text-fg-2")}
            >
              <Key label="WASD" /> {t("move")}
              <Dot />
              <Key label="E" /> {t("interact")}
              <Dot />
              <Key label="Shift" /> {t("run")}
              <Dot />
              <Key label="Space" /> {t("jump")}
              <Dot />
              <Key label="L" /> {otherLocale.toUpperCase()}
              <Dot />
              <Key label="O" /> 2D
              <Dot />
              <Key label="M" /> {t("mute")}
              <Dot />
              <Key label="Esc" /> {t("close")}
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="fixed top-4 right-4 z-10 flex flex-col items-end gap-1.5 pointer-events-auto"
      >
        {/* Discovery progress — a quiet completion nudge, not a quest log. Only
            appears once the player has opened their first station, so the camp
            reads calm on arrival. Turns amber once everything's been found. */}
        <AnimatePresence>
          {visitedCount > 0 && (
            <m.div
              key="discovery"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                CHIP,
                "inline-flex items-center gap-2 px-3 py-2",
                allFound ? "border-act text-act-ink" : "border-line text-fg-2",
              )}
            >
              <MapPin className="size-3" />
              {allFound ? (
                t("allFound")
              ) : (
                <span>
                  <span className="text-fg">{visitedCount}</span>/
                  {totalStations} {t("discovered")}
                </span>
              )}
            </m.div>
          )}
        </AnimatePresence>
        {/* Wind guidance chip — ember flame icon + destination + cancel.
            Breathes with an amber glow on the border. No generic icons. */}
        <AnimatePresence>
          {guidedStation ? (
            <WindChip
              key="wind-guide"
              label={WIND_LABEL[guidedStation]?.[locale === "nb" ? "nb" : "en"] ?? guidedStation}
              locale={locale}
              onCancel={() => setGuidedStation(null)}
              cancelLabel={t("windCancel")}
            />
          ) : null}
        </AnimatePresence>
        {/* Raw world coords — a dev/owner readout, not visitor-facing.
            Gated behind secretMode (Konami) so the camp stays uncluttered. */}
        {secretMode && (
          <div
            id="coords-hud-readout"
            className={cn(CHIP, "border-line px-3 py-2 text-act-ink")}
          >
            x +0.00  y +0.00  z +0.00
          </div>
        )}
      </m.div>
    </>
  )
}

function Key({ label }: { label: string }) {
  return (
    <kbd className="border border-line px-1.5 py-0.5 leading-none text-fg">
      {label}
    </kbd>
  )
}

function Dot() {
  return <span className="mx-1 text-fg-3">·</span>
}

function WindChip({
  label,
  locale,
  onCancel,
  cancelLabel,
}: {
  label: string
  locale: string
  onCancel: () => void
  cancelLabel: string
}) {
  return (
    <m.div
      key="wind-guide"
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(CHIP, "flex items-center gap-2.5 border-act py-1.5 pl-3 pr-1.5")}
    >
      {/* Tiny CSS wind glyph — drifting aurora lines, no SVG */}
      <span aria-hidden className="wind-glyph" />

      <span className="flex items-baseline gap-1.5">
        <span className="text-fg-3">
          {locale === "nb" ? "mot" : "to"}
        </span>
        <span className="text-act-ink">
          {label}
        </span>
      </span>

      <span aria-hidden className="h-3 w-px shrink-0 bg-line" />

      <button
        type="button"
        onClick={onCancel}
        aria-label={cancelLabel}
        className="grid size-7 place-items-center text-fg-3 transition-colors hover:text-fg"
      >
        <X className="size-3" />
      </button>
    </m.div>
  )
}
