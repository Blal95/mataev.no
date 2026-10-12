"use client"

import { useEffect, useRef, type MouseEvent } from "react"
import { useTranslations } from "next-intl"
import { DoorOpen } from "lucide-react"
import { Link, useRouter } from "@/i18n/navigation"
import { useCabinGate } from "@/hooks/useCabinGate"
import { cn } from "@/lib/cn"

/** The night falls from the corner the word sits in, before the cabin boots. */
const COVER = {
  keyframes: [{ clipPath: "inset(0 0 100% 100%)" }, { clipPath: "inset(0)" }],
  options: { duration: 560, easing: "cubic-bezier(0.7, 0, 0.84, 0)", fill: "forwards" },
} satisfies { keyframes: Keyframe[]; options: KeyframeAnimationOptions }

/**
 * The way into the 3D cabin, in the corner of every desktop screen. It is
 * only there for a browser that can walk around the cabin, so it arrives a
 * moment after load; it sits first in the corner's right-aligned row, so its
 * arrival moves nothing else. Never on a phone, and never a gate.
 */
export function CabinSwitch({ className }: { className?: string }) {
  const { canEnter } = useCabinGate()
  const router = useRouter()
  const t = useTranslations("site.chrome")
  const cover = useRef<HTMLDivElement | null>(null)

  useEffect(() => () => cover.current?.remove(), [])

  if (!canEnter) return null

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    e.preventDefault()
    const el = document.createElement("div")
    el.className = "tone-night night-cover"
    document.body.append(el)
    cover.current = el
    el.animate(COVER.keyframes, COVER.options).finished.then(() => router.push("/cabin"))
  }

  return (
    <Link
      href="/cabin"
      prefetch={false}
      onClick={onClick}
      className={cn(
        "label hidden min-h-11 items-center gap-1.5 px-2 text-fg-2 transition-colors hover:text-fg motion-safe:animate-[arrive-fade_0.4s_var(--ease-expo)_both] lg:inline-flex",
        className,
      )}
    >
      <DoorOpen aria-hidden className="size-3.5" />
      {t("cabin")}
    </Link>
  )
}
