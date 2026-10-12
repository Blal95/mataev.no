"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useTranslations } from "next-intl"
import { RigidBody, CuboidCollider } from "@react-three/rapier"
import * as THREE from "three"
import { Interactable } from "./Interactable"
import { STATION_POSITIONS } from "@/config/stations"
import { useGameStore } from "@/hooks/useGameStore"

interface MailboxStationProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

// Signal flag: lowered against the box by default, swings up once a message
// has been sent (rotation about Z, pivoting at the mailbox side).
const FLAG_DOWN = -1.45
const FLAG_UP = 0.05

export function MailboxStation({
  worldPosition,
  worldRotation,
}: MailboxStationProps = {}) {
  const t = useTranslations("prompt")
  const flagRef = useRef<THREE.Group>(null)

  useFrame((_, rawDt) => {
    if (!flagRef.current) return
    const target = useGameStore.getState().contactSent ? FLAG_UP : FLAG_DOWN
    flagRef.current.rotation.z = THREE.MathUtils.damp(
      flagRef.current.rotation.z,
      target,
      7,
      Math.min(rawDt, 0.05),
    )
  })

  return (
    <Interactable
      id="contact"
      position={STATION_POSITIONS.mailbox}
      worldPosition={worldPosition}
      worldRotation={worldRotation}
      radius={2.2}
      label={t("mailbox")}
      labelHeight={2.3}
    >
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.3, 0.8, 0.3]} position={[0, 0.8, 0]} />
      </RigidBody>
      {/* Norwegian-red mailbox on a wooden post */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[0.5, 0.32, 0.32]} />
        <meshStandardMaterial color="#c83e3e" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.4, 0.165]} castShadow>
        <boxGeometry args={[0.46, 0.28, 0.005]} />
        <meshStandardMaterial color="#E8EDF5" roughness={0.4} />
      </mesh>

      {/* Signal flag — pivots up from the right side when a message is sent */}
      <group ref={flagRef} position={[0.26, 1.3, 0]} rotation={[0, 0, FLAG_DOWN]}>
        {/* Arm */}
        <mesh position={[0, 0.11, 0]} castShadow>
          <boxGeometry args={[0.016, 0.22, 0.016]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Flag panel */}
        <mesh position={[0.06, 0.17, 0]} castShadow>
          <boxGeometry args={[0.11, 0.09, 0.006]} />
          <meshStandardMaterial color="#c83e3e" roughness={0.6} />
        </mesh>
      </group>

      {/* Post */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.08, 1.4, 0.08]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.95} />
      </mesh>
    </Interactable>
  )
}
