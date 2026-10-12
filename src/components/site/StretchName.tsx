"use client"

import { useRef } from "react"
import { useStretch } from "@/hooks/useStretch"
import { cn } from "@/lib/cn"
import { TowerM } from "./TowerM"

/**
 * The name, in the display cut at 62% width. Letters near the pointer widen
 * along the font's own width axis and settle back when it leaves: the one
 * playful thing on the page, and it is made of the typeface, not an effect
 * laid over it. Each line rises out of a mask on a hard load.
 *
 * The M of the family name is the mark itself (<TowerM>): the first screen
 * says what the corner mark is before the corner mark is even there.
 *
 * Only a real mouse with motion allowed gets the stretch; everyone else gets
 * the set type, which is the finished design. The visual lines are hidden
 * from assistive tech, so the name is read from plain text, drawing and all.
 */
export function StretchName({
  lines,
  mark = true,
  className,
}: {
  lines: string[]
  /** Set the last line's M as the tower mark. */
  mark?: boolean
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useStretch(ref)

  return (
    <h1 ref={ref} className={cn("display select-none", className)}>
      <span className="sr-only">{lines.join(" ")}</span>
      {lines.map((line, li) => {
        const last = li === lines.length - 1
        const towered = mark && last && line.startsWith("M")
        return (
          <span
            key={line}
            aria-hidden
            // The towered M's roofs rise above the cap line, past the mask's
            // top edge: pad the mask up by the roofs and take it back out.
            className={cn("block overflow-y-clip pb-[0.05em]", towered && "-mt-[0.2em] pt-[0.2em]")}
          >
            <span
              className={cn(
                "arrive-rise block whitespace-nowrap [contain:layout]",
                li === 1 && "text-act [animation-delay:90ms]",
              )}
            >
              {Array.from(line).map((ch, ci) =>
                towered && ci === 0 ? (
                  <TowerM key={ci} />
                ) : (
                  <span key={ci} data-letter className="inline-block">
                    {ch}
                  </span>
                ),
              )}
            </span>
          </span>
        )
      })}
    </h1>
  )
}
