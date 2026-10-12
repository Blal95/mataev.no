"use client"

import type { ReactElement } from "react"
import { useEditableTransform } from "./useEditablePosition"
import type { Vec3 } from "./editorStore"

interface EditableProps {
  id: string
  label: string
  initial: Vec3
  initialRot?: Vec3
  /**
   * Render callback. Receives the current position and rotation as
   * separate args so callers can pass each to a different prop
   * (e.g. `position={p}` and `rotation={r}` on a <group>).
   */
  children: (pos: Vec3, rot: Vec3) => ReactElement
}

/**
 * Subscribes to the editor store for a given id and hands the live
 * transform to its child:
 *
 *   <Editable id="firepit" label="Fire pit" initial={[0,0,0]}>
 *     {(p, r) => <FirePit position={p} rotation={r} />}
 *   </Editable>
 */
export function Editable({
  id,
  label,
  initial,
  initialRot = [0, 0, 0],
  children,
}: EditableProps) {
  const { pos, rot } = useEditableTransform(id, label, initial, initialRot)
  return children(pos, rot)
}
