"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Power, Image as ImageIcon, Wifi, BatteryMedium, Search } from "lucide-react"

interface MenuBarProps {
  onShutDown: () => void
  onCycleWallpaper: () => void
  wallpaperLabel: string
}

export function MenuBar({
  onShutDown,
  onCycleWallpaper,
  wallpaperLabel,
}: MenuBarProps) {
  const t = useTranslations("os")
  const [clock, setClock] = useState("")

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]
      setClock(
        `${wd} ${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes(),
        ).padStart(2, "0")}`,
      )
    }
    tick()
    const id = window.setInterval(tick, 15_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="flex h-7 shrink-0 items-center gap-4 bg-black/40 px-3 font-mono text-[12px] text-white/90 backdrop-blur-md">
      <span className="font-semibold">{t("name")}</span>
      <span className="text-white/60">{t("menuFile")}</span>
      <span className="text-white/60">{t("menuView")}</span>
      {/* Right status cluster */}
      <span className="ml-auto flex items-center gap-3 text-white/70">
        <button
          type="button"
          onClick={onCycleWallpaper}
          className="transition hover:text-white"
          aria-label="Change wallpaper"
          title={`Wallpaper: ${wallpaperLabel}`}
        >
          <ImageIcon className="size-3.5" />
        </button>
        <Wifi className="size-3.5" aria-hidden />
        <BatteryMedium className="size-4" aria-hidden />
        <Search className="size-3.5" aria-hidden />
        <button
          type="button"
          onClick={onShutDown}
          className="transition hover:text-white"
          aria-label={t("shutDown")}
        >
          <Power className="size-3.5" />
        </button>
        <span className="tabular-nums text-white/90">{clock}</span>
      </span>
    </div>
  )
}
