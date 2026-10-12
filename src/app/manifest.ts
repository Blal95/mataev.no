import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mataev.no',
    short_name: 'Mataev',
    description: 'Bilal R. Mataev, full-stack developer and designer',
    start_url: '/',
    display: 'standalone',
    // Mirrors --paper in globals.css. The installed shell should be the same
    // ground the page stands on, not an accent.
    background_color: '#f4f5f7',
    theme_color: '#f4f5f7',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
