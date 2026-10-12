"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { Pose } from "@/config/borzik"
import { useCabinGate } from "@/hooks/useCabinGate"
import { Link } from "@/i18n/navigation"
import { useFolio, useScrub } from "./Folio"
import { InkArt } from "./InkArt"
import { Panel } from "./Panel"

const DOOR_POSE: Pose = "door"
/** The window's size before it opens, as a share of the screen. */
const SHUT = { x: 0.24, y: 0.4 }
/** How far into the pan the window starts to open. */
const OPEN_FROM = 0.2
/** It opens in fiftieths, so the width axis is written only when it moves. */
const STEPS = 50
/** The panel takes the cabin's night only once the window covers the chrome. */
const NIGHT_AT = 0.97

/**
 * The folio's last panel, after Contact: a window of the cabin's night in the
 * paper, opening to full bleed as you pan into it, with Borzik holding the
 * door and one button in. The recruiter's road ends at Contact before it, so
 * this is an invitation, never a gate. Sideways only, and only for a browser
 * that can walk around the cabin: everywhere else there is no door.
 *
 * The window is scaled and the room inside counter-scaled, so the room stays
 * put while the window opens: composited, with no clip redrawn every frame.
 */
export function CabinDoor() {
  const { mode } = useFolio()
  const { canEnter } = useCabinGate()
  return mode === "h" && canEnter ? <Door /> : null
}

// Its own component, so the scrub registers when the door arrives: the gate
// only answers after load.
function Door() {
  const t = useTranslations("site.door")
  const root = useRef<HTMLDivElement>(null)
  const win = useRef<HTMLDivElement>(null)
  const word = useRef<HTMLHeadingElement>(null)

  useScrub(
    () => root.current?.closest("[data-panel]"),
    "enter",
    (p, g) => {
      const w = win.current
      const h = word.current
      const panel = root.current?.closest<HTMLElement>("[data-panel]")
      if (!w || !h || !panel) return
      const open = g ? Math.round(Math.min(1, Math.max(0, (p - OPEN_FROM) / (1 - OPEN_FROM))) * STEPS) / STEPS : 1
      w.style.setProperty("--sx", (SHUT.x + (1 - SHUT.x) * open).toFixed(3))
      w.style.setProperty("--sy", (SHUT.y + (1 - SHUT.y) * open).toFixed(3))
      h.style.setProperty("--wdth", `${Math.round(62 + 50 * open)}%`)
      const tone = open >= NIGHT_AT ? "night" : "day"
      if (panel.dataset.tone !== tone) panel.dataset.tone = tone
    },
  )

  return (
    <Panel id="cabin" labelledBy="cabin-title" arrives="night" className="folio:w-screen">
      <div ref={root} className="relative h-full">
        <div ref={win} className="door-window tone-night bg-ground text-fg">
          <div className="door-inner grid place-items-center">
            <div className="flex flex-col items-center gap-8">
              <InkArt pose={DOOR_POSE} className="w-[min(18rem,32svh)]" />
              <h2
                id="cabin-title"
                ref={word}
                className="display door-word text-[length:clamp(4rem,min(9vw,16svh),9rem)]"
              >
                {t("title")}
              </h2>
              <Button asChild size="lg">
                <Link href="/cabin" prefetch={false}>
                  {t("enter")}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
