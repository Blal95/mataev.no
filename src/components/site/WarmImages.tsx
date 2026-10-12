"use client"

import { useEffect } from "react"

/**
 * Lazy images wait for the reader to be near them, and in the sideways folio
 * that is the moment the pan arrives: the photo is drawn a beat after its
 * panel. Once the first screen has loaded and the browser is idle, they are
 * fetched anyway, so they are already there when the pan reaches them.
 */
export function WarmImages() {
  useEffect(() => {
    let cancelled = false
    const warm = () => {
      if (cancelled) return
      for (const img of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) {
        img.loading = "eager"
      }
    }
    // Safari has no requestIdleCallback.
    const idle = () => (window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1200)))(warm, { timeout: 2500 })
    if (document.readyState === "complete") idle()
    else window.addEventListener("load", idle, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener("load", idle)
    }
  }, [])
  return null
}
