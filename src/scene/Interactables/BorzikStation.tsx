"use client"

import { useCallback, useRef, useState } from "react"
import type { Group } from "three"
import { useLocale, useTranslations } from "next-intl"
import { Interactable } from "./Interactable"
import { Hamster } from "../World/Hamster"
import { useGameStore } from "@/hooks/useGameStore"
import type { BorzikMsg } from "@/hooks/useGameStore"

interface BorzikStationProps {
  /** World position of Borzik's home — center of his roam zone. */
  worldPosition?: [number, number, number]
  worldRotation?: [number, number, number]
}

/**
 * Borzik the hamster — a small grey-on-top, white-underneath hamster
 * who wanders near the camp. Pressing E within range opens a chat
 * panel where you can talk to him.
 */
export function BorzikStation({
  worldPosition = [0, 0, 0],
  worldRotation,
}: BorzikStationProps) {
  const t = useTranslations("prompt")
  const locale = useLocale()
  const addBorzikMessage = useGameStore((s) => s.addBorzikMessage)
  const borzikMessages = useGameStore((s) => s.borzikMessages)

  const [idleBubble, setIdleBubble] = useState<string | null>(null)
  const idleClear = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Prevents stacking concurrent AI fetch calls regardless of timer firing rate.
  const fetchPending = useRef(false)
  // Ref accessible inside the Hamster callback without stale closure.
  const messagesRef = useRef(borzikMessages)
  messagesRef.current = borzikMessages
  // Borzik roams up to 8 units from home: the station aims at him, not at
  // the empty spot he started from.
  const hamster = useRef<Group>(null)

  /** Called by Hamster when welcome fires — push to persistent chat. */
  const handleWelcomeSay = useCallback(
    (text: string) => {
      addBorzikMessage({ role: "borzik", text, ts: Date.now() } satisfies BorzikMsg)
    },
    [addBorzikMessage],
  )

  /** Called by Hamster when idle timer fires and player is in range.
   *  Fetches an AI monologue line, shows it as bubble + stores in chat. */
  const handleIdleTrigger = useCallback(async () => {
    // Guard: only one fetch at a time. Without this, a failed fetch (catch)
    // that never sets idleBubble would have previously locked Borzik silent
    // forever. Guard lives here so Hamster stays stateless about it.
    if (fetchPending.current) return
    fetchPending.current = true
    try {
      const res = await fetch("/api/borzik-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: locale === "nb" ? "nb" : "en",
          idle: true,
          messages: messagesRef.current
            .slice(-4)
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      })
      const data = (await res.json()) as { reply?: string }
      const text = data.reply
      if (!text) return
      // Show bubble.
      setIdleBubble(text)
      if (idleClear.current) clearTimeout(idleClear.current)
      idleClear.current = setTimeout(() => setIdleBubble(null), 7000)
      // Push to chat history.
      addBorzikMessage({ role: "borzik", text, ts: Date.now() })
    } catch {
      // Silently skip — network fail shouldn't break the NPC.
    } finally {
      fetchPending.current = false
    }
  }, [locale, addBorzikMessage])

  return (
    <>
      <Hamster
        ref={hamster}
        home={worldPosition}
        radius={8}
        onWelcomeSay={handleWelcomeSay}
        onIdleTrigger={handleIdleTrigger}
        idleBubble={idleBubble}
      />
      <Interactable
        id="borzik"
        position={[0, 0, 0]}
        worldPosition={worldPosition}
        worldRotation={worldRotation}
        radius={3.5}
        lookRadius={12}
        lookCone={0.18}
        label={t("borzik")}
        follow={hamster}
        hideHud
        noCollider
      >
        {/* Visuals live in <Hamster>; this Interactable follows him and owns
            the prompt. The empty group is a placeholder. */}
        <group />
      </Interactable>
    </>
  )
}
