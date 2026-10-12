"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/cn"

// The viewer carries a PDF renderer; it loads the first time someone opens
// the CV, never with the page.
const loadViewer = () => import("@/components/ui/CVViewer")
const CVViewer = dynamic(() => loadViewer().then((m) => m.CVViewer), {
  ssr: false,
})

// A pointer on the button or focus on it is a good sign a click is coming:
// fetch the viewer and the PDF then, quietly, so the sheet opens with the CV
// already on it. Once per file.
const warmed = new Set<string>()
const warm = (file: string) => {
  if (warmed.has(file)) return
  warmed.add(file)
  loadViewer().catch(() => {})
  fetch(file, { priority: "low" } as RequestInit).catch(() => {})
}

/**
 * Opens the CV in the page, with a download beside it. Without JS the button
 * is a plain link to the PDF, so the CV is never more than one click away.
 */
export function CVButton({
  variant,
  className,
}: {
  /** `chip` for the corner of the folio, `link` beside a button, `label` in a
   *  row of small links. */
  variant: "chip" | "link" | "label"
  className?: string
}) {
  const t = useTranslations("site.cv")
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const file = `/Resume_${locale === "en" ? "en" : "nb"}.pdf`

  return (
    <>
      <a
        href={file}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          setOpen(true)
        }}
        onPointerEnter={() => warm(file)}
        onFocus={() => warm(file)}
        aria-haspopup="dialog"
        className={cn(
          variant === "chip" &&
            "label inline-flex min-h-11 items-center border border-fg px-4 transition-colors hover:border-act hover:bg-act hover:text-on-act",
          variant === "link" &&
            "inline-flex min-h-11 items-center text-[17px] font-medium underline decoration-line decoration-2 underline-offset-[6px] transition-colors hover:decoration-act",
          variant === "label" &&
            "label inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:text-fg hover:decoration-act",
          className,
        )}
      >
        {t("open")}
      </a>
      {open && <CVViewer file={file} onClose={() => setOpen(false)} />}
    </>
  )
}
