"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import { useTranslations } from "next-intl"
import { Star, X } from "lucide-react"
import * as THREE from "three"
import { Interactable } from "./Interactable"
import { getBookSpineTexture } from "./textures"
import { useGameStore } from "@/hooks/useGameStore"
import { sfx } from "@/lib/sfx"
import { cn } from "@/lib/cn"
import type { BookEntry, BookStatus } from "@/types/books"

interface BookshelfStationProps {
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

const ROWS = 4
const COLS = 10
const SHELF_W = 3.4
const SHELF_DEPTH = 0.34
const SLOT_W = SHELF_W / COLS
const ROW_Y = [0.42, 1.04, 1.66, 2.28] // local shelf-row heights
const FRONT_Z = SHELF_DEPTH / 2 - 0.02 // placeholder front face
const PROUD_Z = FRONT_Z + 0.05 // real books sit proud of the shelf
const READING_COLOR = "#F4A261" // currently-reading books read as amber

// --- Open-book reader (the book that flies to your face and opens) ---
const OPEN_MS = 820 // shelf → in-front-of-face, cover swinging open
const CLOSE_MS = 780 // shut the cover, then fly back to the shelf
const CLOSE_SHUT_FRAC = 0.42 // first 42% of CLOSE_MS shuts the cover in place
const READ_DIST = 2.2 // metres the open book floats in front of the camera
const READ_FILL = 0.7 // fraction of the viewport height the spread fills
const COVER_W = SLOT_W // half-spread (one page) width — wide enough to show a
// whole cover with little crop (page aspect ≈ COVER_W/coverH ≈ 0.65).
// Page content is a screen-aligned <Html distanceFactor> overlay whose cards
// are sized in viewport units (w-[34vh] h-[52vh], matching the page aspect).
// Sizing both the card and the 3D page off the viewport makes the fit
// resolution-independent; this factor maps the card onto the world page height
// (= 0.96·READ_FILL·scaleFOV); scale it with READ_FILL.
const CONTENT_DF = 3.5

const STATUS_KEY: Record<BookStatus, string> = {
  read: "statusRead",
  "currently-reading": "statusReading",
}

type ReaderPhase = "idle" | "opening" | "reading" | "closing"

// Deterministic pseudo-random in [0,1) from an integer (stable layout).
function rnd(n: number): number {
  const x = Math.sin(n * 127.1 + 13.7) * 43758.5453
  return x - Math.floor(x)
}

type Slot = {
  i: number
  x: number
  y: number
  w: number
  h: number
  entry: BookEntry | null
}

function displayColor(b: BookEntry): string {
  return b.status === "currently-reading" ? READING_COLOR : b.color
}
function baseGlow(b: BookEntry): number {
  return b.status === "currently-reading" ? 0.34 : 0.16
}
function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3)
}

const tmpObj = new THREE.Object3D()
const tmpVec = new THREE.Vector3()
const tmpFwd = new THREE.Vector3()
const tmpDir = new THREE.Vector3()
const endPos = new THREE.Vector3()
const endQuat = new THREE.Quaternion()
const tmpRight = new THREE.Vector3()

