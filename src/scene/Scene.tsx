"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import type { PerspectiveCamera } from "three"
import {
  KeyboardControls,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
  PerformanceMonitor,
} from "@react-three/drei"
import { Physics } from "@react-three/rapier"
import { useProgress } from "@react-three/drei"

import { HytteBackdrop } from "./World/HytteBackdrop"
import { Lighting } from "./World/Lighting"
import { Stars } from "./World/Sky/Stars"
import { AuroraShader } from "./World/Sky/AuroraShader"
import { Snow } from "./World/Snow"
import { FirePit } from "./World/FirePit"
import { ChimneySmoke } from "./World/ChimneySmoke"
import { Editable, PositionEditor } from "./editor"
import { Footprints } from "./World/Footprints"
import { Cat } from "./World/Cat"
import { BorzikStation } from "./Interactables/BorzikStation"
import { SkillTree } from "./World/SkillTree"
import { CoordsHUD } from "./CoordsHUD"
import { PostFX } from "./PostFX"
import { Player } from "./Player/Player"
import { IntroCamera } from "./Player/IntroCamera"
import { LaptopCamera } from "./Player/LaptopCamera"
import { Footsteps } from "@/components/scene/Footsteps"
import { MailboxStation } from "./Interactables/MailboxStation"
import { WorkbenchStation } from "./Interactables/WorkbenchStation"
import { DiplomaCairnStation } from "./Interactables/DiplomaCairnStation"
import { PhotoFramesStation } from "./Interactables/PhotoFramesStation"
import { RecordStation } from "./Interactables/RecordStation"
import { BookshelfStation } from "./Interactables/BookshelfStation"
import { GalleryStation } from "./Interactables/GalleryStation"
import { FireGuideStation } from "./Interactables/FireGuideStation"
import { GuidingWind } from "./World/GuidingWind"
import { Beacon } from "./Interactables/Beacon"
import { NIGHT } from "./palette"
import {
  VainakhTowerStation,
  HeritageStone,
} from "./Interactables/TowersStation"
import { useGameStore } from "@/hooks/useGameStore"
import {
  useDeviceCapability,
  qualityProfileFor,
} from "@/hooks/useDeviceCapability"

const keyMap = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "back", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] },
  { name: "sprint", keys: ["ShiftLeft", "ShiftRight"] },
  { name: "interact", keys: ["KeyE"] },
  { name: "jump", keys: ["Space"] },
  { name: "respawn", keys: ["KeyR"] },
]

interface SceneProps {
  onProgress?: (progress: number) => void
  paused?: boolean
}

