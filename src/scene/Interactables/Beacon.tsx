"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"
import { NIGHT } from "../palette"

const INTENSITY = 3.2
/** How far above the aimed thing the light hangs. */
const LIFT = 1.3
/** Share of the gap the light's intensity closes per second. */
const EASE = 0.999

const at = new THREE.Vector3()

/**
 * The one light that marks what the crosshair is on. It is always there, at
 * zero when nothing is aimed at, and follows the aimed thing, so the number of
 * lights in the scene never changes: a light added and removed per station
 * made every material recompile the first time you looked at something.
 */
export function Beacon() {
  const light = useRef<THREE.PointLight>(null)

  useFrame((_, dt) => {
    const l = light.current
    if (!l) return
    const target = useGameStore.getState().interactTarget
    if (target) {
      target.getWorldPosition(at)
      l.position.set(at.x, at.y + LIFT, at.z)
    }
    const want = target ? INTENSITY : 0
    l.intensity += (want - l.intensity) * (1 - Math.pow(1 - EASE, dt))
  })

  return <pointLight ref={light} color={NIGHT.act} intensity={0} distance={4.5} decay={2} />
}
