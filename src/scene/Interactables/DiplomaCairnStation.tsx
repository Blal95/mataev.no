"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Interactable } from "./Interactable"
import { STATION_POSITIONS } from "@/config/stations"

interface DiplomaCairnStationProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

export function DiplomaCairnStation({
  worldPosition,
  worldRotation,
}: DiplomaCairnStationProps = {}) {
  const t = useTranslations("prompt")

  // Pre-computed stone positions for the cairn.
  const stones = useMemo(
    () => [
      { pos: [0, 0.18, 0], scale: 0.36 },
      { pos: [-0.18, 0.42, 0.1], scale: 0.28 },
      { pos: [0.16, 0.52, -0.08], scale: 0.25 },
      { pos: [0, 0.78, 0], scale: 0.22 },
      { pos: [-0.05, 0.96, 0.05], scale: 0.16 },
      { pos: [0.08, 1.08, -0.02], scale: 0.12 },
    ],
    []
  )

  return (
    <Interactable
      id="education"
      position={STATION_POSITIONS.cairn}
      worldPosition={worldPosition}
      worldRotation={worldRotation}
      radius={2.2}
      label={t("bookshelf")}
    >
      {/* Stone cairn */}
      {stones.map((s, i) => (
        <mesh
          key={i}
          position={s.pos as [number, number, number]}
          castShadow
        >
          <dodecahedronGeometry args={[s.scale, 0]} />
          <meshStandardMaterial color="#3a3a40" roughness={0.95} />
        </mesh>
      ))}

      {/* Flat rock to the side, holding a book stack */}
      <mesh position={[0.9, 0.1, 0.3]} castShadow>
        <boxGeometry args={[0.5, 0.15, 0.4]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.95} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0.9, 0.22 + i * 0.045, 0.3]}
          rotation={[0, i * 0.07, 0]}
          castShadow
        >
          <boxGeometry args={[0.32, 0.04, 0.24]} />
          <meshStandardMaterial
            color={["#5BC0EB", "#F4A261", "#1d3a2a"][i]}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Three framed degree plaques — one per bachelor's (programming,
          information management, accounting) propped against the cairn. */}
      {[
        { angle: -0.5, x: -0.74, color: "#5BC0EB" },
        { angle: 0.0, x: 0.0, color: "#6BCB77" },
        { angle: 0.42, x: 0.74, color: "#F4A261" },
      ].map((p, i) => (
        <group
          key={i}
          position={[p.x, 0.4, 0.3]}
          rotation={[-0.35, p.angle, 0]}
        >
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.56, 0.03]} />
            <meshStandardMaterial color="#3a2a1d" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[0.36, 0.5]} />
            <meshStandardMaterial color={p.color} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </Interactable>
  )
}
