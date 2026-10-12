import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/postprocessing",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "date-fns",
      "zod",
    ],
  },
  // The Worker cannot resize images (no Images binding), so /_next/image only
  // relayed each original at every width. The photos in public/ are sized and
  // compressed WebP already; serve them straight from the asset CDN.
  images: {
    unoptimized: true,
  },
  async redirects() {
    // The 2D site used to live at /list; it is the homepage now.
    return [
      { source: "/:locale(nb|en)/list", destination: "/:locale", permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*\\.(opus|mp3|glb|gltf|hdr|ktx2|basis|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*\\.(png|jpg|jpeg|svg|webp|avif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
