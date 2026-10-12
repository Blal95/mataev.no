"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { NIGHT } from "../palette"

interface ChimneySmokeProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  count?: number
}

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function ChimneySmoke({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  count = 12,
}: ChimneySmokeProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        offset: (i / count) * 6,
        // Deterministic sway in [-1, 1] derived from index — keeps the
        // useMemo pure (Math.random would violate react-hooks/purity).
        sway: (((i * 0.6180339887) % 1) * 2) - 1,
      })),
    [count]
  )

  const writeInstances = (t: number) => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      const s = seeds[i]
      const tt = (t + s.offset) % 6
      const y = tt * 0.5
      const x = Math.sin(tt * 1.2 + s.sway) * 0.15
      const scale = 0.15 + tt * 0.08
      const opacity = Math.max(0, 1 - tt / 6)
      dummy.position.set(x, y, 0)
      dummy.scale.setScalar(scale * (opacity > 0.05 ? 1 : 0))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }

  useEffect(() => {
    if (REDUCED_MOTION) writeInstances(0)
  })

  useFrame((state) => {
    if (REDUCED_MOTION) return
    writeInstances(state.clock.elapsedTime)
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      position={position}
      rotation={rotation}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 12, 8]} />
      {/* Faint, in the night's own line colour: a dark 35% column read as a
          ghost standing over the fire. */}
      <meshBasicMaterial
        color={NIGHT.line}
        transparent
        opacity={0.14}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
