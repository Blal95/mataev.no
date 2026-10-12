"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"

interface GroundAnchorProps {
  /** World X,Z to drop onto the ground. Y from props is ignored. */
  x: number
  z: number
  /** Additional Y offset above the snapped ground point. */
  yOffset?: number
  children: ReactNode
}

const downRay = new THREE.Raycaster()
const DOWN = new THREE.Vector3(0, -1, 0)

/**
 * Wraps children at the ground level under (x, z). Raycasts straight down
 * from y=50 and finds the first solid mesh hit (snow, cabin floor, terrain).
 * Falls back to y=0 if nothing is below.
 *
 * Useful for static decorations (fire pit, skill tree, reindeer) that need
 * to sit on the GLB's snow surface without hardcoded heights.
 */
export function GroundAnchor({
  x,
  z,
  yOffset = 0,
  children,
}: GroundAnchorProps) {
  const { scene } = useThree()
  const [groundY, setGroundY] = useState<number | null>(null)
  const attempts = useRef(0)

  useEffect(() => {
    let cancelled = false
    const find = () => {
      if (cancelled) return
      attempts.current++
      downRay.set(new THREE.Vector3(x, 50, z), DOWN)
      downRay.far = 200
      const hits = downRay.intersectObjects(scene.children, true)
      const hit = hits.find((h) => {
        const m = h.object as THREE.Mesh
        return (
          m.isMesh &&
          !(m.material as THREE.Material)?.transparent &&
          m.visible
        )
      })
      if (hit) {
        setGroundY(hit.point.y)
        return
      }
      // GLB may still be loading — retry up to 30 frames.
      if (attempts.current < 30) {
        requestAnimationFrame(find)
      } else {
        setGroundY(0)
      }
    }
    requestAnimationFrame(find)
    return () => {
      cancelled = true
    }
  }, [x, z, scene])

  if (groundY === null) return null
  return <group position={[x, groundY + yOffset, z]}>{children}</group>
}
