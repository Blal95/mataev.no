"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore, type PanelId } from "@/hooks/useGameStore"
import { useEditorStore } from "../editor"
import { GUIDE_TARGETS, PANEL_TO_EDITABLE_ID } from "@/config/guideTargets"

/** Live station position: reads the SAME store the P-editor and every
 * `<Editable>` station use, so guided wind can never point at a stale
 * coordinate. Falls back to the documented default only until that
 * station's `<Editable>` has registered. */
function liveTarget(station: NonNullable<PanelId>): [number, number, number] | null {
  const editableId = PANEL_TO_EDITABLE_ID[station]
  const fallback = GUIDE_TARGETS[station] ?? null
  if (!editableId) return fallback
  const item = useEditorStore.getState().items[editableId]
  return item ? item.pos : fallback
}

// ---------- constants (see docs/guiding-wind-redesign-plan.md) ----------
const RIBBONS      = 6      // hard cap; usually 2–3 visible at once
const POINTS       = 24     // history points per ribbon
const VERTS        = RIBBONS * POINTS * 2
const SAMPLE_DT     = 0.028  // history sampling interval (coarser than frame rate)
const GUST_PERIOD   = 5.5    // seconds, Β± jitter below
const GUST_JITTER   = 1.5
const WAVE_MIN      = 2
const WAVE_MAX      = 3
const STAGGER_MIN   = 0.15
const STAGGER_MAX   = 0.3
const LIFE_BASE     = 3.8
const LIFE_JITTER   = 0.5
const FADE_IN       = 0.35
const FADE_OUT      = 0.8
const SPEED_PEAK    = 3.2
const WIDTH_HALF    = 0.055
const ARRIVE_DIST   = 5.5
const AHEAD_MIN     = 1.0
const AHEAD_MAX     = 3.0
const CONE_HALF     = THREE.MathUtils.degToRad(25)
const YAW_A1        = 0.55
const YAW_W1        = 0.35 * Math.PI * 2
const YAW_A2        = 0.18
const YAW_W2        = 1.1 * Math.PI * 2
const PARK          = new THREE.Vector3(0, -9999, 0)

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

// ---------- per-ribbon state ----------
interface Ribbon {
  active: boolean
  spawned: boolean       // has this activation actually laid down its spawn point yet
  pendingDelay: number   // seconds until this scheduled ribbon actually spawns
  life: number
  maxLife: number
  seed: number
  head: THREE.Vector3
  history: THREE.Vector3[]  // fixed-length ring buffer, POINTS long
  histIndex: number          // index of the newest sample
  sampleTimer: number
}

function makeRibbon(): Ribbon {
  return {
    active: false,
    spawned: false,
    pendingDelay: 0,
    life: 0,
    maxLife: LIFE_BASE,
    seed: 0,
    head: PARK.clone(),
    history: Array.from({ length: POINTS }, () => PARK.clone()),
    histIndex: 0,
    sampleTimer: 0,
  }
}

// ---------- reused scratch objects (no per-frame allocation) ----------
const _camPos   = new THREE.Vector3()
const _dir      = new THREE.Vector3()
const _tgt      = new THREE.Vector3()
const _spawnPos = new THREE.Vector3()
const _headDir  = new THREE.Vector3()
const _tangent  = new THREE.Vector3()
const _side     = new THREE.Vector3()
const _toCam    = new THREE.Vector3()
const _up       = new THREE.Vector3(0, 1, 0)
const _left     = new THREE.Vector3()
const _right    = new THREE.Vector3()

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const VERT = /* glsl */ `
  attribute float aU;
  attribute float aSide;
  attribute float aAlpha;
  varying float vU;
  varying float vSide;
  varying float vAlpha;
  void main() {
    vU = aU;
    vSide = aSide;
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  uniform float uGlobalAlpha;
  varying float vU;
  varying float vSide;
  varying float vAlpha;

  void main() {
    float lat  = 1.0 - smoothstep(0.25, 1.0, abs(vSide));
    float lon  = pow(clamp(vU, 0.0, 1.0), 1.6);
    float head = 1.0 - smoothstep(0.82, 1.0, vU) * 0.35;

    vec3 cyan = vec3(0.55, 0.80, 0.94);
    vec3 pale = vec3(0.94, 0.98, 1.00);
    vec3 col  = mix(cyan, pale, vU);

    float a = lat * lon * head * vAlpha * uGlobalAlpha * 0.55;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`

