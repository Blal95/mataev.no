"use client"

import { type ReactNode, type RefObject, useRef, useEffect, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import { RigidBody, CuboidCollider } from "@react-three/rapier"
import * as THREE from "three"
import type { PanelId } from "@/hooks/useGameStore"
import { useGameStore } from "@/hooks/useGameStore"
import { cn } from "@/lib/cn"
import { InkRing } from "./InkRing"

interface Props {
  id: PanelId
  /** Relative position — gets multiplied by worldScale and snapped to ground. */
  position: [number, number, number]
  /**
   * Absolute world position override. When set, takes precedence over
   * `position`: skips the worldScale multiplication AND the ground
   * raycast, anchoring the interactable at the exact world coords.
   * Used by the in-game position editor.
   */
  worldPosition?: [number, number, number]
  /** Euler rotation (radians, XYZ order) applied to the outer group. */
  worldRotation?: [number, number, number]
  /** Proximity activation radius (you're close enough — interact). */
  radius?: number
  /** Look-at activation distance (you're looking at it — interact from afar). */
  lookRadius?: number
  /** Cone angle in radians for "looking at" check. ~0.35 ≈ 20°. */
  lookCone?: number
  label: string
  /** When true, skip the proximity halo + floating label HTML chip. */
  hideHud?: boolean
  /** When true, skip the physics collider so the player can walk through. */
  noCollider?: boolean
  /** Height (world units) of the floating label chip above the base. */
  labelHeight?: number
  /** Something that moves (Borzik): aim, distance and the beacon follow it,
   *  and aiming means hitting its own geometry, not the station's home. */
  follow?: RefObject<THREE.Object3D | null>
  /** "Start here" emphasis: keeps the label visible from afar and brightens
   *  the halo/beacon, regardless of distance. Used for first-visit onboarding
   *  (the signpost) so the camp stays calm but one station beckons. */
  emphasize?: boolean
  children: ReactNode
}

const downRay = new THREE.Raycaster()
const DOWN = new THREE.Vector3(0, -1, 0)
const tmpToObj = new THREE.Vector3()
const tmpFwd = new THREE.Vector3()
// Reusable vectors for ray-to-point distance check
const _rayOrigin = new THREE.Vector3()
const _rayDir = new THREE.Vector3()
const _toPoint = new THREE.Vector3()
// Center-screen ray reused for the precise geometry hover test.
const _lookRay = new THREE.Raycaster()
/** Closer than this (world units), a station's floating tag is hidden. */
const LABEL_NEAR = 2.5

/**
 * Distance from a world point P to the infinite ray (origin, dir).
 * Uses the scalar-rejection formula: ||(P-O) - ((P-O)·d)d||
 * This is what the crosshair (center-screen ray) actually measures, so
 * "ray within N units of object" == "crosshair aimed at object".
 */
function rayToPointDist(
  origin: THREE.Vector3,
  dir: THREE.Vector3,  // must be normalised
  point: THREE.Vector3,
): number {
  _toPoint.subVectors(point, origin)
  const proj = _toPoint.dot(dir)
  if (proj < 0) return Infinity  // point is behind the camera
  return Math.sqrt(Math.max(0, _toPoint.lengthSq() - proj * proj))
}

export function Interactable({
  id,
  position,
  worldPosition,
  worldRotation,
  radius = 2.4,
  lookRadius = 5,
  lookCone = 0.35,
  label,
  hideHud = false,
  noCollider = false,
  labelHeight = 1.55,
  follow,
  emphasize = false,
  children,
}: Props) {
  const group = useRef<THREE.Group>(null)
  const content = useRef<THREE.Group>(null)
  const { camera, scene } = useThree()
  const close = useRef(false)
  const tmp = useRef(new THREE.Vector3())
  const [distance, setDistance] = useState(99)
  const lastDistanceWrite = useRef(0)
  const [groundY, setGroundY] = useState<number | null>(null)
  const frameSkip = useRef(0)
  const worldScale = useGameStore((s) => s.worldScale)

  const canInteract = useGameStore((s) => s.canInteract)
  const setCanInteract = useGameStore((s) => s.setCanInteract)
  // While a book is being read in-scene the open book fills the view; every
  // other floating label (a DOM overlay that always paints on top of the
  // canvas) would otherwise bleed through it. Suppress them for the duration.
  const reading = useGameStore((s) => s.reading3DBookId !== null)
  // While the guiding wind is leading the player here, this station glows so
  // the current visibly "lands" on a beckoning object (GoT: the sweep stops on
  // the interactable). Folds into the same emphasis path as first-visit.
  const guidedStation = useGameStore((s) => s.guidedStation)
  const isWindTarget = guidedStation === id
  // Single emphasis flag: first-visit onboarding OR the live wind target.
  const emph = emphasize || isWindTarget

  const active = canInteract === id

  const usingOverride = worldPosition !== undefined
  const worldX = usingOverride ? worldPosition[0] : position[0] * worldScale
  const worldZ = usingOverride ? worldPosition[2] : position[2] * worldScale
  const yOffset = position[1] // unscaled clearance above ground (e.g. 0.9 for table-height)

  // Raycast down to find the ground surface (cabin floor, snow, etc.)
  // Skipped entirely when an absolute world position is supplied.
  useEffect(() => {
    if (usingOverride) {
      setGroundY(worldPosition[1])
      return
    }
    let cancelled = false
    let attempts = 0
    const findGround = () => {
      if (cancelled) return
      attempts++
      downRay.set(new THREE.Vector3(worldX, 50, worldZ), DOWN)
      downRay.far = 200
      const hits = downRay.intersectObjects(scene.children, true)
      // skip our own halo/labels — pick first solid mesh hit
      const hit = hits.find((h) => {
        const m = h.object as THREE.Mesh
        return (
          m.isMesh &&
          !(m.material as THREE.Material)?.transparent &&
          m.visible
        )
      })
      if (hit) {
        setGroundY(hit.point.y)
      } else if (attempts < 8) {
        setTimeout(findGround, 250)
      } else {
        setGroundY(0)
      }
    }
    setGroundY(null)
    const t = setTimeout(findGround, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [usingOverride, worldPosition, worldX, worldZ, scene, worldScale])

  const finalY = usingOverride ? worldPosition[1] : (groundY ?? 0) + yOffset

  useFrame(() => {
    if (!group.current || groundY === null) return

    // Proximity / look-at checks run every other frame (~30 Hz). Cheap
    // dot product + distance, and the higher rate makes E-to-open feel
    // snappy instead of 60 ms-delayed.
    frameSkip.current = (frameSkip.current + 1) % 2
    if (frameSkip.current === 0) {
      const moving = follow?.current
      if (moving) moving.getWorldPosition(tmp.current)
      else tmp.current.set(worldX, finalY, worldZ)
      const d = tmp.current.distanceTo(camera.position)

      // distance state drives label opacity only — throttle React writes to 4 Hz.
      const now = performance.now()
      if (now - lastDistanceWrite.current > 250) {
        lastDistanceWrite.current = now
        setDistance(d)
      }

      // Look-at: cast the center-screen ray (camera position + forward) and
      // ask what it actually hits. The crosshair IS this ray.
      let lookingAt = false
      if (d < lookRadius) {
        _rayOrigin.copy(camera.position)
        camera.getWorldDirection(_rayDir) // already normalised by Three.js

        // PRIMARY — precise hit against the object's real geometry. Aim anywhere
        // on its actual surface (a photo on the wide gallery wall, a spine on the
        // bookshelf) and it selects; the gaps between objects no longer fire.
        const shape = moving ?? content.current
        if (shape) {
          _lookRay.set(_rayOrigin, _rayDir)
          _lookRay.far = lookRadius + 1
          if (_lookRay.intersectObject(shape, true).length > 0) {
            lookingAt = true
          }
        }

        // FALLBACK — aim-assist for thin/small objects (vinyl, mailbox slot)
        // whose geometry is hard to land the dot on. Center-axis proximity,
        // sampled at three heights; tightens with distance to avoid cross-fire.
        if (!lookingAt) {
          const threshold = Math.max(0.4, 0.8 - d * 0.08)
          const heights = moving
            ? [tmp.current.y + 0.05, tmp.current.y + 0.2, tmp.current.y + 0.35]
            : [finalY + 0.3, finalY + 0.9, finalY + labelHeight]
          for (const ty of heights) {
            tmpToObj.set(tmp.current.x, ty, tmp.current.z)
            if (rayToPointDist(_rayOrigin, _rayDir, tmpToObj) <= threshold) {
              lookingAt = true
              break
            }
          }
        }
      }

      // Point-blank still activates even if you look past it.
      const pointBlank = d < radius * 0.5
      const shouldBeActive = d < lookRadius && (lookingAt || pointBlank)
      if (shouldBeActive && !close.current) {
        close.current = true
        setCanInteract(id, label, moving ?? group.current)
      } else if (!shouldBeActive && close.current) {
        close.current = false
        if (useGameStore.getState().canInteract === id) setCanInteract(null)
      }
    }
  })

  useEffect(() => {
    return () => {
      if (useGameStore.getState().canInteract === id) setCanInteract(null)
    }
  }, [id, setCanInteract])

  if (groundY === null) return null

  // Distant labels fade right out so the camp reads calm ("atmospheric, never
  // busy") and bloom back as you approach. The aimed (active) station and an
  // emphasized one (onboarding) stay fully lit regardless of distance.
  const distanceFade = Math.max(0, Math.min(1, (13 - distance) / 7))
  // Aimed at, the crosshair's tag says what it is and which key to press; and
  // right up close an Html tag would swell to fill the view. It steps aside.
  const labelOpacity = active || distance < LABEL_NEAR ? 0 : emph ? 1 : distanceFade

  return (
    <group
      ref={group}
      position={[worldX, finalY, worldZ]}
      rotation={worldRotation}
    >
      <group ref={content}>{children}</group>

      {!noCollider && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.6, 1.4, 0.6]} position={[0, 1.4, 0]} />
        </RigidBody>
      )}

      {!hideHud && (
        <>
          <InkRing active={active} emphasize={emph} y={-yOffset + 0.02} />

          {/* Out of reach, the tag is not there at all: a hidden Html label
              is still placed on screen every frame. */}
          {!reading && labelOpacity > 0 && (
            <Html
              center
              position={[0, labelHeight, 0]}
              distanceFactor={6}
              zIndexRange={[100, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div
                className={cn(
                  "tone-night label whitespace-nowrap border bg-ground px-2.5 py-1.5",
                  emph ? "border-act text-act-ink" : "border-line text-fg",
                )}
                style={{ opacity: labelOpacity }}
              >
                {label}
              </div>
            </Html>
          )}
        </>
      )}
    </group>
  )
}
