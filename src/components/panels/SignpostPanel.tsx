"use client"

import { useTranslations } from "next-intl"
import { BookOpen, Camera, Code2, Crown, GraduationCap, Keyboard, Landmark, Mail, MapPin, Music, Sparkles, Star, User, Wind } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useGameStore } from "@/hooks/useGameStore"
import { GUIDE_TARGETS } from "@/config/guideTargets"
import type { PanelId } from "@/hooks/useGameStore"
import { cn } from "@/lib/cn"

type GuidableId = keyof typeof GUIDE_TARGETS

/** The stations exposed in the guide, in discovery-path order. */
const STATIONS: Array<{
  id: GuidableId
  labelKey: string
  hintKey: string
  icon: LucideIcon
}> = [
  { id: "contact",   labelKey: "contact",       hintKey: "contactHint",   icon: Mail          },
  { id: "projects",  labelKey: "projects",      hintKey: "projectsHint",  icon: Code2         },
  { id: "education", labelKey: "education",     hintKey: "educationHint", icon: GraduationCap },
  { id: "about",     labelKey: "about",         hintKey: "aboutHint",     icon: User          },
  { id: "record",    labelKey: "record",        hintKey: "recordHint",    icon: Music         },
  { id: "borzik",    labelKey: "borzikStation", hintKey: "borzikHint",    icon: Star          },
  { id: "books",     labelKey: "books",         hintKey: "booksHint",     icon: BookOpen      },
  { id: "gallery",   labelKey: "gallery",       hintKey: "galleryHint",   icon: Camera        },
  { id: "heritage",  labelKey: "heritage",      hintKey: "heritageHint",  icon: Landmark      },
]

/**
 * Fireside guide panel — opens when the player interacts with the campfire.
 * Three sections:
 *   1. Controls  2. Navigable stations (click → wind guides you there)
 *   3. Secret breadcrumb
 */
export function SignpostPanel() {
  const t = useTranslations("panel.signpost")
  const setOpenPanel = useGameStore((s) => s.setOpenPanel)
  const setGuidedStation = useGameStore((s) => s.setGuidedStation)
  const visitedStations = useGameStore((s) => s.visitedStations)

  function followWind(stationId: GuidableId) {
    // Close panel first (restores pointer lock path in PanelHost)
    setOpenPanel(null)
    // Small tick so the panel has closed before wind starts
    setTimeout(() => setGuidedStation(stationId as PanelId), 60)
  }

  return (
    <div className="space-y-6">
      <p className="text-balance leading-relaxed text-muted">{t("intro")}</p>

      {/* Controls */}
      <Section icon={Keyboard} title={t("controls")}>
        <ul className="space-y-1.5 font-mono text-[13px] text-text/90">
          <li>{t("walk")}</li>
          <li>{t("look")}</li>
          <li>{t("interact")}</li>
          <li className="text-muted">{t("leave")}</li>
        </ul>
      </Section>

      {/* Stations — flat ruled list; click to let the wind guide you there */}
      <Section icon={MapPin} title={t("stations")}>
        <ul className="divide-y divide-border/30">
          {STATIONS.map((s) => {
            const visited = visitedStations.includes(s.id)
            const Icon = s.icon
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => followWind(s.id)}
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 py-2.5 pl-1 pr-2 text-left",
                    "rounded transition-colors duration-150",
                    "hover:bg-amber/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-inset",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon
                      aria-hidden
                      className={cn(
                        "size-3.5 shrink-0 transition-colors duration-150",
                        // Visited vs unvisited is a step on the ramp, not an
                        // opacity fade: `border` is a fill value (1.50:1) and
                        // was unreadable as icon ink.
                        visited ? "text-muted" : "text-steel",
                        "group-hover:text-amber",
                      )}
                    />
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "font-mono text-[11px] uppercase tracking-widest",
                          visited ? "text-muted" : "text-text/90",
                          "group-hover:text-text",
                        )}
                      >
                        {t(s.labelKey as Parameters<typeof t>[0])}
                      </span>
                      <p className="mono mt-0 text-[10px] leading-tight text-muted">
                        {t(s.hintKey as Parameters<typeof t>[0])}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {visited && (
                      <span className="font-mono text-[9px] text-cyan">✓</span>
                    )}
                    {/* Wind glyph — drifts right on hover */}
                    <Wind
                      aria-hidden
                      className={cn(
                        "size-3 transition-all duration-200",
                        "text-muted/20 group-hover:translate-x-0.5 group-hover:text-amber",
                      )}
                    />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 pl-1 font-mono text-[10px] text-muted">
          ↑ {t("followWind")}
        </p>
      </Section>

      {/* Easter-egg breadcrumb */}
      <Section icon={Sparkles} title={t("secrets")} accent="amber">
        <p className="text-sm italic leading-relaxed text-muted">
          {t("secretsBody")}
        </p>
      </Section>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  accent = "cyan",
  children,
}: {
  icon: typeof MapPin
  title: string
  accent?: "cyan" | "amber"
  children: React.ReactNode
}) {
  const color = accent === "amber" ? "text-amber" : "text-cyan"
  return (
    <div>
      <h3
        className={`mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-widest ${color}`}
      >
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </div>
  )
}
