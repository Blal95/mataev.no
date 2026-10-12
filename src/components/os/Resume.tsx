"use client"

import { useLocale } from "next-intl"
import { Download } from "lucide-react"

/**
 * "Résumé.pdf" — embeds Bilal's real CV from /public, picking the file
 * by current locale (Resume_nb.pdf for Norwegian, Resume_en.pdf else).
 */
export function Resume() {
  const locale = useLocale()
  const file = locale === "nb" ? "/Resume_nb.pdf" : "/Resume_en.pdf"

  return (
    // #525659 / #323639 are Chrome's own PDF-viewer greys — this is a picture
    // of that viewer, so they stay literal rather than moving onto the ramp.
    <div className="flex h-full flex-col bg-[#525659]">
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-black/30 bg-[#323639] px-3">
        <span className="truncate font-mono text-[11px] text-white/70">
          {file.replace("/", "")}
        </span>
        <a
          href={file}
          download
          className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/80 transition hover:bg-white/20"
        >
          <Download className="size-3" />
          Download
        </a>
      </div>
      <iframe
        src={`${file}#toolbar=0&navpanes=0&view=FitH`}
        title="Résumé"
        className="min-h-0 flex-1 border-0 bg-white"
      />
    </div>
  )
}
