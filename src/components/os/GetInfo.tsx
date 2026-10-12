"use client"

import { useTranslations } from "next-intl"
import { projects } from "@/config/projects"
import { folderBySlug } from "@/config/osFiles"
import { useWindowStore } from "./windowStore"

interface GetInfoProps {
  projectSlug: string
}

export function GetInfo({ projectSlug }: GetInfoProps) {
  const tOs = useTranslations("os")
  // project.*Key are full message paths ("projects.<slug>.title"), so resolve
  // them from the root — namespacing to "projects" would double the prefix.
  const t = useTranslations()
  const openWindow = useWindowStore((s) => s.open)

  const project = projects.find((p) => p.slug === projectSlug)
  const folder = folderBySlug(projectSlug)
  if (!project || !folder) return null

  return (
    <div className="p-5 text-text">
      <div className="flex items-start gap-4">
        {/* The site's print, or Borzik at this project's job, not a coloured dot. */}
        <div
          className="size-16 shrink-0 rounded-2xl border border-border bg-panel-2 bg-contain bg-center bg-no-repeat"
          style={{
            backgroundImage: project.print
              ? `url(/art/prints/${project.slug}.webp)`
              : `url(/art/borzik/${project.pose}.webp)`,
          }}
        />
        <div className="min-w-0">
          <h2 className="display text-2xl leading-tight">
            {t(project.titleKey)}
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
            <dt>{tOs("infoKind")}</dt>
            <dd className="text-text/80">{t(project.contextKey)}</dd>
            <dt>{tOs("infoYear")}</dt>
            <dd className="text-text/80">{project.year}</dd>
            <dt>{tOs("infoRole")}</dt>
            <dd className="text-text/80">{t(project.roleKey)}</dd>
          </dl>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">
        {t(project.summaryKey)}
      </p>

      <div className="mt-4">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
          {tOs("infoTech")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {project.tech.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-border bg-panel px-2 py-0.5 font-mono text-[10px] text-text/80"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {project.url && (
          <button
            type="button"
            onClick={() =>
              openWindow({
                id: `${project.slug}-site`,
                kind: "site",
                title: new URL(project.url!).hostname.replace(/^www\./, ""),
                url: project.url,
              })
            }
            className="rounded-lg bg-cyan/20 px-3 py-1.5 text-sm font-medium text-cyan transition hover:bg-cyan/30"
          >
            {tOs("visitSite")}
          </button>
        )}
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-text/80 transition hover:border-cyan/40"
          >
            {tOs("openRepo")}
          </a>
        )}
      </div>
    </div>
  )
}
