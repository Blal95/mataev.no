"use client"

import { useTranslations } from "next-intl"
import { TowerMark, TowerHairline } from "@/components/ui/TowerMark"

/**
 * HeritagePanel — opened from the twin watchtowers at the camp gate. Tells the
 * "Between Two Mountains" thread: Bilal's Vainakh (Chechen) roots in the
 * Caucasus highlands, mirrored against the Norwegian fjell.
 */
export function HeritagePanel() {
  const t = useTranslations("heritage")
  const facts = t.raw("facts") as { k: string; v: string }[]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-stone">
        <TowerMark className="size-8" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {t("eyebrow")}
        </p>
      </div>

      <div className="space-y-4 text-text/90 text-pretty leading-relaxed">
        <p className="[&::first-letter]:float-left [&::first-letter]:mr-2 [&::first-letter]:mt-1 [&::first-letter]:font-[family-name:var(--font-display)] [&::first-letter]:text-5xl [&::first-letter]:leading-[0.8] [&::first-letter]:text-stone">
          {t("p1")}
        </p>
        <p>{t("p2")}</p>
        <p>{t("p3")}</p>
      </div>

      <TowerHairline ornament="tower" className="py-1" />

      {/* Tower glossary — the architectural vocabulary, hand-set. */}
      <dl className="font-mono text-sm">
        {facts.map((row, i) => (
          <div
            key={i}
            className="flex items-baseline gap-3 border-b border-border/40 py-1.5 last:border-0"
          >
            <dt className="w-28 shrink-0 uppercase tracking-wide text-stone/90">
              {row.k}
            </dt>
            <dd className="text-text/90">{row.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
