import type { ReactNode } from "react"
import type { Metadata } from "next"
import { Archivo, Fragment_Mono } from "next/font/google"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { MotionProvider } from "@/components/providers/MotionProvider"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { Toaster } from "sonner"

import "../globals.css"
import { routing } from "@/i18n/routing"
import { baseMetadata, personJsonLd, websiteJsonLd } from "@/lib/seo"

// Two families, split by job. Archivo sets language; its width axis (62–125)
// is the display voice — the name runs at 62% and stretches under the pointer.
// Fragment Mono sets data.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
})
const fragment = Fragment_Mono({
  variable: "--font-fragment",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "meta" })
  return baseMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as "nb" | "en",
  })
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  /* The skip link is the first thing a screen reader reaches, so it is the one
     piece of chrome that must never be in the wrong language. */
  const tA11y = await getTranslations({ locale, namespace: "a11y" })

  return (
    <html
      lang={locale}
      className={`${archivo.variable} ${fragment.variable} min-h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <MotionProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:bg-act focus:px-3 focus:py-2 focus:text-sm focus:text-on-act"
          >
            {tA11y("skipToContent")}
          </a>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--ink)",
                color: "var(--paper)",
                border: "1px solid var(--deep)",
                borderRadius: 0,
              },
            }}
          />
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
