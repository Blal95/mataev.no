"use client"

import { create } from "zustand"

export type Vec3 = [number, number, number]

export interface Editable {
  id: string
  label: string
  pos: Vec3
  /** Euler rotation in radians (XYZ order). */
  rot: Vec3
}

interface EditorState {
  enabled: boolean
  selectedId: string | null
  items: Record<string, Editable>
  order: string[]

  toggleEnabled: () => void
  setEnabled: (b: boolean) => void

  register: (id: string, label: string, initial: Vec3, initialRot?: Vec3) => void
  unregister: (id: string) => void

  select: (id: string | null) => void
  selectNext: () => void
  selectPrev: () => void

  setPos: (id: string, pos: Vec3) => void
  nudge: (id: string, dx: number, dy: number, dz: number) => void
  setRot: (id: string, rot: Vec3) => void
  nudgeRot: (id: string, drx: number, dry: number, drz: number) => void
}

const fmt = (n: number) => n.toFixed(2)

const log = (label: string, id: string, p: Vec3, r?: Vec3) => {
  const rotPart =
    r && (r[0] !== 0 || r[1] !== 0 || r[2] !== 0)
      ? ` rot (${fmt(r[0])}, ${fmt(r[1])}, ${fmt(r[2])})`
      : ""
  // eslint-disable-next-line no-console
  console.info(
    `[editor] ${label} (${id}) → world (${fmt(p[0])}, ${fmt(p[1])}, ${fmt(p[2])})${rotPart}`,
  )
}

export const useEditorStore = create<EditorState>((set, get) => ({
  enabled: false,
  selectedId: null,
  items: {},
  order: [],

  toggleEnabled: () => {
    const next = !get().enabled
    set({ enabled: next })
    if (next) {
      // eslint-disable-next-line no-console
      console.info(
        "[editor] enabled — Tab cycles, arrows = XZ, Q/E = Y, hold Shift for 5x, Alt for 0.1x, C copies, L logs all, Esc deselects, P toggles",
      )
    } else {
      // eslint-disable-next-line no-console
      console.info("[editor] disabled")
    }
  },
  setEnabled: (b) => set({ enabled: b }),

  register: (id, label, initial, initialRot = [0, 0, 0]) =>
    set((state) => {
      // Don't clobber an in-progress edit on re-mount.
      if (state.items[id]) {
        if (state.items[id].label === label) return state
        return {
          items: {
            ...state.items,
            [id]: { ...state.items[id], label },
          },
        }
      }
      return {
        items: {
          ...state.items,
          [id]: { id, label, pos: initial, rot: initialRot },
        },
        order: state.order.includes(id) ? state.order : [...state.order, id],
        selectedId: state.selectedId ?? id,
      }
    }),

  unregister: (id) =>
    set((state) => {
      const { [id]: _gone, ...rest } = state.items
      void _gone
      return {
        items: rest,
        order: state.order.filter((x) => x !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      }
    }),

  select: (id) => set({ selectedId: id }),

  selectNext: () =>
    set((state) => {
      const { order, selectedId } = state
      if (order.length === 0) return state
      const idx = selectedId ? order.indexOf(selectedId) : -1
      const next = order[(idx + 1) % order.length]
      const item = state.items[next]
      if (item) log(item.label, item.id, item.pos, item.rot)
      return { selectedId: next }
    }),

  selectPrev: () =>
    set((state) => {
      const { order, selectedId } = state
      if (order.length === 0) return state
      const idx = selectedId ? order.indexOf(selectedId) : 0
      const next = order[(idx - 1 + order.length) % order.length]
      const item = state.items[next]
      if (item) log(item.label, item.id, item.pos, item.rot)
      return { selectedId: next }
    }),

  setPos: (id, pos) =>
    set((state) => {
      const cur = state.items[id]
      if (!cur) return state
      log(cur.label, id, pos, cur.rot)
      return {
        items: { ...state.items, [id]: { ...cur, pos } },
      }
    }),

  nudge: (id, dx, dy, dz) =>
    set((state) => {
      const cur = state.items[id]
      if (!cur) return state
      const pos: Vec3 = [
        +(cur.pos[0] + dx).toFixed(3),
        +(cur.pos[1] + dy).toFixed(3),
        +(cur.pos[2] + dz).toFixed(3),
      ]
      log(cur.label, id, pos, cur.rot)
      return {
        items: { ...state.items, [id]: { ...cur, pos } },
      }
    }),

  setRot: (id, rot) =>
    set((state) => {
      const cur = state.items[id]
      if (!cur) return state
      log(cur.label, id, cur.pos, rot)
      return {
        items: { ...state.items, [id]: { ...cur, rot } },
      }
    }),

  nudgeRot: (id, drx, dry, drz) =>
    set((state) => {
      const cur = state.items[id]
      if (!cur) return state
      const rot: Vec3 = [
        +(cur.rot[0] + drx).toFixed(4),
        +(cur.rot[1] + dry).toFixed(4),
        +(cur.rot[2] + drz).toFixed(4),
      ]
      log(cur.label, id, cur.pos, rot)
      return {
        items: { ...state.items, [id]: { ...cur, rot } },
      }
    }),
}))
