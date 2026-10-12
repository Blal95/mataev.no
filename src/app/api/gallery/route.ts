import { NextResponse } from "next/server"
import type { GalleryImage, GalleryResponse } from "@/types/gallery"

// nodejs runtime (matches the books route + OpenNext/Cloudflare nodejs_compat).
// Top-level `revalidate` is intentionally omitted — caching is driven by the
// fetch() call below; a route-segment revalidate on an edge handler broke the
// deployed build (500s).
export const runtime = "nodejs"

// Source of truth is the standalone gallery site (gallery.mataev.no), which
// owns uploads, EXIF, and storage. Override with GALLERY_API_URL in dev.
const GALLERY_API =
  process.env.GALLERY_API_URL ?? "https://gallery.mataev.no/api/photos"

const GALLERY_ORIGIN = "https://gallery.mataev.no"

function toAbsolute(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return `${GALLERY_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`
}

/** Shape of a photo as returned by gallery.mataev.no/api/photos (subset we use). */
interface RemotePhoto {
  slug: string
  url: { thumb: string; large: string; original: string }
  caption: string | null
  width: number
  height: number
  place?: string | null
  country?: string | null
  countryCode?: string | null
  lat?: number | null
  lon?: number | null
  camera?: string | null
  lens?: string | null
  focal?: string | null
  fNumber?: number | null
  exposure?: string | null
  iso?: number | null
  takenAt?: number | null
  tags?: string[]
  mediaType?: string
}

export async function GET() {
  try {
    const res = await fetch(GALLERY_API, { next: { revalidate: 300 } })
    if (!res.ok) {
      return NextResponse.json({ images: [] } satisfies GalleryResponse)
    }
    const data = (await res.json()) as { photos?: RemotePhoto[] }
    const images: GalleryImage[] = (data.photos ?? []).map((p) => ({
      url: toAbsolute(p.url.large),
      thumb: toAbsolute(p.url.thumb),
      original: toAbsolute(p.url.original),
      slug: p.slug,
      permalink: p.slug ? `https://gallery.mataev.no/image/${p.slug}` : undefined,
      title: p.caption ?? undefined,
      alt: p.caption ?? undefined,
      place: p.place,
      countryCode: p.countryCode,
      country: p.country,
      lat: p.lat,
      lon: p.lon,
      camera: p.camera,
      lens: p.lens,
      takenAt: p.takenAt,
      width: p.width,
      height: p.height,
      mediaType: p.mediaType,
    }))
    return NextResponse.json({ images } satisfies GalleryResponse)
  } catch {
    // Network/parse failure → empty gallery; the panel already handles empty.
    return NextResponse.json({ images: [] } satisfies GalleryResponse)
  }
}
