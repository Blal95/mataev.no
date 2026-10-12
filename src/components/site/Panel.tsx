import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import type { Tone } from "./Folio"

/**
 * One panel of the folio. Sideways it is a full-height column of the track;
 * down the page it is a section. Its tone is what the floating chrome reads
 * to stay legible over it.
 */
export function Panel({
  id,
  tone = "day",
  arrives,
  labelledBy,
  className,
  children,
}: {
  id?: string
  tone?: Tone
  /** The tone it turns to once the reader is in it (the cabin door opening
   *  into night), which the sheet in the corner shows it as. */
  arrives?: Tone
  labelledBy?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      data-panel=""
      data-tone={tone}
      data-arrives={arrives}
      aria-labelledby={labelledBy}
      className={cn(
        tone === "blue" && "tone-blue",
        tone === "night" && "tone-night",
        "panel relative scroll-mt-4 bg-ground text-fg",
        className,
      )}
    >
      {children}
    </section>
  )
}
