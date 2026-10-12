import { useTranslations } from "next-intl"
import { TowerMark } from "@/components/ui/TowerMark"
import { cn } from "@/lib/cn"

/**
 * Availability, pressed onto the page like a rubber stamp in the site's one
 * ink, with the mark as its seal — the same stamp Borzik brings down on the
 * Buypass paperwork. It lands once, a beat after the name, and the seal is
 * traced as it lands. It is also the way to say yes: it goes to Contact, and
 * presses again under the pointer.
 *
 * It sits beside the way into the work, the size of a stamp rather than a
 * headline, and the seal sits beside the words, not above them, so the stamp
 * is no taller than its words.
 */
export function AvailableStamp({ className }: { className?: string }) {
  const t = useTranslations("site.stamp")

  return (
    <a
      href="#contact"
      aria-label={t("label")}
      className={cn("stamp inline-flex items-center gap-2.5 px-4 py-2.5 text-act-ink select-none", className)}
    >
      <TowerMark className="size-[clamp(2rem,min(3.2vw,5.5svh),3rem)] shrink-0" strokeWidth={2.2} />
      <span className="flex flex-col items-start">
        <span className="display text-[length:clamp(1.75rem,min(3vw,5svh),2.75rem)] leading-[0.85]">
          {t("top")}
        </span>{" "}
        <span className="label mt-1.5 tracking-[0.18em]">{t("bottom")}</span>
      </span>
    </a>
  )
}
