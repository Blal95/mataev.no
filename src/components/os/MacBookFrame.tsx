"use client"

import { type ReactNode } from "react"
import { m } from "framer-motion"

interface MacBookFrameProps {
  children: ReactNode
}

/**
 * Diegetic MacBook chrome: a large aluminium laptop with a black-bezel
 * screen (camera notch) whose interior hosts the Bilal OS desktop, plus
 * a hinge + base wedge so it reads as a real laptop you're using.
 *
 * Pure CSS/DOM — no extra 3D cost. The screen interior is the children.
 */
export function MacBookFrame({ children }: MacBookFrameProps) {
  return (
    <m.div
      className="flex w-[94vw] max-w-[1320px] flex-col items-center"
      initial={{ opacity: 0, scale: 0.9, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 12 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Screen unit: aluminium edge → black bezel → live screen. */}
      {/* Anodised-aluminium greys and the dark screen well are a drawing of a
          laptop. They are not brand surfaces and the palette does not reach them. */}
      <div className="w-full rounded-t-2xl bg-gradient-to-b from-[#d6d9de] to-[#a8acb3] p-[3px] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)]">
        <div className="relative rounded-t-xl bg-black p-[10px] pt-[18px]">
          {/* Camera notch */}
          <div className="absolute left-1/2 top-[5px] flex h-[9px] w-[120px] -translate-x-1/2 items-center justify-center rounded-b-lg bg-black">
            <span className="size-[5px] rounded-full bg-[#11151f] ring-1 ring-[#22303f]" />
          </div>
          {/* Live screen */}
          <div className="relative h-[74vh] max-h-[720px] w-full overflow-hidden rounded-md bg-[#070b16]">
            {children}
            {/* Retina vignette + glass sheen for depth (non-interactive). */}
            <div className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.45)]" />
            <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-br from-white/[0.05] via-transparent to-transparent" />
            {/* Power-on wake flash — one shot when the screen mounts. */}
            <m.div
              className="pointer-events-none absolute inset-0 rounded-md bg-white"
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Hinge + base wedge. */}
      <div className="relative h-[14px] w-[101%] rounded-b-md bg-gradient-to-b from-[#b9bdc4] to-[#8e929a]">
        {/* lid groove / notch for opening */}
        <div className="absolute left-1/2 top-0 h-[6px] w-[110px] -translate-x-1/2 rounded-b-xl bg-[#7c8088]" />
      </div>
      {/* Front lip shadow for depth */}
      <div className="h-[5px] w-[97%] rounded-b-2xl bg-[#6c7077]/70 blur-[1px]" />
    </m.div>
  )
}
