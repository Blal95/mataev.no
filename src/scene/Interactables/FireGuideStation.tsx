"use client"

import { useTranslations } from "next-intl"
import { Interactable } from "./Interactable"
import { useGameStore } from "@/hooks/useGameStore"

interface FireGuideStationProps {
  /** World position of the campfire — the beacon doubles as the halo anchor. */
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

/**
 * The campfire IS the "start here". You spawn looking at it and it already
 * glows, so it's the natural focal point — no wooden signpost needed. Pressing
 * E opens the fireside guide (orientation + station list + easter-egg
 * breadcrumb). Until the player has read it once, the amber halo/label stay lit
 * from afar (emphasize) so the fire beckons across the calm camp.
 *
 * No mesh of its own: <FirePit> supplies the visuals, logs, light and collider.
 * This wrapper only adds the proximity halo, floating label and panel trigger,
 * so it runs `noCollider` to avoid double-walling the flames.
 */
export function FireGuideStation({
  worldPosition = [21.7, 3.05, 5.79],
  worldRotation,
}: FireGuideStationProps = {}) {
  const t = useTranslations("prompt")
  const signpostSeen = useGameStore((s) => s.signpostSeen)
  return (
    <Interactable
      id="signpost"
      position={[0, 0, 0]}
      worldPosition={worldPosition}
      worldRotation={worldRotation}
      radius={2.8}
      lookRadius={6}
      label={t("fire")}
      emphasize={!signpostSeen}
      noCollider
      labelHeight={1.35}
    >
      {/* Visuals live in <FirePit>; this interactable is purely the HUD halo,
          label and E-to-open trigger. */}
      <group />
    </Interactable>
  )
}
