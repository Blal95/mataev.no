"use client"

import { useTranslations } from "next-intl"
import { folderBySlug } from "@/config/osFiles"
import { fileGlyph } from "./icons"
import { useWindowStore } from "./windowStore"

interface FinderProps {
  projectSlug: string
}

export function Finder({ projectSlug }: FinderProps) {
  const tOs = useTranslations("os")
  const folder = folderBySlug(projectSlug)
  const openWindow = useWindowStore((s) => s.open)
  if (!folder) return null

  return (
    <div className="p-3">
      <ul className="grid grid-cols-3 gap-2">
        {folder.files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onDoubleClick={() => {
                if (file.kind === "repo" && file.url) {
                  window.open(file.url, "_blank", "noopener")
                  return
                }
                if (file.kind === "site" && file.url) {
                  openWindow({
                    id: file.id,
                    kind: "site",
                    title: file.label,
                    url: file.url,
                  })
                  return
                }
                openWindow({
                  id: `${folder.slug}-info`,
                  kind: "info",
                  title: `${folder.label}: README`,
                  projectSlug: folder.slug,
                })
              }}
              className="flex w-full flex-col items-center gap-1 rounded-lg p-3 text-center transition hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
              title={tOs("hintDesktop")}
            >
              <span className="text-3xl">{fileGlyph(file.kind)}</span>
              <span className="line-clamp-1 font-mono text-[11px] text-text/80">
                {file.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
