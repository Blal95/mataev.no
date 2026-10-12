"use client"

import { useRef, useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useKeyboardControls } from "@react-three/drei"
import { SmoothPointerLock } from "./SmoothPointerLock"
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"
import { climbZoneAt } from "../ladders"
import { sfx } from "@/lib/sfx"
import { getSharedVinylLoop } from "@/lib/vinylLoop"

const SPEED = 5.2
const SPRINT = 9.0
const CLIMB_SPEED = 3.2
const JUMP_FORCE = 10.0
const XZ_DAMP = 0.82       // slightly tighter than original 0.86 — less slide
const EYE_HEIGHT = 1.70
// Post-cinematic settle: how long the camera eases from the cinematic's
// final pose into the standing eye position (s). Makes the hand-off feel
// like you were already standing there, not a hard cut.
const SETTLE_DURATION = 0.7
// Landing squash: how hard the camera dips on touchdown, scaled by fall speed.
const LAND_DIP_MAX = 0.14
// Spawn at clearing entry, eye-level. XZ is south of the fire pit at origin
// (z>0) so the player faces -Z (toward the fire) on initial pointer lock.
// Eye-level target: world (24.30, 5.12, 7.57). Spawn body high so the
// ground-snap raycast can settle the capsule onto the snow.
const SPAWN: [number, number, number] = [24.3, 14, 7.57]
const SPAWN_GROUND_OFFSET = 1.2 // body settles this high above raycast hit
// Kill plane: the walkable snow sits at world y ≈ 4. Let the player drop a
// little BELOW the ground before respawning (so a slip reads as a short fall,
// not a teleport), but catch them well before the void.
const FALL_KILL_Y = -5.0
const CAPSULE_BOTTOM = 0.92
const GROUND_RAY_DIST = 0.28  // more forgiving on uneven snow terrain

const FOV_REST = 70
const FOV_SPRINT = 80      // wider range for more satisfying sprint feel
const FOV_LERP = 0.06      // slightly slower transition — smoother

const BOB_FREQ_WALK = 7.5
const BOB_FREQ_RUN = 11
const BOB_AMP = 0.045

/** A per-frame factor tuned at 60 fps, for a frame of `dt` seconds, so every
 *  decay and ease below takes the same time at 60 and 120 Hz. */
const at60 = (k: number, dt: number) => Math.pow(k, dt * 60)

/** A soft round puff for the breath: a bare point is drawn as a square, and
 *  35 cm from the eye a square puff reads as a grey tile in the sky. */
function softDot(): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const g = canvas.getContext("2d")
  if (!g) return null
  const r = size / 2
  const fade = g.createRadialGradient(r, r, 0, r, r, r)
  fade.addColorStop(0, "rgba(255,255,255,1)")
  fade.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = fade
  g.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

const BREATH_INTERVAL_MS = 2500
const BREATH_PARTICLE_COUNT = 6

