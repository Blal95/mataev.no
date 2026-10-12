/**
 * The night tone, for the cabin's materials, lights and shaders. Three.js
 * cannot read CSS variables, so these mirror `.tone-night` and the ultramarine
 * tokens in globals.css; change them together. The cabin wears the site's one
 * hue: ultramarine and its paper, with the fire as the only warm light.
 */
export const NIGHT = {
  /** --ground: the sky, the fog, every dark surface of the UI. */
  ground: "#0e1024",
  /** --line */
  line: "#2a2f5c",
  /** --fg: paper. */
  fg: "#f4f5f7",
  /** --act: what you can use, and what is live. */
  act: "#8c95ff",
} as const

export const ULTRA = "#2b3ae0"
/** tone-blue --fg-2: the palest ultramarine, for the brightest light. */
export const ULTRA_PALE = "#dde0ff"

/** The fire: the one warm light in the night, and the embers it sends up. */
export const FIRE = {
  hot: "#ffd173",
  cool: "#ff5c14",
} as const
