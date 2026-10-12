import { setRequestLocale } from "next-intl/server"
import { CabinExperience } from "@/components/scene/CabinExperience"
import { routing } from "@/i18n/routing"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <main id="main" className="tone-night relative min-h-dvh bg-ground">
      <CabinExperience />
    </main>
  )
}
