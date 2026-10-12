"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, m } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import { FileText, Globe2, TerminalSquare, Trash2 } from "lucide-react"
import { useGameStore } from "@/hooks/useGameStore"
import { OS_FOLDERS } from "@/config/osFiles"
import { FOLDER_GLYPH } from "./icons"
import { WALLPAPERS } from "./wallpapers"
import { useWindowStore } from "./windowStore"
import { MacBookFrame } from "./MacBookFrame"
import { MenuBar } from "./MenuBar"
import { Dock } from "./Dock"
import { WindowFrame } from "./WindowFrame"
import { Finder } from "./Finder"
import { GetInfo } from "./GetInfo"
import { BrowserWindow } from "./BrowserWindow"
import { Resume } from "./Resume"
import { Trash } from "./Trash"
import { Terminal } from "./Terminal"

function windowSize(kind: string): { width: number; height: number } {
  switch (kind) {
    case "site":
      return { width: 820, height: 520 }
    case "info":
      return { width: 460, height: 420 }
    case "resume":
      return { width: 560, height: 560 }
    case "terminal":
      return { width: 580, height: 360 }
    case "trash":
      return { width: 320, height: 240 }
    default:
      return { width: 360, height: 260 }
  }
}

export function BilalOS() {
  const t = useTranslations("os")
  const locale = useLocale()
  const setOpenPanel = useGameStore((s) => s.setOpenPanel)
  const windows = useWindowStore((s) => s.windows)
  const openWindow = useWindowStore((s) => s.open)
  const restore = useWindowStore((s) => s.restore)
  const reset = useWindowStore((s) => s.reset)
  const [wallpaperIdx, setWallpaperIdx] = useState(0)
  const wallpaper = WALLPAPERS[wallpaperIdx]

  const shutDown = () => {
    reset()
    setOpenPanel(null)
  }

  // Esc closes the whole OS. Mount-once; Zustand action refs are stable.
  // Cleanup resets windows on any unmount so the desktop never reopens stale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        shutDown()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lock body scroll while the OS overlay is mounted. Unlike the Radix
  // dialogs, this overlay is hand-rolled, so without this the page behind
  // stays scrollable — on touch devices you could swipe the home page and
  // see it through the translucent backdrop. The position:fixed + top trick
  // is the iOS-Safari-safe way (plain overflow:hidden doesn't stop rubber-band
  // swipes there); we restore the exact scroll position on close.
  useEffect(() => {
    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }
    body.style.overflow = "hidden"
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.width = "100%"
    return () => {
      body.style.overflow = prev.overflow
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [])

  const minimized = windows.filter((w) => w.minimized)

  return (
    <m.div
      className="fixed inset-0 z-40 grid place-items-center overscroll-contain bg-black/55 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      // Swallow touch-moves on the backdrop itself so a swipe that starts on
      // the dimmed area can't scroll/pan the page behind on mobile.
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault()
      }}
    >
      <MacBookFrame>
        {/* Screen interior = the live OS. */}
        <div
          className="flex h-full flex-col font-sans"
          style={{ background: wallpaper.css }}
        >
          <MenuBar
            onShutDown={shutDown}
            onCycleWallpaper={() =>
              setWallpaperIdx((i) => (i + 1) % WALLPAPERS.length)
            }
            wallpaperLabel={wallpaper.label}
          />

          <div className="relative min-h-0 flex-1" data-os-screen>
            {/* Project folders (top-right). */}
            <div className="absolute right-4 top-4 grid grid-cols-1 gap-3">
              {OS_FOLDERS.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  // Single click (or Enter/Space on the focused button) opens —
                  // a web desktop where folders need a double-click is friction
                  // most visitors won't push through. macOS purists still get
                  // double-click for free (openWindow dedupes by id).
                  onClick={() =>
                    openWindow({
                      id: `${folder.slug}-finder`,
                      kind: "finder",
                      title: folder.label,
                      projectSlug: folder.slug,
                    })
                  }
                  className="flex w-24 flex-col items-center gap-1 rounded-lg p-2 text-center transition hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                >
                  <span className="text-4xl drop-shadow">{FOLDER_GLYPH}</span>
                  <span className="line-clamp-1 rounded px-1 font-mono text-[11px] text-white/90">
                    {folder.label}
                  </span>
                </button>
              ))}
            </div>

            {/* App / file shortcuts (top-left). */}
            <div className="absolute left-4 top-4 grid grid-cols-1 gap-3">
              <DesktopIcon
                glyph={<Globe2 className="size-9" />}
                label={t("desktopSite")}
                onOpen={() =>
                  openWindow({
                    id: "site-2d",
                    kind: "site",
                    title: "mataev.no",
                    url: `/${locale}`,
                  })
                }
              />
              <DesktopIcon
                glyph={<FileText className="size-9" />}
                label={t("desktopResume")}
                onOpen={() =>
                  openWindow({
                    id: "resume",
                    kind: "resume",
                    title: t("desktopResume"),
                  })
                }
              />
              <DesktopIcon
                glyph={<TerminalSquare className="size-9" />}
                label={t("desktopTerminal")}
                onOpen={() =>
                  openWindow({
                    id: "terminal",
                    kind: "terminal",
                    title: "borzik-shell",
                  })
                }
              />
              <DesktopIcon
                glyph={<Trash2 className="size-9" />}
                label={t("desktopTrash")}
                onOpen={() =>
                  openWindow({ id: "trash", kind: "trash", title: t("desktopTrash") })
                }
              />
            </div>

            {windows.length === 0 && (
              <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-sm text-white/70">
                {t("hintDesktop")}
              </p>
            )}

            {/* Window layer. */}
            <AnimatePresence>
              {windows
                .filter((w) => !w.minimized)
                .map((w) => {
                  const { width, height } = windowSize(w.kind)
                  return (
                    <WindowFrame
                      key={w.id}
                      id={w.id}
                      title={w.title}
                      x={w.x}
                      y={w.y}
                      z={w.z}
                      maximized={w.maximized}
                      width={width}
                      height={height}
                    >
                      {w.kind === "finder" && w.projectSlug && (
                        <Finder projectSlug={w.projectSlug} />
                      )}
                      {w.kind === "info" && w.projectSlug && (
                        <GetInfo projectSlug={w.projectSlug} />
                      )}
                      {w.kind === "site" && w.url && (
                        <BrowserWindow url={w.url} />
                      )}
                      {w.kind === "resume" && <Resume />}
                      {w.kind === "trash" && <Trash />}
                      {w.kind === "terminal" && <Terminal />}
                    </WindowFrame>
                  )
                })}
            </AnimatePresence>

            {/* Minimized tray (bottom-left, above the dock). */}
            {minimized.length > 0 && (
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                {minimized.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => restore(w.id)}
                    className="truncate rounded-md border border-white/15 bg-white/10 px-2 py-1 font-mono text-[10px] text-white/80 backdrop-blur transition hover:bg-white/20"
                  >
                    {w.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Dock onShutDown={shutDown} />
        </div>
      </MacBookFrame>
    </m.div>
  )
}

function DesktopIcon({
  glyph,
  label,
  onOpen,
}: {
  glyph: React.ReactNode
  label: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-24 flex-col items-center gap-1 rounded-lg p-2 text-center transition hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
    >
      <span className="grid size-10 place-items-center text-white drop-shadow">
        {glyph}
      </span>
      <span className="line-clamp-1 font-mono text-[11px] text-white/90">
        {label}
      </span>
    </button>
  )
}
