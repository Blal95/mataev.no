"use client"

import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

interface Props {
  position?: [number, number, number]
}

/**
 * Curled sleeping cat near the fireplace. Animation only runs when the player
 * is within ~8 world units (gated to save per-frame work elsewhere).
 */
export function Cat({ position = [-0.4, 0.05, -1.6] }: Props) {
  const head = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  const tmp = useRef(new THREE.Vector3())
  const headT = useRef(0)
  const distSkip = useRef(0)
  const cachedDist = useRef(99)
  const visible = useRef(false)

  useFrame((state) => {
    if (!head.current || !tail.current) return

    // Distance check throttled to ~6 Hz
    distSkip.current = (distSkip.current + 1) % 10
    if (distSkip.current === 0) {
      tmp.current.set(...position)
      cachedDist.current = tmp.current.distanceTo(camera.position)
      visible.current = cachedDist.current < 8
    }

    if (!visible.current) return

    const aware = cachedDist.current < 4
    const headTarget = aware ? 0.25 : 0
    headT.current += (headTarget - headT.current) * 0.06
    head.current.rotation.z = headT.current

    const swayAmp = aware ? 0.5 : 0.12
    tail.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * swayAmp
  })

  return (
    <group position={position}>
      <mesh scale={[0.4, 0.18, 0.28]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.85} />
      </mesh>
      <group ref={head} position={[0.3, 0.04, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.13, 12, 8]} />
          <meshStandardMaterial color="#3a2a1d" roughness={0.85} />
        </mesh>
        <mesh position={[0.05, 0.1, -0.06]} rotation={[0, 0, 0.5]} castShadow>
          <coneGeometry args={[0.04, 0.08, 6]} />
          <meshStandardMaterial color="#2a1f17" roughness={0.85} />
        </mesh>
        <mesh position={[0.05, 0.1, 0.06]} rotation={[0, 0, 0.5]} castShadow>
          <coneGeometry args={[0.04, 0.08, 6]} />
          <meshStandardMaterial color="#2a1f17" roughness={0.85} />
        </mesh>
        <mesh position={[0.11, 0.02, -0.04]}>
          <sphereGeometry args={[0.012, 4, 4]} />
          <meshBasicMaterial color="#0a0f1c" />
        </mesh>
        <mesh position={[0.11, 0.02, 0.04]}>
          <sphereGeometry args={[0.012, 4, 4]} />
          <meshBasicMaterial color="#0a0f1c" />
        </mesh>
      </group>
      <mesh ref={tail} position={[-0.32, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.04, 0.5, 6]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.85} />
      </mesh>
    </group>
  )
}
