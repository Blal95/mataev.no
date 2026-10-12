"use client"

import { useId, useSyncExternalStore, type CSSProperties } from "react"
import { useTranslations } from "next-intl"
import { Reveal } from "@/components/site/Reveal"
import {
  AXIS,
  endDecimal,
  jobs,
  monthIndex,
  ongoing,
  startDecimal,
  studies,
  type Job,
  type Study,
} from "@/config/education"
import { cn } from "@/lib/cn"

/** Where a year falls on the shared scale, 0–1. */
const pos = (year: number) => (year - AXIS.from) / (AXIS.to - AXIS.from)

const never = () => () => {}

/**
 * Bakgrunn — two ruled lists, newest first: what he studies, and the jobs he
 * has held alongside. Each row reads as plain text (what, where, the years)
 * and carries a thin strip of its years on one shared scale, so running down
 * a list shows without a chart that there has always been something to study
 * and something to work at, at once. Anything still running is live, and
 * live is what the action colour marks.
 *
 * Shared by the About chapter and the cabin's diploma cairn. The lists sit
 * side by side where there is room and stack where there is not.
 */
export function EducationPanel({
  groupHeading: Heading = "h3",
  now: serverNow,
}: {
  /** The list headings' level: h4 under the page's Background heading. */
  groupHeading?: "h3" | "h4"
  /** The month the page was rendered in (`monthIndex`), so the server's HTML
   *  and the first render agree on what is still running. */
  now?: number
}) {
  const t = useTranslations()
  const uid = useId()
  // The page is built ahead of time: it hydrates with the month it was built
  // in, then catches up with the calendar.
  const now = useSyncExternalStore(
    never,
    () => monthIndex(new Date()),
    () => serverNow ?? monthIndex(new Date()),
  )

  const nowYear = now / 12 + 1 / 24
  const groups: { id: string; label: string; rows: (Study | Job)[] }[] = [
    { id: `${uid}-study`, label: t("sections.groupStudy"), rows: studies },
    { id: `${uid}-job`, label: t("sections.groupJob"), rows: jobs },
  ]

  return (
    // Sideways the panel is as wide as its content, so the root must not be
    // size-contained; each list is a container of its own.
    <div className="@container/bg folio:[container-type:normal]">
      <div className="grid gap-12 @4xl/bg:grid-cols-2 @4xl/bg:gap-x-[4vw] folio:grid-cols-[repeat(2,min(34rem,40vw))] folio:gap-x-[4vw]">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={g.id} className="@container">
            <Heading id={g.id} className="label border-b border-fg pb-2 text-fg">
              {g.label}
            </Heading>
            <ol>
              {g.rows.map((p, i) => {
                const live = ongoing(p, now)
                const a = pos(startDecimal(p))
                const b = pos(live ? Math.min(nowYear, endDecimal(p)) : endDecimal(p))
                return (
                  <li
                    key={p.slug}
                    className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 border-b border-line py-3 @md:grid-cols-[5.25rem_minmax(0,1fr)_minmax(6rem,9rem)] @md:items-center"
                  >
                    <span className="label tabular text-fg-2">
                      {p.from}–{p.to ?? ""}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[1.125rem] font-bold leading-tight tracking-[-0.01em] [font-stretch:78%]">
                        {"institution" in p
                          ? t("education.line", { level: t(p.levelKey), degree: t(p.degreeKey) })
                          : t(p.roleKey)}
                      </p>
                      <p className="text-[14px] leading-snug text-fg-2">
                        {"institution" in p ? (
                          <>
                            {p.institution}
                            {p.trackKey && ` · ${t(p.trackKey)}`}
                            {p.thesis && ` · ${t("education.thesis")}`}
                          </>
                        ) : (
                          t(p.companyKey)
                        )}
                        {live && <span className="label ml-2 text-act-ink">{t("sections.ongoing")}</span>}
                      </p>
                    </div>
                    <span aria-hidden className="strip col-start-2 @md:col-start-auto">
                      <span className="strip-bar" style={{ "--a": a, "--b": b } as CSSProperties}>
                        <Reveal
                          kind="draw"
                          as="span"
                          margin="0px"
                          delay={i * 80}
                          className={cn("block h-full w-full", live ? "bg-act" : "bg-fg")}
                        />
                      </span>
                      {live && p.to !== undefined && (
                        <span
                          className="strip-tail"
                          style={{ "--b": b, "--e": pos(endDecimal(p)) } as CSSProperties}
                        />
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
            <div
              aria-hidden
              className="mt-2 grid grid-cols-[5.25rem_minmax(0,1fr)] gap-x-4 @md:grid-cols-[5.25rem_minmax(0,1fr)_minmax(6rem,9rem)]"
            >
              <span className="label col-start-2 flex justify-between text-fg-3 @md:col-start-3">
                <span>{AXIS.from}</span>
                <span>{AXIS.to}</span>
              </span>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
