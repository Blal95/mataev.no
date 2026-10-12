# mataev.no

My portfolio. Live at [mataev.no](https://mataev.no).

There are two ways in. The normal site is one long page in Norwegian and English that pans
sideways on a desktop and reads top to bottom on a phone. If you're on a desktop with a mouse,
there's also a small 3D cabin you can walk around in, where the same content sits on a laptop,
a photo wall, a mailbox and so on. The hamster is Borzik. He's real.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, next-intl for nb/en
- Three.js with React Three Fiber, Drei and Rapier for the cabin
- Hosted on Cloudflare Workers through OpenNext
- The photo archive comes from [gallery.mataev.no](https://gallery.mataev.no), my own API on
  Workers, D1 and R2

## Running it

```bash
npm install
npm run dev        # localhost:3000
npm run build
npm run deploy     # OpenNext build + wrangler deploy
```

The contact form and Borzik's chat need `RESEND_API_KEY`, `RESEND_FROM` and `GROQ_API_KEY`.
Everything else runs without them.

## Layout

```
src/app/        routes (/[locale] is the site, /[locale]/cabin the 3D version)
src/components/ the 2D site, panels shared by both versions, HUD
src/scene/      the cabin: world, player, stations (only loaded on /cabin)
src/config/     projects, education, chapters
src/i18n/       nb and en messages
```
