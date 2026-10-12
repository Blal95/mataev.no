/** One picture in the gallery. Sourced from gallery.mataev.no/api/photos. */
export interface GalleryImage {
  /** Large CDN URL — used by the 2D panel <img> and proxied for 3D wall textures. */
  url: string
  /** Small CDN URL (~500 px) — preferred for 3D wall textures to save bandwidth/GPU. */
  thumb?: string
  /** Original full-resolution CDN URL. */
  original?: string
  /** Stable slug for this photo on the gallery site. */
  slug?: string
  /** Permalink to this exact photo's page on gallery.mataev.no. */
  permalink?: string
  /** Caption / display title. */
  title?: string
  /** Alt text (falls back to `title`). */
  alt?: string
  /** Location name where the photo was taken. */
  place?: string | null
  /** ISO 3166-1 alpha-2 country code (e.g. "NO"). */
  countryCode?: string | null
  /** Full country name as the gallery reports it (e.g. "Italy"). */
  country?: string | null
  /** Latitude where the photo was taken (WGS84). */
  lat?: number | null
  /** Longitude where the photo was taken (WGS84). */
  lon?: number | null
  /** Camera model string (e.g. "iPhone 15 Pro"). */
  camera?: string | null
  /** Lens string. */
  lens?: string | null
  /** Unix timestamp (ms) of when the photo was taken. */
  takenAt?: number | null
  /** Pixel dimensions of the source frame. The plate's aspect comes from here
   *  rather than from the <img>'s load event, so the box is the photograph's
   *  own shape in the SSR payload too. */
  width?: number
  height?: number
  /** "photo" | "video". A video's `large` URL is a poster frame, not a frame of
   *  film — the gallery has three, and they must never take the held shot. */
  mediaType?: string
}

export interface GalleryResponse {
  images: GalleryImage[]
}
