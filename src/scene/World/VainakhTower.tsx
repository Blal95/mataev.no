"use client"

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { RigidBody, CuboidCollider } from "@react-three/rapier"
import { useGLTF } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { getTowerStoneTexture, getTowerStoneNormal } from "../Interactables/textures"
import { registerClimbZone } from "../ladders"

/**
 * VainakhTower — a procedural Chechen combat tower (Bjov / бӀов), modelled on
 * the real Tazbichi/Vovnushki/Erzi towers.
 *
 * PERFORMANCE: every stone box (shaft courses, piers, sill, lintels, deck,
 * machicolation, roof slabs, terminal) is merged into ONE BufferGeometry, so a
 * whole tower draws in 3 calls — stone, timber (ladder), and the emissive
 * arrow-slits — plus a single point light. Realism comes from texture work and
 * baked vertex colours, not from extra geometry or draw calls:
 *  - a cached stone colour map + a derived normal map give lit bevel/relief;
 *  - per-vertex "story wear" darkens the eroded base and fades the wind-worn
 *    crown, breaking up tiling for free;
 *  - materials are shared module singletons reused across every tower.
 *
 * Form: a tapering coursed-stone shaft with a ground doorway (kurtulg keystone)
 * and arrow slits; an open windowed observation storey (corner piers + sill +
 * projecting machicolation); and the signature stepped pyramidal roof of thin
 * overhanging slabs rising to a pointed terminal stone (tsurko thulg). A timber
 * ladder up the shaft lifts the player through a hole in the deck to look down.
 */

const TIMBER = "#5c4327"
const SLIT_GLOW = "#9fc6e8"

interface VainakhTowerProps {
  /** World position of the tower foot (centre of the base). */
  position: [number, number, number]
  rotation?: [number, number, number]
  /** Overall height of the stone shaft (the roof rises above this). */
  height?: number
  /** Half-width of the square base. */
  baseHalf?: number
  /** Faint warm glow from the interior, e.g. candlelight. */
  litColor?: string
  /**
   * Optional baked GLB to use as the *visual* shell (hybrid mode). The
   * procedural colliders, ladder climb-zone and light are always used; the GLB
   * only replaces the merged stone/timber/slit meshes. If it fails to load the
   * procedural visual is shown instead, so the scene never breaks.
   *
   * Author the GLB to match the collider frame: foot centred at the origin
   * sitting on y=0, the doorway facing +Z, ~`baseHalf*2` wide at the base and
   * ~`height` tall to the deck (roof above). Tune fit with `modelScale` /
   * `modelOffsetY`.
   */
  modelUrl?: string
  /** Uniform scale applied to the GLB to fit the collider frame. */
  modelScale?: number
  /** Vertical nudge applied to the GLB. */
  modelOffsetY?: number
}

// ---- Shared materials (one set for every tower) ----
let _stoneMat: THREE.MeshStandardMaterial | null = null
let _timberMat: THREE.MeshStandardMaterial | null = null
let _slitMat: THREE.MeshStandardMaterial | null = null

function stoneMaterial(): THREE.MeshStandardMaterial {
  if (!_stoneMat) {
    const map = getTowerStoneTexture()
    const normalMap = getTowerStoneNormal()
    // Low repeat = large, readable dressed blocks (each course shows ~3 rows).
    map.repeat.set(1.3, 0.5)
    normalMap.repeat.set(1.3, 0.5)
    _stoneMat = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      vertexColors: true,
      roughness: 0.97,
      metalness: 0,
    })
  }
  return _stoneMat
}
function timberMaterial(): THREE.MeshStandardMaterial {
  if (!_timberMat) {
    // Slight emissive on the ladder so the timber reads clearly in the dim
    // tower interior; without it the ladder vanishes into shadow.
    _timberMat = new THREE.MeshStandardMaterial({
      color: "#8b6a3a",
      emissive: "#3a280f",
      emissiveIntensity: 0.55,
      roughness: 0.85,
    })
  }
  return _timberMat
}
function slitMaterial(): THREE.MeshStandardMaterial {
  if (!_slitMat) {
    _slitMat = new THREE.MeshStandardMaterial({
      color: "#0a0f1c",
      emissive: new THREE.Color(SLIT_GLOW),
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    })
  }
  return _slitMat
}

/** Story-wear vertex tint by local height: eroded warm base → clean mid →
 * faded cool crown, optionally scaled darker for accent pieces. */
