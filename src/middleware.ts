// Keep filename as middleware.ts (NOT proxy.ts) until @opennextjs/cloudflare
// ships support for Next 16's renamed proxy convention. Turbopack + proxy.ts
// does not produce `.next/server/middleware.js.nft.json`, which the adapter
// requires. Tracking: https://github.com/opennextjs/opennextjs-cloudflare
import createMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

export default createMiddleware(routing)

export const config = {
  matcher: ["/", "/(nb|en)/:path*", "/((?!api|og|_next|_vercel|.*\\..*).*)" ],
}
