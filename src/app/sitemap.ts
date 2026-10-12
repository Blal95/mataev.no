import type { MetadataRoute } from "next"
import { routing } from "@/i18n/routing"
import { siteUrl } from "@/lib/seo"

const PATHS = [{ path: "", priority: 1.0 }]

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.flatMap(({ path, priority }) =>
    routing.locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${siteUrl}/${l}${path}`])
        ),
      },
    }))
  )
}
