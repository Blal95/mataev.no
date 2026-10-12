"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useTranslations } from "next-intl"
import * as THREE from "three"
import { Interactable } from "./Interactable"
import { STATION_POSITIONS } from "@/config/stations"
import { getLaptopScreenTexture, getKeyboardTexture } from "./textures"
import { useGameStore } from "@/hooks/useGameStore"

interface WorkbenchStationProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

// Lid hinge angle (radians) about the back edge. The lid panel is built
// standing UP from the hinge (screen facing the player at angle 0).
//   CLOSED = +90° → folded flat forward onto the keyboard.
//   OPEN   = slight negative → upright, reclined a touch back. Right-side up.
const LID_CLOSED = Math.PI / 2
const LID_OPEN = -0.18

export function WorkbenchStation({
  worldPosition,
  worldRotation,
}: WorkbenchStationProps = {}) {
  const t = useTranslations("prompt")
  const screenTex = getLaptopScreenTexture()
  const keyboardTex = getKeyboardTexture()
  const openPanel = useGameStore((s) => s.openPanel)
  const lidRef = useRef<THREE.Group>(null)
  const deckMatRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((_, dt) => {
    if (!lidRef.current) return
    const target = openPanel === "projects" ? LID_OPEN : LID_CLOSED
    const cur = lidRef.current.rotation.x
    const next = cur + (target - cur) * Math.min(1, dt * 6)
    lidRef.current.rotation.x =
      Math.abs(target - next) < 0.001 ? target : next

    // Keyboard backlight follows how far the lid has opened (0 closed → 1
    // upright), so the keys glow on as the laptop wakes.
    if (deckMatRef.current) {
      const openProgress = THREE.MathUtils.clamp(
        (LID_CLOSED - next) / (LID_CLOSED - LID_OPEN),
        0,
        1,
      )
      deckMatRef.current.emissiveIntensity = openProgress * 0.5
    }
  })

  return (
    <Interactable
      id="projects"
      position={STATION_POSITIONS.workbench}
      worldPosition={worldPosition}
      worldRotation={worldRotation}
      radius={2.4}
      label={t("laptop")}
    >
      {/* Shelter posts (4 corners) */}
      {[
        [-1.4, 0, -0.9],
        [1.4, 0, -0.9],
        [-1.4, 0, 0.9],
        [1.4, 0, 0.9],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], 1.4, p[2]]} castShadow>
          <boxGeometry args={[0.1, 2.8, 0.1]} />
          <meshStandardMaterial color="#2a1f17" roughness={0.95} />
        </mesh>
      ))}

      {/* Slanted snow-roof */}
      <mesh position={[0, 2.9, 0]} rotation={[-0.18, 0, 0]} castShadow>
        <boxGeometry args={[3.2, 0.08, 2.4]} />
        <meshStandardMaterial color="#E8EDF5" roughness={0.85} />
      </mesh>

      {/* Workbench slab */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[2.2, 0.08, 1.1]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.85} />
      </mesh>
      {/* Bench legs */}
      {[
        [-1, 0.4, -0.5],
        [1, 0.4, -0.5],
        [-1, 0.4, 0.5],
        [1, 0.4, 0.5],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.08, 0.8, 0.08]} />
          <meshStandardMaterial color="#2a1f17" roughness={0.95} />
        </mesh>
      ))}

      {/* Laptop base (MacBook silver) */}
      <mesh position={[0, 0.91, 0]} castShadow>
        <boxGeometry args={[0.9, 0.03, 0.62]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Keyboard + trackpad deck (procedural texture). Lies flat on the
          base; its keys backlight as the lid opens (emissive lerp above). */}
      <mesh position={[0, 0.927, 0.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.86, 0.58]} />
        <meshStandardMaterial
          ref={deckMatRef}
          map={keyboardTex}
          emissiveMap={keyboardTex}
          emissive="#bfe6ff"
          emissiveIntensity={0}
          roughness={0.6}
        />
      </mesh>

      {/* Hinged lid: hinge group at the back edge of the base (z = -0.31).
          The panel hangs UP from the hinge (child centered at y = +0.31),
          so lidRef.rotation.x = 0 stands it upright facing the player and
          +90° folds it flat forward onto the keyboard (closed). */}
      <group ref={lidRef} position={[0, 0.94, -0.31]}>
        <group position={[0, 0.31, 0]}>
          {/* Lid back (aluminium) */}
          <mesh position={[0, 0, -0.011]} castShadow>
            <boxGeometry args={[0.9, 0.62, 0.02]} />
            <meshStandardMaterial
              color="#c9ccd1"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Screen (faces +z / the player when open) */}
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[0.82, 0.54]} />
            <meshBasicMaterial map={screenTex} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* Lantern */}
      <mesh position={[1.3, 2.4, 0.85]}>
        <boxGeometry args={[0.18, 0.22, 0.18]} />
        <meshStandardMaterial
          color="#F4A261"
          emissive="#F4A261"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[1.3, 2.4, 0.85]}
        color="#F4A261"
        intensity={0.8}
        distance={3}
        decay={2}
      />

      {/* Steaming coffee mug */}
      <mesh position={[0.78, 0.95, 0.3]} castShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.13, 16]} />
        <meshStandardMaterial color="#E8EDF5" roughness={0.7} />
      </mesh>
    </Interactable>
  )
}
