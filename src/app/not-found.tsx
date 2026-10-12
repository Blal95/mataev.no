import Link from "next/link"
import { Archivo, Fragment_Mono } from "next/font/google"
import { InkArt } from "@/components/site/InkArt"
import en from "@/i18n/messages/en.json"
import nb from "@/i18n/messages/nb.json"

// This page renders under the root shell, NOT under `[locale]/layout.tsx`, so
// it supplies its own stylesheet and font variables — and, with no locale to
// go on, speaks both languages.
import "./globals.css"

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

export default function NotFound() {
  return (
    <html lang="nb" className={`${archivo.variable} ${fragment.variable}`}>
      <body className="grid min-h-dvh place-items-center bg-ground px-6 py-16 text-fg">
        <main className="grid w-full max-w-5xl items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div>
            <p className="label text-fg-3">404</p>
            <h1 className="display mt-4 text-[clamp(3.5rem,10vw,8rem)]">
              {nb.site.notFound.title}
            </h1>
            <p lang="en" className="mt-6 text-[clamp(1.125rem,1.6vw,1.375rem)] text-fg-2">
              {en.site.notFound.title}
            </p>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2">
              <Link
                href="/nb"
                className="label inline-flex min-h-11 items-center text-act-ink underline decoration-line underline-offset-4 hover:decoration-act"
              >
                ← {nb.site.notFound.back}
              </Link>
              <Link
                href="/en"
                lang="en"
                className="label inline-flex min-h-11 items-center text-act-ink underline decoration-line underline-offset-4 hover:decoration-act"
              >
                ← {en.site.notFound.back}
              </Link>
            </div>
          </div>
          <InkArt pose="bowl" pull className="w-full max-w-[22rem] justify-self-center" />
        </main>
      </body>
    </html>
  )
}