export function Scene({ onProgress }: SceneProps) {
  const cap = useDeviceCapability()
  const profile = cap?.profile ?? qualityProfileFor("mid")
  const antialias = false // even high-tier ships AA off; bloom-less scene reads clean
  // Tight DPR caps — single biggest perf knob. Retina at 2.0 is wasteful here.
  const maxDpr = profile.dprCap
  const [dpr, setDpr] = useState<number>(maxDpr)

  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        id="scene-canvas"
        camera={{ fov: 70, near: 0.05, far: 200, position: [0, 1.55, 4] }}
        dpr={dpr}
        gl={{ antialias, powerPreference: "high-performance" }}
      >
        {/* The sky and the fog are the night tone's ground, so the world
            fades into the same ink as the cabin's UI. */}
        <fog attach="fog" args={[NIGHT.ground, 22, 70]} />
        <color attach="background" args={[NIGHT.ground]} />
        <ProgressBridge onProgress={onProgress} />
        <PerformanceMonitor
          onDecline={() => setDpr(Math.max(0.7, maxDpr - 0.3))}
          onIncline={() => setDpr(maxDpr)}
        />
        <Lighting />
        <Beacon />
        <Stars />
        <AuroraShader animation={profile.aurora} />
        <Snow count={profile.snowCount} />
        <Suspense fallback={null}>
          {/* One physics step per frame. A fixed 60 Hz step moved the player on
              every second frame of a 120 Hz screen, and the camera, which
              follows the body, juddered on every walk. */}
          <Physics gravity={[0, -9.81, 0]} timeStep="vary">

            <HytteBackdrop />
            {/* Pilgrim's path: spawn → mailbox+signpost → fire pit →
                skill tree → workbench+cairn on the deck → photo
                wall at the cabin facade. World coords match the snow
                plane (y ≈ 4) for path stations, and the wooden deck
                (y ≈ 4.84) for stations near the cabin. */}
            {/* Editable scene props — toggle the in-game editor with P. */}
            {/* The fire is the camp's "start here": you spawn looking at it,
                it already glows. FireGuideStation makes it interactable (E →
                fireside guide) and rides the same world position as the pit,
                so the wooden signpost prop is gone — the flames are the
                beacon. */}
            <Editable id="firepit" label="Fire pit" initial={[21.7, 3.05, 5.79]}>
              {(p, r) => (
                <>
                  <FirePit
                    position={p}
                    rotation={r}
                    flicker={profile.fireplaceFlicker}
                  />
                  <FireGuideStation worldPosition={p} worldRotation={r} />
                </>
              )}
            </Editable>
            {/* Smoke rises from the cabin's chimney. The fire sends up embers
                instead: seen from beside it, a smoke column hung over the
                whole view. */}
            {profile.chimneySmoke && (
              <Editable id="cabin-smoke" label="Cabin chimney smoke" initial={[8.3, 13.6, -8.5]}>
                {(p, r) => <ChimneySmoke position={p} rotation={r} count={10} />}
              </Editable>
            )}
            <Editable id="skill-tree" label="Skill tree" initial={[14, 3, 0]}>
              {(p, r) => (
                <SkillTree position={p} rotation={r} bob={profile.skillTreeBob} />
              )}
            </Editable>
            <Editable id="borzik" label="Borzik (hamster home)" initial={[24.3, 4.05, 7.57]}>
              {(p, r) => <BorzikStation worldPosition={p} worldRotation={r} />}
            </Editable>

            <Editable
              id="mailbox"
              label="Mailbox"
              initial={[18.0, 3.0, 11.5]}
              initialRot={[0, 2.23, 0]}
            >
              {(p, r) => <MailboxStation worldPosition={p} worldRotation={r} />}
            </Editable>
            <Editable id="workbench" label="Workbench" initial={[11.5, 5, -8.5]}>
              {(p, r) => <WorkbenchStation worldPosition={p} worldRotation={r} />}
            </Editable>
            <Editable
              id="cairn"
              label="Diploma cairn"
              initial={[-1.0, 3.85, 6.9]}
              initialRot={[0, -1.31, 0]}
            >
              {(p, r) => <DiplomaCairnStation worldPosition={p} worldRotation={r} />}
            </Editable>
            <Editable
              id="photos"
              label="Photo frames"
              initial={[-1.0, 3.84, 9.5]}
              initialRot={[0, 2.35, 0]}
            >
              {(p, r) => <PhotoFramesStation worldPosition={p} worldRotation={r} />}
            </Editable>
            <Editable
              id="record"
              label="Record player"
              initial={[15, 2.9, 4]}
              initialRot={[0, -2.49, 0]}
            >
              {(p, r) => <RecordStation worldPosition={p} worldRotation={r} />}
            </Editable>
            <Editable
              id="books"
              label="Bookshelf"
              initial={[-2.5, 2.9, -13]}
              initialRot={[0, 0.39, 0]}
            >
              {(p, r) => <BookshelfStation worldPosition={p} worldRotation={r} />}
            </Editable>
            <Editable
              id="gallery"
              label="Gallery"
              initial={[-23.9, 20.4, 23.85]}
              initialRot={[0, 2.23, 0]}
            >
              {(p, r) => <GalleryStation worldPosition={p} worldRotation={r} />}
            </Editable>

            {/* Twin Vainakh watchtowers — placed individually so each foot can
                land on uneven snow. Tune Y per tower in the P-editor. The
                aurora overlook coords are the user-chosen viewpoint. */}
            <Editable
              id="tower-west"
              label="Watchtower (west)"
              initial={[-31.05, 11.4, -31.55]}
              initialRot={[0, 1.18, 0]}
            >
              {(p, r) => <VainakhTowerStation worldPosition={p} worldRotation={r} />}
            </Editable>
            <Editable
              id="tower-east"
              label="Watchtower (east)"
              initial={[12.5, 16.4, -34]}
              initialRot={[0, -0.53, 0]}
            >
              {(p, r) => <VainakhTowerStation worldPosition={p} worldRotation={r} />}
            </Editable>
            <Editable
              id="heritage"
              label="Heritage stone (kurtulg)"
              initial={[-11, 2.4, -15]}
              initialRot={[0, 0, 0]}
            >
              {(p, r) => <HeritageStone worldPosition={p} worldRotation={r} />}
            </Editable>

            <PositionEditor />

            <Cat position={[-1.4, 0.06, -2.5]} />

            <DebugExpose />
            <Player />
            {/* Guiding wind — amber ember stream from player toward chosen station.
                Mounted inside Physics so it has scene context; frustumCulled=false
                so particles don't pop when the emitter (camera) is outside the bbox. */}
            <GuidingWind />
            <IntroCamera />
            <LaptopCamera />
            <Footsteps />
            <Footprints />
            <CoordsHUD />
          </Physics>
          <Preload all />
        </Suspense>
        {/* Subtle bloom + vignette — gated to high-tier GPUs so weak devices
            keep the strict perf budget untouched. */}
        {profile.tier === "high" && <PostFX />}
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
      </Canvas>
    </KeyboardControls>
  )
}

