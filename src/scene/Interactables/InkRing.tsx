"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { NIGHT } from "../palette"

const vertex = /* glsl */ `
varying vec2 vPos;
void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Draws the ring up to `uProgress` of the way round, so it can be traced.
const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uProgress;
varying vec2 vPos;
void main() {
  float turn = atan(vPos.y, vPos.x) / 6.2831853 + 0.5;
  if (turn > uProgress) discard;
  gl_FragColor = vec4(uColor, uOpacity);
}
`

/** Seconds the ring takes to trace itself round. */
const TRACE_S = 0.45

/**
 * The ring on the ground at a station, drawn like a stroke of the site's
 * one ink. At rest it lies there faintly; when the crosshair lands on the
 * station it is traced round again, bright, the TRACE gesture of the page;
 * the station the camp wants you to start at breathes.
 */
export function InkRing({ active, emphasize, y }: { active: boolean; emphasize: boolean; y: number }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const was = useRef(false)
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(NIGHT.act) },
      uOpacity: { value: 0.22 },
      uProgress: { value: 1 },
    }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const u = material.current?.uniforms
    if (!u) return
    if (active && !was.current) u.uProgress.value = 0
    was.current = active
    u.uProgress.value = Math.min(1, u.uProgress.value + dt / TRACE_S)
    const breathe = emphasize ? 0.45 + Math.sin(clock.elapsedTime * 2.2) * 0.15 : 0.22
    u.uOpacity.value = active ? 0.9 : breathe
  })

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <ringGeometry args={[0.84, 0.92, 96]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
