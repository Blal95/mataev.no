"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, m } from "framer-motion"
import { useTranslations } from "next-intl"
import { MousePointerClick } from "lucide-react"
import { TowerMark } from "@/components/ui/TowerMark"
import { BootScreen } from "@/components/boot/BootScreen"
import { HUD } from "@/components/hud/HUD"
import { PanelHost } from "@/components/panels/PanelHost"
import { useGameStore } from "@/hooks/useGameStore"
import { useDeviceCapability } from "@/hooks/useDeviceCapability"
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { useLocaleToggle } from "@/hooks/useLocaleToggle"
import { useKonami } from "@/hooks/useKonami"
import { AudioLayer } from "./AudioLayer"
import { InteractionSfx } from "./InteractionSfx"
import { DataPrefetcher } from "./DataPrefetcher"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/cn"
import { getSharedVinylLoop } from "@/lib/vinylLoop"

import { EditorHUD } from "@/scene/editor"

const Scene = dynamic(
  () => import("@/scene/Scene").then((m) => m.Scene),
  { ssr: false }
)

const BilalOS = dynamic(
  () => import("@/components/os/BilalOS").then((m) => m.BilalOS),
  { ssr: false },
)

const GalleryBrowser = dynamic(
  () => import("@/components/scene/GalleryBrowser").then((m) => m.GalleryBrowser),
  { ssr: false },
)

