import { useTranslations } from "next-intl"
import { Reveal } from "@/components/site/Reveal"
import { TowerMark } from "@/components/ui/TowerMark"
import { cn } from "@/lib/cn"

/**
 * The imprint the folio closes on: the mark pressed like a printer's seal,
 * and the year. The seal is in the quiet ink, not ultramarine: nothing here
 * can be pressed.
 */
export function Colophon({ className }: { className?: string }) {
  const t = useTranslations("footer")
  const year = new Date().getFullYear()

  return (
    <p className={cn("label flex items-center gap-3 text-fg-3", className)}>
      <Reveal kind="press" as="span" className="inline-flex">
        <TowerMark className="size-6" strokeWidth={2.4} />
      </Reveal>
      <span>{t("copyright", { year })}</span>
    </p>
  )
}
