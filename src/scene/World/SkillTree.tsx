"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import * as THREE from "three"
import { SKILLS, type SkillCategory } from "@/config/skills"

interface SkillTreeProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** Per-frame ornament bob — disabled on low tier. */
  bob?: boolean
}

const CATEGORY_COLOR: Record<SkillCategory, string> = {
  languages: "#5BC0EB",
  frameworks: "#F4A261",
  infra: "#6BCB77",
  tools: "#E8EDF5",
}

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function SkillTree({
  position = [0, 0, 8],
  rotation = [0, 0, 0],
  bob = true,
}: SkillTreeProps) {
  // Distribute ornaments on a spiral around the tree cone.
  const ornaments = useMemo(
    () =>
      SKILLS.map((skill, i) => {
        const t = i / Math.max(1, SKILLS.length - 1) // 0..1 top→bottom
        const y = 4 - t * 3 // start at y=4, descend to y=1
        const radius = 0.4 + t * 0.9 // cone widens going down
        const angle = i * 2.4 // golden-ish spiral
        return {
          skill,
          pos: [
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius,
          ] as [number, number, number],
          phaseOffset: i * 0.37,
        }
      }),
    []
  )

  const ornamentGroupRef = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!bob || REDUCED_MOTION || !ornamentGroupRef.current) return
    const t = state.clock.elapsedTime
    ornamentGroupRef.current.children.forEach((child, i) => {
      const phase = ornaments[i]?.phaseOffset ?? 0
      child.position.y = ornaments[i].pos[1] + Math.sin(t * 1.4 + phase) * 0.04
    })
  })

  return (
    <group position={position} rotation={rotation}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 2, 8]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>

      {/* Foliage cones — 3 stacked */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[1.4, 1.6, 8]} />
        <meshStandardMaterial color="#1d3a2a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.0, 0]} castShadow>
        <coneGeometry args={[1.0, 1.4, 8]} />
        <meshStandardMaterial color="#1d3a2a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.0, 0]} castShadow>
        <coneGeometry args={[0.6, 1.0, 8]} />
        <meshStandardMaterial color="#1d3a2a" roughness={0.85} />
      </mesh>

      {/* Ornaments */}
      <group ref={ornamentGroupRef}>
        {ornaments.map((o) => (
          <group key={o.skill.id} position={o.pos}>
            {/* Ornament bauble */}
            <mesh>
              <sphereGeometry args={[0.06, 8, 6]} />
              <meshStandardMaterial
                color={CATEGORY_COLOR[o.skill.category]}
                emissive={CATEGORY_COLOR[o.skill.category]}
                emissiveIntensity={0.3}
                roughness={0.4}
              />
            </mesh>
            {/* Label */}
            <Text
              position={[0.12, 0, 0]}
              fontSize={0.07}
              color="#E8EDF5"
              anchorX="left"
              anchorY="middle"
              outlineWidth={0.005}
              outlineColor="#0a0f1c"
            >
              {o.skill.label}
            </Text>
          </group>
        ))}
      </group>

      {/* Star on top */}
      <mesh position={[0, 4.6, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial
          color="#F4A261"
          emissive="#F4A261"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
