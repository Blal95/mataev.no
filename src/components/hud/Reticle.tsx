"use client"

import { useEffect } from "react"
import { useGameStore } from "@/hooks/useGameStore"
import { InkArt } from "@/components/site/InkArt"
import { cn } from "@/lib/cn"

/**
 * The crosshair. At rest, a point of paper ink. On something you can use,
 * crop marks close in around it, the sheet's frame at the size of a cursor,
 * and a tag beside it says what it is and which key uses it. On Borzik he is
 * printed in beside the crosshair, waving, so wherever he has wandered it is
 * plain that it is him you are about to talk to.
 */
export function Reticle() {
  const target = useGameStore((s) => s.canInteract)
  const label = useGameStore((s) => s.interactLabel)
  const borzik = target === "borzik"

  // His print is fetched while the cabin is being walked, not the first time
  // the crosshair lands on him (a mask is a CORS request, hence crossOrigin).
  useEffect(() => {
    for (const kind of ["fill", "ink"]) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = `/art/borzik/wave-${kind}.webp`
    }
  }, [])

  return (
    <div aria-hidden data-on={target ? "" : undefined} className="reticle tone-night pointer-events-none fixed left-1/2 top-1/2 z-10">
      <span className="reticle-dot" />
      <span className="reticle-mark" data-corner="tl" />
      <span className="reticle-mark" data-corner="tr" />
      <span className="reticle-mark" data-corner="bl" />
      <span className="reticle-mark" data-corner="br" />
      {target && (
        <span key={target} className={cn("reticle-tag label", borzik && "pl-1.5")}>
          {borzik && <InkArt pose="wave" pull className="w-12 shrink-0" />}
          <kbd className="border border-act px-1 leading-none text-act-ink">E</kbd>
          <span className="text-fg">{label}</span>
        </span>
      )}
    </div>
  )
}