/**
 * Ghost-of-Tsushima-style guiding wind — v2: ribbon-trail strokes.
 *
 * A handful of curved ribbons (curl-noise yaw on the flow direction, not a
 * straight line) sweep low across the snow in staggered gusts, then vanish
 * entirely between waves. Each ribbon is a real history trail (not a rigid
 * dash) — thin tail, full mid-body, tapered head, with a "calligraphy flick"
 * (lift + extra curl) as it dissolves at the end of its life.
 *
 * One draw call for all ribbons: a single indexed BufferGeometry, positions
 * rewritten every frame from each ribbon's sampled history.
 */
export function GuidingWind() {
  const guidedStation    = useGameStore((s) => s.guidedStation)
  const setGuidedStation = useGameStore((s) => s.setGuidedStation)
  const { camera }       = useThree()

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const position = new Float32Array(VERTS * 3)
    const aU = new Float32Array(VERTS)
    const aSide = new Float32Array(VERTS)
    const aAlpha = new Float32Array(VERTS)

    for (let r = 0; r < RIBBONS; r++) {
      for (let i = 0; i < POINTS; i++) {
        const u = i / (POINTS - 1)
        const base = (r * POINTS + i) * 2
        aU[base] = u
        aU[base + 1] = u
        aSide[base] = -1
        aSide[base + 1] = 1
      }
    }

    const indices: number[] = []
    for (let r = 0; r < RIBBONS; r++) {
      const rBase = r * POINTS * 2
      for (let i = 0; i < POINTS - 1; i++) {
        const vL0 = rBase + i * 2
        const vR0 = vL0 + 1
        const vL1 = vL0 + 2
        const vR1 = vL0 + 3
        indices.push(vL0, vR0, vL1, vR0, vR1, vL1)
      }
    }

    geo.setAttribute("position", new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute("aU", new THREE.BufferAttribute(aU, 1))
    geo.setAttribute("aSide", new THREE.BufferAttribute(aSide, 1))
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(aAlpha, 1).setUsage(THREE.DynamicDrawUsage))
    geo.setIndex(indices)
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200)
    return geo
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent:    true,
        depthWrite:     false,
        depthTest:      true,
        blending:       THREE.NormalBlending,
        side:           THREE.DoubleSide,
        uniforms:       { uGlobalAlpha: { value: 0.0 } },
        vertexShader:   VERT,
        fragmentShader: FRAG,
      }),
    [],
  )

  const meshRef    = useRef<THREE.Mesh>(null)
  const ribbons    = useRef<Ribbon[]>([])
  const opacityNow = useRef(0)
  const prevGuided = useRef<typeof guidedStation>(null)
  const gustTimer  = useRef(0) // counts down to next gust wave

  useEffect(() => {
    ribbons.current = Array.from({ length: RIBBONS }, makeRibbon)
    gustTimer.current = 0.4 // first gust arrives quickly once guided
  }, [])

  useFrame((state, rawDt) => {
    if (REDUCED_MOTION) return
    const mesh = meshRef.current
    if (!mesh) return
    if (useGameStore.getState().paused) return
    const dt = Math.min(rawDt, 0.05)

    const target = guidedStation ? liveTarget(guidedStation) : null
    const wantOp = target ? 1.0 : 0.0
    opacityNow.current = THREE.MathUtils.lerp(opacityNow.current, wantOp, dt * 3.0)
    ;(material.uniforms.uGlobalAlpha as { value: number }).value = opacityNow.current

    if (!target && opacityNow.current < 0.01) {
      prevGuided.current = null
      return
    }

    camera.getWorldPosition(_camPos)

    if (target) {
      _tgt.set(target[0], target[1], target[2])
      if (_camPos.distanceTo(_tgt) < ARRIVE_DIST) {
        setGuidedStation(null)
        return
      }
      _dir.subVectors(_tgt, _camPos).setY(0).normalize()
    }

    // Station switched mid-flight: let the current wave keep flying (it'll
    // re-aim via the live `_dir` above); just reset the gust clock so a
    // fresh wave toward the new target arrives soon.
    if (guidedStation && guidedStation !== prevGuided.current) {
      prevGuided.current = guidedStation
      gustTimer.current = Math.min(gustTimer.current, 0.5)
    }

    const rs = ribbons.current
    const now = state.clock.elapsedTime

    // ---- gust scheduling ----
    if (target) {
      gustTimer.current -= dt
      if (gustTimer.current <= 0) {
        gustTimer.current = GUST_PERIOD + (Math.random() * 2 - 1) * GUST_JITTER
        const dormant = rs.reduce<number[]>((acc, r, i) => {
          if (!r.active) acc.push(i)
          return acc
        }, [])
        const waveSize = Math.min(
          dormant.length,
          WAVE_MIN + Math.floor(Math.random() * (WAVE_MAX - WAVE_MIN + 1)),
        )
        for (let k = 0; k < waveSize; k++) {
          const idx = dormant[Math.floor(Math.random() * dormant.length)]
          dormant.splice(dormant.indexOf(idx), 1)
          const r = rs[idx]
          r.active = true
          r.spawned = false
          r.pendingDelay = k * (STAGGER_MIN + Math.random() * (STAGGER_MAX - STAGGER_MIN))
          r.life = -r.pendingDelay // counts up through 0 at actual activation
          r.maxLife = LIFE_BASE + (Math.random() * 2 - 1) * LIFE_JITTER
          r.seed = Math.random() * 1000
        }
      }
    }

    // ---- per-ribbon update ----
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute
    const alphaAttr = geometry.getAttribute("aAlpha") as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const alphaArr = alphaAttr.array as Float32Array

    for (let ri = 0; ri < RIBBONS; ri++) {
      const r = rs[ri]

      if (!r.active) {
        // Dormant: park + zero alpha for this ribbon's whole vertex range.
        const base = ri * POINTS * 2
        for (let i = 0; i < POINTS * 2; i++) {
          const vi = (base + i) * 3
          posArr[vi] = PARK.x
          posArr[vi + 1] = PARK.y
          posArr[vi + 2] = PARK.z
          alphaArr[base + i] = 0
        }
        continue
      }

      r.life += dt

      // Still staggering before actually spawning this frame.
      if (r.life < 0) {
        const base = ri * POINTS * 2
        for (let i = 0; i < POINTS * 2; i++) alphaArr[base + i] = 0
        continue
      }

      // Just activated: spawn ahead of the camera inside a cone toward the
      // target, at snow height, and reset the trail so it grows out fresh
      // instead of resuming from a previous life's stale positions.
      if (!r.spawned && target) {
        const coneAngle = (Math.random() * 2 - 1) * CONE_HALF
        _headDir.copy(_dir).applyAxisAngle(_up, coneAngle)
        const ahead = AHEAD_MIN + Math.random() * (AHEAD_MAX - AHEAD_MIN)
        _spawnPos.set(
          _camPos.x + _headDir.x * ahead,
          _camPos.y - 1.62 + 0.35,
          _camPos.z + _headDir.z * ahead,
        )
        r.head.copy(_spawnPos)
        for (const h of r.history) h.copy(_spawnPos)
        r.histIndex = 0
        r.sampleTimer = 0
        r.spawned = true
      }

      if (r.life >= r.maxLife) {
        r.active = false
        r.spawned = false
        continue
      }

      const prog = THREE.MathUtils.clamp(r.life / r.maxLife, 0, 1)

      // Life envelope: fade in β†’ sustain β†’ fade out.
      let env: number
      if (r.life < FADE_IN) env = r.life / FADE_IN
      else if (r.life > r.maxLife - FADE_OUT) env = (r.maxLife - r.life) / FADE_OUT
      else env = 1

      // Calligraphy flick: last FADE_OUT seconds lift + curl harder.
      const flickT =
        r.life > r.maxLife - FADE_OUT
          ? smoothstep(0, 1, (r.life - (r.maxLife - FADE_OUT)) / FADE_OUT)
          : 0
      const yawMul = 1 + flickT
      const lift = flickT * 0.6

      if (target) {
        // Curved flow: two sine octaves bend the travel direction, easing
        // straight as the ribbon ages (except during the end-of-life flick).
        const straighten = flickT > 0 ? 1 : 1 - prog * 0.7
        const yaw =
          (YAW_A1 * Math.sin(now * YAW_W1 + r.seed) +
            YAW_A2 * Math.sin(now * YAW_W2 + r.seed * 2.7)) *
          straighten *
          yawMul

        _headDir.copy(_dir).applyAxisAngle(_up, yaw)
        const gust = env // motion breathes with the same envelope as alpha
        const speed = SPEED_PEAK * (0.85 + 0.3 * Math.sin(r.seed)) * (0.4 + gust * 0.6)

        r.head.x += _headDir.x * speed * dt
        r.head.z += _headDir.z * speed * dt
        r.head.y =
          _camPos.y - 1.62 + 0.35 + Math.sin(now * 0.5 + r.seed) * 0.25 + lift

        // Sample into the ring buffer on its own cadence (coarser than
        // frame rate β†’ longer, smoother-reading ribbons).
        r.sampleTimer += dt
        if (r.sampleTimer >= SAMPLE_DT) {
          r.sampleTimer = 0
          r.histIndex = (r.histIndex + 1) % POINTS
          r.history[r.histIndex].copy(r.head)
        }
      }

      // ---- rebuild this ribbon's verts from its history ring ----
      const base = ri * POINTS * 2
      for (let i = 0; i < POINTS; i++) {
        const u = i / (POINTS - 1)
        const slot = (r.histIndex + 1 + i) % POINTS // oldest β†’ newest
        const p = r.history[slot]
        const prevSlot = (slot - 1 + POINTS) % POINTS
        const nextSlot = (slot + 1) % POINTS
        const pPrev = r.history[i === 0 ? slot : prevSlot]
        const pNext = r.history[i === POINTS - 1 ? slot : nextSlot]

        _tangent.subVectors(pNext, pPrev)
        if (_tangent.lengthSq() < 1e-6) _tangent.set(_dir.x, 0, _dir.z)
        _toCam.subVectors(_camPos, p)
        _side.crossVectors(_tangent, _toCam)
        if (_side.lengthSq() < 1e-6) _side.crossVectors(_tangent, _up)
        _side.normalize()

        const halfW = WIDTH_HALF * Math.pow(Math.max(u, 0.001), 0.45) * (1 - smoothstep(0.85, 1, u) * 0.6)
        _left.copy(p).addScaledVector(_side, -halfW)
        _right.copy(p).addScaledVector(_side, halfW)

        const vL = (base + i * 2) * 3
        const vR = vL + 3
        posArr[vL] = _left.x
        posArr[vL + 1] = _left.y
        posArr[vL + 2] = _left.z
        posArr[vR] = _right.x
        posArr[vR + 1] = _right.y
        posArr[vR + 2] = _right.z

        const a = env
        alphaArr[base + i * 2] = a
        alphaArr[base + i * 2 + 1] = a
      }
    }

    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
  })

  if (REDUCED_MOTION) return null

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={999} />
  )
}
