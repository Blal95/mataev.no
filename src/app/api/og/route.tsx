import { getCloudflareContext } from "@opennextjs/cloudflare"
import { ImageResponse } from "next/og"
import { M_GLYPH, TOWER_M, mirrorRoof } from "@/config/mark"

export const runtime = "nodejs"

/**
 * The share card: the homepage in one frame — the name in the display cut on
 * ultramarine, its M drawn as the tower-M the way the page draws it, and
 * Borzik asleep in his bowl.
 *
 * `next/og` renders through Satori, which never sees the stylesheet, so these
 * are literals and must follow `globals.css`. Satori also cannot use a
 * variable font, so the two cuts it needs are static instances of Archivo in
 * `public/fonts/og/` (62% width at 800, and 100% at 500), subset to Latin.
 */
const ULTRA = "#2b3ae0" // --ultra
const PAPER = "#f4f5f7" // --paper
const PALE = "#dde0ff" // tone-blue fg-2

const NAME_SIZE = 232
const NAME_LEADING = 0.82
/** Archivo's ascent and descent (hhea), in em. Satori centres them in the
 *  line box, which puts the baseline this far above the box's bottom. */
const ASCENT = 0.878
const DESCENT = 0.21
const BASELINE_UP = NAME_SIZE * (NAME_LEADING - ((NAME_LEADING - ASCENT - DESCENT) / 2 + ASCENT))

const TAGLINE = {
  nb: "Fullstack-utvikler og designer · Norge",
  en: "Full-stack developer and designer · Norway",
} as const

async function loadAsset(origin: string, path: string): Promise<ArrayBuffer> {
  // Through the Cloudflare ASSETS binding in production (no self-fetch loop on
  // the zone); getCloudflareContext is unavailable in local dev, so fall back
  // to fetching from the origin.
  const url = new URL(path, origin).toString()
  try {
    const assets = getCloudflareContext().env.ASSETS as
      | { fetch: (req: Request | string) => Promise<Response> }
      | undefined
    if (assets) return (await assets.fetch(url)).arrayBuffer()
  } catch {
    /* not on Cloudflare */
  }
  return (await fetch(url)).arrayBuffer()
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url)
  const locale = searchParams.get("locale") === "en" ? "en" : "nb"

  const [display, text, borzik] = await Promise.all([
    loadAsset(origin, "/fonts/og/Archivo-CondensedExtraBold.ttf"),
    loadAsset(origin, "/fonts/og/Archivo-Medium.ttf"),
    loadAsset(origin, "/art/borzik/og-bowl.png"),
  ])
  const borzikSrc = `data:image/png;base64,${Buffer.from(borzik).toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          padding: "64px 72px",
          background: ULTRA,
          color: PAPER,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Archivo Condensed",
              fontSize: NAME_SIZE,
              lineHeight: NAME_LEADING,
              letterSpacing: -2,
            }}
          >
            <span>BILAL</span>
            {/* The M is the mark: one cap height on the baseline, the roofs
                rising above the cap line, as <TowerM> sets it on the page. */}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <svg
                viewBox={TOWER_M.viewBox}
                preserveAspectRatio="none"
                width={M_GLYPH.a0 * NAME_SIZE}
                height={(M_GLYPH.cap + M_GLYPH.roof) * NAME_SIZE}
                fill={PAPER}
                style={{ marginBottom: BASELINE_UP }}
              >
                <path fillRule="evenodd" d={TOWER_M.body} />
                {TOWER_M.roof.map((d) => (
                  <path key={d} d={d} />
                ))}
                {TOWER_M.roof.map((d) => (
                  <path key={`r${d}`} d={mirrorRoof(d)} />
                ))}
              </svg>
              <span>ATAEV</span>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 40, fontFamily: "Archivo", fontSize: 38, color: PALE }}>
            {TAGLINE[locale]}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={borzikSrc} alt="" width={400} height={361} />
          <div style={{ display: "flex", marginTop: 28, fontFamily: "Archivo", fontSize: 30, color: PALE }}>
            mataev.no
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Archivo Condensed", data: display, weight: 800, style: "normal" },
        { name: "Archivo", data: text, weight: 500, style: "normal" },
      ],
    },
  )
}
