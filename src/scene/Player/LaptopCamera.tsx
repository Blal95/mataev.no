"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useGameStore } from "@/hooks/useGameStore"
import { useEditorStore } from "@/scene/editor/editorStore"

const DOLLY_IN = 1.0 // seconds
const DOLLY_OUT = 0.8

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

// Local offsets (workbench local space, matching WorkbenchStation layout).
const SCREEN_LOCAL = new THREE.Vector3(0, 1.4, 0.1) // screen mid-height
const EYE_LOCAL = new THREE.Vector3(0, 1.5, 2.2) // camera in front (+z)

export function LaptopCamera() {
  const openPanel = useGameStore((s) => s.openPanel)
  const { camera } = useThree()

  const active = openPanel === "projects"
  const fromPos = useRef(new THREE.Vector3())
  const fromQuat = useRef(new THREE.Quaternion())
  const toPos = useRef(new THREE.Vector3())
  const toQuat = useRef(new THREE.Quaternion())
  const savedPos = useRef(new THREE.Vector3())
  const savedQuat = useRef(new THREE.Quaternion())
  const start = useRef<number | null>(null)
  const phase = useRef<"in" | "out" | null>(null)
  const wasActive = useRef(false)

  const computeFocus = () => {
    const item = useEditorStore.getState().items["workbench"]
    const pos = item?.pos ?? [11.5, 5, -8.5]
    const rot = item?.rot ?? [0, 0, 0]
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(pos[0], pos[1], pos[2]),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rot[0], rot[1], rot[2]),
      ),
      new THREE.Vector3(1, 1, 1),
    )
    const eye = EYE_LOCAL.clone().applyMatrix4(m)
    const look = SCREEN_LOCAL.clone().applyMatrix4(m)
    toPos.current.copy(eye)
    const lookM = new THREE.Matrix4().lookAt(
      eye,
      look,
      new THREE.Vector3(0, 1, 0),
    )
    toQuat.current.setFromRotationMatrix(lookM)
  }

  useEffect(() => {
    if (active) {
      savedPos.current.copy(camera.position)
      savedQuat.current.copy(camera.quaternion)
      fromPos.current.copy(camera.position)
      fromQuat.current.copy(camera.quaternion)
      computeFocus()
      wasActive.current = true
      if (REDUCED_MOTION) {
        camera.position.copy(toPos.current)
        camera.quaternion.copy(toQuat.current)
        phase.current = null
        start.current = null
      } else {
        phase.current = "in"
        start.current = performance.now()
      }
      return
    }

    if (!wasActive.current) return
    wasActive.current = false
    fromPos.current.copy(camera.position)
    fromQuat.current.copy(camera.quaternion)
    toPos.current.copy(savedPos.current)
    toQuat.current.copy(savedQuat.current)
    if (REDUCED_MOTION) {
      camera.position.copy(toPos.current)
      camera.quaternion.copy(toQuat.current)
      phase.current = null
      start.current = null
    } else {
      phase.current = "out"
      start.current = performance.now()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useFrame(() => {
    if (!phase.current || start.current == null) return
    const dur = phase.current === "in" ? DOLLY_IN : DOLLY_OUT
    const elapsed = (performance.now() - start.current) / 1000
    const t = Math.min(1, elapsed / dur)
    const eased = 1 - Math.pow(1 - t, 3)
    camera.position.lerpVectors(fromPos.current, toPos.current, eased)
    camera.quaternion.copy(fromQuat.current).slerp(toQuat.current, eased)
    if (t >= 1) {
      phase.current = null
      start.current = null
    }
  })

  return null
}