export function BookshelfStation({
  worldPosition = [0, 0, 0],
  worldRotation,
}: BookshelfStationProps) {
  const t = useTranslations("prompt")
  const tp = useTranslations("panel.books")
  const { camera } = useThree()
  const canInteract = useGameStore((s) => s.canInteract)
  const setSelectedBook = useGameStore((s) => s.setSelectedBook)
  const setOpenPanel = useGameStore((s) => s.setOpenPanel)
  const openingBook = useGameStore((s) => s.openingBook)
  const setOpeningBook = useGameStore((s) => s.setOpeningBook)
  const setBookDetailId = useGameStore((s) => s.setBookDetailId)
  const setReading3DBookId = useGameStore((s) => s.setReading3DBookId)
  const booksData = useGameStore((s) => s.booksData)

  const entries = useMemo(
    () => (booksData ?? []).slice(0, ROWS * COLS),
    [booksData]
  )

  const matRefs = useRef<Record<number, THREE.MeshStandardMaterial | null>>({})
  const [focusedSlotId, setFocusedSlotId] = useState(-1)
  const lastId = useRef<string | null>(null)

  // --- Open-book reader state ---
  const [phase, setPhase] = useState<ReaderPhase>("idle")
  const [readerSlot, setReaderSlot] = useState<Slot | null>(null)
  const phaseRef = useRef<ReaderPhase>("idle")
  const animStart = useRef(0)
  const closeRequested = useRef(false)
  const prevOpening = useRef(false)
  const openRootRef = useRef<THREE.Group>(null)
  const leftCoverRef = useRef<THREE.Group>(null)
  const startPos = useRef(new THREE.Vector3())
  const startQuat = useRef(new THREE.Quaternion())

  // Slots: real books spread evenly, the rest placeholders.
  const layout = useMemo<Slot[]>(() => {
    const total = ROWS * COLS
    const realMap = new Map<number, BookEntry>()
    const step = Math.floor(total / Math.max(entries.length, 1))
    entries.forEach((b, k) => realMap.set((k * step + 3) % total, b))

    const slots: Slot[] = []
    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / COLS)
      const col = i % COLS
      const entry = realMap.get(i) ?? null
      const w = SLOT_W * (0.6 + rnd(i) * 0.28)
      const h = entry ? 0.52 : 0.34 + rnd(i * 3.3) * 0.16
      const x = -SHELF_W / 2 + SLOT_W * (col + 0.5)
      const y = ROW_Y[row]
      slots.push({ i, x, y, w, h, entry })
    }
    return slots
  }, [entries])

  const realSlots = useMemo(() => layout.filter((s) => s.entry), [layout])

  const setPhaseBoth = (p: ReaderPhase) => {
    phaseRef.current = p
    setPhase(p)
  }

  // Drop the open book back onto the shelf and hand control back to the player.
  const requestClose = () => {
    if (phaseRef.current === "reading") closeRequested.current = true
  }

  // ESC closes the open book too (the cursor is free, so pointer-lock's own
  // ESC handler isn't in play here).
  useEffect(() => {
    if (phase !== "reading") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase])

  // While the book is up, a click on the canvas must NOT re-grab pointer lock
  // (drei's PointerLockControls adds a click→lock listener on #scene-canvas).
  // Swallow canvas clicks in the capture phase so the cursor stays free and the
  // camera can't start moving. Overlay UI (close button, links) lives in
  // separate DOM nodes, so it keeps working. A pointerlockchange net drops any
  // lock that still slips through.
  useEffect(() => {
    if (phase === "idle") return
    const canvas = document.getElementById("scene-canvas")
    const block = (e: Event) => {
      if (e.target === canvas) {
        e.stopImmediatePropagation()
        e.preventDefault()
      }
    }
    const onLockChange = () => {
      if (document.pointerLockElement) document.exitPointerLock?.()
    }
    window.addEventListener("click", block, true)
    window.addEventListener("pointerdown", block, true)
    document.addEventListener("pointerlockchange", onLockChange)
    return () => {
      window.removeEventListener("click", block, true)
      window.removeEventListener("pointerdown", block, true)
      document.removeEventListener("pointerlockchange", onLockChange)
    }
  }, [phase])

  useFrame(() => {
    // ---------- Open-book reader: trigger ----------
    if (openingBook && !prevOpening.current) {
      const slot = realSlots.find((s) => s.i === focusedSlotId) ?? null
      if (!slot || !slot.entry) {
        // Interacted with the shelf in general (no spine focused) → full list.
        setBookDetailId(null)
        setOpenPanel("books")
        document.exitPointerLock?.()
      } else if (phaseRef.current === "idle") {
        // A specific spine → fly it off the shelf and open it in-scene.
        // Cache its current shelf pose as the animation start.
        tmpObj.position.set(...worldPosition)
        tmpObj.rotation.set(
          worldRotation?.[0] ?? 0,
          worldRotation?.[1] ?? 0,
          worldRotation?.[2] ?? 0,
        )
        tmpObj.updateMatrix()
        startPos.current
          .set(slot.x, slot.y + slot.h / 2, PROUD_Z)
          .applyMatrix4(tmpObj.matrix)
        startQuat.current.copy(tmpObj.quaternion)

        setReaderSlot(slot)
        setPhaseBoth("opening")
        animStart.current = performance.now()
        closeRequested.current = false
        setSelectedBook(slot.entry.id)
        // Lock the player (no move/look) and free the cursor for reading.
        setReading3DBookId(slot.entry.id)
        document.exitPointerLock?.()
        sfx.bookOpen()
      }
      setOpeningBook(false)
    }
    prevOpening.current = openingBook

    // ---------- Open-book reader: animation ----------
    const ph = phaseRef.current
    if (ph !== "idle") {
      const root = openRootRef.current
      if (root && readerSlot) {
        const coverH = readerSlot.h
        // End pose: centred in front of the (frozen) camera, scaled to fill.
        const cam = camera as THREE.PerspectiveCamera
        const visH = 2 * READ_DIST * Math.tan((cam.fov * Math.PI) / 360)
        const endScale = (visH * READ_FILL) / coverH
        camera.getWorldDirection(tmpFwd)
        endPos.copy(camera.position).addScaledVector(tmpFwd, READ_DIST)
        endQuat.copy(camera.quaternion)

        // posE: 0 = on the shelf, 1 = in front of your face.
        // coverAngle: 0 = cover open (flat), π = cover shut.
        let posE = 1
        let coverAngle = 0
        if (ph === "opening") {
          const p = Math.min(1, (performance.now() - animStart.current) / OPEN_MS)
          const e = easeOutCubic(p)
          posE = e
          coverAngle = Math.PI * (1 - e) // shut → open as it flies in
          if (p >= 1) setPhaseBoth("reading")
        } else if (ph === "reading") {
          if (closeRequested.current) {
            closeRequested.current = false
            setPhaseBoth("closing")
            animStart.current = performance.now()
            sfx.bookOpen()
          }
        } else if (ph === "closing") {
          // Two beats: first shut the cover in place, THEN fly back to the
          // shelf with the book closed.
          const t = Math.min(1, (performance.now() - animStart.current) / CLOSE_MS)
          const shut = Math.min(1, t / CLOSE_SHUT_FRAC)
          const fly = Math.max(0, (t - CLOSE_SHUT_FRAC) / (1 - CLOSE_SHUT_FRAC))
          coverAngle = Math.PI * easeOutCubic(shut) // open → shut
          posE = 1 - easeOutCubic(fly) // holds at the face until shut, then flies back
          if (t >= 1) {
            // Done — back on the shelf, hand control to the player.
            setPhaseBoth("idle")
            setReaderSlot(null)
            setReading3DBookId(null)
            setSelectedBook(null)
            lastId.current = null
            return
          }
        }

        const scaleNow = 1 + (endScale - 1) * posE
        root.position.lerpVectors(startPos.current, endPos, posE)
        root.quaternion.copy(startQuat.current).slerp(endQuat, posE)
        root.scale.setScalar(scaleNow)
        // The open spread is centred on the spine, but a shut book sits one
        // page-width to the right of it. Nudge left as the cover folds so the
        // closed square stays centred (and lands cleanly back on the shelf).
        tmpRight.set(1, 0, 0).applyQuaternion(root.quaternion)
        root.position.addScaledVector(
          tmpRight,
          -(COVER_W / 2) * (coverAngle / Math.PI) * scaleNow
        )
        if (leftCoverRef.current) leftCoverRef.current.rotation.y = coverAngle
      }
      return // freeze shelf focus scanning while the reader is up
    }

    // ---------- Shelf: look-at focus + glow ----------
    if (canInteract !== "books") {
      if (focusedSlotId !== -1) setFocusedSlotId(-1)
      if (lastId.current !== null) {
        lastId.current = null
        setSelectedBook(null)
      }
      for (const s of realSlots) {
        const m = matRefs.current[s.i]
        if (m && s.entry) {
          const base = baseGlow(s.entry)
          m.emissiveIntensity += (base - m.emissiveIntensity) * 0.2
        }
      }
      return
    }

    tmpObj.position.set(...worldPosition)
    tmpObj.rotation.set(
      worldRotation?.[0] ?? 0,
      worldRotation?.[1] ?? 0,
      worldRotation?.[2] ?? 0,
    )
    tmpObj.updateMatrix()
    camera.getWorldDirection(tmpFwd)

    let bestSlot = -1
    let bestDot = Math.cos(0.09)
    for (const s of realSlots) {
      tmpVec.set(s.x, s.y, PROUD_Z).applyMatrix4(tmpObj.matrix)
      tmpDir.copy(tmpVec).sub(camera.position).normalize()
      const dot = tmpFwd.dot(tmpDir)
      if (dot > bestDot) {
        bestDot = dot
        bestSlot = s.i
      }
    }

    if (bestSlot !== focusedSlotId) setFocusedSlotId(bestSlot)

    const focusedEntry =
      bestSlot >= 0 ? layout.find((s) => s.i === bestSlot)?.entry ?? null : null
    const id = focusedEntry?.id ?? null
    if (id !== lastId.current) {
      lastId.current = id
      setSelectedBook(id)
    }

    for (const s of realSlots) {
      const m = matRefs.current[s.i]
      if (!m || !s.entry) continue
      const target = s.i === bestSlot ? 0.75 : baseGlow(s.entry)
      m.emissiveIntensity += (target - m.emissiveIntensity) * 0.25
    }
  })

  const focusedSlot =
    focusedSlotId >= 0 ? realSlots.find((s) => s.i === focusedSlotId) : undefined

  return (
    <>
      <Interactable
        id="books"
        position={[0, 0, 0]}
        worldPosition={worldPosition}
        worldRotation={worldRotation}
        radius={2.6}
        lookRadius={6}
        label={t("books")}
        labelHeight={2.9}
      >
        {/* Side panels */}
        {[-SHELF_W / 2 - 0.05, SHELF_W / 2 + 0.05].map((x) => (
          <mesh key={x} position={[x, 1.35, 0]} castShadow>
            <boxGeometry args={[0.08, 2.7, SHELF_DEPTH + 0.04]} />
            <meshStandardMaterial color="#3a2a1d" roughness={0.9} />
          </mesh>
        ))}
        {/* Shelf boards + top cap */}
        {[0.1, 0.72, 1.34, 1.96, 2.62].map((y) => (
          <mesh key={y} position={[0, y, 0]} castShadow>
            <boxGeometry args={[SHELF_W + 0.12, 0.05, SHELF_DEPTH + 0.02]} />
            <meshStandardMaterial color="#3a2a1d" roughness={0.9} />
          </mesh>
        ))}
        {/* Back panel */}
        <mesh position={[0, 1.35, -SHELF_DEPTH / 2]}>
          <boxGeometry args={[SHELF_W + 0.04, 2.7, 0.03]} />
          <meshStandardMaterial color="#2a1f17" roughness={0.95} />
        </mesh>

        {/* Spines */}
        {layout.map((s) => {
          // Hide the spine of the book that's currently lifted off the shelf.
          if (readerSlot?.i === s.i) return null
          if (!s.entry) {
            return (
              <mesh
                key={s.i}
                position={[s.x, s.y + s.h / 2, FRONT_Z - 0.03]}
                castShadow
              >
                <boxGeometry args={[s.w, s.h, 0.24]} />
                <meshStandardMaterial color="#3b3f49" roughness={0.95} />
              </mesh>
            )
          }
          const b = s.entry
          const col = displayColor(b)
          const bw = SLOT_W * 0.78
          return (
            <group key={s.i} position={[s.x, s.y + s.h / 2, 0]}>
              <mesh position={[0, 0, PROUD_Z - 0.13]} castShadow>
                <boxGeometry args={[bw, s.h, 0.26]} />
                <meshStandardMaterial
                  ref={(m) => {
                    matRefs.current[s.i] = m
                  }}
                  color={col}
                  emissive={col}
                  emissiveIntensity={baseGlow(b)}
                  roughness={0.6}
                />
              </mesh>
              <mesh position={[0, 0, PROUD_Z + 0.001]}>
                <planeGeometry args={[bw, s.h]} />
                <meshBasicMaterial
                  map={getBookSpineTexture(b.title, col)}
                  toneMapped={false}
                />
              </mesh>
            </group>
          )
        })}

        {/* Floating title for the focused book (hidden while reading) */}
        {phase === "idle" && focusedSlot?.entry && (
          <Html
            center
            position={[
              focusedSlot.x,
              focusedSlot.y + focusedSlot.h + 0.18,
              PROUD_Z,
            ]}
            distanceFactor={7}
            zIndexRange={[100, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="tone-night label whitespace-nowrap border border-act bg-ground px-2.5 py-1.5 text-fg">
              {focusedSlot.entry.title}
              {focusedSlot.entry.status === "currently-reading" && (
                <span className="text-act-ink"> · {tp("statusReading")}</span>
              )}
            </div>
          </Html>
        )}
      </Interactable>

      {/* The open-book reader — a real book that flies off the shelf, swings
          open in front of you and carries its content on its two pages. Lives
          at scene root so its world transform can be driven straight off the
          camera (see useFrame), independent of the shelf's orientation. */}
      <OpenBookRig
        slot={readerSlot}
        phase={phase}
        rootRef={openRootRef}
        leftCoverRef={leftCoverRef}
        onClose={requestClose}
        tp={tp}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Open-book reader geometry + page content                            */
/* ------------------------------------------------------------------ */

function OpenBookRig({
  slot,
  phase,
  rootRef,
  leftCoverRef,
  onClose,
  tp,
}: {
  slot: Slot | null
  phase: ReaderPhase
  rootRef: React.RefObject<THREE.Group | null>
  leftCoverRef: React.RefObject<THREE.Group | null>
  onClose: () => void
  tp: ReturnType<typeof useTranslations>
}) {
  const book = slot?.entry ?? null
  const visible = phase !== "idle" && !!book
  const coverH = slot?.h ?? 0.52
  const col = book ? displayColor(book) : "#3a2a1d"

  return (
    <group ref={rootRef} visible={visible}>
      {book && (
        <>
          {/* --- Bound body: a single page-wide block (right half). The cover
              folds onto THIS, so a shut book is one square, not two pages. --- */}
          {/* Back board */}
          <mesh position={[COVER_W / 2, 0, -0.05]} castShadow>
            <boxGeometry args={[COVER_W + 0.03, coverH + 0.03, 0.02]} />
            <meshStandardMaterial
              color={col}
              emissive={col}
              emissiveIntensity={0.16}
              roughness={0.6}
            />
          </mesh>
          {/* Page block (thickness) */}
          <mesh position={[COVER_W / 2, 0, -0.02]}>
            <boxGeometry args={[COVER_W * 0.96, coverH * 0.96, 0.05]} />
            <meshStandardMaterial color="#f4ecda" roughness={0.85} />
          </mesh>
          {/* Right page surface (review sits here) */}
          <mesh position={[COVER_W / 2, 0, 0.006]}>
            <planeGeometry args={[COVER_W * 0.97, coverH * 0.97]} />
            <meshStandardMaterial
              color="#f4ecda"
              emissive="#efe6d2"
              emissiveIntensity={0.55}
              roughness={0.9}
            />
          </mesh>
          {/* Spine — slim, at the binding (x=0) */}
          <mesh position={[0, 0, -0.012]}>
            <boxGeometry args={[0.03, coverH * 0.99, 0.1]} />
            <meshStandardMaterial
              color={col}
              emissive={col}
              emissiveIntensity={0.14}
              roughness={0.6}
            />
          </mesh>

          {/* --- Front cover, hinged at the spine (x=0). Open: lies flat to the
              left, inner paper + cover card facing you. Closing: folds Y→π onto
              the body, outer art facing you → one shut square. --- */}
          <group ref={leftCoverRef} position={[0, 0, 0]}>
            {/* Cover board */}
            <mesh position={[-COVER_W / 2, 0, 0.006]} castShadow>
              <boxGeometry args={[COVER_W, coverH, 0.02]} />
              <meshStandardMaterial
                color={col}
                emissive={col}
                emissiveIntensity={0.22}
                roughness={0.55}
              />
            </mesh>
            {/* Inner page surface — faces you when open */}
            <mesh position={[-COVER_W / 2, 0, 0.018]}>
              <planeGeometry args={[COVER_W * 0.96, coverH * 0.96]} />
              <meshStandardMaterial
                color="#f4ecda"
                emissive="#efe6d2"
                emissiveIntensity={0.55}
                roughness={0.9}
              />
            </mesh>
            {/* Outer cover art — faces you when shut */}
            <mesh position={[-COVER_W / 2, 0, -0.006]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[COVER_W * 0.9, coverH * 0.9]} />
              <meshBasicMaterial
                map={getBookSpineTexture(book.title, col)}
                toneMapped={false}
              />
            </mesh>
          </group>

          {/* Page content — only while the book is fully open and at rest, so
              it never renders mid-flip. Left page = cover, right = review.
              These are screen-aligned (non-transform) overlays sized via
              distanceFactor: the book faces the camera flat, so they land
              squarely on each page, and the fit is resolution-independent
              (page geometry + Html share the same projection). */}
          {phase === "reading" && (
            <>
              <Html
                center
                position={[-COVER_W / 2, 0, 0.03]}
                distanceFactor={CONTENT_DF}
                zIndexRange={[30, 0]}
                style={{ pointerEvents: "none" }}
              >
                <CoverPage book={book} />
              </Html>
              <Html
                center
                position={[COVER_W / 2, 0, 0.03]}
                distanceFactor={CONTENT_DF}
                zIndexRange={[30, 0]}
                style={{ pointerEvents: "auto" }}
              >
                <ReviewPage book={book} tp={tp} />
              </Html>

              {/* Close-book control, pinned to the book's top-left corner. */}
              <Html
                position={[-COVER_W * 1.02, coverH / 2 + 0.04, 0.04]}
                zIndexRange={[80, 0]}
                style={{ pointerEvents: "auto" }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={tp("close")}
                  className="tone-night label group flex min-h-11 items-center gap-2 border border-line bg-ground px-3 text-fg transition-colors hover:border-act hover:text-act-ink"
                >
                  <X className="size-3.5" />
                  {tp("close")}
                </button>
              </Html>
            </>
          )}
        </>
      )}
    </group>
  )
}

/** Left page — the cover, matted on the paper with a gutter shadow at the
 *  spine (right) edge. */
function CoverPage({ book }: { book: BookEntry }) {
  return (
    <div className="h-[59vh] w-[38vh] overflow-hidden rounded-l-[0.5vh] rounded-r-[0.15vh] bg-[#f4ecda] p-[1.2vh] shadow-[0_2vh_3.5vh_-1.5vh_rgba(0,0,0,0.55),inset_-1.2vh_0_2vh_-1vh_rgba(58,38,18,0.22)]">
      {book.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.cover}
          alt={book.title}
          className="h-full w-full rounded-[0.2vh] object-contain"
        />
      ) : (
        <div
          className="flex h-full w-full items-end rounded-[0.2vh] p-[1.6vh]"
          style={{ background: `linear-gradient(150deg, ${book.color}, #0a0f1c)` }}
        >
          <span className="text-balance text-[2.2vh] font-semibold leading-tight text-white/90">
            {book.title}
          </span>
        </div>
      )}
    </div>
  )
}

/** Right page — title, meta and Bilal's review ("reviews and comments"),
 *  inked onto the paper. Scrolls if the review runs long. */
function ReviewPage({
  book,
  tp,
}: {
  book: BookEntry
  tp: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="flex h-[59vh] w-[38vh] flex-col gap-[1.3vh] rounded-l-[0.15vh] rounded-r-[0.5vh] bg-[#f4ecda] px-[2.8vh] py-[2.6vh] text-[#2a1c0d] shadow-[0_2vh_3.5vh_-1.5vh_rgba(0,0,0,0.55),inset_1.2vh_0_2vh_-1vh_rgba(58,38,18,0.22)]">
      <div className="space-y-[0.7vh]">
        <h3 className="display text-balance text-[2.7vh] font-semibold leading-[1.1]">
          {book.title}
        </h3>
        <p className="display text-[1.8vh] italic text-[#7a6a52]">
          {tp("by")} {book.author}
        </p>
        <div className="flex flex-wrap items-center gap-[0.9vh] pt-[0.5vh]">
          <span className="rounded-full border border-[#c2ad84] bg-[#e8ddc6] px-[1vh] py-[0.3vh] font-mono text-[1.15vh] uppercase tracking-[0.18em] text-[#6b5d49]">
            {tp(STATUS_KEY[book.status])}
          </span>
          {book.rating > 0 && (
            <span className="flex items-center gap-[0.25vh]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-[1.7vh]",
                    i < book.rating
                      ? "fill-[#c8841d] text-[#c8841d]"
                      : "text-[#cabd9f]"
                  )}
                />
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="h-[0.12vh] bg-gradient-to-r from-[#cdbfa3] to-transparent" />

      <p className="font-mono text-[1.2vh] uppercase tracking-[0.22em] text-[#9c8b6e]">
        {tp("thoughts")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto pr-[0.6vh]">
        {book.review ? (
          <p className="whitespace-pre-line text-pretty font-[family-name:var(--font-fraunces)] text-[1.9vh] leading-[1.55] text-[#33271a]">
            {book.review}
          </p>
        ) : (
          <p className="font-[family-name:var(--font-fraunces)] text-[1.8vh] italic text-[#8a7c63]">
            {tp("reviewComing")}
          </p>
        )}
      </div>

      <a
        href={book.link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-[0.4vh] inline-flex items-center gap-[0.5vh] self-start font-mono text-[1.15vh] uppercase tracking-[0.18em] text-[#8a5a1c] transition-colors hover:text-[#5f3d12]"
      >
        Goodreads ↗
      </a>
    </div>
  )
}
