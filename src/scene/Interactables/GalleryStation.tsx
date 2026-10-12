"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useTranslations } from "next-intl"
import * as THREE from "three"
import { Interactable } from "./Interactable"
import { useGameStore } from "@/hooks/useGameStore"
import type { GalleryImage } from "@/types/gallery"

interface GalleryStationProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

// Large 3×3 wall (local units = world units; the station has no extra scale).
/** Metres from the wall at which its large photos start to load. */
const WARM_DISTANCE = 22
const COLS = 3
const ROWS = 3
const FRAME_W = 1.7
const FRAME_H = 1.35
const GAP = 0.25
const WALL_W = COLS * FRAME_W + (COLS - 1) * GAP // 5.6
const WALL_H = ROWS * FRAME_H + (ROWS - 1) * GAP // 4.55
const BASE_Y = 0.9 // bottom of the lowest frame, above the snow

export function GalleryStation({
  worldPosition,
  worldRotation,
}: GalleryStationProps = {}) {
  const t = useTranslations("prompt")
  const galleryData = useGameStore((s) => s.galleryData)
  const setFocusedGalleryIndex = useGameStore((s) => s.setFocusedGalleryIndex)
  const [textures, setTextures] = useState<(THREE.Texture | null)[]>(
    Array(COLS * ROWS).fill(null),
  )

  // --- Gaze tracking: which of the 9 frames is the crosshair on? ---
  // Each frame group registers its node here; while the gallery is the active
  // interactable we pick the frame whose direction best matches camera-forward,
  // so pressing [E] opens the panel on the exact photo you're looking at.
  const { camera, gl } = useThree()
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl])
  const cellRefs = useRef<(THREE.Group | null)[]>([])
  const lastFocus = useRef(-1)
  // The large photos are 200 KB to 3 MB each: fetched once the player is
  // walking up to the wall, not for everyone who never goes there.
  const nearWall = useRef(false)
  const onNearWall = useRef<(() => void) | null>(null)
  const nearTimer = useRef(0)
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const toCell = useMemo(() => new THREE.Vector3(), [])
  const cellWorld = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    if (!nearWall.current) {
      nearTimer.current += dt
      const wall = cellRefs.current[Math.floor((COLS * ROWS) / 2)]
      if (wall && nearTimer.current > 0.5) {
        nearTimer.current = 0
        wall.getWorldPosition(cellWorld)
        if (cellWorld.distanceTo(camera.position) < WARM_DISTANCE) {
          nearWall.current = true
          onNearWall.current?.()
        }
      }
    }
    if (useGameStore.getState().canInteract !== "gallery") return
    camera.getWorldDirection(fwd)
    let best = -Infinity
    let bestI = 0
    for (let i = 0; i < cellRefs.current.length; i++) {
      const g = cellRefs.current[i]
      if (!g) continue
      g.getWorldPosition(cellWorld)
      toCell.copy(cellWorld).sub(camera.position).normalize()
      const d = fwd.dot(toCell)
      if (d > best) {
        best = d
        bestI = i
      }
    }
    if (bestI !== lastFocus.current) {
      lastFocus.current = bestI
      setFocusedGalleryIndex(bestI)
    }
  })

  // --- Shared GPU resources (one set for all 9 frames) ---
  const frameGeometry = useMemo(
    () => new THREE.BoxGeometry(FRAME_W + 0.1, FRAME_H + 0.1, 0.06),
    [],
  )
  const pictureGeometry = useMemo(
    () => new THREE.PlaneGeometry(FRAME_W, FRAME_H),
    [],
  )
  const frameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1b2236",
        metalness: 0.2,
        roughness: 0.6,
      }),
    [],
  )
  const placeholderMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0e1626",
        emissive: new THREE.Color("#13203a"),
        emissiveIntensity: 0.4,
        roughness: 0.5,
      }),
    [],
  )

  // Dispose shared geometry + materials on unmount.
  useEffect(() => {
    return () => {
      frameGeometry.dispose()
      pictureGeometry.dispose()
      frameMaterial.dispose()
      placeholderMaterial.dispose()
    }
  }, [frameGeometry, pictureGeometry, frameMaterial, placeholderMaterial])

  // Load Three.js textures from the prefetched image URLs.
  // galleryData is populated by DataPrefetcher right after spawn — no API call here.
  // The wall fills in two passes: the 500px thumbs first (about 50 KB each, so
  // all nine frames are lit within a moment), then, once the player is
  // walking up to the wall, the large source, two at a time so they do not
  // split the connection nine ways. The large one is what
  // the frames need up close at grazing angles; it replaces the thumb under
  // anisotropic filtering + trilinear mips so it stays crisp off-axis.
  useEffect(() => {
    if (!galleryData) return
    const loader = new THREE.TextureLoader()
    const imgs: GalleryImage[] = galleryData.slice(0, COLS * ROWS)
    const held: (THREE.Texture | null)[] = imgs.map(() => null)
    let cancelled = false
    const proxied = (u: string) => `/api/img?u=${encodeURIComponent(u)}`
    // A failed image resolves to null: the frame keeps its placeholder canvas.
    const fetchTexture = (src: string) =>
      new Promise<THREE.Texture | null>((resolve) =>
        loader.load(src, resolve, undefined, () => resolve(null)),
      )
    const show = (i: number, tex: THREE.Texture) => {
      if (cancelled) {
        tex.dispose()
        return
      }
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = maxAniso
      tex.magFilter = THREE.LinearFilter
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.generateMipmaps = true
      tex.needsUpdate = true
      // Upload now, not in the frame the wall first comes into view.
      gl.initTexture(tex)
      held[i]?.dispose()
      held[i] = tex
      setTextures((prev) => {
        const next = [...prev]
        next[i] = tex
        return next
      })
    }
    void (async () => {
      await Promise.all(
        imgs.map(async (img, i) => {
          const small = img.thumb ?? img.url
          if (!small) return
          const tex = await fetchTexture(proxied(small))
          if (tex) show(i, tex)
        }),
      )
      if (!nearWall.current) await new Promise<void>((resolve) => (onNearWall.current = resolve))
      let next = 0
      const worker = async () => {
        while (!cancelled && next < imgs.length) {
          const i = next++
          const large = imgs[i].url
          if (!large || large === imgs[i].thumb) continue
          const tex = await fetchTexture(proxied(large))
          if (tex) show(i, tex)
        }
      }
      await Promise.all([worker(), worker()])
    })()
    return () => {
      cancelled = true
      held.forEach((tx) => tx?.dispose())
    }
  }, [galleryData, maxAniso, gl])

  const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = -WALL_W / 2 + FRAME_W / 2 + col * (FRAME_W + GAP)
    // row 0 = top
    const y = BASE_Y + WALL_H - FRAME_H / 2 - row * (FRAME_H + GAP)
    return { i, x, y }
  })

  return (
    <Interactable
      id="gallery"
      position={[0, 0, 0]}
      worldPosition={worldPosition}
      worldRotation={worldRotation}
      radius={3.0}
      lookRadius={7}
      label={t("gallery")}
      labelHeight={BASE_Y + WALL_H + 0.5}
    >
      {/* Side posts */}
      {[-WALL_W / 2 - 0.2, WALL_W / 2 + 0.2].map((x) => (
        <mesh key={x} position={[x, (BASE_Y + WALL_H) / 2, -0.05]} castShadow>
          <boxGeometry args={[0.14, BASE_Y + WALL_H + 0.3, 0.14]} />
          <meshStandardMaterial color="#3a2a1d" roughness={0.95} />
        </mesh>
      ))}
      {/* Top beam */}
      <mesh position={[0, BASE_Y + WALL_H + 0.2, -0.05]} castShadow>
        <boxGeometry args={[WALL_W + 0.7, 0.14, 0.14]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.95} />
      </mesh>

      {/* 3×3 frames — all share one frameGeometry + one frameMaterial */}
      {cells.map(({ i, x, y }) => {
        const tex = textures[i]
        return (
          <group
            key={i}
            position={[x, y, 0]}
            ref={(el) => {
              cellRefs.current[i] = el
            }}
          >
            {/* Frame border — shared geometry + material */}
            <mesh
              castShadow
              geometry={frameGeometry}
              material={frameMaterial}
            />
            {/* Picture surface — unique texture per frame, shared plane geometry */}
            {tex ? (
              <mesh key="loaded" position={[0, 0, 0.04]} geometry={pictureGeometry}>
                <meshBasicMaterial map={tex} toneMapped={false} />
              </mesh>
            ) : (
              <mesh
                key="placeholder"
                position={[0, 0, 0.04]}
                geometry={pictureGeometry}
                material={placeholderMaterial}
              />
            )}
          </group>
        )
      })}
    </Interactable>
  )
}