type Controls =
  | "forward"
  | "back"
  | "left"
  | "right"
  | "sprint"
  | "interact"
  | "jump"
  | "respawn"

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const { camera, scene } = useThree()
  const { rapier, world } = useRapier()
  const [sub, get] = useKeyboardControls<Controls>()

  const paused = useGameStore((s) => s.paused)
  const openPanel = useGameStore((s) => s.openPanel)
  const canInteract = useGameStore((s) => s.canInteract)
  const setOpenPanel = useGameStore((s) => s.setOpenPanel)
  const introPlaying = useGameStore((s) => s.introPlaying)
  const setAirborne = useGameStore((s) => s.setAirborne)

  const lastGroundedAt = useRef(Date.now())
  const jumpLatch = useRef(false)
  const hasJumped = useRef(false)
  const bobPhase = useRef(0)
  const bobOffset = useRef(0)
  const lastBreath = useRef(performance.now())
  const groundSnapped = useRef(false)
  const wasIntroPlaying = useRef(false)
  const climbingRef = useRef(false)
  // Auto-descend: time spent standing still over the deck hole, and a latch
  // that forces downward climb once it crosses the threshold.
  const holeIdleRef = useRef(0)
  const descendRef = useRef(false)
  // While true, the player is being driven from the ladder top onto the deck
  // exit point (held up, no fall) until they stand on solid deck. The zone is
  // cached so the drive completes even after the player leaves the climb zone.
  const dismountingRef = useRef(false)
  const dismountZoneRef = useRef<{ exitX: number; exitZ: number } | null>(null)
  // Set when the player presses back at the ladder foot to step off. Blocks the
  // engage-on-back logic from instantly re-grabbing the ladder; cleared when
  // back is released or the player leaves the climb zone.
  const bottomStepOffRef = useRef(false)

  // Smooth cinematic → spawn hand-off + fun-movement feel.
  const settling = useRef(false)
  const settleStart = useRef(0)
  const settleFrom = useRef(new THREE.Vector3())
  const wasGrounded = useRef(true)
  const fallVel = useRef(0)
  const landDip = useRef(0)
  const jumpFovKick = useRef(0)

  // Breath particles — one recycled Points cloud
  const breathRef = useRef<THREE.Points>(null)
  const breathSprite = useMemo(() => softDot(), [])
  const breathGeom = useMemo(() => {
    const positions = new Float32Array(BREATH_PARTICLE_COUNT * 3)
    const velocities = new Float32Array(BREATH_PARTICLE_COUNT * 3)
    const ages = new Float32Array(BREATH_PARTICLE_COUNT)
    for (let i = 0; i < BREATH_PARTICLE_COUNT; i++) {
      ages[i] = 999 // start dead
    }
    return { positions, velocities, ages }
  }, [])

  useEffect(() => {
    return sub(
      (s) => s.interact,
      (pressed) => {
        // Inert while a panel is open or a book is being read in-scene.
        if (
          pressed &&
          canInteract &&
          !openPanel &&
          !useGameStore.getState().reading3DBookId
        ) {
          if (canInteract === "record") {
            // Diegetic: one keypress toggles the music in-world. No overlay,
            // no pause, no pointer-lock release — keep walking while it plays.
            const s = useGameStore.getState()
            const loop = getSharedVinylLoop()
            if (s.vinylPlaying) {
              loop.stop()
              s.setVinylPlaying(false)
              sfx.needleLift()
            } else {
              loop.start()
              s.setVinylPlaying(true)
              sfx.needleDrop()
            }
          } else if (canInteract === "books") {
            // Defer: BookshelfStation plays the 3D open-book animation, then
            // opens the panel (and releases pointer lock) when it finishes.
            useGameStore.getState().setOpeningBook(true)
          } else {
            setOpenPanel(canInteract)
            document.exitPointerLock?.()
          }
        }
      }
    )
  }, [sub, canInteract, openPanel, setOpenPanel])

  useEffect(() => {
    return sub(
      (s) => s.respawn,
      (pressed) => {
        // Controls are inert while interacting (panel open) or during the
        // intro — reset must not fire then.
        const { openPanel: op, introPlaying: ip } = useGameStore.getState()
        if (pressed && body.current && !op && !ip) {
          body.current.setTranslation(
            { x: SPAWN[0], y: SPAWN[1], z: SPAWN[2] },
            true
          )
          body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }
      }
    )
  }, [sub])

  useFrame((_, dt) => {
    if (!body.current) return
    const pos = body.current.translation()

    // Don't run the kill-plane check until after the intro has handed off and
    // the body has ground-snapped (it sits high at SPAWN[1] until then).
    if (groundSnapped.current && !introPlaying && pos.y < FALL_KILL_Y) {
      body.current.setTranslation(
        { x: SPAWN[0], y: SPAWN[1], z: SPAWN[2] },
        true
      )
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      settling.current = false
      // Keep groundSnapped armed so the kill plane still fires next time; the
      // body falls from SPAWN height and re-lands on the snow under gravity.
      return
    }

    // During intro: freeze body in place (no fall) and don't update camera —
    // IntroCamera owns the camera while introPlaying is true.
    if (introPlaying) {
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.current.setTranslation(
        { x: SPAWN[0], y: SPAWN[1], z: SPAWN[2] },
        true
      )
      wasIntroPlaying.current = true
      return
    }

    // First frame AFTER intro: raycast down from SPAWN to find ground, then
    // teleport body there. Avoids dropping from sky after the cinematic.
    if (wasIntroPlaying.current && !groundSnapped.current) {
      wasIntroPlaying.current = false
      const rayOrigin = { x: SPAWN[0], y: SPAWN[1] + 10, z: SPAWN[2] }
      const downRay = new rapier.Ray(rayOrigin, { x: 0, y: -1, z: 0 })
      const groundHit = world.castRay(
        downRay,
        100,
        true,
        undefined,
        undefined,
        undefined,
        body.current
      )
      const landY = groundHit
        ? rayOrigin.y - groundHit.timeOfImpact + SPAWN_GROUND_OFFSET
        : SPAWN[1]
      body.current.setTranslation(
        { x: SPAWN[0], y: landY, z: SPAWN[2] },
        true
      )
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      groundSnapped.current = true

      // Begin a brief settle: ease the camera from the cinematic's final
      // pose into the standing eye position so the hand-off is seamless —
      // it should feel like you were already standing here.
      settleFrom.current.copy(camera.position)
      settleStart.current = performance.now()
      settling.current = true
      return
    }

    if (paused) {
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      // While the laptop OS is open, LaptopCamera owns the camera (dolly
      // to/from the screen). Don't write camera.position here or the two
      // fight every frame — just freeze the body and yield, same as the
      // introPlaying handoff above.
      if (openPanel === "projects") return
      camera.position.set(
        pos.x,
        pos.y + EYE_HEIGHT - 0.4 + bobOffset.current,
        pos.z
      )
      return
    }

    // Ground check
    const origin = { x: pos.x, y: pos.y - CAPSULE_BOTTOM, z: pos.z }
    const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(
      ray,
      GROUND_RAY_DIST,
      true,
      undefined,
      undefined,
      undefined,
      body.current
    )
    const grounded = hit !== null
    if (grounded) {
      lastGroundedAt.current = Date.now()
      hasJumped.current = false
    }
    const coyote = Date.now() - lastGroundedAt.current < 150
    setAirborne(!grounded)

    // Landing squash: track the steepest fall while airborne, then dip the
    // camera on touchdown proportional to impact speed (recovers fast).
    const vyNow = body.current.linvel().y
    if (!grounded) {
      fallVel.current = Math.min(fallVel.current, vyNow)
    } else if (!wasGrounded.current) {
      const impact = Math.min(Math.abs(fallVel.current), 14)
      landDip.current = -Math.min(LAND_DIP_MAX, impact * 0.012)
      fallVel.current = 0
    }
    wasGrounded.current = grounded

    const k = get()

    // ---- Ladder climbing ----
    // Engage only on intent (a latch): pressing forward/back inside the shaft
    // turns climbing on; it stays on while you remain in the column (so you can
    // pause mid-climb), and releases when you leave the column or settle back
    // at the foot. A plain jump inside the tower never engages it — so you can
    // still walk and JUMP freely indoors.
    const climb = climbZoneAt(pos.x, pos.y, pos.z)
    const movingInput = k.forward || k.back || k.left || k.right

    // --- Top-of-ladder pad: standing/walking over the deck hole ---
    // The hole has no floor, but the player should be able to walk across it
    // freely (it's "above the ladder"). While they're over it, the controller
    // supports them (no fall). If they hold STILL for 2s, they drop into a
    // controlled descent down the ladder. Any movement resets the timer.
    const overHole =
      !!climb &&
      !climbingRef.current &&
      pos.y > climb.topY - 0.7 &&
      Math.abs(pos.x - climb.holeCx) <= climb.holeHalfX &&
      Math.abs(pos.z - climb.holeCz) <= climb.holeHalfZ
    // --- Dismount drive: carry the player from the ladder top onto the deck
    // exit point, held up, regardless of zone membership. ---
    if (dismountingRef.current && dismountZoneRef.current) {
      const z = dismountZoneRef.current
      const dx = z.exitX - pos.x
      const dz = z.exitZ - pos.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.35) {
        dismountingRef.current = false
        dismountZoneRef.current = null
        climbingRef.current = false
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      } else {
        const inv = 1 / dist
        body.current.setLinvel(
          { x: dx * inv * SPEED, y: 0, z: dz * inv * SPEED },
          true,
        )
        const eyeY = pos.y + EYE_HEIGHT - 0.4 + bobOffset.current
        if (settling.current) settling.current = false
        camera.position.set(pos.x, eyeY, pos.z)
        jumpLatch.current = k.jump
        hasJumped.current = false
        void scene
        return
      }
    }

    let supportHole = false
    if (overHole) {
      supportHole = true
      if (movingInput) {
        holeIdleRef.current = 0
      } else {
        holeIdleRef.current += dt
        if (holeIdleRef.current >= 2.0) {
          climbingRef.current = true
          descendRef.current = true
          holeIdleRef.current = 0
          supportHole = false
        }
      }
    } else if (!climbingRef.current) {
      holeIdleRef.current = 0
    }

    // Release the step-off latch once back is released or we leave the zone.
    if (!climb || !k.back) bottomStepOffRef.current = false

    if (!climb) {
      climbingRef.current = false
      descendRef.current = false
      dismountingRef.current = false
    } else {
      // ENGAGE a climb when the player is right at the ladder + pressing
      // forward or back. Proximity (nearLadder) is enough disambiguation —
      // the old lookingUp guard caused walking through the ladder at eye level.
      const nearLadder =
        Math.hypot(pos.x - climb.cx, pos.z - climb.cz) < 0.8
      const onDeck = pos.y >= climb.topY - 1.0
      const wantsUp = k.forward && !onDeck
      // Don't treat back as climb-intent while the step-off latch is held —
      // otherwise releasing at the foot instantly re-grabs the ladder.
      const wantsDown = k.back && !onDeck && !bottomStepOffRef.current
      if (
        (wantsUp || wantsDown) &&
        nearLadder &&
        !dismountingRef.current &&
        !climbingRef.current
      ) {
        climbingRef.current = true
      } else if (
        !descendRef.current &&
        !dismountingRef.current &&
        !k.forward &&
        !k.back &&
        pos.y < climb.baseY + 1.2
      ) {
        climbingRef.current = false
      }
    }
    if (climb && climbingRef.current) {
      const atTop = pos.y >= climb.topY - 0.08

      // Once we reach the top (climbing up), latch into the dismount drive
      // (handled above) that carries the player onto the deck exit point —
      // prevents getting stuck / falling back down the open hole.
      if (atTop && !descendRef.current) {
        dismountingRef.current = true
        dismountZoneRef.current = { exitX: climb.exitX, exitZ: climb.exitZ }
        return
      }

      // Jump off the ladder mid-climb: kick away from the shaft (toward the
      // dismount/door direction, so you don't just fall straight back onto
      // the rungs) with an upward pop, then hand off to normal free-fall
      // physics. Skipped at the very top — that's the dismount drive above —
      // and blocked from re-triggering while jump is held (jumpLatch).
      if (k.jump && !jumpLatch.current && !atTop) {
        climbingRef.current = false
        descendRef.current = false
        bottomStepOffRef.current = true // don't instantly re-grab the ladder
        jumpLatch.current = true
        hasJumped.current = true
        body.current.setLinvel(
          {
            x: climb.dismountX * 3.2,
            y: JUMP_FORCE * 0.75,
            z: climb.dismountZ * 3.2,
          },
          true,
        )
        jumpFovKick.current = 6
        sfx.jump()
        return
      }

      // At the ladder foot pressing back: no more rungs below — release the
      // climb and fall through to normal walking so S steps the player
      // backwards off the ladder instead of pinning them at the floor.
      // Capsule rests ~0.9 above the foot (halfHeight 0.5 + radius 0.4).
      const atBottom = pos.y <= climb.baseY + 1.0
      if (atBottom && k.back && !descendRef.current) {
        climbingRef.current = false
        bottomStepOffRef.current = true
      } else {
      let vy = 0
      if (descendRef.current) {
        // Auto-descent (triggered by standing on the hole): drop the player
        // down OFF the deck into the shaft, then hand back to manual climbing
        // (hover). It does NOT force them to the bottom. Pressing forward at
        // any point climbs back up. After this they control it: W up, S down,
        // idle hover.
        if (k.forward) {
          descendRef.current = false
          vy = atTop ? 0 : CLIMB_SPEED
        } else if (pos.y <= climb.topY - 2.5) {
          descendRef.current = false // cleared the deck — manual from here
          vy = 0
        } else {
          vy = -CLIMB_SPEED * 0.8
        }
      } else if (k.forward && !atTop) vy = CLIMB_SPEED
      else if (k.back) vy = -CLIMB_SPEED

      // Glide toward the ladder's STAND point (south of the ladder mesh) so
      // the player ends up behind the ladder with it in front of them.
      const vx = THREE.MathUtils.clamp((climb.standX - pos.x) * 8, -3, 3)
      const vz = THREE.MathUtils.clamp((climb.standZ - pos.z) * 8, -3, 3)
      body.current.setLinvel({ x: vx, y: vy, z: vz }, true)

      bobOffset.current *= at60(0.85, dt)
      const eyeY = pos.y + EYE_HEIGHT - 0.4 + bobOffset.current
      if (settling.current) settling.current = false
      camera.position.set(pos.x, eyeY, pos.z)
      jumpLatch.current = k.jump // don't fire a jump when leaving the ladder
      hasJumped.current = false
      void scene
      return
      }
    }

    // Jump
    if (k.jump && !jumpLatch.current && coyote && !hasJumped.current) {
      jumpLatch.current = true
      hasJumped.current = true
      const cur = body.current.linvel()
      body.current.setLinvel({ x: cur.x, y: JUMP_FORCE, z: cur.z }, true)
      jumpFovKick.current = 6 // quick FOV pop for a livelier leap
      sfx.jump()
    }
    if (!k.jump) jumpLatch.current = false

    // XZ movement
    const cur = body.current.linvel()
    const cam = new THREE.Vector3()
    camera.getWorldDirection(cam)
    cam.y = 0
    cam.normalize()
    const right = new THREE.Vector3()
      .crossVectors(cam, new THREE.Vector3(0, 1, 0))
      .normalize()

    let mx = 0
    let mz = 0
    if (k.forward) {
      mx += cam.x
      mz += cam.z
    }
    if (k.back) {
      mx -= cam.x
      mz -= cam.z
    }
    if (k.left) {
      mx -= right.x
      mz -= right.z
    }
    if (k.right) {
      mx += right.x
      mz += right.z
    }

    const len = Math.sqrt(mx * mx + mz * mz)
    const speed = k.sprint ? SPRINT : SPEED

    let vx: number
    let vz: number

    if (len > 0) {
      vx = (mx / len) * speed
      vz = (mz / len) * speed
    } else {
      vx = cur.x * at60(XZ_DAMP, dt)
      vz = cur.z * at60(XZ_DAMP, dt)
    }

    // Post-apex gravity boost: add a fixed downward nudge once falling so the
    // arc feels weighty. dt-scaled so it's framerate-independent and bounded.
    const extraGrav =
      !grounded && !supportHole && cur.y < 0 ? -18 * dt : 0
    const vyOut = supportHole ? 0 : cur.y + extraGrav
    body.current.setLinvel({ x: vx, y: vyOut, z: vz }, true)

    // Head-bob: tied to horizontal speed; pauses when airborne
    const horizSpeed = Math.sqrt(vx * vx + vz * vz)
    const moving = horizSpeed > 0.3 && grounded
    const bobFreq = k.sprint ? BOB_FREQ_RUN : BOB_FREQ_WALK
    if (moving) {
      bobPhase.current += dt * bobFreq
      const amp = BOB_AMP * Math.min(1, horizSpeed / SPEED)
      bobOffset.current = Math.sin(bobPhase.current) * amp
    } else {
      bobOffset.current *= at60(0.85, dt) // decay to zero
    }

    const eyeY = pos.y + EYE_HEIGHT - 0.4 + bobOffset.current + landDip.current
    if (settling.current) {
      // Ease from the cinematic's final camera pose into the standing eye.
      const e = (performance.now() - settleStart.current) / 1000
      const st = Math.min(1, e / SETTLE_DURATION)
      const k2 = 1 - Math.pow(1 - st, 3)
      camera.position.set(
        THREE.MathUtils.lerp(settleFrom.current.x, pos.x, k2),
        THREE.MathUtils.lerp(settleFrom.current.y, eyeY, k2),
        THREE.MathUtils.lerp(settleFrom.current.z, pos.z, k2)
      )
      if (st >= 1) settling.current = false
    } else {
      camera.position.set(pos.x, eyeY, pos.z)
    }
    landDip.current *= at60(0.86, dt) // recover from the landing squash

    // Sprint FOV pulse + a quick kick on jump.
    const baseFov = k.sprint && horizSpeed > 1 ? FOV_SPRINT : FOV_REST
    const targetFov = baseFov + jumpFovKick.current
    jumpFovKick.current *= at60(0.88, dt)
    const perspCam = camera as THREE.PerspectiveCamera
    if (Math.abs(perspCam.fov - targetFov) > 0.05) {
      perspCam.fov += (targetFov - perspCam.fov) * (1 - at60(1 - FOV_LERP, dt))
      perspCam.updateProjectionMatrix()
    }

    // Breath particles — spawn periodically
    const now = performance.now()
    if (now - lastBreath.current > BREATH_INTERVAL_MS) {
      lastBreath.current = now
      // Spawn a small puff: respawn 3 dead particles at camera origin offset
      const { positions, velocities, ages } = breathGeom
      let spawned = 0
      const camFwd = new THREE.Vector3()
      camera.getWorldDirection(camFwd)
      const origin = camera.position
      for (let i = 0; i < BREATH_PARTICLE_COUNT && spawned < 3; i++) {
        if (ages[i] >= 1) {
          const ix = i * 3
          // Spawn slightly below camera, forward
          positions[ix + 0] = origin.x + camFwd.x * 0.35 + (Math.random() - 0.5) * 0.05
          positions[ix + 1] = origin.y - 0.15 + (Math.random() - 0.5) * 0.04
          positions[ix + 2] = origin.z + camFwd.z * 0.35 + (Math.random() - 0.5) * 0.05
          velocities[ix + 0] = camFwd.x * 0.4 + (Math.random() - 0.5) * 0.2
          velocities[ix + 1] = 0.15 + Math.random() * 0.1
          velocities[ix + 2] = camFwd.z * 0.4 + (Math.random() - 0.5) * 0.2
          ages[i] = 0
          spawned++
        }
      }
    }

    // Age and move breath particles
    const { positions, velocities, ages } = breathGeom
    for (let i = 0; i < BREATH_PARTICLE_COUNT; i++) {
      if (ages[i] < 1) {
        const ix = i * 3
        ages[i] += dt / 0.8 // 800ms lifetime
        positions[ix + 0] += velocities[ix + 0] * dt
        positions[ix + 1] += velocities[ix + 1] * dt
        positions[ix + 2] += velocities[ix + 2] * dt
        velocities[ix + 0] *= at60(0.96, dt)
        velocities[ix + 1] *= at60(0.99, dt)
        velocities[ix + 2] *= at60(0.96, dt)
      }
    }
    if (breathRef.current) {
      const attr = breathRef.current.geometry.attributes.position
      if (attr) attr.needsUpdate = true
      const mat = breathRef.current.material as THREE.PointsMaterial
      // Opacity reflects average remaining life of live particles
      let aliveSum = 0
      let count = 0
      for (let i = 0; i < BREATH_PARTICLE_COUNT; i++) {
        if (ages[i] < 1) {
          aliveSum += 1 - ages[i]
          count++
        }
      }
      mat.opacity = count > 0 ? (aliveSum / count) * 0.5 : 0
    }
    // Suppress unused 'scene' warning
    void scene
  })

  return (
    <>
      <RigidBody
        ref={body}
        type="dynamic"
        position={SPAWN}
        enabledRotations={[false, false, false]}
        linearDamping={0}
        angularDamping={6}
        colliders={false}
        ccd
      >
        <CapsuleCollider args={[0.5, 0.4]} />
      </RigidBody>
      <SmoothPointerLock selector="#scene-canvas" />

      {/* Breath particles — render at scene root, positions are world-space */}
      <points ref={breathRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[breathGeom.positions, 3]}
            count={BREATH_PARTICLE_COUNT}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={breathSprite}
          size={0.08}
          color="#dbe9ff"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  )
}
