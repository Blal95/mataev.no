import { useTranslations } from "next-intl"
import { ArrowUpRight } from "lucide-react"
import { projects, type Project } from "@/config/projects"
import { InkArt } from "./InkArt"

/**
 * One project, as a column of six rows: the picture; number, year and how it
 * came about; the name; one sentence; the role and the stack; the site.
 * Sideways the columns share those rows (a subgrid, globals.css), so they
 * read across like a table, and the one marked `wide` is half as wide again.
 *
 * The picture is the site itself where Bilal designed one, printed in the
 * one ink; otherwise Borzik at the job. Under the pointer or keyboard focus
 * it is pulled through the screen again into Borzik doing the job. A project
 * with a public site is one big link to it, and floods ultramarine from the
 * top; one without stays on paper, because ultramarine marks what you can
 * press.
 *
 * `.proj` owns its display and grid in CSS: no layout utilities on it.
 */
export function ProjectCard({ project }: { project: Project }) {
  const t = useTranslations("projects")
  const tRoot = useTranslations()
  const key = project.slug === "mash-partners" ? "mash" : project.slug
  const title = t(`${key}.title`)
  const year = project.ongoing ? `${project.year}–` : project.year
  const index = projects.findIndex((p) => p.slug === project.slug) + 1
  const host = project.url ? new URL(project.url).hostname.replace(/^www\./, "") : null

  return (
    <article
      id={project.slug}
      data-link={project.url ? "" : undefined}
      data-wide={project.wide ? "" : undefined}
      className="proj border-t border-line px-6 py-8 first:border-t-0 sm:px-8 sm:nth-2:border-t-0 folio:border-l folio:border-t-0 folio:px-7 folio:py-0"
    >
      <div className="flex items-end justify-center folio:min-h-0">
        {project.print ? (
          <InkArt
            print={{ slug: project.slug, size: project.print }}
            alt={project.action}
            label={host ? t("shot", { site: host }) : undefined}
            pull="view"
            className="w-full folio:max-h-full"
          />
        ) : (
          <InkArt
            pose={project.pose}
            alt={project.action ?? project.pose}
            pull="view"
            className="w-[62%] max-w-[17rem] folio:h-full folio:max-h-[min(12rem,22svh)] folio:w-[80%] folio:max-w-none"
          />
        )}
      </div>
      <p className="label tabular text-fg-3">
        {String(index).padStart(2, "0")} · {year} · {tRoot(project.contextKey)}
      </p>
      <h3 className="text-[clamp(1.75rem,2.3vw,2.4rem)] font-bold leading-[0.95] tracking-[-0.02em] [font-stretch:78%]">
        {title}
      </h3>
      <p className="max-w-[46ch] text-[15px] leading-relaxed text-fg-2 text-pretty">{t(`${key}.summary`)}</p>
      <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
        <dt className="label text-fg-3">{t("dl.role")}</dt>
        <dd className="text-[14px] leading-snug">{t(`${key}.role`)}</dd>
        <dt className="label text-fg-3">{t("dl.stack")}</dt>
        <dd className="label text-fg-2">{project.tech.join(" · ")}</dd>
      </dl>
      <div>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="label inline-flex min-h-11 items-center gap-1.5 text-act-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {host}
            <span className="sr-only">{`, ${t("visit")} ${title}`}</span>
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        )}
      </div>
    </article>
  )
}
