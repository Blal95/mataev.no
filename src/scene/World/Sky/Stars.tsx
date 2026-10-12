"use client"

import { Stars as DreiStars } from "@react-three/drei"

export function Stars() {
  return (
    <DreiStars
      radius={80}
      depth={40}
      count={500}
      factor={3}
      saturation={0}
      fade
      speed={0.3}
    />
  )
}
