"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { useGameStore } from "@/hooks/useGameStore"

export function useLocaleToggle(key = "KeyL") {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return
      if (e.code !== key) return
      // Inert while interacting (a panel is open) — no language flips mid-form.
      if (useGameStore.getState().paused) return
      e.preventDefault()
      const next = routing.locales.find((l) => l !== locale)
      if (next) router.replace(pathname, { locale: next })
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [locale, router, pathname, key])
}
