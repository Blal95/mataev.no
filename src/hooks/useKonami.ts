"use client"

import { useEffect, useRef } from "react"
import { useGameStore } from "@/hooks/useGameStore"

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
]

/**
 * Listens for the Konami code anywhere on the page. Toggles `secretMode` in
 * the store on completion. Plays a one-shot reset 30 seconds later (auto-off).
 */
export function useKonami() {
  const toggleSecretMode = useGameStore((s) => s.toggleSecretMode)
  const buffer = useRef<string[]>([])
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      buffer.current.push(e.code)
      if (buffer.current.length > SEQUENCE.length) {
        buffer.current.shift()
      }
      if (
        buffer.current.length === SEQUENCE.length &&
        buffer.current.every((k, i) => k === SEQUENCE[i])
      ) {
        buffer.current = []
        toggleSecretMode()
        if (resetTimer.current) window.clearTimeout(resetTimer.current)
        resetTimer.current = window.setTimeout(() => {
          toggleSecretMode()
          resetTimer.current = null
        }, 30_000)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      if (resetTimer.current) window.clearTimeout(resetTimer.current)
    }
  }, [toggleSecretMode])
}
