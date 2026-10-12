import type { PanelId } from "@/hooks/useGameStore"

/**
 * Maps each guidable panel to the `id` its station registers under in the
 * in-game position editor (`useEditorStore`, via `<Editable id="...">` in
 * Scene.tsx). GuidingWind reads the LIVE position from that store every
 * frame — this file only maps panel β†’ editable id, and the ids below serve
 * as a documented fallback if a station hasn't registered yet (e.g. the
 * very first frame before its `<Editable>` mounts).
 *
 * This is the fix for wind pointing at stale coordinates: station positions
 * used to be hand-copied into a parallel constants file that silently drifted
 * out of sync every time a station got repositioned in Scene.tsx or nudged
 * via the P-editor. Reading the editor store directly means there is only
 * ONE source of truth for "where is this station" β€” the same one the P-editor
 * and the objects themselves use β€” so it can't go stale again.
 */
export const PANEL_TO_EDITABLE_ID: Partial<Record<NonNullable<PanelId>, string>> = {
  contact:   "mailbox",
  projects:  "workbench",
  education: "cairn",
  about:     "photos",
  record:    "record",
  borzik:    "borzik",
  books:     "books",
  gallery:   "gallery",
  heritage:  "heritage",
}

/**
 * Fallback world-space positions, used only until the matching `<Editable>`
 * has registered (or if a station is ever removed from the scene). Keep
 * these roughly current, but they are NOT the source of truth β€” see above.
 */
export const GUIDE_TARGETS: Partial<Record<NonNullable<PanelId>, [number, number, number]>> = {
  contact:   [18.0, 3.0,  11.5],   // Mailbox
  projects:  [11.5, 5.0,  -8.5],   // Workbench — south deck
  education: [-1.0, 3.85,  6.9],   // Diploma cairn
  about:     [-1.0, 3.84,  9.5],   // Photo frames
  record:    [15.0, 2.9,   4.0],   // Record player — east of fire
  borzik:    [24.3, 4.05,  7.57],  // Hamster home
  books:     [-2.5, 2.9, -13.0],   // Bookshelf — cabin interior west
  gallery:   [-23.9,20.4, 23.85],  // Gallery — aurora overlook
  heritage:  [-11.0,2.4, -15.0],   // Heritage stone
}
