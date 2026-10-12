"use client"

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"

/**
 * Subtle bloom on emissive surfaces (aurora, candle, fireplace, signs) plus a
 * gentle vignette. Only mounted on `tier === "high"` devices.
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={0.55}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.4}
        mipmapBlur
        blendFunction={BlendFunction.SCREEN}
      />
      <Vignette
        eskil={false}
        offset={0.18}
        darkness={0.55}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
