"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"

interface Props {
  count?: number
  area?: number
  height?: number
}

const vertex = /* glsl */ `
attribute vec3 aDrift;
attribute float aSeed;
uniform float uTime;
uniform vec2 uWind;
uniform float uSize;
uniform float uArea;
uniform float uHeight;
varying float vDepth;
varying float vAlpha;
void main() {
  // Each flake has a stable fall speed, wrapping cleanly top-to-bottom.
  float fallSpeed = 0.5 + aSeed * 0.35;
  float period = (uHeight + 4.0) / fallSpeed;
  // Per-flake phase offset so they're spread over the full cycle at t=0
  float t = mod(uTime * fallSpeed + aSeed * period, period);

  vec3 p = position;
  // Y: falls from top to bottom, wraps
  p.y = uHeight - t * fallSpeed;
  // Unified wind drift — all flakes share the same wind, accumulating with fall
  float windAccum = t;
  p.x = position.x + uWind.x * windAccum;
  p.z = position.z + uWind.y * windAccum;
  // Gentle individual sway — low frequency, small amplitude
  p.x += sin(uTime * 0.35 + aSeed * 6.28318) * 0.4;
  p.z += cos(uTime * 0.28 + aSeed * 6.28318) * 0.25;
  // Wrap X/Z inside area so flakes stay around player
  float halfArea = uArea * 0.5;
  p.x = mod(p.x + halfArea, uArea) - halfArea;
  p.z = mod(p.z + halfArea, uArea) - halfArea;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  // Fade near edges of fall to avoid pop
  float fadeY = smoothstep(0.0, 3.0, uHeight - t * fallSpeed) * smoothstep(0.0, 3.0, t * fallSpeed);
  vAlpha = fadeY;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (280.0 / max(-mv.z, 1.0));
}
`

const fragment = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
varying float vDepth;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float dist = length(c);
  // Soft gaussian-like falloff for clean round flakes
  float a = exp(-dist * dist * 14.0);
  a = a * smoothstep(0.5, 0.2, dist);
  // Depth fade — distant flakes subtler
  float depthFade = smoothstep(60.0, 5.0, vDepth);
  gl_FragColor = vec4(uColor, a * 0.7 * vAlpha * mix(0.4, 1.0, depthFade));
}
`

function generateSnowBuffers(count: number, area: number, height: number) {
  const positions = new Float32Array(count * 3)
  const drift = new Float32Array(count * 3) // kept for attribute slot, unused in new shader
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // Spread XZ randomly across area; Y spread handled by seed phase in shader
    positions[i * 3 + 0] = (Math.random() - 0.5) * area
    positions[i * 3 + 1] = Math.random() * height
    positions[i * 3 + 2] = (Math.random() - 0.5) * area
    drift[i * 3 + 0] = 0
    drift[i * 3 + 1] = 0
    drift[i * 3 + 2] = 0
    seeds[i] = Math.random()
  }
  return { positions, drift, seeds }
}

/**
 * GPU-animated snow. Positions, drift, and seed live in static buffer attributes;
 * vertex shader does all motion. Per-frame CPU cost: 1 uniform update + camera-
 * follow group translate. No `needsUpdate=true` upload.
 */
export function Snow({ count = 280, area = 70, height = 30 }: Props) {
  const ref = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const dummy = useRef(new THREE.Vector3())
  const secretMode = useGameStore((s) => s.secretMode)

  const { positions, drift, seeds } = useMemo(
    () => generateSnowBuffers(count, area, height),
    [count, area, height]
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector2(0, 0) },
      uColor: { value: new THREE.Color("#ffffff") },
      uSize: { value: 0.09 },
      uArea: { value: area },
      uHeight: { value: height },
    }),
    [area, height]
  )

  useFrame((state) => {
    if (!ref.current || !matRef.current) return
    const t = state.clock.elapsedTime
    uniforms.uTime.value = t
    // Slow, smooth wind gusts — speed units/sec in XZ
    uniforms.uWind.value.set(Math.sin(t * 0.07) * 0.18 + 0.1, Math.cos(t * 0.05) * 0.08)
    uniforms.uColor.value.set(secretMode ? "#f4a261" : "#ffffff")

    // Follow camera (XZ only)
    const cam = state.camera.position
    dummy.current.set(cam.x, 0, cam.z)
    ref.current.position.copy(dummy.current)
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aDrift"
          args={[drift, 3]}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSeed"
          args={[seeds, 1]}
          count={count}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
