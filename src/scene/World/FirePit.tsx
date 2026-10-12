"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { RigidBody, CylinderCollider } from "@react-three/rapier"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"
import { Embers } from "./Embers"
import { Flame } from "./Flame"

interface FirePitProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** "off" → static light, "throttled" → 12 Hz flicker, "full" → per-frame. */
  flicker?: "off" | "throttled" | "full"
}

// Reduced-motion media query — read once at module scope to avoid
// re-running matchMedia per render.
const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function FirePit({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  flicker = "full",
}: FirePitProps) {
  const flickerInterval = flicker === "throttled" ? 1 / 12 : 0
  const lastFlicker = useRef(0)
  const audioOn = useGameStore((s) => s.audioOn)
  const lightRef = useRef<THREE.PointLight>(null)
  const audioAnchor = useRef<THREE.Group>(null)
  const { camera } = useThree()

  // Imperatively mount THREE.PositionalAudio after first user gesture.
  // Drei's <PositionalAudio> uses useLoader -> useProgress -> setState
  // during render, which trips React 19's setState-in-render guard.
  useEffect(() => {
    if (!audioOn) return
    let positional: THREE.PositionalAudio | null = null
    let listener: THREE.AudioListener | null = null
    let cancelled = false

    const start = () => {
      if (cancelled || !audioAnchor.current) return
      listener = new THREE.AudioListener()
      camera.add(listener)
      positional = new THREE.PositionalAudio(listener)
      const loader = new THREE.AudioLoader()
      loader.load(
        "/audio/fireplace.opus",
        (buffer) => {
          if (cancelled || !positional) return
          positional.setBuffer(buffer)
          positional.setRefDistance(6)
          positional.setLoop(true)
          positional.setVolume(0.38)
          try {
            positional.play()
            audioAnchor.current?.add(positional)
          } catch {
            // browser autoplay/context block — no-op, ambient wind still plays
          }
        },
        undefined,
        () => {
          // Audio asset missing — silently no-op.
        }
      )
    }

    window.addEventListener("pointerdown", start, { once: true })
    window.addEventListener("keydown", start, { once: true })

    return () => {
      cancelled = true
      window.removeEventListener("pointerdown", start)
      window.removeEventListener("keydown", start)
      if (positional) {
        positional.stop()
        positional.disconnect()
        audioAnchor.current?.remove(positional)
      }
      if (listener) {
        camera.remove(listener)
      }
    }
  }, [audioOn, camera])

  // Pre-built log layout (3 logs crossing each other).
  const logs = useMemo(
    () => [
      { rot: [0, 0, Math.PI / 2], pos: [-0.05, 0.05, 0] as [number, number, number] },
      { rot: [0, Math.PI / 3, Math.PI / 2], pos: [0, 0.05, 0.05] as [number, number, number] },
      { rot: [0, -Math.PI / 3, Math.PI / 2], pos: [0.05, 0.05, -0.05] as [number, number, number] },
    ],
    []
  )

  // Ring of 6 stones around the pit.
  const stones = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2
        return {
          pos: [Math.cos(a) * 0.55, 0.07, Math.sin(a) * 0.55] as [
            number,
            number,
            number,
          ],
          scale: 0.18 + (i % 3) * 0.04,
        }
      }),
    []
  )

  useFrame((state) => {
    if (REDUCED_MOTION || flicker === "off") return
    const t = state.clock.elapsedTime
    if (flickerInterval > 0) {
      if (t - lastFlicker.current < flickerInterval) return
      lastFlicker.current = t
    }
    if (lightRef.current) {
      // Warm flicker: base 3 + 0.6 * sin + 0.3 * noise.
      const noise = Math.sin(t * 17.3) * 0.5 + Math.sin(t * 7.1) * 0.5
      lightRef.current.intensity = 3 + Math.sin(t * 6) * 0.6 + noise * 0.3
    }
  })

  return (
    <group position={position} rotation={rotation}>
      {/* Stone ring */}
      {stones.map((s, i) => (
        <mesh key={i} position={s.pos} castShadow>
          <dodecahedronGeometry args={[s.scale, 0]} />
          <meshStandardMaterial color="#3a3a40" roughness={0.95} />
        </mesh>
      ))}

      {/* Logs */}
      {logs.map((l, i) => (
        <mesh
          key={i}
          position={l.pos}
          rotation={l.rot as [number, number, number]}
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
          <meshStandardMaterial color="#2b1e15" roughness={0.95} />
        </mesh>
      ))}

      {/* The flame, and the embers it sends up toward the aurora. */}
      <Flame still={REDUCED_MOTION} />
      {!REDUCED_MOTION && (
        <group position={[0, 0.35, 0]}>
          <Embers />
        </group>
      )}

      {/* Warm flickering light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.4, 0]}
        color="#F4A261"
        intensity={3}
        distance={10}
        decay={2}
        castShadow={false}
      />

      {/* Crackle audio anchor — THREE.PositionalAudio attached imperatively
          in useEffect to avoid drei's useLoader/setState-in-render path. */}
      <group ref={audioAnchor} />

      {/* Player can't walk through the fire */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.5, 0.7]} position={[0, 0.5, 0]} />
      </RigidBody>
    </group>
  )
}