function woreColor(
  y: number,
  obsY: number,
  height: number,
  mul: number,
): [number, number, number] {
  const base: [number, number, number] = [0.58, 0.51, 0.43]
  const mid: [number, number, number] = [0.92, 0.87, 0.78]
  const top: [number, number, number] = [0.85, 0.86, 0.91]
  const b1 = obsY * 0.22
  const t1 = obsY * 0.85
  let c: [number, number, number]
  if (y < b1) {
    const k = THREE.MathUtils.clamp(y / b1, 0, 1)
    c = [
      THREE.MathUtils.lerp(base[0], mid[0], k),
      THREE.MathUtils.lerp(base[1], mid[1], k),
      THREE.MathUtils.lerp(base[2], mid[2], k),
    ]
  } else if (y < t1) {
    c = mid
  } else {
    const k = THREE.MathUtils.clamp((y - t1) / (height + 3 - t1), 0, 1)
    c = [
      THREE.MathUtils.lerp(mid[0], top[0], k),
      THREE.MathUtils.lerp(mid[1], top[1], k),
      THREE.MathUtils.lerp(mid[2], top[2], k),
    ]
  }
  return [c[0] * mul, c[1] * mul, c[2] * mul]
}

export function VainakhTower({
  position,
  rotation = [0, 0, 0],
  height = 18,
  baseHalf = 1.9,
  litColor = "#f4a261",
  modelUrl,
  modelScale = 1,
  modelOffsetY = 0,
}: VainakhTowerProps) {
  const topHalf = baseHalf * 0.6 // ~6° inward batter at full height
  const wallT = 0.34
  const doorW = 1.3
  const doorH = 2.5

  const obsY = height - 2.8 // observation-storey floor
  const tsHalf = THREE.MathUtils.lerp(baseHalf, topHalf, obsY / height)
  // The GLB flares the top storey OUT to a wide corbelled fighting platform
  // (authentic machicolation) so the deck is roomy. Deck/sill/colliders use
  // `fHalf` (must match the Blender build), not the tapered shaft `tsHalf`.
  const fHalf = 1.78
  // Interior floor surface y (flush with the ramp top so there's no lip).
  const floorTopY = 0.0

  // Ladder shaft: ladder mesh at `ladderZ` (toward the north wall), player
  // stands `standoff` south of it while climbing. Hole kept small so the deck
  // stays walkable; it just has to clear the ladder + the standing capsule.
  const ladderZ = -0.7
  const ladderHalfW = 0.4
  const standoff = 0.5
  const standZ = ladderZ + standoff
  const holeHalfX = 0.62
  const holeZMin = ladderZ - 0.5 // behind the ladder
  const holeZMax = standZ + 0.45 // ahead of the stand point
  const holeCenterZ = (holeZMin + holeZMax) / 2
  const holeHalfZ = (holeZMax - holeZMin) / 2

  // Observation-storey dims (flared platform).
  const sillH = 0.95
  const sillMidY = obsY + sillH / 2
  const pierH = height - obsY
  const pierHalf = 0.22
  const pierOff = tsHalf - pierHalf
  const lintelY = height - 0.35

  // Deck frame around the central hole, sized to the flared platform `fHalf`.
  const southHalfZ = (fHalf - holeZMax) / 2
  const southCz = (holeZMax + fHalf) / 2
  const northHalfZ = (holeZMin + fHalf) / 2 // (-fHalf to holeZMin)
  const northCz = (-fHalf + holeZMin) / 2
  const sideHalfX = (fHalf - holeHalfX) / 2
  const sideCx = (holeHalfX + fHalf) / 2
  const sideHalfZ = (holeZMax - holeZMin) / 2
  const sideCz = holeCenterZ

  // Mid-level floors (the GLB's timber joist/plank decks at these heights) —
  // real, solid, walkable floor with only the small ladder hole cut out
  // (same footprint as the deck hole above), not the open single-shaft void
  // the climb column used to be. Shaft half-width tapers linearly with
  // height, same curve as `tsHalf`.
  const MID_FLOOR_YS = [4.0, 7.6, 11.2]
  const halfAt = (y: number) => THREE.MathUtils.lerp(baseHalf, topHalf, y / height)

  // Roof.
  const eaveHalf = tsHalf + 0.5
  const roofSteps = 13
  const stepRise = 0.21
  const tsurkoY = height + 0.08 + roofSteps * stepRise + 0.2

  // ---- Register the climb volume (world space, rotation-aware) ----
  // Stable scalar deps (not the `position` array) so the effect doesn't churn
  // every render — a churning effect was unregistering the zone the same frame
  // the player tried to climb, making the ladder appear broken. Tower rotation
  // around Y is applied to the local ladder offset so a rotated tower still
  // finds its climb shaft, and the half-widths are bumped to sqrt(2)*0.6 so
  // the axis-aligned zone still covers the rotated shaft footprint.
  const px = position[0], py = position[1], pz = position[2]

  // ---- Measure real ground height under the stairs (rotation-aware) ----
  // The stair ramp collider used to assume a fixed drop (-0.6 over the run)
  // tuned for one hand-placed instance. Towers get repositioned per-site via
  // the P-editor onto uneven snow, so a hardcoded drop silently goes wrong —
  // the ramp floats above or buries under the real terrain and the player
  // can't walk up. Raycast straight down at the door threshold and at the
  // stair foot (same technique as <GroundAnchor>) and build the ramp from
  // the ACTUAL measured heights instead of an assumption.
  const { scene } = useThree()
  const rampNearLocalZ = 1.9 // door threshold, matches the door cut
  const rampFarLocalZ = 3.34 // outer edge of the lowest stair tier
  const [rampDrop, setRampDrop] = useState(0.6) // sensible fallback until measured
  useEffect(() => {
    const cosY = Math.cos(rotation[1])
    const sinY = Math.sin(rotation[1])
    const toWorld = (localZ: number) => ({
      x: px + localZ * sinY,
      z: pz + localZ * cosY,
    })
    const ray = new THREE.Raycaster()
    const down = new THREE.Vector3(0, -1, 0)
    const measure = (localZ: number): number | null => {
      const { x, z } = toWorld(localZ)
      ray.set(new THREE.Vector3(x, py + 50, z), down)
      ray.far = 200
      const hits = ray.intersectObjects(scene.children, true)
      const hit = hits.find((h) => {
        const m = h.object as THREE.Mesh
        return m.isMesh && m.visible && !(m.material as THREE.Material)?.transparent
      })
      return hit ? hit.point.y - py : null
    }
    let cancelled = false
    let attempts = 0
    const tryMeasure = () => {
      if (cancelled) return
      attempts++
      const nearY = measure(rampNearLocalZ)
      const farY = measure(rampFarLocalZ)
      if (nearY != null && farY != null) {
        // Drop relative to the door threshold, clamped to a sane walkable
        // range so a raycast miss/oddity can't produce an unclimbable cliff.
        const drop = THREE.MathUtils.clamp(nearY - farY, 0.15, 1.4)
        setRampDrop(drop)
        return
      }
      if (attempts < 60) requestAnimationFrame(tryMeasure)
    }
    requestAnimationFrame(tryMeasure)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [px, py, pz, rotation[1], scene])
  const rotY = rotation[1]
  useEffect(() => {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY)
    // local (0, ladderZ) → world offset via Y-rotation
    const ladderWx = ladderZ * sinY
    const ladderWz = ladderZ * cosY
    // stand point: local (0, standZ) → world. Player stands south of the
    // ladder so the ladder is in front of the camera while climbing.
    const standWx = standZ * sinY
    const standWz = standZ * cosY
    // dismount direction: local +Z (south, toward door), rotated
    const dismountX = sinY
    const dismountZ = cosY
    // hole centre world (local (0, holeCenterZ) rotated)
    const holeCx = px + holeCenterZ * sinY
    const holeCz = pz + holeCenterZ * cosY
    // exit point: on the solid south deck, past the hole's south edge
    const exitLocalZ = holeZMax + 0.55
    const exitX = px + exitLocalZ * sinY
    const exitZ = pz + exitLocalZ * cosY
    return registerClimbZone({
      cx: px + ladderWx,
      cz: pz + ladderWz,
      standX: px + standWx,
      standZ: pz + standWz,
      halfX: 1.0,
      halfZ: 1.0,
      baseY: py + floorTopY,
      topY: py + obsY + 1.0,
      dismountX,
      dismountZ,
      holeCx,
      holeCz,
      // Tight: auto-descent only triggers when the player is genuinely
      // centred over the hole, not merely near it.
      holeHalfX: 0.55,
      holeHalfZ: 0.55,
      exitX,
      exitZ,
    })
  }, [px, py, pz, rotY, ladderZ, standZ, obsY, holeCenterZ, holeHalfX, holeHalfZ])

  // ---- Build the three merged geometries once per shape ----
  const { stoneGeo, timberGeo, slitGeo, floorsGeo, wrapGeo } = useMemo(() => {
    const stone: { geo: THREE.BufferGeometry; mul: number }[] = []
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) =>
      new THREE.BoxGeometry(w, h, d).translate(x, y, z)
    const add = (geo: THREE.BufferGeometry, mul = 1) => stone.push({ geo, mul })

    // Shaft courses (0 → obsY), tapering. Door faces are split on low courses.
    const n = 14
    for (let i = 0; i < n; i++) {
      const cy = ((i + 0.5) * obsY) / n
      const half = THREE.MathUtils.lerp(baseHalf, tsHalf, (i + 0.5) / n)
      const h = obsY / n + 0.06 // slight overlap so courses sit flush
      const doorGap = cy < doorH ? doorW : 0
      add(box(half * 2, h, wallT, 0, cy, -half + wallT / 2)) // north
      add(box(wallT, h, half * 2, half - wallT / 2, cy, 0)) // east
      add(box(wallT, h, half * 2, -half + wallT / 2, cy, 0)) // west
      if (doorGap > 0) {
        const postW = half - doorGap / 2
        add(box(postW, h, wallT, doorGap / 2 + postW / 2, cy, half - wallT / 2))
        add(box(postW, h, wallT, -(doorGap / 2 + postW / 2), cy, half - wallT / 2))
      } else {
        add(box(half * 2, h, wallT, 0, cy, half - wallT / 2)) // south
      }
    }

    // Doorway keystone (kurtulg).
    add(box(doorW + 0.7, 0.36, wallT + 0.06, 0, doorH + 0.18, baseHalf - wallT / 2))

    // Observation deck frame (south strip + two side strips).
    add(box(tsHalf * 2, 0.12, southHalfZ * 2, 0, obsY + 0.06, southCz), 0.7)
    add(box(tsHalf * 2, 0.12, northHalfZ * 2, 0, obsY + 0.06, northCz), 0.7)
    add(box(sideHalfX * 2, 0.12, sideHalfZ * 2, sideCx, obsY + 0.06, sideCz), 0.7)
    add(box(sideHalfX * 2, 0.12, sideHalfZ * 2, -sideCx, obsY + 0.06, sideCz), 0.7)

    // Window sill ring.
    add(box(tsHalf * 2, sillH, 0.26, 0, sillMidY, -tsHalf + 0.13))
    add(box(tsHalf * 2, sillH, 0.26, 0, sillMidY, tsHalf - 0.13))
    add(box(0.26, sillH, tsHalf * 2, -tsHalf + 0.13, sillMidY, 0))
    add(box(0.26, sillH, tsHalf * 2, tsHalf - 0.13, sillMidY, 0))

    // Corner piers carrying the roof.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(box(pierHalf * 2, pierH, pierHalf * 2, sx * pierOff, obsY + pierH / 2, sz * pierOff))

    // Window lintels (arched heads) under the eaves.
    add(box(tsHalf * 2 - 0.6, 0.5, 0.26, 0, lintelY, -tsHalf + 0.13))
    add(box(tsHalf * 2 - 0.6, 0.5, 0.26, 0, lintelY, tsHalf - 0.13))
    add(box(0.26, 0.5, tsHalf * 2 - 0.6, -tsHalf + 0.13, lintelY, 0))
    add(box(0.26, 0.5, tsHalf * 2 - 0.6, tsHalf - 0.13, lintelY, 0))

    // Projecting machicolation box (cherh) on the front (+Z) face + corbels.
    add(box(0.95, 0.8, 0.55, 0.4, obsY + 1.05, tsHalf + 0.27))
    add(box(0.16, 0.3, 0.45, 0.0, obsY + 0.55, tsHalf + 0.22), 0.6)
    add(box(0.16, 0.3, 0.45, 0.8, obsY + 0.55, tsHalf + 0.22), 0.6)

    // Stepped pyramidal roof (thin overhanging slabs) — slight offset jitter so
    // the courses don't read as perfectly machined.
    let jseed = 7
    const jr = () => ((jseed = (jseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5)
    for (let i = 0; i < roofSteps; i++) {
      const t = i / (roofSteps - 1)
      const half = THREE.MathUtils.lerp(eaveHalf, 0.12, t)
      const sy = height + 0.08 + i * stepRise
      add(box(half * 2, 0.16, half * 2, jr() * 0.06, sy, jr() * 0.06))
    }
    // Tsurko terminal stone.
    add(new THREE.ConeGeometry(0.2, 0.6, 4).translate(0, tsurkoY, 0))

    // Bake story-wear vertex colours per geo, then merge.
    for (const { geo, mul } of stone) {
      const p = geo.attributes.position
      const col = new Float32Array(p.count * 3)
      for (let i = 0; i < p.count; i++) {
        const [r, g, b] = woreColor(p.getY(i), obsY, height, mul)
        col[i * 3] = r
        col[i * 3 + 1] = g
        col[i * 3 + 2] = b
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3))
    }
    const stoneGeo = mergeGeometries(stone.map((s) => s.geo))!
    stone.forEach((s) => s.geo.dispose())

    // Timber ladder (rails + rungs).
    const timber: THREE.BufferGeometry[] = []
    for (const x of [-ladderHalfW, ladderHalfW])
      timber.push(box(0.08, obsY - floorTopY, 0.08, x, (floorTopY + obsY) / 2, ladderZ))
    for (let y = floorTopY + 0.4; y < obsY - 0.1; y += 0.42)
      timber.push(box(ladderHalfW * 2, 0.06, 0.07, 0, y, ladderZ))
    const timberGeo = mergeGeometries(timber)!
    timber.forEach((g) => g.dispose())

    // Leather grip-wraps on the rails at hand heights — worn-by-use detail.
    const wraps: THREE.BufferGeometry[] = []
    for (const x of [-ladderHalfW, ladderHalfW])
      for (const k of [0.22, 0.48, 0.74])
        wraps.push(box(0.105, 0.2, 0.105, x, floorTopY + (obsY - floorTopY) * k, ladderZ))
    const wrapGeo = mergeGeometries(wraps)!
    wraps.forEach((g) => g.dispose())

    // Arrow slits (recessed emissive planes) up the shaft faces.
    const slitYs = [doorH + 1.8, obsY * 0.45, obsY * 0.62, obsY * 0.8]
    const faces: [number, number, number][] = [
      [0, 1, 0],
      [Math.PI / 2, 1, 0],
      [Math.PI, -1, 0],
      [-Math.PI / 2, -1, 0],
    ]
    const slitGeos: THREE.BufferGeometry[] = []
    slitYs.forEach((sy, i) => {
      const rotY = faces[i % 4][0]
      const half = THREE.MathUtils.lerp(baseHalf, tsHalf, sy / obsY)
      const nx = Math.sin(rotY)
      const nz = Math.cos(rotY)
      const g = new THREE.PlaneGeometry(0.18, 0.9)
      const m = new THREE.Matrix4().makeRotationY(rotY)
      m.setPosition(nx * (half + 0.01), sy, nz * (half + 0.01))
      g.applyMatrix4(m)
      slitGeos.push(g)
    })
    const slitGeo = mergeGeometries(slitGeos)!
    slitGeos.forEach((g) => g.dispose())

    // Floors (ground + the 3 deck strips) share one flat material — merge into
    // a single geometry so each tower draws all its floors in ONE call instead
    // of five. Purely a draw-call win; identical visuals.
    const floors: THREE.BufferGeometry[] = [
      box(baseHalf * 1.85, 0.06, baseHalf * 1.85, 0, -0.02, 0),
      box(fHalf * 2 - 0.1, 0.1, southHalfZ * 2, 0, obsY + 0.04, southCz),
      box(fHalf * 2 - 0.1, 0.1, northHalfZ * 2, 0, obsY + 0.04, northCz),
      box(sideHalfX * 2, 0.1, sideHalfZ * 2, sideCx, obsY + 0.04, sideCz),
      box(sideHalfX * 2, 0.1, sideHalfZ * 2, -sideCx, obsY + 0.04, sideCz),
    ]
    const floorsGeo = mergeGeometries(floors)!
    floors.forEach((g) => g.dispose())

    return { stoneGeo, timberGeo, slitGeo, floorsGeo, wrapGeo }
  }, [
    height,
    baseHalf,
    topHalf,
    obsY,
    tsHalf,
    sillMidY,
    pierH,
    pierOff,
    lintelY,
    southCz,
    southHalfZ,
    northCz,
    northHalfZ,
    sideCx,
    sideCz,
    sideHalfX,
    sideHalfZ,
    eaveHalf,
    tsurkoY,
    holeZMax,
  ])

  // Dispose merged geometries on unmount / reshape.
  useEffect(() => {
    return () => {
      stoneGeo.dispose()
      timberGeo.dispose()
      slitGeo.dispose()
      floorsGeo.dispose()
      wrapGeo.dispose()
    }
  }, [stoneGeo, timberGeo, slitGeo, floorsGeo, wrapGeo])

  // The procedural stone shell — used directly, or as the GLB's load/error
  // fallback so the scene never breaks if the model is missing.
  const stoneVisual = (
    <mesh geometry={stoneGeo} material={stoneMaterial()} castShadow receiveShadow />
  )

  return (
    <group position={position} rotation={rotation}>
      {/* Stone shell: baked GLB (hybrid) or the procedural mesh. */}
      {modelUrl ? (
        <GLBBoundary fallback={stoneVisual}>
          <Suspense fallback={stoneVisual}>
            <TowerModel
              url={modelUrl}
              scale={modelScale}
              offsetY={modelOffsetY}
              towerPosition={position}
              cullRadius={baseHalf + 6}
            />
          </Suspense>
        </GLBBoundary>
      ) : (
        stoneVisual
      )}

      {/* Always procedural (not in the GLB): timber ladder, emissive arrow
          slits, kurtulg glyph — kept in code so they track the climb zone. */}
      {/* Interior ground-floor visual (the GLB has no floor; without this you
          look straight through the doorway into the void below). Stone plank
          surface flush with the floor collider. */}
      {/* Ground floor + top observation-deck floor strips, merged into one
          mesh (GLB has no floors). */}
      <mesh geometry={floorsGeo} receiveShadow>
        <meshStandardMaterial color="#3a342a" roughness={1} />
      </mesh>
      <mesh geometry={timberGeo} material={timberMaterial()} castShadow />
      <mesh geometry={wrapGeo}>
        <meshStandardMaterial color="#2a1f16" roughness={0.9} />
      </mesh>
      <mesh geometry={slitGeo} material={slitMaterial()} />
      <mesh position={[0, doorH + 0.18, baseHalf + 0.02]}>
        <planeGeometry args={[0.34, 0.24]} />
        <meshStandardMaterial
          color="#c2a98c"
          emissive="#c2a98c"
          emissiveIntensity={0.22}
          roughness={0.8}
        />
      </mesh>

      {/* Single interior light — placed high in the shaft so it reaches both
          the doorway below and the observation deck above. */}
      <pointLight
        position={[0, obsY * 0.7, 0]}
        color={litColor}
        intensity={2.4}
        distance={Math.max(12, height)}
        decay={2}
      />
      {/* Dim deck light over the signal brazier — the emissive embers/candles
          in the GLB glow but emit no actual light, so the deck stayed black. */}
      <pointLight
        position={[0.7, height + 0.7, 0.45]}
        color="#f0863c"
        intensity={1.1}
        distance={5.5}
        decay={2}
      />

      {/* Hearth smoke — thin column rising from the ground-floor fire pit. */}
      <HearthSmoke position={[1.36, 0.25, 1.49]} />

      {/* ---- Collision (lean: shaft room + door, deck frame, sill ring) ---- */}
      <RigidBody type="fixed" colliders={false}>
        {/* Stair ramp: invisible sloped collider over the GLB's 4-tier stone
            stairs on the south (+Z) face. A Rapier dynamic capsule can't
            "step up" discrete tiers, but it slides up a ramp, so this lets
            the player walk smoothly from the ground up to the doorway sill
            without jumping. Slope/drop is MEASURED against the real terrain
            (see the raycast effect above) instead of a hardcoded assumption —
            towers get repositioned onto uneven snow per-site, so a fixed drop
            silently stops matching the ground and blocks the stairs. */}
        <CuboidCollider
          args={[1.36, 0.04, (rampFarLocalZ - rampNearLocalZ) / 2]}
          position={[
            0,
            -rampDrop / 2,
            (rampNearLocalZ + rampFarLocalZ) / 2,
          ]}
          rotation={[
            Math.atan2(rampDrop, rampFarLocalZ - rampNearLocalZ),
            0,
            0,
          ]}
        />
        {/* Interior floor: top flush with the stair ramp top (y=0) so there's
            no lip at the doorway that could catch the capsule. */}
        <CuboidCollider args={[baseHalf, 0.1, baseHalf]} position={[0, -0.1, 0]} />
        {/* north, east, west shaft walls (0 → obsY) */}
        <CuboidCollider
          args={[baseHalf, obsY / 2, wallT / 2]}
          position={[0, obsY / 2, -baseHalf + wallT / 2]}
        />
        <CuboidCollider
          args={[wallT / 2, obsY / 2, baseHalf]}
          position={[baseHalf - wallT / 2, obsY / 2, 0]}
        />
        <CuboidCollider
          args={[wallT / 2, obsY / 2, baseHalf]}
          position={[-baseHalf + wallT / 2, obsY / 2, 0]}
        />
        {/* south wall: two jambs + lintel leaving the doorway gap */}
        {[-1, 1].map((sx) => {
          const jambW = (baseHalf - doorW / 2) / 2
          return (
            <CuboidCollider
              key={sx}
              args={[jambW, obsY / 2, wallT / 2]}
              position={[sx * (doorW / 2 + jambW), obsY / 2, baseHalf - wallT / 2]}
            />
          )
        })}
        <CuboidCollider
          args={[doorW / 2 + 0.35, (obsY - doorH) / 2, wallT / 2]}
          position={[0, doorH + (obsY - doorH) / 2, baseHalf - wallT / 2]}
        />
        {/* observation deck frame on the flared platform (around ladder hole) */}
        <CuboidCollider args={[fHalf, 0.08, southHalfZ]} position={[0, obsY, southCz]} />
        <CuboidCollider args={[fHalf, 0.08, northHalfZ]} position={[0, obsY, northCz]} />
        <CuboidCollider args={[sideHalfX, 0.08, sideHalfZ]} position={[sideCx, obsY, sideCz]} />
        <CuboidCollider args={[sideHalfX, 0.08, sideHalfZ]} position={[-sideCx, obsY, sideCz]} />
        {/* Mid-level floors (timber decks in the GLB) — real solid floor with
            only the ladder hole cut out, same footprint as the deck hole
            above. These used to have no collider at all, so the whole shaft
            was one continuous open drop between the ground and the deck —
            the floor you can visually see through the loopholes wasn't
            actually walkable. */}
        {MID_FLOOR_YS.map((fy) => {
          const half = halfAt(fy)
          const fSouthHalfZ = (half - holeZMax) / 2
          const fSouthCz = (holeZMax + half) / 2
          const fNorthHalfZ = (holeZMin + half) / 2
          const fNorthCz = (-half + holeZMin) / 2
          const fSideHalfX = (half - holeHalfX) / 2
          const fSideCx = (holeHalfX + half) / 2
          return (
            <group key={fy}>
              <CuboidCollider args={[half, 0.08, fSouthHalfZ]} position={[0, fy, fSouthCz]} />
              <CuboidCollider args={[half, 0.08, fNorthHalfZ]} position={[0, fy, fNorthCz]} />
              <CuboidCollider args={[fSideHalfX, 0.08, sideHalfZ]} position={[fSideCx, fy, sideCz]} />
              <CuboidCollider args={[fSideHalfX, 0.08, sideHalfZ]} position={[-fSideCx, fy, sideCz]} />
            </group>
          )
        })}
        {/* Ladder rails — solid, thin colliders so casually walking past the
            ladder (not climbing) bumps into it like a real object instead of
            passing straight through. The climb standoff point keeps the
            player capsule south of these rails while climbing, so it never
            has to overlap them. */}
        <CuboidCollider
          args={[0.06, obsY / 2, 0.06]}
          position={[-ladderHalfW, obsY / 2, ladderZ]}
        />
        <CuboidCollider
          args={[0.06, obsY / 2, 0.06]}
          position={[ladderHalfW, obsY / 2, ladderZ]}
        />
        {/* Top-storey wall ring — FULL height (obsY → eaves), not just a sill.
            A short sill let the player jump clear and escape through the open
            window above it; full-height collision keeps them in. Windows stay
            visually open (no mesh here, collision only). */}
        {(() => {
          const wallMidY = (obsY + height) / 2
          const wallHalfH = (height - obsY) / 2
          return (
            <>
              <CuboidCollider args={[fHalf, wallHalfH, 0.13]} position={[0, wallMidY, -fHalf + 0.13]} />
              <CuboidCollider args={[fHalf, wallHalfH, 0.13]} position={[0, wallMidY, fHalf - 0.13]} />
              <CuboidCollider args={[0.13, wallHalfH, fHalf]} position={[-fHalf + 0.13, wallMidY, 0]} />
              <CuboidCollider args={[0.13, wallHalfH, fHalf]} position={[fHalf - 0.13, wallMidY, 0]} />
            </>
          )
        })()}
        {/* Roof ceiling — thick cap so a fast jump can't tunnel through into
            the (collider-less) roof slabs. */}
        <CuboidCollider args={[fHalf, 0.4, fHalf]} position={[0, height - 0.2, 0]} />
        {/* Central stone pillar (erd-bIogIam) in the GLB — ground floor,
            west of the door path so the doorway and ladder shaft stay clear.
            Collider so the player can't clip through it. Matches the Blender
            build at (-1.15, -0.9) → game (-1.15, +0.9), 0.62 m square, up to
            the z=11.2 floor. */}
        <CuboidCollider args={[0.32, 5.6, 0.32]} position={[-1.15, 5.6, 0.9]} />
      </RigidBody>
    </group>
  )
}

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/** Meshes whose silhouette actually matters in the shadow map: the stone
 * shell, floors/joists, armor bodies, and the NPC's coat. Everything else
 * (arrows, jugs, gazyrs, candle flames…) skips shadow casting — P3 of
 * docs/tower-optimization-plan.md. */
