"use client"

import { useSyncExternalStore } from "react"
import { useDeviceCapability } from "./useDeviceCapability"

export type CabinBlockReason = "mobile" | "no-webgl" | "low-end" | null

export interface CabinGate {
  canEnter: boolean
  reason: CabinBlockReason
  loading: boolean
}

const LOADING: CabinGate = { canEnter: false, reason: null, loading: true }

const FINE = "(pointer: fine) and (hover: hover)"
const onPointerChange = (cb: () => void) => {
  const mq = window.matchMedia(FINE)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

/**
 * Whether this browser can walk around the cabin. Until it is known the
 * answer is no, so no way into the cabin is ever in the server HTML or
 * flashes up on a phone. A real mouse is required too: iPadOS reports a
 * desktop user agent, but the cabin needs WASD and pointer lock.
 */
export function useCabinGate(): CabinGate {
  const cap = useDeviceCapability()
  const fine = useSyncExternalStore(
    onPointerChange,
    () => window.matchMedia(FINE).matches,
    () => null,
  )

  if (!cap || fine === null) return LOADING
  if (cap.isMobile || !fine) return { canEnter: false, reason: "mobile", loading: false }
  if (!cap.hasWebGL) return { canEnter: false, reason: "no-webgl", loading: false }
  if (!cap.canRun3D) return { canEnter: false, reason: "low-end", loading: false }
  return { canEnter: true, reason: null, loading: false }
}
