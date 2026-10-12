import type { CSSProperties } from "react"
import { M_GLYPH, TOWER_M, mirrorRoof } from "@/config/mark"

/**
 * The M of MATAEV, drawn as the mark: two Vainakh towers with stepped roofs
 * whose inner tops fall to a point. It is the favicon's silhouette in the
 * name's own ink, one cap height tall on the baseline, with the roofs rising
 * above the cap line. Its width follows the name along the width axis
 * (`--s`, written by useStretch), so the towers part with the letters
 * around them. The roofs are built step by step on arrival (globals.css).
 */
export function TowerM() {
  return (
    <span
      data-letter=""
      aria-hidden
      className="tower-m"
      style={
        {
          "--m-a0": M_GLYPH.a0,
          "--m-k": M_GLYPH.k,
          "--m-cap": M_GLYPH.cap,
          "--m-roof": M_GLYPH.roof,
        } as CSSProperties
      }
    >
      <svg viewBox={TOWER_M.viewBox} preserveAspectRatio="none" aria-hidden>
        <path fillRule="evenodd" d={TOWER_M.body} />
        {TOWER_M.roof.map((d, i) => (
          <path key={`l${i}`} className="roof" style={{ "--i": i } as CSSProperties} d={d} />
        ))}
        {TOWER_M.roof.map((d, i) => (
          <path key={`r${i}`} className="roof" style={{ "--i": i } as CSSProperties} d={mirrorRoof(d)} />
        ))}
      </svg>
    </span>
  )
}
