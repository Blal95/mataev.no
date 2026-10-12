"use client"

import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

/**
 * Trash — empty, with a Borzik gag.
 */
export function Trash() {
  const t = useTranslations("os")
  return (
    <div className="grid h-full place-items-center bg-midnight p-6 text-center">
      <div>
        <Trash2 className="mx-auto mb-3 size-10 text-muted" />
        <p className="font-mono text-sm text-text/80">{t("trashEmpty")}</p>
        <p className="mt-1 font-mono text-[11px] text-muted">
          {t("trashBorzik")}
        </p>
      </div>
    </div>
  )
}
