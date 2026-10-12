"use client"

import type { MouseEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { useFolioMaybe } from "@/components/site/Folio"
import { holdPlace, waitForPlace } from "@/lib/folioResume"
import { cn } from "@/lib/cn"

/** How long the sheet waits for the other language to find the reader's place. */
const PLACE_WAIT_MS = 1200

/**
 * The other language, named in its own words: "English" on the Norwegian
 * page, "Norsk" on the English one. One link and one click, and a reader who
 * does not read this language still finds theirs.
 *
 * Clicked, the page is re-printed in the other language: the new sheet is
 * pulled down over the old one (a view transition), and the reader stays at
 * the same place in the folio. Without JS it is a plain link to the top of
 * the other page.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const locale = useLocale()
  const other = locale === "nb" ? "en" : "nb"
  const pathname = usePathname()
  const router = useRouter()
  const folio = useFolioMaybe()
  const t = useTranslations("site.chrome")

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const place = folio?.capturePlace()
    if (place) holdPlace(place)
    const swap = () => router.replace(pathname, { locale: other, scroll: false })
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("startViewTransition" in document)
    ) {
      swap()
      return
    }
    const root = document.documentElement
    root.dataset.vt = "sheet"
    const vt = document.startViewTransition(async () => {
      swap()
      await waitForPlace(PLACE_WAIT_MS)
    })
    vt.finished.finally(() => {
      delete root.dataset.vt
    })
  }

  return (
    <Link
      href={folio && folio.current !== "home" ? { pathname, hash: folio.current } : pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      onClick={onClick}
      className={cn(
        "label inline-flex min-h-11 items-center px-2 underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:decoration-act focus-visible:decoration-act",
        className,
      )}
    >
      {t("otherLanguage")}
    </Link>
  )
}
