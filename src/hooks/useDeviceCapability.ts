"use client"

import { useEffect, useState } from "react"

export type Tier = "low" | "mid" | "high"

export interface QualityProfile {
  tier: Tier
  /** Cap for AdaptiveDpr / Canvas dpr prop. */
  dprCap: number
  /** Snow particle count. */
  snowCount: number
  /** Render chimney smoke instanced sprites. */
  chimneySmoke: boolean
  /** "off" | "throttled" | "full" — controls fireplace point-light flicker rate. */
  fireplaceFlicker: "off" | "throttled" | "full"
  /** "static" | "animated" | "full" — aurora shader animation level. */
  aurora: "static" | "animated" | "full"
  /** Bob skill tree ornaments. */
  skillTreeBob: boolean
  /** Mount AudioLayer at all (network + decode cost). */
  ambientAudio: boolean
}

export interface DeviceCapability {
  isMobile: boolean
  hasWebGL: boolean
  cores: number
  memory: number
  canRun3D: boolean
  tier: Tier
  profile: QualityProfile
}

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl")
    )
  } catch {
    return false
  }
}

export function qualityProfileFor(tier: Tier): QualityProfile {
  if (tier === "high") {
    return {
      tier,
      dprCap: 1.4,
      snowCount: 500,
      chimneySmoke: true,
      fireplaceFlicker: "full",
      aurora: "full",
      skillTreeBob: true,
      ambientAudio: true,
    }
  }
  if (tier === "mid") {
    return {
      tier,
      dprCap: 1.0,
      snowCount: 280,
      chimneySmoke: true,
      fireplaceFlicker: "throttled",
      aurora: "animated",
      skillTreeBob: true,
      ambientAudio: true,
    }
  }
  return {
    tier,
    dprCap: 0.9,
    snowCount: 120,
    chimneySmoke: false,
    fireplaceFlicker: "off",
    aurora: "static",
    skillTreeBob: false,
    ambientAudio: false,
  }
}

export function useDeviceCapability(): DeviceCapability | null {
  const [cap, setCap] = useState<DeviceCapability | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    const isMobile =
      /android|iphone|ipad|ipod|mobile|opera mini/.test(ua) ||
      window.matchMedia("(max-width: 768px)").matches
    const hasWebGL = detectWebGL()
    const cores = navigator.hardwareConcurrency ?? 2
    type NavWithMem = Navigator & { deviceMemory?: number }
    const memory = (navigator as NavWithMem).deviceMemory ?? 4
    const canRun3D = !isMobile && hasWebGL && cores >= 4 && memory >= 2
    const tier: Tier =
      cores >= 8 && memory >= 8 ? "high" : cores >= 4 && memory >= 4 ? "mid" : "low"
    setCap({
      isMobile,
      hasWebGL,
      cores,
      memory,
      canRun3D,
      tier,
      profile: qualityProfileFor(tier),
    })
  }, [])

  return cap
}
