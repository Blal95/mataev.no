"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useGameStore } from "@/hooks/useGameStore"
import type { BorzikMsg as Msg } from "@/hooks/useGameStore"

type Lang = "en" | "nb"

const GREETINGS: Record<Lang, string[]> = {
  en: [
    "Pip pip. I'm Borzik, keeper of the wall and the seed stash.",
    "Hei hei. Got sunflower seeds? No? We can still chat.",
    "Welcome to my snowy yard. Ask me about Bilal. Or seeds. Mostly seeds.",
    "Squeak. You're the big one who keeps pressing E. I forgive you.",
  ],
  nb: [
    "Pip pip. Jeg er Borzik, vokter av veggen og frølageret.",
    "Hei hei. Har du solsikkefrø? Nei? Vi kan prate likevel.",
    "Velkommen til den snødekte gården min. Spør meg om Bilal. Eller frø. Mest frø.",
    "Pip. Du er den store som stadig trykker E. Jeg tilgir deg.",
  ],
}

// Real photos of Borzik, each with a little in-character story per language.
// Drop the files in /public — any missing one is hidden gracefully on error.
const BORZIK_PHOTOS: { src: string; caption: Record<Lang, string> }[] = [
  {
    src: "/borzik-climbing.webp",
    caption: {
      en: "Bilal let me climb the big pillow today. Look how high I got. King of the mountain.",
      nb: "Bilal lot meg klatre på den store puta i dag. Se så høyt jeg kom. Konge av fjellet.",
    },
  },
  {
    src: "/borzik-looking.webp",
    caption: {
      en: "Caught me on the table. I was scouting for seeds. Obviously.",
      nb: "Tatt på fersken oppå bordet. Jeg speidet etter frø. Så klart.",
    },
  },
  {
    src: "/borzik-in-bowl.webp",
    caption: {
      en: "Found myself a small bowl. This is my throne now. You may bow.",
      nb: "Fant meg en liten bolle. Dette er tronen min nå. Du kan bukke.",
    },
  },
  {
    src: "/borzik-scared.webp",
    caption: {
      en: "I got scared yesterday. Bilal looked hungry and stared right at me. Send seeds, not stares.",
      nb: "Jeg ble redd i går. Bilal så sulten ut og stirret rett på meg. Send frø, ikke blikk.",
    },
  },
]

const LINES = {
  offer: {
    en: "Psst. Want to see a picture of me?",
    nb: "Psst. Vil du se et bilde av meg?",
  },
  decline: {
    en: "Fine. More seeds for me.",
    nb: "Greit. Mer frø til meg.",
  },
  netError: {
    en: "*nibbles on a wire* the WiFi seed feeder is broken.",
    nb: "*gnager på en ledning* WiFi-frømateren er ødelagt.",
  },
  replyFallback: {
    en: "*squeaks confused* my paws are too small to type.",
    nb: "*piper forvirret* potene mine er for små til å skrive.",
  },
} as const

// Module-level interaction state — survives panel close/reopen within the session.
let _photoIdx = 0
let _offeredOnce = false
let _awaitingPhotoYes = false

// Intent matchers (English + Norwegian).
const SCARED_RE = /\beat|eaten|hungry|scared|afraid|fear|sulten|redd\b/i
const CLIMB_RE = /\bclimb|climbing|high|klatre|høyt\b/i
const PHOTO_RE =
  /\b(pic|pics|picture|pictures|photo|photos|selfie|show me|see you|look like|cute|bilde|bilder|vis meg|søt)\b/i
const YES_RE =
  /\b(yes|yeah|yep|sure|ok|okay|please|go on|do it|ja|ja takk|gjerne|vis)\b/i
const NO_RE = /\b(no|nope|nah|not now|later|nei)\b/i

