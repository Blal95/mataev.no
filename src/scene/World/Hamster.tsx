"use client"

import { type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Billboard, Text } from "@react-three/drei"
import * as THREE from "three"
import { NIGHT } from "../palette"

/** The site's text face, for the words that float in the world. */
const ARCHIVO = "/fonts/og/Archivo-Medium.ttf"

const WELCOME_LINES = [
  "Oh! A visitor. Welcome to my territory. Mind the seeds.",
  "Pip pip! You made it. I have been expecting someone tall.",
  "Welcome, big one. I will be your guide. Mostly I wander though.",
  "Ah, a new arrival. I am Borzik. You may look but not touch the seeds.",
]

// Ground planes inside hytte.glb (every "Plane*" mesh + the GroundFill slab).
// We raycast only against these to find Borzik's footing — bypassing the
// cabin, mountains, trees, etc.
const isTerrain = (name: string) =>
  name.startsWith("Plane") || name === "GroundFill"

const downRay = new THREE.Raycaster()
const DOWN = new THREE.Vector3(0, -1, 0)
const rayOrigin = new THREE.Vector3()

interface HamsterProps {
  /** Center of his roaming territory. */
  home?: [number, number, number]
  /** Radius (XZ) of random walk around home. */
  radius?: number
  /** Movement speed (world units / s). */
  speed?: number
  /** Called when Borzik says the welcome line (text included — local, instant). */
  onWelcomeSay?: (text: string) => void
  /** Called when idle timer fires AND player is within hearRadius — parent
   *  fetches the AI line, then sets idleBubble. */
  onIdleTrigger?: () => void
  /** AI-generated idle text from parent. Hamster displays it as a bubble. */
  idleBubble?: string | null
  /** Distance (world units) within which idle trigger fires. Default 12. */
  hearRadius?: number
  /** Borzik himself, as he moves, for the station that talks to him. */
  ref?: Ref<THREE.Group | null>
}

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

// Greyish top, whiteish bottom.
const COLOR_TOP = "#9aa0a8"
const COLOR_BOTTOM = "#f1f1ee"
const COLOR_NOSE = "#3a1f1f"
const COLOR_EYE = "#1a1a22"
const COLOR_EAR_INNER = "#d7a0a0"

/**
 * Borzik — a small hamster that wanders randomly around `home`.
 * Greyish top, whiteish belly, a tiny "Borzik" name tag floating over
 * his head. Reduced-motion users get a static pose.
 */
