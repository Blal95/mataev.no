"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Billboard } from "@react-three/drei"
import * as THREE from "three"
import { FIRE } from "../palette"

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// A tongue of fire: a teardrop that narrows as it rises, pushed about by
// noise scrolling upward, white-yellow at the core and orange at the edge.
const fragment = /* glsl */ `
uniform float uTime;
uniform vec3 uHot;
uniform vec3 uCool;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  float h = vUv.y;
  float n = noise(vec2(vUv.x * 4.0, h * 5.0 - uTime * 3.0)) * 0.6 + noise(vec2(vUv.x * 9.0, h * 9.0 - uTime * 5.0)) * 0.4;
  float x = (vUv.x - 0.5) * 2.0 + (n - 0.5) * 0.5 * h;
  float width = (1.0 - h) * (0.7 + 0.45 * n);
  float edge = smoothstep(width, width * 0.35, abs(x));
  float top = smoothstep(0.95, 0.35 + 0.3 * n, h) * smoothstep(0.0, 0.1, h);
  float body = edge * top;
  float core = smoothstep(0.35, 0.9, body) * (1.0 - h);
  vec3 col = mix(uCool, uHot, core);
  gl_FragColor = vec4(col * body * 1.8, 1.0);
}
`

/** The fire's flame, always turned to the viewer. Added light. */
export function Flame({ still = false }: { still?: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 3 },
      uHot: { value: new THREE.Color(FIRE.hot) },
      uCool: { value: new THREE.Color(FIRE.cool) },
    }),
    [],
  )

  useFrame((_, dt) => {
    if (still || !material.current) return
    material.current.uniforms.uTime.value += dt
  })

  return (
    <Billboard lockY>
      <mesh position={[0, 0.55, 0]}>
        <planeGeometry args={[0.8, 1.3]} />
        <shaderMaterial
          ref={material}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  )
}
