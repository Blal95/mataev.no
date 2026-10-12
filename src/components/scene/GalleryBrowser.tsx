"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { m } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCw,
  X,
} from "lucide-react"
import { useGameStore } from "@/hooks/useGameStore"
import type { GalleryImage } from "@/types/gallery"
import { cn } from "@/lib/cn"

const BOARD_COUNT = 9
const EXPO = [0.16, 1, 0.3, 1] as const
const GALLERY_HOME = "https://gallery.mataev.no"

/** Re-engage pointer lock on the canvas after the browser closes (user gesture). */
function resumeLock() {
  const canvas = document.getElementById(
    "scene-canvas",
  ) as HTMLCanvasElement | null
  if (!canvas || canvas.ownerDocument !== document || !document.contains(canvas))
    return
  try {
    const ret = canvas.requestPointerLock?.() as unknown
    if (ret && typeof (ret as Promise<void>).catch === "function") {
      ;(ret as Promise<void>).catch(() => {})
    }
  } catch {
    /* browser cooldown / missing gesture — auto-lock effect recovers */
  }
}

type Status = "loading" | "ok" | "blocked"

/**
 * Diegetic in-world browser for the photo wall. Aiming at a frame and pressing
 * [E] opens this over the cabin (like the laptop's OS): a styled browser window
 * that frames the live photo page on gallery.mataev.no, with ‹ › to flip
 * between the nine pinned photos. Verified frameable (no X-Frame-Options); if a
 * page ever refuses, it falls back to the high-res photo + an open-in-tab link.
 */
export function GalleryBrowser() {
  const t = useTranslations("panel.gallery")
  const galleryData = useGameStore((s) => s.galleryData)
  const setOpenPanel = useGameStore((s) => s.setOpenPanel)

  const images = useMemo<GalleryImage[]>(
    () => (galleryData ? galleryData.slice(0, BOARD_COUNT) : []),
    [galleryData],
  )

  const [index, setIndex] = useState(() => {
    const f = useGameStore.getState().focusedGalleryIndex
    return Math.min(Math.max(0, f), BOARD_COUNT - 1)
  })
  const [status, setStatus] = useState<Status>("loading")
  const timer = useRef<number | null>(null)

  const safeIndex = images.length > 0 ? Math.min(index, images.length - 1) : 0
  const photo: GalleryImage | undefined = images[safeIndex]
  const pageUrl = photo?.permalink ?? GALLERY_HOME
  const prettyPath = useMemo(() => {
    try {
      const u = new URL(pageUrl)
      return `${u.hostname}${u.pathname}`
    } catch {
      return pageUrl
    }
  }, [pageUrl])

  const close = useCallback(() => {
    setOpenPanel(null)
    resumeLock()
  }, [setOpenPanel])

  const go = useCallback(
    (dir: 1 | -1) => {
      if (images.length < 2) return
      setStatus("loading")
      setIndex((i) => (i + dir + images.length) % images.length)
    },
    [images.length],
  )

  // Arm the blocked-fallback timeout whenever the framed page changes.
  useEffect(() => {
    setStatus("loading")
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? "blocked" : s))
    }, 4000)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [pageUrl])

  // Keyboard: Esc closes, ← / → flip photos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        close()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        go(1)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close, go])

  return (
    <m.div
      className="fixed inset-0 z-40 grid place-items-center bg-midnight/70 p-4 backdrop-blur-md sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EXPO }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={t("seeAll")}
    >
      <m.div
        className="flex h-[min(86vh,760px)] w-[min(94vw,1120px)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-panel shadow-2xl shadow-midnight/60 ring-1 ring-cyan/10"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.45, ease: EXPO }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Browser chrome */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-panel-2/80 px-3">
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
          >
            <X className="size-4" />
          </button>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("prevPhoto")}
              disabled={images.length < 2}
              className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("nextPhoto")}
              disabled={images.length < 2}
              className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Address bar */}
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/60 bg-midnight/60 px-3 py-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-success" />
            <span className="truncate font-mono text-[11px] text-muted">
              {prettyPath}
            </span>
          </div>

          {images.length > 1 && (
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
              {safeIndex + 1} / {images.length}
            </span>
          )}

          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("viewOnGallery")}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>

        {/* Page body */}
        <div className="relative min-h-0 flex-1 bg-midnight">
          {status === "loading" && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-midnight">
              <div className="flex items-center gap-2 text-muted">
                <RotateCw className="size-4 animate-spin" />
                <span className="font-mono text-xs">{t("loading")}</span>
              </div>
            </div>
          )}

          {status !== "blocked" ? (
            <iframe
              key={pageUrl}
              src={pageUrl}
              title={prettyPath}
              loading="eager"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              className="h-full w-full border-0 bg-midnight"
              onLoad={() => {
                if (timer.current) window.clearTimeout(timer.current)
                setStatus("ok")
              }}
              onError={() => {
                if (timer.current) window.clearTimeout(timer.current)
                setStatus("blocked")
              }}
            />
          ) : (
            // Fallback: page refused to frame — show the photo itself + a link.
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="flex max-w-2xl flex-col items-center text-center">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={photo.alt ?? photo.title ?? ""}
                    className="mb-4 max-h-[55vh] w-auto rounded-lg border border-border/50 object-contain"
                  />
                )}
                <p className="mb-3 text-xs text-muted">{t("cantEmbed")}</p>
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg bg-cyan/15 px-4 py-2 text-sm font-medium text-cyan",
                    "transition-colors hover:bg-cyan/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60",
                  )}
                >
                  {t("viewOnGallery")} <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </m.div>
    </m.div>
  )
}