export function Hamster({
  home = [0, 0, 0],
  radius = 3,
  speed = 0.7,
  onWelcomeSay,
  onIdleTrigger,
  idleBubble = null,
  hearRadius = 12,
  ref,
}: HamsterProps) {
  const groupRef = useRef<THREE.Group>(null)
  useImperativeHandle<THREE.Group | null, THREE.Group | null>(ref, () => groupRef.current, [])
  const bodyRef = useRef<THREE.Group>(null)
  const target = useRef<[number, number]>([home[0], home[2]])
  const lastChange = useRef(0)
  const groundY = useRef(home[1])
  const terrainMeshes = useRef<THREE.Mesh[]>([])
  const skip = useRef(0)
  const snappedOnce = useRef(false)
  const { scene, camera } = useThree()

  // Internal bubble for the welcome only.
  const [welcomeBubble, setWelcomeBubble] = useState<string | null>(null)
  const welcomed = useRef(false)
  const lastSay = useRef(0)
  const nextSayIn = useRef(999) // welcome fires first; idle timer starts after
  const welcomeClear = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cache the ground meshes — retry across a few frames while the GLB
  // streams in, otherwise the list stays empty and Borzik never snaps
  // (he floats at his home height).
  useEffect(() => {
    let tries = 0
    let raf = 0
    const grab = () => {
      const found: THREE.Mesh[] = []
      scene.traverse((node) => {
        const m = node as THREE.Mesh
        if (m.isMesh && isTerrain(node.name)) found.push(m)
      })
      terrainMeshes.current = found
      if (found.length === 0 && tries++ < 40) raf = requestAnimationFrame(grab)
    }
    grab()
    return () => cancelAnimationFrame(raf)
  }, [scene])

  // Tiny shared geometries/materials.
  const earGeo = useMemo(() => new THREE.SphereGeometry(0.08, 8, 6), [])
  const earMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: COLOR_TOP, roughness: 0.95 }),
    [],
  )
  const earInnerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: COLOR_EAR_INNER,
        roughness: 0.9,
      }),
    [],
  )

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const g = groupRef.current
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.05)

    if (REDUCED_MOTION) {
      g.position.set(home[0], home[1], home[2])
      return
    }

    // Pick a new wander target every 3–6s.
    if (t - lastChange.current > 3 + Math.random() * 3) {
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * radius
      target.current = [home[0] + Math.cos(a) * r, home[2] + Math.sin(a) * r]
      lastChange.current = t
    }

    const dx = target.current[0] - g.position.x
    const dz = target.current[1] - g.position.z
    const dist = Math.hypot(dx, dz)

    if (dist > 0.05) {
      const vx = (dx / dist) * speed
      const vz = (dz / dist) * speed
      g.position.x += vx * dt
      g.position.z += vz * dt
      g.rotation.y = Math.atan2(dx, dz)
    }

    // Welcome on first appearance (~2 s after spawn so world is settled).
    if (!welcomed.current && t > 2) {
      welcomed.current = true
      const line = WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)]
      setWelcomeBubble(line)
      onWelcomeSay?.(line)
      lastSay.current = t
      nextSayIn.current = 40 + Math.random() * 30
      if (welcomeClear.current) clearTimeout(welcomeClear.current)
      welcomeClear.current = setTimeout(() => setWelcomeBubble(null), 7000)
    }

    // Idle trigger: only when player is within hearRadius.
    // Concurrent-fetch guard lives in the parent (BorzikStation), not here.
    if (welcomed.current && t - lastSay.current > nextSayIn.current) {
      const camPos = camera.position
      const bPos = g.position
      const playerDist = Math.hypot(camPos.x - bPos.x, camPos.z - bPos.z)
      if (playerDist <= hearRadius) {
        lastSay.current = t
        nextSayIn.current = 40 + Math.random() * 30
        onIdleTrigger?.()
      } else {
        // Player out of range — advance timer so we check again soon.
        lastSay.current = t
        nextSayIn.current = 10 + Math.random() * 10
      }
    }

    // Ground-snap: raycast against the cached ground planes. Run every frame
    // until the first successful hit (so Borzik drops onto the snow as soon
    // as the GLB is ready instead of floating), then throttle to ~15 frames.
    skip.current = (skip.current + 1) % 15
    if (
      (!snappedOnce.current || skip.current === 0) &&
      terrainMeshes.current.length > 0
    ) {
      rayOrigin.set(g.position.x, 50, g.position.z)
      downRay.set(rayOrigin, DOWN)
      downRay.far = 200
      const hits = downRay.intersectObjects(terrainMeshes.current, false)
      if (hits.length > 0) {
        groundY.current = hits[0].point.y
        snappedOnce.current = true
      }
    }

    const moving = dist > 0.05 ? 1 : 0
    g.position.y = groundY.current + Math.abs(Math.sin(t * 12)) * 0.04 * moving

    // Body wobble side-to-side.
    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(t * 14) * 0.08 * moving
    }
  })

  return (
    <group ref={groupRef} position={home}>
      <group ref={bodyRef}>
        {/* Lower belly (whiteish) */}
        <mesh position={[0, 0.07, 0]} castShadow>
          <sphereGeometry args={[0.18, 14, 10]} />
          <meshStandardMaterial color={COLOR_BOTTOM} roughness={0.95} />
        </mesh>

        {/* Top of body (greyish) — flattened sphere on top */}
        <mesh position={[0, 0.13, 0]} castShadow>
          <sphereGeometry
            args={[0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshStandardMaterial color={COLOR_TOP} roughness={0.95} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.18, 0.16]} castShadow>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial color={COLOR_TOP} roughness={0.95} />
        </mesh>
        {/* Chin (lighter) */}
        <mesh position={[0, 0.13, 0.2]}>
          <sphereGeometry
            args={[0.085, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
          />
          <meshStandardMaterial color={COLOR_BOTTOM} roughness={0.95} />
        </mesh>

        {/* Ears */}
        <mesh
          position={[-0.07, 0.27, 0.13]}
          geometry={earGeo}
          material={earMat}
          scale={[0.7, 1, 0.55]}
        />
        <mesh
          position={[0.07, 0.27, 0.13]}
          geometry={earGeo}
          material={earMat}
          scale={[0.7, 1, 0.55]}
        />
        <mesh
          position={[-0.07, 0.27, 0.14]}
          geometry={earGeo}
          material={earInnerMat}
          scale={[0.4, 0.7, 0.3]}
        />
        <mesh
          position={[0.07, 0.27, 0.14]}
          geometry={earGeo}
          material={earInnerMat}
          scale={[0.4, 0.7, 0.3]}
        />

        {/* Eyes */}
        <mesh position={[-0.05, 0.2, 0.25]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshBasicMaterial color={COLOR_EYE} />
        </mesh>
        <mesh position={[0.05, 0.2, 0.25]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshBasicMaterial color={COLOR_EYE} />
        </mesh>

        {/* Nose */}
        <mesh position={[0, 0.17, 0.28]}>
          <sphereGeometry args={[0.013, 8, 6]} />
          <meshBasicMaterial color={COLOR_NOSE} />
        </mesh>

        {/* Tiny tail nub */}
        <mesh position={[0, 0.12, -0.18]}>
          <sphereGeometry args={[0.028, 8, 6]} />
          <meshStandardMaterial color={COLOR_BOTTOM} roughness={0.95} />
        </mesh>

        {/* Feet (4 small bumps under belly) */}
        {[
          [-0.08, 0, 0.1],
          [0.08, 0, 0.1],
          [-0.08, 0, -0.08],
          [0.08, 0, -0.08],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color={COLOR_BOTTOM} roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Speech bubble — welcome (internal) or AI idle (from parent). */}
      {(welcomeBubble ?? idleBubble) && (
        <Billboard position={[0, 0.85, 0]}>
          <Text
            font={ARCHIVO}
            fontSize={0.1}
            color={NIGHT.fg}
            anchorX="center"
            anchorY="middle"
            maxWidth={2.2}
            textAlign="center"
            outlineWidth={0.012}
            outlineColor={NIGHT.ground}
          >
            {welcomeBubble ?? idleBubble}
          </Text>
        </Billboard>
      )}

      {/* Name tag floating above his head — billboarded so it always faces
          the camera. Without this it inherits Borzik's wander heading and
          renders mirrored ("kizroB") whenever he turns away. */}
      <Billboard position={[0, 0.55, 0]}>
        <Text
          font={ARCHIVO}
          fontSize={0.12}
          color={NIGHT.act}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor={NIGHT.ground}
        >
          Borzik
        </Text>
      </Billboard>
    </group>
  )
}
