"use client"

import { useEffect } from "react"
import { useEditorStore, type Vec3 } from "./editorStore"

/**
 * Register a scene prop with the in-game position editor.
 *
 * Pass the same `id` on every render. The store keeps the live position
 * + rotation keyed by `id`. The returned tuple is the current position;
 * use {@link useEditableTransform} if you also need the rotation.
 *
 * `initial` is only used on first registration.
 */
export function useEditablePosition(
  id: string,
  label: string,
  initial: Vec3,
): Vec3 {
  const register = useEditorStore((s) => s.register)
  const unregister = useEditorStore((s) => s.unregister)
  const pos = useEditorStore((s) => s.items[id]?.pos ?? initial)

  useEffect(() => {
    register(id, label, initial)
    return () => unregister(id)
    // intentionally not depending on `initial`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label, register, unregister])

  return pos
}

/**
 * Same as {@link useEditablePosition} but also returns the current
 * rotation. Use this when the prop you're wrapping accepts a rotation.
 */
export function useEditableTransform(
  id: string,
  label: string,
  initial: Vec3,
  initialRot: Vec3 = [0, 0, 0],
): { pos: Vec3; rot: Vec3 } {
  const register = useEditorStore((s) => s.register)
  const unregister = useEditorStore((s) => s.unregister)
  const pos = useEditorStore((s) => s.items[id]?.pos ?? initial)
  const rot = useEditorStore((s) => s.items[id]?.rot ?? initialRot)

  useEffect(() => {
    register(id, label, initial, initialRot)
    return () => unregister(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label, register, unregister])

  return { pos, rot }
}
