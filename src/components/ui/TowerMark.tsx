import { cn } from "@/lib/cn"

/**
 * TowerMark — the Mataev brandmark as themeable line-art: two tapered Vainakh
 * watchtowers with stepped roofs, whose inner roof lines fall to a centre
 * point to form the M of Mataev. The same M stands in the name on the first
 * screen, so the mark explains itself without a word.
 *
 * Stroke-based so it inherits `currentColor`. Every stroke has a path length
 * of 1 and a part class, so CSS can trace it part by part (`--draw`, see
 * globals.css); with nothing set it is simply drawn. `accent` sets the valley,
 * the stroke that makes the M, in ultramarine.
 */
export function TowerMark({
  className,
  strokeWidth = 2,
  accent = false,
}: {
  className?: string
  strokeWidth?: number
  accent?: boolean
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("tm", accent && "tm-accent", "size-7", className)}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path className="tm-tower" pathLength={1} d="M6 43 L9 16 L15 16 L14 43" />
      <path className="tm-tower" pathLength={1} d="M42 43 L39 16 L33 16 L34 43" />
      <path className="tm-roof" pathLength={1} d="M8.5 16 L10 12.5 H14 L15.5 16 M11 12.5 L12 8 L13 12.5" />
      <path className="tm-roof" pathLength={1} d="M39.5 16 L38 12.5 H34 L32.5 16 M37 12.5 L36 8 L35 12.5" />
      <path className="tm-slit" pathLength={1} d="M11 22 v3 M11 29 v3" strokeWidth={strokeWidth * 0.8} />
      <path className="tm-slit" pathLength={1} d="M37 22 v3 M37 29 v3" strokeWidth={strokeWidth * 0.8} />
      <path className="tm-valley" pathLength={1} d="M15 16 L24 32 L33 16" />
    </svg>
  )
}

/**
 * TowerHairline — an engraved section divider: a faint rule with the tower
 * mark (or a diamond ornament) set in the middle. Echoes Caucasus carved
 * stone borders without tipping into pastiche.
 */
export function TowerHairline({
  className,
  ornament = "tower",
}: {
  className?: string
  ornament?: "tower" | "diamond"
}) {
  return (
    <div
      aria-hidden
      className={cn("flex items-center justify-center gap-4", className)}
    >
      <span className="hairline h-px flex-1" />
      {ornament === "tower" ? (
        <TowerMark className="size-4 shrink-0 text-cyan/50" strokeWidth={2.4} />
      ) : (
        <span className="size-1.5 shrink-0 rotate-45 border border-cyan/50 bg-cyan/20" />
      )}
      <span className="hairline h-px flex-1" />
    </div>
  )
}