const SHADOW_CASTER_PREFIXES = [
  "Ext_",
  "Int_Pillar",
  "Int_Planks_",
  "Int_Joists_",
  "Int_Ledges",
  "Int_Bench_",
  "Int_Vault",
  "Arm_MailShirt",
  "Arm_MailStand",
  "Arm_MailCoif",
  "NPC_Coat",
  "NPC_Papakha",
]

/** Faint smoke column above the hearth: a few crossed alpha planes drifting
 * upward on a loop. Purely ambient — no light, no physics. */
const SMOKE_PUFFS = 4
const SMOKE_RISE = 3.1
function HearthSmoke({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (REDUCED_MOTION || !group.current) return
    const t = clock.elapsedTime
    group.current.children.forEach((puff, i) => {
      const k = ((t * 0.12 + i / SMOKE_PUFFS) % 1 + 1) % 1
      puff.position.y = k * SMOKE_RISE
      puff.position.x = Math.sin(t * 0.4 + i * 2.1) * 0.08 * k
      const s = 0.25 + k * 0.55
      puff.scale.setScalar(s)
      const m = (puff as THREE.Group).children[0] as THREE.Mesh
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = 0.16 * Math.sin(k * Math.PI)
      puff.rotation.y = t * 0.15 + i
    })
  })
  return (
    <group position={position} ref={group}>
      {Array.from({ length: SMOKE_PUFFS }, (_, i) => (
        <group key={i}>
          {[0, Math.PI / 2].map((ry) => (
            <mesh key={ry} rotation={[0, ry, 0]}>
              <planeGeometry args={[0.7, 0.7]} />
              <meshBasicMaterial
                color="#9a948c"
                transparent
                opacity={REDUCED_MOTION ? 0.08 : 0}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** Node-name prefixes that live INSIDE the shaft — invisible from outside the
 * tower and pointless to render/shadow-pass until the player is near. The
 * stone shell, roof, and exterior dressing stay out of this list so the
 * tower's silhouette never pops when the interior culls. */
const INTERIOR_PREFIXES = [
  "Int_",
  "Decor_",
  "NPC_",
  "Arm_",
  "Istang_",
  "Hearth_",
]

/** How often (seconds) the near/far interior check re-evaluates. Cheap
 * distance check, but no need to run it every frame. */
const CULL_CHECK_INTERVAL = 0.25

/** Loads a baked GLB shell and clones it (so multiple towers can share one
 * cached load), enabling shadows. Visual only — no colliders.
 *
 * Interior meshes (floors, decor, armor, NPC, carpets — everything the
 * player can't see from outside) are reparented under one `Group` at mount
 * and toggled `visible` by the camera's horizontal distance, at 4 Hz. Two
 * towers standing apart means only the one you're near pays the ~30-mesh
 * interior draw-call + shadow cost — see P2 of
 * docs/tower-optimization-plan.md. */
function TowerModel({
  url,
  scale,
  offsetY,
  towerPosition,
  cullRadius,
}: {
  url: string
  scale: number
  offsetY: number
  towerPosition: [number, number, number]
  cullRadius: number
}) {
  const { scene } = useGLTF(url)
  const interiorGroup = useRef<THREE.Group | null>(null)
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    const interior = new THREE.Group()
    interior.name = "InteriorCullGroup"
    const toMove: THREE.Object3D[] = []
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = SHADOW_CASTER_PREFIXES.some((p) => o.name.startsWith(p))
        o.receiveShadow = true
      }
      // Only re-home top-level interior nodes (their children, like NPC_*
      // parented under NPC_Root, come along automatically).
      if (
        o.parent === c &&
        INTERIOR_PREFIXES.some((p) => o.name.startsWith(p))
      ) {
        toMove.push(o)
      }
    })
    toMove.forEach((o) => interior.add(o))
    c.add(interior)
    interiorGroup.current = interior
    return c
  }, [scene])

  // Idle sway for the seated NPC elder: the GLB parents all NPC_* meshes under
  // an "NPC_Root" empty at his hip, so one gentle rotation rocks him and the
  // pondar together — reads as breathing/strumming from across the room.
  const npcRoot = useMemo(() => cloned.getObjectByName("NPC_Root") ?? null, [cloned])
  const npcBaseRot = useMemo(() => npcRoot?.rotation.clone() ?? null, [npcRoot])

  const towerVec = useMemo(
    () => new THREE.Vector3(...towerPosition),
    [towerPosition],
  )
  const cullTimer = useRef(0)

  useFrame(({ clock, camera }, delta) => {
    const group = interiorGroup.current
    if (group) {
      cullTimer.current += delta
      if (cullTimer.current >= CULL_CHECK_INTERVAL) {
        cullTimer.current = 0
        // Horizontal distance only: climbing the ladder raises the camera,
        // and a straight-line distance to the tower's foot switched the
        // whole interior off around the player halfway up.
        const dx = camera.position.x - towerVec.x
        const dz = camera.position.z - towerVec.z
        const near = dx * dx + dz * dz < cullRadius * cullRadius
        if (group.visible !== near) group.visible = near
      }
    }

    if (REDUCED_MOTION || !npcRoot || !npcBaseRot || group?.visible === false) return
    const t = clock.elapsedTime
    npcRoot.rotation.z = npcBaseRot.z + Math.sin(t * 0.7) * 0.02
    npcRoot.rotation.x = npcBaseRot.x + Math.sin(t * 0.45 + 1.3) * 0.014
  })

  return <primitive object={cloned} scale={scale} position={[0, offsetY, 0]} />
}

/** Falls back to the procedural shell if the GLB throws (e.g. 404 / parse). */
class GLBBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
