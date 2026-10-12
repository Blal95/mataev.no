"use client"

import { create } from "zustand"

export type OSWindowKind =
  | "finder"
  | "site"
  | "info"
  | "terminal"
  | "resume"
  | "trash"

export interface OSWindow {
  /** Stable id — dedupes re-opening the same thing. */
  id: string
  kind: OSWindowKind
  title: string
  /** projectSlug for finder/info; undefined otherwise. */
  projectSlug?: string
  /** url for site windows. */
  url?: string
  x: number
  y: number
  /** focus order; higher = on top. */
  z: number
  minimized: boolean
  maximized: boolean
}

interface WindowState {
  windows: OSWindow[]
  topZ: number
  open: (w: Omit<OSWindow, "x" | "y" | "z" | "minimized" | "maximized"> & {
    x?: number
    y?: number
  }) => void
  close: (id: string) => void
  focus: (id: string) => void
  move: (id: string, x: number, y: number) => void
  toggleMinimize: (id: string) => void
  toggleMaximize: (id: string) => void
  restore: (id: string) => void
  reset: () => void
}

// Cascade new windows so they don't stack exactly.
const CASCADE = 26

export const useWindowStore = create<WindowState>((set) => ({
  windows: [],
  topZ: 1,
  open: (w) =>
    set((state) => {
      const nextZ = state.topZ + 1
      const existing = state.windows.find((x) => x.id === w.id)
      if (existing) {
        // Re-focus + un-minimize instead of duplicating.
        return {
          topZ: nextZ,
          windows: state.windows.map((x) =>
            x.id === w.id ? { ...x, z: nextZ, minimized: false } : x,
          ),
        }
      }
      const n = state.windows.length
      const win: OSWindow = {
        ...w,
        x: w.x ?? 90 + n * CASCADE,
        y: w.y ?? 70 + n * CASCADE,
        z: nextZ,
        minimized: false,
        maximized: false,
      }
      return { topZ: nextZ, windows: [...state.windows, win] }
    }),
  close: (id) =>
    set((state) => ({
      windows: state.windows.filter((x) => x.id !== id),
    })),
  focus: (id) =>
    set((state) => {
      const nextZ = state.topZ + 1
      return {
        topZ: nextZ,
        windows: state.windows.map((x) =>
          x.id === id ? { ...x, z: nextZ } : x,
        ),
      }
    }),
  move: (id, x, y) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),
  toggleMinimize: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w,
      ),
    })),
  toggleMaximize: (id) =>
    set((state) => {
      const nextZ = state.topZ + 1
      return {
        topZ: nextZ,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, maximized: !w.maximized, z: nextZ } : w,
        ),
      }
    }),
  restore: (id) =>
    set((state) => {
      const nextZ = state.topZ + 1
      return {
        topZ: nextZ,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, minimized: false, z: nextZ } : w,
        ),
      }
    }),
  reset: () => set({ windows: [], topZ: 1 }),
}))
