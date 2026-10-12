"use client"

import { type ReactNode, useCallback, useRef } from "react"
import { m } from "framer-motion"
import { useWindowStore } from "./windowStore"

interface WindowFrameProps {
  id: string
  title: string
  x: number
  y: number
  z: number
  maximized: boolean
  width?: number
  height?: number
  children: ReactNode
}

export function WindowFrame({
  id,
  title,
  x,
  y,
  z,
  maximized,
  width = 520,
  height = 360,
  children,
}: WindowFrameProps) {
  const focus = useWindowStore((s) => s.focus)
  const close = useWindowStore((s) => s.close)
  const move = useWindowStore((s) => s.move)
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize)
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const onTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (maximized) return // don't drag a maximized window
      focus(id)
      drag.current = { dx: e.clientX - x, dy: e.clientY - y }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [focus, id, x, y, maximized],
  )

  const onTitlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return
      let nx = e.clientX - drag.current.dx
      let ny = e.clientY - drag.current.dy
      // Keep the title bar reachable: never drag above the screen top or
      // so far left/right that the bar scrolls fully off-screen.
      const screen = document.querySelector<HTMLElement>("[data-os-screen]")
      if (screen) {
        const { width: sw, height: sh } = screen.getBoundingClientRect()
        const TITLE_H = 36  // matches h-9 title bar
        const MIN_VIS = 80  // minimum px of title bar that must stay on-screen
        ny = Math.max(0, Math.min(ny, sh - TITLE_H))
        nx = Math.max(-(width - MIN_VIS), Math.min(nx, sw - MIN_VIS))
      }
      move(id, nx, ny)
    },
    [move, id, width],
  )

  const onTitlePointerUp = useCallback((e: React.PointerEvent) => {
    drag.current = null
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  // Maximized fills the OS desktop area (inset within the screen card);
  // otherwise free-floating at (x, y) with its natural size.
  const frameStyle: React.CSSProperties = maximized
    ? { left: 8, top: 8, right: 8, bottom: 8, zIndex: z }
    : { left: x, top: y, width, height, zIndex: z }

  return (
    <m.div
      className="absolute flex flex-col overflow-hidden rounded-xl border border-white/15 bg-panel shadow-[0_24px_70px_-12px_rgba(0,0,0,0.7)]"
      style={frameStyle}
      onPointerDown={() => focus(id)}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Title bar */}
      <div
        className="group flex h-9 shrink-0 cursor-grab items-center gap-2 border-b border-white/10 bg-panel-2 px-3 active:cursor-grabbing"
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onDoubleClick={() => toggleMaximize(id)}
      >
        {/* Traffic lights keep macOS's own red/yellow/green literals. They
            depict a physical control someone recognises, not this site's brand,
            so the palette does not apply to them. */}
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Close"
            onClick={() => close(id)}
            className="grid size-3 place-items-center rounded-full bg-[#ff5f57] text-[8px] leading-none text-black/60 transition hover:brightness-110"
          >
            <span className="opacity-0 group-hover:opacity-100">✕</span>
          </button>
          <button
            type="button"
            aria-label="Minimize"
            onClick={() => toggleMinimize(id)}
            className="grid size-3 place-items-center rounded-full bg-[#febc2e] text-[8px] leading-none text-black/60 transition hover:brightness-110"
          >
            <span className="opacity-0 group-hover:opacity-100">−</span>
          </button>
          <button
            type="button"
            aria-label={maximized ? "Restore" : "Fullscreen"}
            onClick={() => toggleMaximize(id)}
            className="grid size-3 place-items-center rounded-full bg-[#28c840] text-[7px] leading-none text-black/60 transition hover:brightness-110"
          >
            <span className="opacity-0 group-hover:opacity-100">
              {maximized ? "❐" : "+"}
            </span>
          </button>
        </span>
        <span className="pointer-events-none ml-1 truncate font-mono text-[12px] text-text/80">
          {title}
        </span>
      </div>
      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </m.div>
  )
}
