/**
 * Borzik's poses in `public/art/borzik/`, as the pixel size of each mask pair
 * (`<pose>-ink.webp` + `<pose>-fill.webp`), which is also the aspect ratio
 * <InkArt> reserves. Masks are made by `scripts/ink-masks.py`.
 *
 * The `-go` poses are the action frames a Work column re-prints into on
 * hover: Borzik doing the job instead of posing with it. `door` stands in the
 * cabin door at the end of the folio.
 */
export const POSES = {
  bowl: [577, 520],
  wave: [709, 850],
  cheese: [689, 652],
  laptop: [673, 546],
  taxi: [797, 816],
  camera: [636, 606],
  highfive: [657, 464],
  stamp: [743, 751],
  knight: [733, 541],
  "taxi-go": [763, 678],
  "highfive-go": [762, 688],
  "camera-go": [714, 759],
  "stamp-go": [753, 761],
  "knight-go": [761, 581],
  door: [717, 510],
} as const satisfies Record<string, readonly [number, number]>

export type Pose = keyof typeof POSES
