export interface Wallpaper {
  id: string
  label: string
  /** CSS background applied to the desktop. */
  css: string
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: "aurora",
    label: "Aurora",
    css: "linear-gradient(160deg, #10233f 0%, #0c1730 45%, #1a3b3a 75%, #070b16 100%)",
  },
  {
    id: "midnight",
    label: "Midnight",
    css: "radial-gradient(120% 120% at 70% 10%, #1b2236 0%, #0b1020 60%, #05070e 100%)",
  },
  {
    id: "candle",
    label: "Candlelight",
    css: "linear-gradient(165deg, #2a1a12 0%, #14100c 50%, #070b16 100%)",
  },
]
