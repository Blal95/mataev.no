"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import { site } from "@/config/site"
import { useStretch } from "@/hooks/useStretch"

/** How long the "copied" stamp stays on the paper, in ms. */
const COPIED_MS = 1600

const never = () => () => {}

/**
 * The address, big, in the name's display cut and with the name's gesture:
 * letters widen under the pointer the way BILAL MATAEV did on the first
 * screen, so the folio ends the way it began. Beside it a small button copies
 * it and stamps "copied" on the paper. The button is only there where the
 * clipboard is: without JS the address is simply the mail link.
 */
export function ContactEmail() {
  const t = useTranslations("site.contact")
  const link = useRef<HTMLAnchorElement>(null)
  const [copied, setCopied] = useState(false)
  const canCopy = useSyncExternalStore(
    never,
    () => typeof navigator.clipboard?.writeText === "function",
    () => false,
  )
  useStretch(link, { rest: 62, peak: 104 })

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email)
      setCopied(true)
    } catch {}
  }

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <a
        ref={link}
        href={`mailto:${site.email}`}
        aria-label={site.email}
        className="block break-words text-[length:clamp(2.75rem,7.5vw,7.5rem)] font-extrabold leading-[0.86] tracking-[-0.012em] [font-stretch:62%] [contain:layout] underline decoration-transparent decoration-[0.06em] underline-offset-[0.12em] transition-[color,text-decoration-color] duration-500 hover:text-act-ink hover:decoration-current folio:whitespace-nowrap folio:text-[length:min(6.8vw,12svh)]"
      >
        {Array.from(site.email).map((ch, i) => (
          <span key={i} aria-hidden data-letter className="inline-block">
            {ch}
          </span>
        ))}
      </a>
      {canCopy && (
        <span className="relative">
          <button
            type="button"
            onClick={copy}
            aria-label={t("copyLabel")}
            className="label min-h-11 min-w-11 border border-fg px-3 transition-colors hover:border-act hover:bg-act hover:text-on-act"
          >
            {t("copy")}
          </button>
          {copied && (
            <span
              aria-hidden
              data-now=""
              className="stamp label pointer-events-none absolute -right-2 -top-3 bg-ground px-2 py-1 text-act-ink [--stamp-tilt:-4deg]"
            >
              {t("copied")}
            </span>
          )}
          <span aria-live="polite" className="sr-only">
            {copied ? t("copied") : ""}
          </span>
        </span>
      )}
    </div>
  )
}
