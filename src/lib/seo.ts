import type { Metadata } from "next"

/** Share previews are cached by the image's URL: bump this when the card
 *  changes, so LinkedIn, Slack and iMessage fetch the new one. */
const OG_VERSION = 2

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mataev.no"

export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Bilal R. Mataev",
  alternateName: [
    "Bilal Mataev",
    "Bilal Rasulovich Mataev",
    "Bilal R Mataev",
    "Mataev",
  ],
  url: siteUrl,
  email: "bilal@mataev.no",
  telephone: "+4740572214",
  jobTitle: "Full Stack Developer",
  worksFor: {
    "@type": "Organization",
    name: "Mash Partners",
    url: "https://mashpartners.no",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Norway",
    addressCountry: "NO",
  },
  sameAs: [
    "https://gallery.mataev.no",
    "https://github.com/Blal95",
    "https://linkedin.com/in/bilalrmataev",
    "https://mashpartners.no",
  ],
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Bilal R. Mataev | Portfolio",
  url: siteUrl,
  author: { "@type": "Person", name: "Bilal R. Mataev" },
}

export const baseMetadata = (params: {
  title: string
  description: string
  locale: "nb" | "en"
  path?: string
}): Metadata => {
  const url = `${siteUrl}${params.path ?? ""}`
  return {
    metadataBase: new URL(siteUrl),
    title: params.title,
    description: params.description,
    keywords: [
      "Bilal Mataev",
      "Bilal R. Mataev",
      "Bilal Rasulovich Mataev",
      "Mataev",
      "mataev.no",
      "fullstack developer Norway",
      "Norwegian developer",
      "Mash Partners",
    ],
    alternates: {
      canonical: url,
      languages: {
        nb: `${siteUrl}/nb${params.path ?? ""}`,
        en: `${siteUrl}/en${params.path ?? ""}`,
      },
    },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      siteName: "Mataev.no",
      locale: params.locale === "nb" ? "nb_NO" : "en_US",
      type: "website",
      images: [
        {
          url: `${siteUrl}/api/og?locale=${params.locale}&v=${OG_VERSION}`,
          width: 1200,
          height: 630,
          alt: params.title,
        },
      ],
    },
    icons: {
      icon: [
        { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    twitter: {
      card: "summary_large_image",
      title: params.title,
      description: params.description,
      images: [`${siteUrl}/api/og?locale=${params.locale}&v=${OG_VERSION}`],
    },
  }
}
