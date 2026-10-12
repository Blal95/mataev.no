"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"

export function Lighting() {
  const moon = useRef<THREE.DirectionalLight>(null)
  const secretMode = useGameStore((s) => s.secretMode)
  const frame = useRef(0)

  useFrame((state) => {
    if (!moon.current) return
    // Update at ~2 Hz — full orbit is 10 min, no need for per-frame work
    frame.current = (frame.current + 1) % 30
    if (frame.current !== 0) return

    const t = state.clock.elapsedTime * ((Math.PI * 2) / 600)
    const radius = 16
    moon.current.position.set(Math.cos(t) * radius, 14, Math.sin(t) * radius)
  })

  return (
    <>
      <ambientLight
        intensity={secretMode ? 0.85 : 0.6}
        color={secretMode ? "#ffd9a8" : "#a8b8d4"}
      />
      <hemisphereLight
        args={[
          secretMode ? "#ffd9a8" : "#b0c4de",
          secretMode ? "#5a3820" : "#3a2820",
          0.75,
        ]}
      />
      <directionalLight
        ref={moon}
        position={[8, 14, 6]}
        intensity={0.65}
        color={secretMode ? "#ffd9a8" : "#aac0e4"}
      />
      <pointLight
        position={[5, 1.6, 3]}
        intensity={secretMode ? 2.6 : 1.8}
        color={secretMode ? "#f4a261" : "#5bc0eb"}
        distance={6}
        decay={2}
      />
    </>
  )
}
