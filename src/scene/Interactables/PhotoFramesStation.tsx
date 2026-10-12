"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import * as THREE from "three"
import { Interactable } from "./Interactable"
import { STATION_POSITIONS } from "@/config/stations"

// 512 px copies: the frames are about half a metre wide, and a photo wall that
// pulled the 1400 px originals was 420 KB and four large uploads for nothing.
const PHOTO_SRCS = ["/tex/bilal1.webp", "/tex/bilal2.webp", "/tex/bilal3.webp", "/tex/bilal4.webp"]

interface PhotoFramesStationProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

export function PhotoFramesStation({
  worldPosition,
  worldRotation,
}: PhotoFramesStationProps = {}) {
  const t = useTranslations("prompt")

  // Load the real photos with a vanilla TextureLoader inside an effect —
  // NOT drei's useTexture, which suspends and drives useProgress, setState-ing
  // the loading bridge mid-render (and can remount the canvas → pointer-lock
  // errors). Each frame falls back to a dark plate until its photo arrives.
  const [photos, setPhotos] = useState<(THREE.Texture | null)[]>([
    null,
    null,
    null,
    null,
  ])

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const loaded: (THREE.Texture | null)[] = [null, null, null, null]
    let cancelled = false
    PHOTO_SRCS.forEach((src, i) => {
      loader.load(src, (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.colorSpace = THREE.SRGBColorSpace
        loaded[i] = tex
        setPhotos((prev) => {
          const next = [...prev]
          next[i] = tex
          return next
        })
      })
    })
    return () => {
      cancelled = true
      loaded.forEach((tx) => tx?.dispose())
    }
  }, [])

  return (
    <Interactable
      id="about"
      position={STATION_POSITIONS.photos}
      worldPosition={worldPosition}
      worldRotation={worldRotation}
      radius={2.4}
      label={t("photoWall")}
      labelHeight={3.2}
    >
      {/* Tall wooden post */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[0.12, 2.8, 0.12]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.95} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <boxGeometry args={[1.6, 0.06, 0.06]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.95} />
      </mesh>

      {/* 4 hanging photo frames */}
      {[
        { x: -0.55, drop: 0.4, rot: 0.06 },
        { x: -0.2, drop: 0.7, rot: -0.04 },
        { x: 0.2, drop: 0.5, rot: 0.05 },
        { x: 0.55, drop: 0.8, rot: -0.07 },
      ].map((f, i) => (
        <group
          key={i}
          position={[f.x, 2.4 - f.drop, 0]}
          rotation={[0, 0, f.rot]}
        >
          {/* Twine */}
          <mesh position={[0, f.drop / 2, 0]}>
            <cylinderGeometry args={[0.005, 0.005, f.drop, 4]} />
            <meshStandardMaterial color="#1a1a22" roughness={0.9} />
          </mesh>
          {/* Frame */}
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.36, 0.02]} />
            <meshStandardMaterial color="#3a2a1d" roughness={0.85} />
          </mesh>
          {/* Photo — swap the mesh once the texture loads so the material
              compiles with the map present (no need to flag needsUpdate). */}
          {photos[i] ? (
            <mesh position={[0, 0, 0.013]}>
              <planeGeometry args={[0.24, 0.3]} />
              <meshBasicMaterial map={photos[i]!} toneMapped={false} />
            </mesh>
          ) : (
            <mesh position={[0, 0, 0.013]}>
              <planeGeometry args={[0.24, 0.3]} />
              <meshStandardMaterial color="#2a2a30" roughness={0.6} />
            </mesh>
          )}
        </group>
      ))}
    </Interactable>
  )
}
