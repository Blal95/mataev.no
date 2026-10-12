import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./src/i18n/routing"

const intlMiddleware = createMiddleware(routing)

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile Safari/i

function isMobile(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") ?? ""
  return MOBILE_UA.test(ua)
}

function localeFromPath(pathname: string): string {
  const seg = pathname.split("/")[1]
  return routing.locales.includes(seg as (typeof routing.locales)[number])
    ? seg
    : routing.defaultLocale
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // The 3D cabin is desktop-only; a phone that follows a link to it lands on
  // the 2D homepage instead.
  if (isMobile(req) && /^\/(?:nb|en)?\/?cabin(?:\/|$)/.test(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = `/${localeFromPath(pathname)}`
    return NextResponse.redirect(url, 307)
  }

  return intlMiddleware(req)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
