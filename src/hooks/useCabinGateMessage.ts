"use client"

import { useTranslations } from "next-intl"
import { useCabinGate, type CabinGate } from "./useCabinGate"

export interface CabinGateMessage extends CabinGate {
  /** Localized reason the 3D cabin can't be entered, or null when it can. */
  gateMsg: string | null
}

/**
 * Cabin gate + its localized block message in one call. Wraps useCabinGate and
 * maps the block reason to the matching `cabinGate.*` translation. Shared by the
 * header, hero, footer, and mobile menu so the reason→message mapping lives once.
 */
export function useCabinGateMessage(): CabinGateMessage {
  const gate = useCabinGate()
  const tg = useTranslations("cabinGate")

  const gateMsg =
    gate.reason === "mobile" ? tg("mobile")
    : gate.reason === "no-webgl" ? tg("noWebGL")
    : gate.reason === "low-end" ? tg("lowEnd")
    : null

  return { ...gate, gateMsg }
}
