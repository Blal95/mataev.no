"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { m } from "framer-motion"
import { useTranslations } from "next-intl"
import { useGameStore } from "@/hooks/useGameStore"
import { cn } from "@/lib/cn"

// Ambient wind bed. The fireplace crackle is handled POSITIONALLY in
// <FirePit> (THREE.PositionalAudio, refDistance 6) so it swells as you walk
// toward the fire — keeping a second global fire loop here would mask that.
// Suggested CC0 source: freesound.org — search "winter wind loop".
const WIND_URL = "/audio/wind.opus"

interface Props {
  active: boolean
}

export function AudioLayer({ active }: Props) {
  const tHud = useTranslations("hud")
  const audioOn = useGameStore((s) => s.audioOn)
  const toggleAudio = useGameStore((s) => s.toggleAudio)
  const paused = useGameStore((s) => s.paused)
  const vinylPlaying = useGameStore((s) => s.vinylPlaying)
  const wind = useRef<HTMLAudioElement | null>(null)
  const [primed, setPrimed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const w = new Audio(WIND_URL)
    w.loop = true
    w.volume = 0
    w.crossOrigin = "anonymous"
    wind.current = w
    return () => {
      w.pause()
      w.src = ""
    }
  }, [])

  // Start audio after user enters cabin (first gesture). Volume eased.
  useEffect(() => {
    if (!active || !audioOn) {
      wind.current?.pause()
      return
    }
    const play = async () => {
      try {
        await wind.current?.play()
        setPrimed(true)
      } catch {
        // browser autoplay block — wait for next gesture
      }
    }
    void play()
  }, [active, audioOn])

  // Smooth wind ducking — three tiers:
  //   paused (panel open)  → 0.02 (nearly silent, UI in front)
  //   vinyl playing        → 0.03 (music takes centre stage)
  //   normal exploration   → 0.09 (ambient, not overwhelming)
  useEffect(() => {
    if (!primed) return
    const target = paused ? 0.02 : vinylPlaying ? 0.03 : 0.09
    let cancelled = false
    const start = performance.now()
    const startWindV = wind.current?.volume ?? 0
    const tick = () => {
      if (cancelled) return
      const t = Math.min(1, (performance.now() - start) / 800)
      if (wind.current)
        wind.current.volume = startWindV + (target - startWindV) * t
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => {
      cancelled = true
    }
  }, [paused, vinylPlaying, primed])

  if (!active) return null

  return (
    <m.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      onClick={(e) => {
        e.stopPropagation()
        toggleAudio()
      }}
      aria-pressed={audioOn}
      aria-label={audioOn ? tHud("audioMute") : tHud("audioUnmute")}
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto",
        "tone-night label inline-flex items-center gap-2 border bg-ground px-3 py-2 transition-colors",
        audioOn ? "border-act text-act-ink" : "border-line text-fg-2 hover:text-fg"
      )}
    >
      {audioOn ? (
        <Volume2 className="size-3" />
      ) : (
        <VolumeX className="size-3" />
      )}
      {audioOn ? tHud("audioOn") : tHud("audioOff")}
    </m.button>
  )
}
