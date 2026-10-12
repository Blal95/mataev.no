/**
 * Archivo's M at weight 800, in em, so the towered M in the name takes the
 * room the letter would. Measured in the browser from the page's own font:
 * `a0` is the advance at width 62% (less the display cut's -0.012em
 * tracking, which a drawn letter does not get), `k` the advance gained per
 * percent of width up to 112%, `cap` the cap height. The roofs rise a fifth
 * of a cap height above the cap line.
 */
const CAP = 0.6871

export const M_GLYPH = {
  a0: 0.6652,
  k: 0.006976,
  cap: CAP,
  roof: CAP * 0.2,
} as const

/**
 * The tower-M's drawing, in its own 200-unit square (`viewBox`): the towers
 * with their windows cut out (even-odd), the V that hangs between them, and
 * the left tower's stepped roof, bottom step first; the right tower's roof is
 * its mirror (`mirrorRoof`). The favicon (`app/icon.svg`) is the same drawing
 * without the windows. The name on the page (`TowerM`) and the share card
 * (`api/og`) both draw it from here.
 */
export const TOWER_M = {
  viewBox: "20 21 160 161",
  body: [
    "M30 182 L42 48 L58 48 L66 182 Z",
    "M58 50 L100 150 L142 50 L123 50 L100 118 L77 50 Z",
    "M170 182 L158 48 L142 48 L134 182 Z",
    "M47 80 h4 v14 h-4 Z M47 112 h4 v14 h-4 Z",
    "M149 80 h4 v14 h-4 Z M149 112 h4 v14 h-4 Z",
  ].join(" "),
  roof: [
    "M37 48 L61 48 L59 42 L39 42 Z",
    "M40 41 L58 41 L56 35 L42 35 Z",
    "M43 34 L55 34 L53 28 L45 28 Z",
    "M46 27 L52 27 L49 21 Z",
  ],
} as const

/** The right tower's roof step for one of the left tower's. */
export const mirrorRoof = (d: string) =>
  d.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, (_, x, y) => `${200 - Number(x)} ${y}`)
