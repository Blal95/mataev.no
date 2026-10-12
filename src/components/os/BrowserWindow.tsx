"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

interface BrowserWindowProps {
  url: string
}

type Status = "loading" | "ok" | "blocked"

export function BrowserWindow({ url }: BrowserWindowProps) {
  const t = useTranslations("os")
  const [status, setStatus] = useState<Status>("loading")
  const timer = useRef<number | null>(null)

  // Each site window mounts with a fixed url (status starts "loading"), so
  // we only arm the blocked-fallback timeout — no synchronous reset needed.
  useEffect(() => {
    timer.current = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? "blocked" : s))
    }, 3500)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const host = (() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  })()

  return (
    // The chrome below (white page, #ececec toolbar, the green dot) is a
    // drawing of a real browser window, not brand surface — it stays literal.
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-black/10 bg-[#ececec] px-3">
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="truncate rounded-full bg-white px-3 py-0.5 font-mono text-[11px] text-black/70">
          {host}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-white text-sm text-black/50">
            {t("loading")}
          </div>
        )}

        {status !== "blocked" ? (
          <iframe
            src={url}
            title={host}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="h-full w-full border-0"
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
          <div className="absolute inset-0 grid place-items-center bg-midnight p-6 text-center">
            <div>
              <img
                src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
                alt=""
                width={48}
                height={48}
                className="mx-auto mb-3 rounded"
              />
              <p className="mb-1 font-mono text-sm text-text">{host}</p>
              <p className="mb-4 text-xs text-muted">{t("cantEmbed")}</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-lg bg-cyan/20 px-4 py-2 text-sm font-medium text-cyan transition hover:bg-cyan/30"
              >
                {t("openNewTab")} ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
