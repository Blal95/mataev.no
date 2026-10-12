"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"
import { NIGHT, ULTRA, ULTRA_PALE } from "../../palette"

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}
`

// The curtain's shape changes only along the sky, so it is worked out once
// per column of vertices: where its bright hem hangs, and how strong it is
// there. The fragment shader only draws the rays.
const vertex = /* glsl */ `
uniform float uTime;
uniform float uNorth;
varying vec2 vUv;
varying float vHem;
varying float vGain;
${NOISE}
void main() {
  vUv = uv;
  float t = uTime * 0.05;
  float x = uv.x;
  vHem = 0.1 + fbm(vec2(x * 7.0 + t, t * 0.7)) * 0.3;
  float breaks = smoothstep(0.3, 0.75, fbm(vec2(x * 3.0 - t * 0.8, 1.7)));
  float north = 0.25 + 0.75 * (cos((x - uNorth) * 6.2831853) * 0.5 + 0.5);
  vGain = breaks * north;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uHem;
uniform vec3 uMid;
uniform vec3 uTop;
varying vec2 vUv;
varying float vHem;
varying float vGain;
${NOISE}
void main() {
  float y = vUv.y;
  // A bright hem, cut sharp below and fading up the sky, like the real thing.
  float body = smoothstep(vHem - 0.025, vHem + 0.01, y) * exp(-(y - vHem) * 3.0);
  float rays = 0.5 + 0.5 * noise(vec2(vUv.x * 260.0 + uTime * 0.2, y * 2.0));
  float a = body * rays * vGain * uIntensity;
  float h = clamp((y - vHem) / 0.55, 0.0, 1.0);
  vec3 col = mix(uHem, uMid, smoothstep(0.0, 0.3, h));
  col = mix(col, uTop, smoothstep(0.3, 1.0, h));
  gl_FragColor = vec4(col * a, 1.0);
}
`

/** Where north (-z) falls along the curtain's circle, 0–1. */
const NORTH = 0.5
const RADIUS = 95
// High enough that its hem clears the hills round the valley.
const HEIGHT = 64
const CENTRE_Y = 52

type AuroraAnimation = "static" | "animated" | "full"

interface AuroraShaderProps {
  /** "static" holds the curtain still (no per-frame work); "animated" moves
   *  it; "full" also lets the secret mode warm it. */
  animation?: AuroraAnimation
}

/**
 * The aurora, in the site's one hue: a curtain hung all the way round the
 * camp, strongest to the north, its hem the palest ultramarine, its rays
 * rising through the act colour into deep ultramarine. Added light, so the
 * bloom on capable machines picks the hem up.
 */
export function AuroraShader({ animation = "full" }: AuroraShaderProps = {}) {
  const ref = useRef<THREE.ShaderMaterial>(null)
  const secretModeRaw = useGameStore((s) => s.secretMode)
  const secretMode = animation === "full" && secretModeRaw

  const uniforms = useMemo(
    () => ({
      uTime: { value: 12 },
      uIntensity: { value: 1.0 },
      uNorth: { value: NORTH },
      uHem: { value: new THREE.Color(ULTRA_PALE) },
      uMid: { value: new THREE.Color(NIGHT.act) },
      uTop: { value: new THREE.Color(ULTRA) },
    }),
    [],
  )
  const wasSecret = useRef(false)

  useFrame((state, dt) => {
    const u = ref.current?.uniforms
    if (!u || animation === "static") return
    u.uTime.value += dt
    // A slow breath, 25 s round.
    u.uIntensity.value = 1.0 + Math.cos(state.clock.elapsedTime * 0.25) * 0.15
    if (wasSecret.current !== secretMode) {
      wasSecret.current = secretMode
      ;(u.uHem.value as THREE.Color).set(secretMode ? "#ffd9a8" : ULTRA_PALE)
      ;(u.uMid.value as THREE.Color).set(secretMode ? "#f4a261" : NIGHT.act)
      ;(u.uTop.value as THREE.Color).set(secretMode ? "#8b5cf6" : ULTRA)
    }
  })

  return (
    <mesh position={[0, CENTRE_Y, 0]} frustumCulled={false}>
      <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, 256, 1, true]} />
      <shaderMaterial
        ref={ref}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
