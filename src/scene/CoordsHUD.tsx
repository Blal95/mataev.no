"use client"

import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"

const TARGET_ID = "coords-hud-readout"

/**
 * Writes camera world coords into a DOM <div> with id `TARGET_ID`, created by
 * HUD.tsx outside the Canvas. Updated every frame via direct DOM manipulation
 * — no React re-renders. Throttled to ~4 Hz to keep textContent cheap.
 */
export function CoordsHUD() {
  const { camera } = useThree()
  const lastUpdate = useRef(0)
  const elRef = useRef<HTMLElement | null>(null)

  useFrame(() => {
    const now = performance.now()
    if (now - lastUpdate.current < 250) return
    lastUpdate.current = now

    // Cache lookup — element only exists when secretMode is on
    if (!elRef.current) elRef.current = document.getElementById(TARGET_ID)
    const el = elRef.current
    if (!el) return

    const p = camera.position
    const fmt = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2)
    el.textContent = `x ${fmt(p.x)}  y ${fmt(p.y)}  z ${fmt(p.z)}`
  })

  return null
}