export function BorzikPanel() {
  const t = useTranslations("panel.borzik")
  const locale = useLocale()
  const L: Lang = locale === "nb" ? "nb" : "en"

  const messages = useGameStore((s) => s.borzikMessages)
  const addBorzikMessage = useGameStore((s) => s.addBorzikMessage)

  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstMessagesRun = useRef(true)
  // Timestamp of panel open — used to swallow the stray interact-key "e" that
  // the browser can deliver into the input the instant it gains focus.
  const openedAt = useRef(0)
  if (openedAt.current === 0) openedAt.current = Date.now()

  // Initial focus: WAIT until the key that opened this panel (E) is released.
  // Focusing synchronously on mount lets that very keypress leak a stray "e"
  // into the input. Gate on keyup, with a short fallback for click-opens.
  useEffect(() => {
    let armed = false
    const focusNow = () => {
      if (armed) return
      armed = true
      window.removeEventListener("keyup", focusNow)
      inputRef.current?.focus()
    }
    window.addEventListener("keyup", focusNow)
    const id = window.setTimeout(focusNow, 500)
    return () => {
      armed = true
      window.removeEventListener("keyup", focusNow)
      window.clearTimeout(id)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
    // Refocus after each *new* message so you can keep typing without
    // re-clicking — but never on the first render (the panel-open keypress
    // is still settling then, see the keyup-gated effect above).
    if (firstMessagesRun.current) {
      firstMessagesRun.current = false
      return
    }
    inputRef.current?.focus()
  }, [messages])

  // Add greeting only on first mount (empty history = first open this session).
  useEffect(() => {
    if (messages.length === 0) {
      addBorzikMessage({
        role: "borzik",
        text: GREETINGS[L][Math.floor(Math.random() * GREETINGS[L].length)],
        ts: Date.now(),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pushBorzik(text: string, image?: string) {
    addBorzikMessage({ role: "borzik", text, ts: Date.now(), image })
  }

  function showPhoto(p: { src: string; caption: Record<Lang, string> }) {
    pushBorzik(p.caption[L], p.src)
  }

  function nextPhoto() {
    const p = BORZIK_PHOTOS[_photoIdx % BORZIK_PHOTOS.length]
    _photoIdx += 1
    return p
  }

  function maybeOfferPhoto(turnCount: number) {
    if (_offeredOnce || _awaitingPhotoYes) return
    if (turnCount >= 5 && Math.random() < 0.75) {
      _offeredOnce = true
      _awaitingPhotoYes = true
      window.setTimeout(() => pushBorzik(LINES.offer[L]), 650)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || pending) return
    const userMsg: Msg = { role: "you", text, ts: Date.now() }
    addBorzikMessage(userMsg)
    setInput("")
    const lower = text.toLowerCase()
    const history = [...messages, userMsg]

    if (_awaitingPhotoYes) {
      _awaitingPhotoYes = false
      if (YES_RE.test(lower) || PHOTO_RE.test(lower)) {
        showPhoto(nextPhoto())
        return
      }
      if (NO_RE.test(lower)) {
        pushBorzik(LINES.decline[L])
        return
      }
      // Not an answer → fall through to normal handling.
    }

    if (SCARED_RE.test(lower)) {
      showPhoto(BORZIK_PHOTOS[3])
      return
    }
    if (CLIMB_RE.test(lower)) {
      showPhoto(BORZIK_PHOTOS[0])
      return
    }
    if (PHOTO_RE.test(lower)) {
      showPhoto(nextPhoto())
      return
    }

    setPending(true)
    try {
      const res = await fetch("/api/borzik-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: L,
          messages: history.map((m) => ({ role: m.role, text: m.text })),
        }),
      })
      const data = (await res.json()) as { reply?: string }
      pushBorzik(data.reply ?? LINES.replyFallback[L])
      maybeOfferPhoto(history.length)
    } catch {
      pushBorzik(LINES.netError[L])
    } finally {
      setPending(false)
      inputRef.current?.focus()
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex h-full max-h-[60vh] flex-col">
      <p className="mb-3 text-sm text-muted">{t("intro")}</p>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-border/40 bg-midnight/40 p-3"
      >
        <ul className="space-y-2">
          {messages.map((m, i) => (
            <li
              key={i}
              className={
                m.role === "borzik"
                  ? "max-w-[80%] rounded-2xl rounded-bl-sm bg-panel-2/80 px-3 py-2 text-sm"
                  : "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-cyan/15 px-3 py-2 text-sm"
              }
            >
              <span
                className={
                  m.role === "borzik"
                    ? "mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted"
                    : "mb-1 block font-mono text-[10px] uppercase tracking-widest text-cyan"
                }
              >
                {m.role === "borzik" ? "Borzik" : t("you")}
              </span>
              {m.text}
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image}
                  alt="Borzik"
                  className="mt-2 max-h-72 w-full rounded-lg bg-midnight/60 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              )}
            </li>
          ))}
          {pending && (
            <li className="max-w-[80%] rounded-2xl rounded-bl-sm bg-panel-2/60 px-3 py-2 text-sm italic text-muted">
              {t("thinking")}
            </li>
          )}
        </ul>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            const v = e.target.value
            // Swallow the lone "e"/"E" that can leak in from the [E] keypress
            // used to open this panel — but only right at open, only when the
            // field was empty. Real typing is never blocked.
            if (
              input === "" &&
              /^[eE]$/.test(v) &&
              Date.now() - openedAt.current < 700
            ) {
              return
            }
            setInput(v)
          }}
          onKeyDown={onKey}
          placeholder={t("placeholder")}
          disabled={pending}
          className="flex-1 rounded-lg border border-border bg-midnight/60 px-3 py-2 text-sm outline-none ring-cyan/40 transition focus:ring-2"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={send}
          disabled={pending || !input.trim()}
          className="rounded-lg bg-cyan/20 px-4 py-2 text-sm font-medium text-cyan transition hover:bg-cyan/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("send")}
        </button>
      </div>
    </div>
  )
}
