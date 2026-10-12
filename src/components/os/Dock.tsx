"use client"

import { useTranslations } from "next-intl"
import { FOLDER_GLYPH } from "./icons"
import { OS_FOLDERS } from "@/config/osFiles"
import { useWindowStore } from "./windowStore"

interface DockProps {
  onShutDown: () => void
}

export function Dock({ onShutDown }: DockProps) {
  const t = useTranslations("os")
  const openWindow = useWindowStore((s) => s.open)
  const firstFolder = OS_FOLDERS[0]

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
      <div className="pointer-events-auto flex items-end gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Finder"
          onClick={() =>
            firstFolder &&
            openWindow({
              id: `${firstFolder.slug}-finder`,
              kind: "finder",
              title: firstFolder.label,
              projectSlug: firstFolder.slug,
            })
          }
          className="grid size-11 place-items-center rounded-xl border border-border bg-panel-2 text-2xl text-frost transition hover:-translate-y-1 hover:scale-125"
        >
          {FOLDER_GLYPH}
        </button>
        <button
          type="button"
          aria-label={t("shutDown")}
          onClick={onShutDown}
          className="grid size-11 place-items-center rounded-xl bg-danger text-xl text-midnight transition hover:-translate-y-1 hover:scale-125"
        >
          ⏻
        </button>
      </div>
    </div>
  )
}
