"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useGameStore } from "@/hooks/useGameStore"
import { sfx, setSfxMuted } from "@/lib/sfx"
import { getSharedVinylLoop } from "@/lib/vinylLoop"

/**
 * Plays short synthesized cues on interaction-state changes:
 *   - a soft pip when a station first comes into range
 *   - a rising chime when a panel opens
 *   - a falling chime when it closes
 * DOM-level (not inside the Canvas); honours the global audio toggle.
 */
export function InteractionSfx() {
  const openPanel = useGameStore((s) => s.openPanel)
  const canInteract = useGameStore((s) => s.canInteract)
  const audioOn = useGameStore((s) => s.audioOn)
  const vinylPlaying = useGameStore((s) => s.vinylPlaying)
  const prevOpen = useRef(openPanel)
  const prevCan = useRef(canInteract)
  const prevVinyl = useRef(vinylPlaying)
  const t = useTranslations("hud")

  useEffect(() => {
    setSfxMuted(!audioOn)
    getSharedVinylLoop().setMuted(!audioOn)
  }, [audioOn])

  // When vinyl starts while muted, show a hint so the user knows why it's silent.
  useEffect(() => {
    const justStarted = !prevVinyl.current && vinylPlaying
    prevVinyl.current = vinylPlaying
    if (justStarted && !audioOn) {
      toast(t("vinylMutedHint"), {
        icon: "🔇",
        duration: 4000,
      })
    }
  }, [vinylPlaying, audioOn, t])

  useEffect(() => {
    const was = prevOpen.current
    if (was === null && openPanel !== null) {
      if (openPanel === "borzik") sfx.squeak()
      else if (openPanel === "contact") sfx.mailLatch()
      else sfx.open()
    } else if (was !== null && openPanel === null) sfx.close()
    prevOpen.current = openPanel
  }, [openPanel])

  useEffect(() => {
    if (prevCan.current === null && canInteract !== null) sfx.available()
    prevCan.current = canInteract
  }, [canInteract])

  return null
}
