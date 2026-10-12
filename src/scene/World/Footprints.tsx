"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"

const POOL_SIZE = 16
const LIFETIME = 6.0 // seconds

// One foot stamp per this much horizontal travel.
const STEP_DIST_PER_FOOT = 0.45

// Half-stride: lateral offset from the player's centerline to each foot.
const FOOT_OFFSET = 0.13

// Footprint geometry tweaks — gives the round disc a foot-shaped oval.
const FOOT_SCALE_X = 0.7
const FOOT_SCALE_Y = 1.5

// Terrain meshes inside hytte.glb. We raycast against just these.
const TERRAIN_NAMES = new Set([
  "Plane001_Plane002",
  "Plane_Plane001",
  "Plane002_Plane004",
  "Plane.001_Plane.002",
  "Plane_Plane.001",
  "Plane.002_Plane.004",
])

const downRay = new THREE.Raycaster()
const DOWN = new THREE.Vector3(0, -1, 0)
const rayOrigin = new THREE.Vector3()
const tmpDir = new THREE.Vector3()
const tmpPerp = new THREE.Vector3()

/**
 * Two-foot snow footprints with a heel-down-and-press-off oval shape.
 * Alternates left/right as the player walks, and stamps a clean pair on
 * landing after a jump.
 */
export function Footprints() {
  const { camera, scene } = useThree()
  const paused = useGameStore((s) => s.paused)
  const introPlaying = useGameStore((s) => s.introPlaying)

  const groupRef = useRef<THREE.Group>(null)
  const lastCam = useRef(new THREE.Vector3())
  const distAccum = useRef(0)
  const nextIdx = useRef(0)
  const footSide = useRef<0 | 1>(0) // 0 = left, 1 = right
  const lastDy = useRef(0)
  const wasFalling = useRef(false)
  const lastHeading = useRef(0) // yaw in radians

  const terrainMeshes = useRef<THREE.Mesh[]>([])

  useEffect(() => {
    const found: THREE.Mesh[] = []
    scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh && TERRAIN_NAMES.has(node.name)) {
        found.push(node as THREE.Mesh)
      }
    })
    terrainMeshes.current = found
  }, [scene])

  const printMaterials = useRef<THREE.MeshBasicMaterial[]>([])
  const printMeshes = useRef<THREE.Mesh[]>([])
  const printAges = useRef<number[]>(new Array(POOL_SIZE).fill(LIFETIME + 1))

  // Oval-ish foot shape via a stretched disc.
  const sharedGeom = useMemo(() => new THREE.CircleGeometry(0.1, 16), [])

  function surfaceYAt(x: number, z: number, fromY: number): number {
    if (terrainMeshes.current.length === 0) return 0.02
    rayOrigin.set(x, fromY + 5, z)
    downRay.set(rayOrigin, DOWN)
    downRay.far = 60
    const hits = downRay.intersectObjects(terrainMeshes.current, false)
    return hits.length > 0 ? hits[0].point.y + 0.02 : 0.02
  }

  function stamp(side: 0 | 1, heading: number, camY: number) {
    const idx = nextIdx.current % POOL_SIZE
    nextIdx.current++
    const mesh = printMeshes.current[idx]
    const mat = printMaterials.current[idx]
    if (!mesh || !mat) return

    // Lateral offset perpendicular to walking direction.
    // Forward = (sin h, 0, cos h). Right = (cos h, 0, -sin h).
    tmpPerp.set(Math.cos(heading), 0, -Math.sin(heading))
    const sign = side === 0 ? -1 : 1
    const fx = camera.position.x + tmpPerp.x * FOOT_OFFSET * sign
    const fz = camera.position.z + tmpPerp.z * FOOT_OFFSET * sign

    const y = surfaceYAt(fx, fz, camY)
    mesh.position.set(fx, y, fz)
    // Lay flat (X = -π/2), then yaw around Y to align with walking dir.
    mesh.rotation.set(-Math.PI / 2, 0, heading)
    printAges.current[idx] = 0
    mat.opacity = 0.5
  }

  useFrame((_, dt) => {
    if (!groupRef.current) return

    // Age existing prints
    for (let i = 0; i < POOL_SIZE; i++) {
      if (printAges.current[i] <= LIFETIME) {
        printAges.current[i] += dt
        const mat = printMaterials.current[i]
        if (mat) {
          mat.opacity = Math.max(0, 0.5 * (1 - printAges.current[i] / LIFETIME))
        }
      }
    }

    if (paused || introPlaying) return

    const camPos = camera.position
    const dx = camPos.x - lastCam.current.x
    const dy = camPos.y - lastCam.current.y
    const dz = camPos.z - lastCam.current.z
    lastCam.current.copy(camPos)

    const horiz = Math.hypot(dx, dz)

    // Track heading from current motion (when meaningful).
    if (horiz > 0.005) {
      lastHeading.current = Math.atan2(dx, dz)
    }

    // Landing detection: was falling fast, now ~stopped.
    const FALL_THRESHOLD = -0.04
    const LAND_THRESHOLD = -0.01
    const falling = dy < FALL_THRESHOLD
    if (falling) wasFalling.current = true
    const landed =
      wasFalling.current && dy > LAND_THRESHOLD && lastDy.current < FALL_THRESHOLD
    if (landed) {
      wasFalling.current = false
      // Both feet stamp on landing.
      stamp(0, lastHeading.current, camPos.y)
      stamp(1, lastHeading.current, camPos.y)
    }
    lastDy.current = dy

    // Horizontal step accumulator.
    distAccum.current += horiz
    while (distAccum.current >= STEP_DIST_PER_FOOT) {
      distAccum.current -= STEP_DIST_PER_FOOT
      stamp(footSide.current, lastHeading.current, camPos.y)
      footSide.current = footSide.current === 0 ? 1 : 0
    }
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) printMeshes.current[i] = m
          }}
          geometry={sharedGeom}
          position={[0, -100, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[FOOT_SCALE_X, FOOT_SCALE_Y, 1]}
          renderOrder={-1}
        >
          <meshBasicMaterial
            ref={(mat) => {
              if (mat) printMaterials.current[i] = mat
            }}
            color="#0a0f1c"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
