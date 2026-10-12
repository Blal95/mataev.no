"use client"

import { useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useTranslations } from "next-intl"
import { Download, X } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// The worker is served from /public, copied from pdfjs-dist at install.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

const MAX_PAGE = 820

/**
 * The CV, on the page. A blue sheet slides over the folio with the PDF's
 * pages on it, and the download sits in the corner. Radix owns the focus
 * trap, ESC and the scroll lock.
 */
export function CVViewer({ file, onClose }: { file: string; onClose: () => void }) {
  const t = useTranslations("site.cv")
  const [pages, setPages] = useState(0)
  const [width, setWidth] = useState(MAX_PAGE)

  useEffect(() => {
    const fit = () => setWidth(Math.min(MAX_PAGE, window.innerWidth - (window.innerWidth < 640 ? 32 : 96)))
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="tone-blue fixed inset-0 z-[80] flex flex-col bg-ground text-fg duration-500 data-[state=open]:animate-in data-[state=open]:slide-in-from-right motion-reduce:data-[state=open]:animate-none"
        >
          <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-8">
            <DialogPrimitive.Title className="label">
              {t("title")}
              {pages > 1 && <span className="ml-3 text-fg-3">{t("pages", { count: pages })}</span>}
            </DialogPrimitive.Title>
            <div className="flex items-center gap-2">
              <a
                href={file}
                download
                className="label inline-flex min-h-11 items-center gap-2 bg-act px-4 text-on-act transition-colors hover:bg-deep hover:text-paper"
              >
                <Download className="size-4" />
                {t("download")}
              </a>
              <DialogPrimitive.Close
                aria-label={t("close")}
                className="grid size-11 place-items-center border border-line transition-colors hover:border-fg"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-10 sm:px-12">
            <Document
              file={file}
              onLoadSuccess={({ numPages }) => setPages(numPages)}
              loading={<p className="label py-24 text-center text-fg-2">{t("loading")}</p>}
              error={
                <p className="label py-24 text-center text-fg-2">
                  {t("error")}{" "}
                  <a href={file} className="underline underline-offset-4">
                    {t("download")}
                  </a>
                </p>
              }
              className="mx-auto flex max-w-[820px] flex-col items-center gap-6"
            >
              {Array.from({ length: pages }, (_, i) => (
                <Page
                  key={i + 1}
                  pageNumber={i + 1}
                  width={width}
                  className="shadow-[0_24px_60px_-24px_rgba(8,12,60,0.7)]"
                />
              ))}
            </Document>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
