"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { FIRE } from "../palette"

const vertex = /* glsl */ `
attribute vec4 aSeed; // phase, speed, starting angle, spread
uniform float uTime;
uniform float uPixelRatio;
uniform float uRise;
varying float vLife;
void main() {
  float life = fract(uTime * aSeed.y + aSeed.x);
  vLife = life;
  float swirl = aSeed.z + life * 5.0;
  float r = aSeed.w * (0.25 + life * 0.9);
  vec3 p = vec3(cos(swirl) * r, life * uRise, sin(swirl) * r);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 - life * 0.7) * 3.2 * uPixelRatio * (6.0 / max(1.0, -mv.z));
}
`

const fragment = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uCool;
varying float vLife;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.1, d);
  float a = core * (1.0 - vLife) * smoothstep(0.0, 0.06, vLife);
  gl_FragColor = vec4(mix(uHot, uCool, vLife) * a * 1.6, 1.0);
}
`

/** How high (metres) an ember climbs before it goes out. */
const RISE = 3.4

/**
 * Sparks going up from the fire, turning from hot yellow to ember orange as
 * they climb and swirl, and out. Every ember is worked out on the GPU from
 * its seed and the clock, so the CPU does nothing per frame but move time on.
 */
export function Embers({ count = 70 }: { count?: number }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const pixelRatio = useThree((s) => s.viewport.dpr)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = Math.random()
      seeds[i * 4 + 1] = 0.22 + Math.random() * 0.28
      seeds[i * 4 + 2] = Math.random() * Math.PI * 2
      seeds[i * 4 + 3] = 0.08 + Math.random() * 0.3
    }
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4))
    // Positions are made in the shader; three still wants the attribute.
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uRise: { value: RISE },
      uHot: { value: new THREE.Color(FIRE.hot) },
      uCool: { value: new THREE.Color(FIRE.cool) },
    }),
    [],
  )

  useFrame((_, dt) => {
    const u = material.current?.uniforms
    if (!u) return
    u.uTime.value += dt
    u.uPixelRatio.value = pixelRatio
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
