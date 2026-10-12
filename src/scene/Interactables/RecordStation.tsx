"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useTranslations } from "next-intl"
import * as THREE from "three"
import { Interactable } from "./Interactable"
import { useGameStore } from "@/hooks/useGameStore"

interface RecordStationProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

// Tonearm rest (parked off the disc) vs engaged (needle over the groove).
const ARM_REST = 0.6
const ARM_ENGAGED = 0.12

/**
 * Outdoor record player on a wooden crate. Pressing [E] toggles the generative
 * "vinyl" loop directly — no panel, no pause. The disc spins, the tonearm
 * drops onto the groove, and the amber label glows while it plays, so the
 * music has an in-world body instead of a menu.
 */
export function RecordStation({
  worldPosition,
  worldRotation,
}: RecordStationProps = {}) {
  const t = useTranslations("prompt")
  const playing = useGameStore((s) => s.vinylPlaying)

  const discRef = useRef<THREE.Group>(null)
  const tonearmRef = useRef<THREE.Group>(null)
  const labelMat = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const on = useGameStore.getState().vinylPlaying

    // Spin the platter while playing; ease to a stop when paused.
    if (discRef.current) {
      const spin = on ? 2.6 : 0
      discRef.current.rotation.y += spin * dt
    }
    // Swing the tonearm in/out.
    if (tonearmRef.current) {
      const target = on ? ARM_ENGAGED : ARM_REST
      tonearmRef.current.rotation.y = THREE.MathUtils.damp(
        tonearmRef.current.rotation.y,
        target,
        6,
        dt,
      )
    }
    // Pulse the amber label glow while playing.
    if (labelMat.current) {
      const tgt = on ? 0.9 + Math.sin(performance.now() * 0.004) * 0.25 : 0.35
      labelMat.current.emissiveIntensity = THREE.MathUtils.damp(
        labelMat.current.emissiveIntensity,
        tgt,
        8,
        dt,
      )
    }
  })

  return (
    <Interactable
      id="record"
      position={[0, 0, 0]}
      worldPosition={worldPosition}
      worldRotation={worldRotation}
      radius={2.2}
      label={playing ? t("recordStop") : t("recordPlay")}
      labelHeight={1.4}
    >
      {/* Crate top */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.5]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.85} />
      </mesh>
      {/* Legs */}
      {[
        [-0.3, 0.2, -0.2],
        [0.3, 0.2, -0.2],
        [-0.3, 0.2, 0.2],
        [0.3, 0.2, 0.2],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
          <meshStandardMaterial color="#2a1f17" roughness={0.95} />
        </mesh>
      ))}
      {/* Turntable plinth */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[0.55, 0.06, 0.42]} />
        <meshStandardMaterial color="#1b2236" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Spinning platter: disc + amber label rotate together */}
      <group ref={discRef} position={[0, 0.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.012, 32]} />
          <meshStandardMaterial color="#0a0f1c" roughness={0.4} />
        </mesh>
        {/* Amber centre label (offset dot so the spin is legible) */}
        <mesh position={[0, 0.007, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.012, 24]} />
          <meshStandardMaterial
            ref={labelMat}
            color="#F4A261"
            emissive="#F4A261"
            emissiveIntensity={0.35}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.035, 0.014, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.012, 12]} />
          <meshStandardMaterial color="#0a0f1c" roughness={0.6} />
        </mesh>
      </group>

      {/* Tonearm pivots from the back-right corner */}
      <group ref={tonearmRef} position={[0.22, 0.5, -0.16]} rotation={[0, ARM_REST, 0]}>
        <mesh position={[0, 0, 0.11]} castShadow>
          <boxGeometry args={[0.02, 0.02, 0.22]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Headshell tip */}
        <mesh position={[0, -0.01, 0.22]}>
          <boxGeometry args={[0.03, 0.02, 0.03]} />
          <meshStandardMaterial color="#1b2236" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
    </Interactable>
  )
}
