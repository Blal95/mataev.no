"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog"
import { useGameStore } from "@/hooks/useGameStore"
import { AboutPanel } from "./AboutPanel"
import { EducationPanel } from "./EducationPanel"
import { ContactPanel } from "./ContactPanel"
import { SignpostPanel } from "./SignpostPanel"
import { BorzikPanel } from "./BorzikPanel"
import { BookshelfPanel } from "./BookshelfPanel"
import { HeritagePanel } from "./HeritagePanel"

function resumeLock() {
  const canvas = document.getElementById(
    "scene-canvas",
  ) as HTMLCanvasElement | null
  if (!canvas || canvas.ownerDocument !== document) return
  if (!document.contains(canvas)) return
  try {
    // Chrome's requestPointerLock can return a promise that REJECTS
    // (WrongDocumentError, missing gesture, doc not focused) — swallow it so
    // it never surfaces as an unhandledrejection. The sync try/catch alone
    // doesn't catch that; the browser may also throw synchronously.
    const ret = canvas.requestPointerLock?.() as unknown
    if (ret && typeof (ret as Promise<void>).catch === "function") {
      ;(ret as Promise<void>).catch(() => {})
    }
  } catch {
    /* WrongDocumentError under StrictMode dev double-mount or
       browser cooldown — silently no-op; auto-lock effect will
       retry. */
  }
}

export function PanelHost() {
  const t = useTranslations("sections")
  const openPanel = useGameStore((s) => s.openPanel)
  const setOpenPanel = useGameStore((s) => s.setOpenPanel)

  const titles: Record<NonNullable<typeof openPanel>, string> = {
    projects: t("work"),
    about: t("about"),
    education: t("education"),
    contact: t("contact"),
    record: t("record"),
    signpost: t("signpost"),
    borzik: t("borzik"),
    books: t("books"),
    gallery: t("gallery"),
    heritage: t("heritage"),
  }

  const handleClose = useCallback(() => {
    setOpenPanel(null)
    // Called within a user gesture (ESC key or click) — pointer lock request
    // is valid here; browser won't reject for missing gesture.
    resumeLock()
  }, [setOpenPanel])

  return (
    <Dialog
      // "projects" → fullscreen BilalOS overlay; "gallery" → in-world
      // GalleryBrowser overlay. Both are handled in CabinExperience, not here.
      open={
        openPanel !== null &&
        openPanel !== "projects" &&
        openPanel !== "gallery"
      }
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent
        onEscapeKeyDown={handleClose}
        // Prevent Radix from immediately moving focus to the first
        // focusable child — otherwise the very key the player just
        // pressed (e.g. "E") leaks into the focused <input>.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {openPanel && (
          <>
            <DialogHeader>
              <DialogTitle>{titles[openPanel]}</DialogTitle>
              <DialogDescription className="sr-only">
                {titles[openPanel]} panel
              </DialogDescription>
            </DialogHeader>
            {/* "projects" is handled by the fullscreen BilalOS overlay
                (see CabinExperience), not the Radix dialog. */}
            {openPanel === "about" && <AboutPanel compact />}
            {openPanel === "education" && <EducationPanel />}
            {openPanel === "contact" && <ContactPanel />}
            {openPanel === "signpost" && <SignpostPanel />}
            {openPanel === "borzik" && <BorzikPanel />}
            {openPanel === "books" && <BookshelfPanel />}
            {openPanel === "heritage" && <HeritagePanel />}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

