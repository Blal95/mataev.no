"use client"

import { RigidBody } from "@react-three/rapier"
import { DoubleSide } from "three"

const WOOD = "#3a2a1d"
const WOOD_LIGHT = "#5a3f2a"
const FLOOR = "#1f1611"

type BoxProps = {
  position: [number, number, number]
  args: [number, number, number]
  color: string
}

export function Hytte() {
  return (
    <>
      <SolidBox position={[0, -0.05, 0]} args={[14, 0.1, 14]} color={FLOOR} />
      <SolidBox position={[0, 4, 0]} args={[14, 0.1, 14]} color={WOOD} />

      <SolidBox position={[0, 2, -7]} args={[5, 4, 0.2]} color={WOOD} />
      <SolidBox position={[-5, 2, -7]} args={[4, 4, 0.2]} color={WOOD} />
      <SolidBox position={[5, 2, -7]} args={[4, 4, 0.2]} color={WOOD} />

      <SolidBox position={[0, 2, 7]} args={[14, 4, 0.2]} color={WOOD} />
      <SolidBox position={[-7, 2, 0]} args={[0.2, 4, 14]} color={WOOD} />
      <SolidBox position={[7, 2, 0]} args={[0.2, 4, 14]} color={WOOD} />

      <mesh position={[0, 2.2, -6.85]}>
        <planeGeometry args={[3.5, 2.2]} />
        <meshStandardMaterial
          color="#0a1530"
          emissive="#1a3056"
          emissiveIntensity={0.4}
          transparent
          opacity={0.6}
          side={DoubleSide}
        />
      </mesh>

      <SolidBox position={[6.85, 0.6, -2]} args={[0.3, 1.2, 1.8]} color="#221511" />
      <mesh position={[6.7, 0.5, -2]}>
        <boxGeometry args={[0.05, 0.8, 1.2]} />
        <meshStandardMaterial
          emissive="#f4a261"
          emissiveIntensity={3}
          color="#f4a261"
        />
      </mesh>

      <DecorativeBox position={[0, 3.7, 0]} args={[0.4, 0.4, 14]} color={WOOD_LIGHT} />
    </>
  )
}

function SolidBox({ position, args, color }: BoxProps) {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={position} castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color={color} roughness={0.95} metalness={0.05} />
      </mesh>
    </RigidBody>
  )
}

function DecorativeBox({ position, args, color }: BoxProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0.05} />
    </mesh>
  )
}