export function CabinExperience() {
  const [progress, setProgress] = useState(0)
  const [entered, setEntered] = useState(false)
  const [locked, setLocked] = useState(false)
  const [suppressOverlay, setSuppressOverlay] = useState(false)
  // Bilal OS overlay is delayed ~600ms after the laptop opens so the lid
  // animation + camera dolly play first, then the screen "wakes".
  const [osVisible, setOsVisible] = useState(false)
  const lastUnlockedAt = useRef(0)
  const prevPaused = useRef(false)
  // Tracks the previous `locked` value so we can distinguish user-ESC
  // (locked true→false) from intro-end / panel-close (locked was already false).
  const prevLocked = useRef(false)
  const cap = useDeviceCapability()
  const reduced = usePrefersReducedMotion()
  const router = useRouter()
  const t = useTranslations("hud")
  const hasBooted = useGameStore((s) => s.hasBooted)
  const paused = useGameStore((s) => s.paused)
  const openPanel = useGameStore((s) => s.openPanel)
  const introPlaying = useGameStore((s) => s.introPlaying)
  const setIntroPlaying = useGameStore((s) => s.setIntroPlaying)
  const openingBook = useGameStore((s) => s.openingBook)

  useLocaleToggle("KeyL")
  useKonami()

  // Stop all 3D audio when navigating away (e.g. to /list).
  // FirePit + AudioLayer clean up in their own effects; vinyl is a module-level
  // singleton that survives component unmount — stop it explicitly here.
  useEffect(() => {
    return () => {
      getSharedVinylLoop().stop()
      useGameStore.getState().setVinylPlaying(false)
    }
  }, [])

  useEffect(() => {
    if (cap && !cap.canRun3D) router.replace("/")
  }, [cap, router])

  // Gate the OS overlay behind the lid-open animation. Opening: wait for
  // the lid to swing up. Closing: hide immediately so the lid can shut.
  useEffect(() => {
    if (openPanel === "projects") {
      const id = setTimeout(() => setOsVisible(true), 600)
      return () => clearTimeout(id)
    }
    setOsVisible(false)
  }, [openPanel])

  // When paused transitions false→true (panel opened) then true→false (panel
  // closed), briefly suppress the "click to look" overlay — PanelHost fired
  // requestPointerLock and we give it a moment to succeed. If the browser
  // rejects the silent re-lock (ESC cooldown / no fresh gesture), the overlay
  // must reappear FAST so the player isn't stuck staring at a frozen, mute
  // screen. Keep this short; a single click re-locks instantly.
  useEffect(() => {
    if (prevPaused.current && !paused) {
      setSuppressOverlay(true)
      // Hold suppression until the silent re-lock lands (the `locked` effect
      // below clears it instantly on success) or this fail-safe fires. Must
      // outlast Chrome's ~1500ms pointer-lock cooldown, otherwise the overlay
      // flashes on between this timer and the lock actually being granted.
      const t = setTimeout(() => setSuppressOverlay(false), 1700)
      prevPaused.current = false
      return () => clearTimeout(t)
    }
    prevPaused.current = paused
  }, [paused])

  // If the suppression window passes and we're still unlocked, the silent
  // re-lock failed — nothing else to do here; the overlay (gated on
  // !suppressOverlay) now shows and any click calls requestLock().

  useEffect(() => {
    const onChange = () => {
      const nowLocked = document.pointerLockElement !== null
      setLocked(nowLocked)
      if (!nowLocked) lastUnlockedAt.current = Date.now()
    }
    document.addEventListener("pointerlockchange", onChange)
    return () => document.removeEventListener("pointerlockchange", onChange)
  }, [])

  const requestLock = useCallback(() => {
    // Chrome enforces ~1.5s cooldown after pointer lock exit — respect it.
    const elapsed = Date.now() - lastUnlockedAt.current
    const delay = Math.max(0, 1500 - elapsed)
    setTimeout(() => {
      // Re-query the canvas at fire time. Under React StrictMode dev
      // double-mount, the initial reference can detach from the active
      // document and `requestPointerLock` throws WrongDocumentError.
      const canvas = document.getElementById(
        "scene-canvas",
      ) as HTMLCanvasElement | null
      if (!canvas || canvas.ownerDocument !== document) return
      if (!document.contains(canvas)) return
      // Bail if a panel opened while we were waiting on the cooldown.
      if (useGameStore.getState().paused) return
      try {
        // Newer Chrome returns a promise that can REJECT (WrongDocumentError,
        // missing gesture, doc not focused). Swallow it so it never surfaces
        // as an unhandledRejection.
        const ret = canvas.requestPointerLock?.() as unknown
        if (ret && typeof (ret as Promise<void>).catch === "function") {
          ;(ret as Promise<void>).catch(() => {})
        }
      } catch {
        /* Browser may reject synchronously too. */
      }
    }, delay)
  }, [])

  const handleEnter = useCallback(() => {
    setEntered(true)
    setIntroPlaying(true)
    // Pointer lock is requested AFTER the intro dolly finishes (handled below)
  }, [setIntroPlaying])

  // When intro finishes or a panel closes, silently re-lock — but NOT when
  // the player deliberately pressed ESC to exit pointer lock (locked true→false).
  // In that case we want the "click to look" overlay to appear, not a silent
  // re-lock that hides the cursor again immediately.
  useEffect(() => {
    if (entered && !introPlaying && !locked && !paused) {
      const lockJustDropped = prevLocked.current && !locked
      prevLocked.current = locked

      if (lockJustDropped) {
        // User pressed ESC in-game — show the overlay immediately, don't relock.
        setSuppressOverlay(false)
        return
      }

      // Intro end or panel close — suppress overlay and silently re-lock.
      setSuppressOverlay(true)
      const t = setTimeout(requestLock, 100)
      // Fallback: if the lock never lands (browser rejected silently), drop
      // the suppression so the overlay can show and a click can recover.
      const fail = setTimeout(() => setSuppressOverlay(false), 1700)
      return () => {
        clearTimeout(t)
        clearTimeout(fail)
      }
    }
    prevLocked.current = locked
  }, [entered, introPlaying, locked, paused, requestLock])

  // Drop suppression as soon as the lock actually lands.
  useEffect(() => {
    if (locked) setSuppressOverlay(false)
  }, [locked])

  const handleClickLock = useCallback(() => {
    requestLock()
  }, [requestLock])

  // The door is on screen from the first paint, before the device is known,
  // so arriving from the page is one frame: no "loading" flash, no swap.
  const door = (
    <AnimatePresence>
      {!entered && (
        <BootScreen
          key="boot"
          progress={progress}
          ready={hasBooted && !!cap?.canRun3D}
          reducedMotion={reduced}
          onEnter={handleEnter}
        />
      )}
    </AnimatePresence>
  )

  // Same shape in both returns, so the door is the same element throughout.
  if (!cap || !cap.canRun3D) return <>{door}</>

  return (
    <>
      {door}
      {/* cursor-none while in-game (entered + not paused) so the cursor
          disappears immediately on panel close without waiting for the
          pointer lock cooldown (~1.5s). The click-to-lock overlay's own
          cursor-pointer overrides this when the overlay is visible. */}
      <div className={cn("fixed inset-0", entered && !paused && "cursor-none")}>
        <Scene onProgress={setProgress} />
      </div>
      <EditorHUD />

      {entered && !locked && !paused && !suppressOverlay && !introPlaying && !openingBook && (
        <m.button
          type="button"
          onClick={handleClickLock}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="tone-night fixed inset-0 z-30 grid cursor-pointer place-items-center bg-ground/55"
        >
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4 border border-line bg-ground px-10 py-8 text-center text-fg"
          >
            <TowerMark accent className="size-9" strokeWidth={2.4} />
            <p className="display text-[length:clamp(1.75rem,3vw,2.5rem)] leading-none">
              {lastUnlockedAt.current > 0 ? t("clickResume") : t("clickLook")}
            </p>
            <span className="label inline-flex items-center gap-2 text-fg-2">
              <MousePointerClick aria-hidden className="size-3.5 text-act-ink" />
              {t("escRelease")}
            </span>
          </m.div>
        </m.button>
      )}

      {entered && <HUD />}
      {entered && <InteractionSfx />}
      <AnimatePresence>
        {openPanel === "projects" && osVisible && <BilalOS key="bilal-os" />}
      </AnimatePresence>
      <AnimatePresence>
        {openPanel === "gallery" && <GalleryBrowser key="gallery-browser" />}
      </AnimatePresence>
      {cap.profile.ambientAudio && <AudioLayer active={entered} />}
      <DataPrefetcher />
      <PanelHost />
    </>
  )
}
