"use client"

import { useMemo } from "react"
import * as THREE from "three"

interface WindowGlowProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  size?: [number, number]
}

export function WindowGlow({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [0.8, 1.0],
}: WindowGlowProps) {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#f4a261",
        transparent: true,
        opacity: 0.65,
        toneMapped: false,
      }),
    []
  )
  return (
    <group position={position} rotation={rotation}>
      <mesh material={mat}>
        <planeGeometry args={size} />
      </mesh>
      {/* Subtle inward warm light to bleed onto nearby snow */}
      <pointLight
        color="#f4a261"
        intensity={1.2}
        distance={4.5}
        decay={2}
        position={[0, 0, 0.2]}
      />
    </group>
  )
}
