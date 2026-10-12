"use client"

import { useEffect } from "react"
import { useEditorStore } from "./editorStore"
import { useGameStore } from "@/hooks/useGameStore"

const BASE_STEP = 0.5
const BASE_ROT_STEP = Math.PI / 24 // 7.5°
const SHIFT_MULTIPLIER = 5
const ALT_MULTIPLIER = 0.1

function step(e: KeyboardEvent): number {
  let s = BASE_STEP
  if (e.shiftKey) s *= SHIFT_MULTIPLIER
  if (e.altKey) s *= ALT_MULTIPLIER
  return s
}

function rotStep(e: KeyboardEvent): number {
  let s = BASE_ROT_STEP
  if (e.shiftKey) s *= SHIFT_MULTIPLIER
  if (e.altKey) s *= ALT_MULTIPLIER
  return s
}

/**
 * Mounts the in-scene position editor keyboard handler.
 *
 * Keys (active while editor is on, toggle with P):
 *   Tab / Shift+Tab — cycle selected prop
 *   ArrowLeft/Right — nudge X
 *   ArrowUp/Down    — nudge Z (toward / away from camera in world space)
 *   Q / E           — nudge Y down / up
 *   Shift held      — 5x step
 *   Alt held        — 0.1x step
 *   C               — copy selected position to clipboard
 *   L               — log all positions to the console
 *   Esc             — deselect
 *   P               — toggle editor
 */
export function PositionEditor() {
  const enabled = useEditorStore((s) => s.enabled)
  const selectedId = useEditorStore((s) => s.selectedId)
  const items = useEditorStore((s) => s.items)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Always allow P to toggle, even when typing? No — only when not in
      // an input. Same rule for all editor keys.
      const tgt = e.target as HTMLElement | null
      const inField =
        tgt?.tagName === "INPUT" ||
        tgt?.tagName === "TEXTAREA" ||
        tgt?.isContentEditable
      if (inField) return
      // Inert while interacting (a panel is open) — controls are frozen.
      if (useGameStore.getState().paused) return

      const store = useEditorStore.getState()

      if (e.key === "p" || e.key === "P") {
        store.toggleEnabled()
        e.preventDefault()
        return
      }

      if (!store.enabled) return

      if (e.key === "Tab") {
        e.preventDefault()
        if (e.shiftKey) store.selectPrev()
        else store.selectNext()
        return
      }

      if (e.key === "Escape") {
        store.select(null)
        return
      }

      if (e.key === "L" || e.key === "l") {
        // eslint-disable-next-line no-console
        console.info("[editor] all positions:")
        for (const id of store.order) {
          const it = store.items[id]
          if (!it) continue
          // eslint-disable-next-line no-console
          console.info(
            `  ${id.padEnd(20)} ${it.label.padEnd(24)} (${it.pos
              .map((n) => n.toFixed(2))
              .join(", ")})`,
          )
        }
        return
      }

      if (!store.selectedId) return
      const id = store.selectedId

      if (e.key === "C" || e.key === "c") {
        const item = store.items[id]
        if (!item) return
        const pos = `[${item.pos[0].toFixed(2)}, ${item.pos[1].toFixed(2)}, ${item.pos[2].toFixed(2)}]`
        const hasRot =
          item.rot[0] !== 0 || item.rot[1] !== 0 || item.rot[2] !== 0
        const rot = hasRot
          ? ` rot [${item.rot[0].toFixed(3)}, ${item.rot[1].toFixed(3)}, ${item.rot[2].toFixed(3)}]`
          : ""
        const text = `${pos}${rot}`
        navigator.clipboard?.writeText(text).catch(() => {})
        // eslint-disable-next-line no-console
        console.info(`[editor] copied ${item.label}: ${text}`)
        return
      }

      const s = step(e)
      const r = rotStep(e)
      switch (e.key) {
        // Translation
        case "ArrowLeft":
          e.preventDefault()
          store.nudge(id, -s, 0, 0)
          break
        case "ArrowRight":
          e.preventDefault()
          store.nudge(id, s, 0, 0)
          break
        case "ArrowUp":
          // Up arrow = forward = -Z in three.js camera-facing convention.
          e.preventDefault()
          store.nudge(id, 0, 0, -s)
          break
        case "ArrowDown":
          e.preventDefault()
          store.nudge(id, 0, 0, s)
          break
        case "q":
        case "Q":
          e.preventDefault()
          store.nudge(id, 0, -s, 0)
          break
        case "e":
        case "E":
          e.preventDefault()
          store.nudge(id, 0, s, 0)
          break

        // Rotation (radians)
        //   Z / X = yaw   (Y axis)  ∓ / ±
        //   T / Y = pitch (X axis)  ∓ / ±
        //   B / N = roll  (Z axis)  ∓ / ±
        case "z":
        case "Z":
          e.preventDefault()
          store.nudgeRot(id, 0, -r, 0)
          break
        case "x":
        case "X":
          e.preventDefault()
          store.nudgeRot(id, 0, r, 0)
          break
        case "t":
        case "T":
          e.preventDefault()
          store.nudgeRot(id, -r, 0, 0)
          break
        case "y":
        case "Y":
          e.preventDefault()
          store.nudgeRot(id, r, 0, 0)
          break
        case "b":
        case "B":
          e.preventDefault()
          store.nudgeRot(id, 0, 0, -r)
          break
        case "n":
        case "N":
          e.preventDefault()
          store.nudgeRot(id, 0, 0, r)
          break

        // R resets rotation to zero
        case "r":
        case "R":
          e.preventDefault()
          store.setRot(id, [0, 0, 0])
          break
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!enabled || !selectedId) return null
  const item = items[selectedId]
  if (!item) return null

  // Visual indicator at the selected prop's world transform.
  return (
    <group position={item.pos} rotation={item.rot}>
      <mesh>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshBasicMaterial color="#F4A261" wireframe />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshBasicMaterial color="#F4A261" />
      </mesh>
      {/* Forward arrow showing the prop's local -Z axis. */}
      <mesh position={[0, 0, -0.6]}>
        <coneGeometry args={[0.12, 0.3, 8]} />
        <meshBasicMaterial color="#5BC0EB" />
      </mesh>
    </group>
  )
}
