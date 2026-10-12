import { NextResponse } from "next/server"

export const runtime = "nodejs"

const ALLOWED_HOSTS = new Set(["cdn.gallery.mataev.no", "gallery.mataev.no"])

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u")
  if (!u) return new NextResponse("missing u", { status: 400 })

  let target: URL
  try {
    target = new URL(u)
  } catch {
    return new NextResponse("bad url", { status: 400 })
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse("forbidden host", { status: 403 })
  }

  // Not through Next's data cache: it refuses anything over 2MB, and the
  // full-size photos are larger. The immutable header below already has
  // browsers keep each one.
  const upstream = await fetch(target.toString(), { cache: "no-store" })
  if (!upstream.ok) return new NextResponse("upstream error", { status: 502 })

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
    },
  })
}