// TEMP DEBUG — exposes the R3F camera/scene to window for overview screenshots.
// Remove after map audit.
function DebugExpose() {
  const { camera, gl, scene, set } = useThree()
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__three = { camera, gl, scene }
    w.__freeze = () => set({ frameloop: "never" })
    w.__resume = () => set({ frameloop: "always" })
    w.__view = (
      px: number,
      py: number,
      pz: number,
      tx = 0,
      ty = 4,
      tz = 0,
      exposure = 1.6,
    ) => {
      const cam = camera as PerspectiveCamera
      const f = scene.fog
      const e = gl.toneMappingExposure
      scene.fog = null
      gl.toneMappingExposure = exposure
      cam.position.set(px, py, pz)
      cam.near = 0.1
      cam.far = 500
      cam.lookAt(tx, ty, tz)
      cam.updateProjectionMatrix()
      gl.render(scene, cam)
      scene.fog = f
      gl.toneMappingExposure = e
    }
  }, [camera, gl, scene, set])
  return null
}

function ProgressBridge({
  onProgress,
}: {
  onProgress?: (progress: number) => void
}) {
  const realProgress = useProgress((s) => s.progress)
  const total = useProgress((s) => s.total)
  const active = useProgress((s) => s.active)
  const setHasBooted = useGameStore((s) => s.setHasBooted)
  // The loader's latest numbers, read by one long-lived clock. The clock used
  // to restart whenever a file finished (they were its effect's deps), so the
  // minimum stay and the fake climb started over mid-load and the wait
  // stuttered.
  const load = useRef({ realProgress, total, active })
  useEffect(() => {
    load.current = { realProgress, total, active }
  }, [realProgress, total, active])

  useEffect(() => {
    let frame = 0
    let shown = -1
    const start = performance.now()
    // The floor a loading state needs to register as a state rather than a
    // flicker on a warm cache; real loading extends it, nothing delays a slow
    // load. The loader's rail and Borzik's print are paced by this number.
    const DURATION = 1600
    const MIN_VISIBLE = 1600

    const tick = () => {
      const { realProgress, total, active } = load.current
      const elapsed = performance.now() - start
      const fake = Math.min(100, (elapsed / DURATION) * 100)
      const value = total > 0 ? Math.max(fake * 0.4, realProgress) : fake
      // Whole percents only: the loader re-renders on each one, not each frame.
      const whole = Math.floor(value)
      if (whole !== shown) {
        shown = whole
        onProgress?.(whole)
      }
      if (value >= 100 && !active && elapsed >= MIN_VISIBLE) {
        setHasBooted(true)
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [onProgress, setHasBooted])

  return null
}
