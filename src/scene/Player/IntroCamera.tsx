"use client"

import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"

// Three-keyframe sweep: high vantage south of the clearing, glide over the
// fire pit at origin, land at the player spawn (eye-level) facing -Z.
type Keyframe = {
  pos: [number, number, number]
  look: [number, number, number]
}

const KEYFRAMES: Keyframe[] = [
  // 0 — high east vantage, looking at the camp fire (~(21.7, 5.05, 5.79))
  { pos: [34, 22, 18], look: [21.7, 5.05, 5.79] },
  // 1 — glide in over the spawn approach
  { pos: [28, 11, 12], look: [21.7, 5.05, 5.79] },
  // 2 — arrive at the actual standing eye pose. Y matches the player's
  // post-spawn eye height (ground ≈ 3.9 + spawn offset + eye), so the
  // hand-off to controls is seamless — you feel already spawned in.
  { pos: [24.3, 6.4, 7.57], look: [21.7, 5.05, 5.79] },
]

const DURATION = 3.4

export function IntroCamera() {
  const introPlaying = useGameStore((s) => s.introPlaying)
  const setIntroPlaying = useGameStore((s) => s.setIntroPlaying)
  const { camera } = useThree()

  const startTime = useRef<number | null>(null)
  const tmpPosA = useRef(new THREE.Vector3())
  const tmpPosB = useRef(new THREE.Vector3())
  const tmpLookA = useRef(new THREE.Vector3())
  const tmpLookB = useRef(new THREE.Vector3())
  const tmpLook = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!introPlaying) return

    // Respect prefers-reduced-motion: snap directly to final pose and finish.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      const last = KEYFRAMES[KEYFRAMES.length - 1]
      camera.position.set(...last.pos)
      camera.lookAt(...last.look)
      setIntroPlaying(false)
      startTime.current = null
      return
    }

    startTime.current = performance.now()
    const first = KEYFRAMES[0]
    camera.position.set(...first.pos)
    camera.lookAt(...first.look)
  }, [introPlaying, camera, setIntroPlaying])

  useFrame(() => {
    if (!introPlaying || startTime.current == null) return

    const elapsed = (performance.now() - startTime.current) / 1000
    const t = Math.min(1, elapsed / DURATION)
    const eased = 1 - Math.pow(1 - t, 3)

    // Map eased [0,1] into the keyframe segments.
    const segments = KEYFRAMES.length - 1
    const scaled = eased * segments
    const segIndex = Math.min(segments - 1, Math.floor(scaled))
    const segT = scaled - segIndex
    const from = KEYFRAMES[segIndex]
    const to = KEYFRAMES[segIndex + 1]

    tmpPosA.current.set(...from.pos)
    tmpPosB.current.set(...to.pos)
    camera.position.lerpVectors(tmpPosA.current, tmpPosB.current, segT)

    tmpLookA.current.set(...from.look)
    tmpLookB.current.set(...to.look)
    tmpLook.current.lerpVectors(tmpLookA.current, tmpLookB.current, segT)
    camera.lookAt(tmpLook.current)

    if (t >= 1) {
      setIntroPlaying(false)
      startTime.current = null
    }
  })

  return null
}
