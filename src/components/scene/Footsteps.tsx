"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"
import { sfx } from "@/lib/sfx"

const SNOW_URL = "/audio/snow-step.mp3"

const WALK_INTERVAL_MS = 460
const SPRINT_INTERVAL_MS = 300

// Water / frozen-lake planes in the GLB — stepping over these plays the icy
// tick instead of the snow crunch. (Sea + the dark-blue water plane, plus
// underscore/space spelling variants the exporter sometimes emits.)
const ICE_NAMES = new Set([
  "Plane.001_Plane.002",
  "Plane_Plane.001",
  "Plane001_Plane002",
  "Plane_Plane001",
])

// Module-level pool so HMR remounts reuse already-created elements.
// 3 slots so rapid footsteps don't cut each other off.
let snowPool: HTMLAudioElement[] | null = null
function getSnowPool(): HTMLAudioElement[] {
  if (snowPool) return snowPool
  if (typeof window === "undefined") return []
  snowPool = Array.from({ length: 3 }, () => {
    const a = new Audio(SNOW_URL)
    a.volume = 0.55
    a.preload = "auto"
    return a
  })
  return snowPool
}

const downRay = new THREE.Raycaster()
const DOWN = new THREE.Vector3(0, -1, 0)
const rayOrigin = new THREE.Vector3()

/**
 * Footstep audio with surface detection. Raycasts straight down each step and
 * picks the snow crunch (recorded) or an icy tick (synth) based on which GLB
 * ground plane is underfoot.
 */
export function Footsteps() {
  const { camera, scene } = useThree()
  const audioOn = useGameStore((s) => s.audioOn)
  const paused = useGameStore((s) => s.paused)
  const introPlaying = useGameStore((s) => s.introPlaying)
  const airborne = useGameStore((s) => s.airborne)

  const poolIdx = useRef(0)
  const lastStep = useRef(0)
  const lastCamPos = useRef({ x: 0, z: 0 })
  const terrain = useRef<THREE.Mesh[]>([])

  // Cache the GLB ground planes once (retry a few frames while it streams in).
  useEffect(() => {
    let tries = 0
    let raf = 0
    const grab = () => {
      const found: THREE.Mesh[] = []
      scene.traverse((n) => {
        const m = n as THREE.Mesh
        if (m.isMesh && (n.name.startsWith("Plane") || n.name === "GroundFill")) {
          found.push(m)
        }
      })
      terrain.current = found
      if (found.length === 0 && tries++ < 40) raf = requestAnimationFrame(grab)
    }
    grab()
    return () => cancelAnimationFrame(raf)
  }, [scene])

  useFrame(() => {
    if (paused || introPlaying || !audioOn || airborne) return

    const camPos = camera.position
    const dx = camPos.x - lastCamPos.current.x
    const dz = camPos.z - lastCamPos.current.z
    const horiz = Math.sqrt(dx * dx + dz * dz)
    lastCamPos.current = { x: camPos.x, z: camPos.z }

    if (horiz < 0.015) return

    const now = performance.now()
    const sprinting = horiz > 0.06
    const interval = sprinting ? SPRINT_INTERVAL_MS : WALK_INTERVAL_MS
    if (now - lastStep.current < interval) return
    lastStep.current = now

    // What's underfoot? Raycast down against the cached ground planes.
    let onIce = false
    if (terrain.current.length > 0) {
      rayOrigin.set(camPos.x, camPos.y, camPos.z)
      downRay.set(rayOrigin, DOWN)
      downRay.far = 60
      const hit = downRay.intersectObjects(terrain.current, false)[0]
      if (hit) onIce = ICE_NAMES.has(hit.object.name)
    }

    if (onIce) {
      sfx.iceStep()
      return
    }

    const pool = getSnowPool()
    if (pool.length === 0) {
      console.warn("[Footsteps] pool empty — skipping")
      return
    }
    const audio = pool[poolIdx.current % pool.length]
    poolIdx.current++
    audio.currentTime = 0
    audio.play().catch(() => {})
  })

  return null
}
