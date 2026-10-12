"use client"

import { useTranslations } from "next-intl"
import { useGLTF } from "@react-three/drei"
import { VainakhTower } from "../World/VainakhTower"
import { Interactable } from "./Interactable"

// Bump ?v= whenever the GLB is re-exported — busts the drei useGLTF cache and
// the browser HTTP cache so the new model is actually picked up.
const TOWER_MODEL: string | undefined = "/models/vainakh-tower.glb?v=18"
if (TOWER_MODEL) useGLTF.preload(TOWER_MODEL)

/**
 * A single Vainakh combat tower at an arbitrary world position. The GLB ships
 * with a stone plinth foundation built in, so the tower sits cleanly on uneven
 * terrain — just nudge the Y in the in-game P-editor until the plinth rests on
 * the snow. Each tower is independently placed so the gate doesn't require flat
 * ground between the two pieces.
 */
interface SingleTowerProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}
export function VainakhTowerStation({
  worldPosition = [0, 0, 0],
  worldRotation = [0, 0, 0],
}: SingleTowerProps = {}) {
  // Pass rotation directly to VainakhTower so its own <group> rotates around
  // its own centre. Wrapping in an outer <group rotation> rotates the position
  // around the world origin, which displaces the tower far away.
  return (
    <VainakhTower
      position={worldPosition}
      rotation={worldRotation}
      height={18}
      baseHalf={1.9}
      modelUrl={TOWER_MODEL}
    />
  )
}

/**
 * The carved "proud stone" (kurtulg) gate marker carrying the heritage panel.
 * Separated from the towers so it can sit anywhere — between two distant
 * towers, off to one side, on the path, wherever the placement reads best.
 */
interface HeritageStoneProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}
export function HeritageStone({
  worldPosition = [0, 0, 0],
  worldRotation = [0, 0, 0],
}: HeritageStoneProps = {}) {
  const t = useTranslations("prompt")
  const [ax, ay, az] = worldPosition
  return (
    <Interactable
      id="heritage"
      position={[0, 0, 0]}
      worldPosition={[ax, ay + 0.1, az]}
      worldRotation={worldRotation}
      radius={2.6}
      lookRadius={6}
      label={t("heritage")}
      labelHeight={1.4}
    >
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 1.1, 0.45]} />
          <meshStandardMaterial color="#8a8178" roughness={1} />
        </mesh>
        <mesh position={[0, 1.12, 0]} castShadow>
          <boxGeometry args={[0.8, 0.16, 0.55]} />
          <meshStandardMaterial color="#9a9088" roughness={1} />
        </mesh>
        <mesh position={[0, 0.62, 0.23]}>
          <planeGeometry args={[0.5, 0.7]} />
          <meshStandardMaterial
            color="#c2a98c"
            emissive="#c2a98c"
            emissiveIntensity={0.18}
            roughness={0.7}
          />
        </mesh>
    </Interactable>
  )
}

/**
 * Back-compat: the original twin-tower preset. Still useful for a flat gate
 * placement; for the aurora-overlook layout use the per-tower components above.
 */
interface TowersStationProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}
export function TowersStation({
  worldPosition = [10.5, 3.9, 14],
  worldRotation = [0, 0, 0],
}: TowersStationProps = {}) {
  const [ax, ay, az] = worldPosition
  const spread = 6
  return (
    <group rotation={worldRotation}>
      <VainakhTowerStation worldPosition={[ax - spread, ay, az]} />
      <VainakhTowerStation worldPosition={[ax + spread, ay, az]} />
      <HeritageStone worldPosition={[ax, ay, az + 1.5]} />
    </group>
  )
}
