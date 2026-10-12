"use client"

import { LazyMotion, domAnimation } from "framer-motion"
import type { ReactNode } from "react"

/**
 * Supplies animation features to the `m` components used across the app.
 *
 * `motion.div` statically imports every DOM feature framer-motion has —
 * gestures, layout projection, drag, scroll — whether a page uses them or not,
 * and that bundle was ~93 KB gz of /list's initial JS. `m` ships featureless
 * and receives what it needs from here.
 *
 * `domAnimation` is the correct tier: nothing in this app uses framer's `drag`
 * prop (WindowFrame implements dragging by hand with pointer events), and there
 * is no `layout`, `layoutId` or `Reorder` anywhere — those are the only things
 * that would require `domMax`.
 *
 * `domAnimation` is imported statically on purpose. Loading it as a promise
 * (`() => import("framer-motion").then(m => m.domAnimation)`) was measured and
 * is worse here — 311 KB to 360 KB — because framer's core is needed by the
 * page's `useScroll`/`useTransform` hooks either way, so the dynamic import
 * duplicates it into a second chunk instead of deferring it.
 *
 * Not `strict`: strict mode throws on any `motion.*` left under this provider
 * rather than degrading to a static element.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>
}
