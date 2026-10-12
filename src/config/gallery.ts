import type { GalleryImage } from "@/types/gallery"

/** The standalone gallery site — the fallback href when a photo has no slug. */
export const GALLERY_URL = "https://gallery.mataev.no"

/**
 * Which photograph gets the held shot.
 *
 * The strip is a shuffle — 89 pictures, an arbitrary fourteen of them, in an
 * arbitrary order, and that is right for a strip. The one photograph that
 * LEAVES the strip and holds the frame for 1350px of scroll is the single
 * cinematic moment on the page, and it was being drawn from the same hat: one
 * load opened on a FaceTime screenshot captioned "Uten tittel", another on the
 * poster frame of a video. A shot nobody chose is not a shot.
 *
 * So the choice is made here, by name, and it is an ALLOW-LIST rather than a
 * filter. That is the load-bearing decision: a filter can only reject what the
 * metadata can see, and the metadata cannot see a censorship scribble drawn
 * over someone's face, a photograph of a person who did not agree to be the
 * front of a portfolio, or a frame that is simply weak. An allow-list rejects
 * everything by default, so nothing the owner has not personally chosen can
 * ever take the frame while a single entry here still exists in the gallery.
 *
 * ── To change the shot: put a different slug first. That is the whole edit.
 * The slug is the last segment of the photo's permalink on gallery.mataev.no
 * (`https://gallery.mataev.no/image/<slug>`). Entries after the first are the
 * understudies, tried in order if the one above has been unpublished.
 */
export const FEATURED_SLUGS: readonly string[] = [
  // Mjøsa from the Lillehammer shore, sun going down behind the fjell. Home,
  // landscape (so it fills the frame the way the frame is shaped), warm light
  // against a cold dark — and a complete record: place, country, coordinates,
  // month, camera.
  "photo-mx5zdcj0",
  // Piazza San Marco at dusk — the campanile and the lion column in silhouette.
  "photo-c81b2wbh",
  // Golden hour over the water, Lillehammer. Portrait.
  "photo-dysw3npb",
]

/** A frame, not a banner crop and not a panorama. */
const MIN_RATIO = 0.5
const MAX_RATIO = 2.1

/**
 * The safety net, for the day every slug above has been deleted from the
 * gallery. It is deliberately strict, and each clause is a real defect it was
 * written against:
 *
 *   mediaType   — the three videos in the set resolve `large` to a poster
 *                 frame, so the stage holds a still of a film with no film in
 *                 it, behind a permalink to `/image/video-…`.
 *   camera      — a photograph came off a lens. Every screenshot, meme,
 *                 collage and video in this gallery has `camera: null`; every
 *                 frame that came out of a camera has it set.
 *   place       — the record needs a name. Without one the held shot is
 *                 captioned "Uten tittel", which is what a critic got.
 *   ratio       — 438x115 is a crop of a chat window, not a picture.
 */
function isDefensible(p: GalleryImage): boolean {
  if (p.mediaType && p.mediaType !== "photo") return false
  if (!p.camera) return false
  if (!p.place?.trim()) return false
  if (!p.width || !p.height) return false
  const r = p.width / p.height
  return r >= MIN_RATIO && r <= MAX_RATIO
}

/**
 * The photograph that holds the frame, and the rest, in that order. Called
 * once on the full response — before any shuffle — so the shot is the same on
 * every load of every locale, and the strip never shows the picture twice.
 */
export function partitionGallery(
  images: readonly GalleryImage[],
): { featured: GalleryImage | null; rest: GalleryImage[] } {
  if (images.length === 0) return { featured: null, rest: [] }
  const featured =
    FEATURED_SLUGS.map((slug) => images.find((p) => p.slug === slug)).find(
      (p): p is GalleryImage => p !== undefined,
    ) ??
    images.find(isDefensible) ??
    images[0]
  return { featured, rest: images.filter((p) => p !== featured) }
}

/** The photograph's own shape, from the data rather than from a load event. */
export function aspectOf(p: GalleryImage): number | null {
  if (!p.width || !p.height) return null
  return p.width / p.height
}
