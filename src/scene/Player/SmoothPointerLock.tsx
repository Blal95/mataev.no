"use client"

/**
 * Pointer-lock mouse-look controller.
 *
 * Design rationale:
 * - Raw movementX/Y is applied immediately — no EMA decay. Smoothing the
 *   output rotation causes the camera to keep drifting after the mouse stops,
 *   which kills precision aiming. True "smooth" feel comes from comfortable
 *   sensitivity and tight pitch clamping, not lag.
 * - We do clamp the per-frame delta to MAX_DELTA_PX so a USB hiccup or
 *   OS pointer-acceleration spike can't spin the player 360°.
 * - Pitch is clamped to ±89° so you can never flip upside-down.
 */

import { useEffect, useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"

// How many radians per raw pixel. 0.0018 ≈ a 180° turn across ~1750px,
// comfortable for most mouse DPI settings without feeling sluggish.
const SENSITIVITY = 0.0018
// Hard cap on raw delta per frame to absorb OS pointer spikes.
const MAX_DELTA_PX = 80
const PI_HALF = Math.PI / 2 - 0.05  // 89° — clamp pitch before gimbal

export function SmoothPointerLock({ selector = "#scene-canvas" }: { selector?: string }) {
  const { camera, gl } = useThree()
  const paused = useGameStore((s) => s.paused)
  const introPlaying = useGameStore((s) => s.introPlaying)

  const rawDx = useRef(0)
  const rawDy = useRef(0)

  // Euler maintained in YXZ order so yaw (Y) never contaminates pitch (X)
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"))

  // Sync euler from camera on first mount so we inherit IntroCamera's pose
  useEffect(() => {
    euler.current.setFromQuaternion(camera.quaternion, "YXZ")
  }, [camera])

  useEffect(() => {
    const canvas =
      (gl.domElement.closest(selector) as HTMLElement | null) ??
      gl.domElement

    const onMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return
      // Accumulate — mousemove can fire multiple times between rAF ticks
      rawDx.current += Math.max(-MAX_DELTA_PX, Math.min(MAX_DELTA_PX, e.movementX))
      rawDy.current += Math.max(-MAX_DELTA_PX, Math.min(MAX_DELTA_PX, e.movementY))
    }

    const onClick = () => {
      const { paused: p, introPlaying: ip } = useGameStore.getState()
      if (!document.pointerLockElement && !p && !ip) {
        // Can reject async (WrongDocumentError / missing gesture / doc not
        // focused) — swallow so it never surfaces as an unhandledrejection.
        const ret = canvas.requestPointerLock() as unknown
        if (ret && typeof (ret as Promise<void>).catch === "function") {
          ;(ret as Promise<void>).catch(() => {})
        }
      }
    }

    document.addEventListener("mousemove", onMove)
    canvas.addEventListener("click", onClick)
    return () => {
      document.removeEventListener("mousemove", onMove)
      canvas.removeEventListener("click", onClick)
    }
  }, [gl, selector])

  // Release lock immediately when a panel opens or the intro runs
  useEffect(() => {
    if ((paused || introPlaying) && document.pointerLockElement) {
      document.exitPointerLock()
    }
  }, [paused, introPlaying])

  useFrame(() => {
    if (!document.pointerLockElement) return
    if (paused || introPlaying) return

    const dx = rawDx.current
    const dy = rawDy.current
    rawDx.current = 0
    rawDy.current = 0

    if (dx === 0 && dy === 0) return

    euler.current.setFromQuaternion(camera.quaternion, "YXZ")
    euler.current.y -= dx * SENSITIVITY
    euler.current.x -= dy * SENSITIVITY
    euler.current.x = Math.max(-PI_HALF, Math.min(PI_HALF, euler.current.x))
    euler.current.z = 0

    camera.quaternion.setFromEuler(euler.current)
  })

  return null
}
