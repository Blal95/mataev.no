"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/cn"

interface RevealChipProps {
  value: string
  href: string
  icon: React.ReactNode
  label: string
  /** Localized accessible name for the reveal action. The component holds no
   *  strings of its own — the caller owns the namespace the label came from. */
  revealLabel: string
  className?: string
}

/**
 * Hides sensitive contact values (email, phone) from the DOM until clicked;
 * the click reveals the value and copies it. Set as text with a dashed
 * underline: "there is something here that is not shown yet".
 */
export function RevealChip({
  value,
  href,
  icon,
  label,
  revealLabel,
  className,
}: RevealChipProps) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const reveal = () => {
    setRevealed(true)
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  const base =
    "inline-flex min-h-11 items-center gap-2 py-2 text-[15px] underline-offset-4 transition-colors"

  if (revealed) {
    return (
      <a
        href={href}
        className={cn(
          base,
          "underline",
          copied
            ? "text-act-ink decoration-act-ink"
            : "text-fg decoration-fg-3 hover:decoration-fg",
          className,
        )}
      >
        {copied ? <Check className="size-3.5 shrink-0" /> : icon}
        {value}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={reveal}
      aria-label={revealLabel}
      className={cn(
        base,
        "cursor-pointer underline decoration-dashed decoration-fg-3 text-fg-2 hover:text-fg hover:decoration-fg",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  )
}
