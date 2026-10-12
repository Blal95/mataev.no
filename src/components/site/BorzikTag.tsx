import Image from "next/image"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"
import { InkArt } from "./InkArt"

/**
 * The first Borzik on the page, introduced. Every drawing on the site is
 * Bilal's hamster, and this is where a visitor learns it: the sleeping print,
 * a tag with his name that goes to his photographs on the desk, and, under a
 * pointer or focus, the photograph the print was drawn from, pulled down
 * beside it.
 */
export function BorzikTag({ className }: { className?: string }) {
  const t = useTranslations("site.borzik")

  return (
    <figure className={cn("borzik-tag relative", className)}>
      <InkArt pose="bowl" pull="intro" pullDelay={250} first className="w-full" />
      <figcaption className="mt-1 flex justify-end">
        <a
          href="#desk"
          className="label inline-flex min-h-11 items-center text-fg-2 underline decoration-line underline-offset-4 transition-colors hover:text-fg hover:decoration-act"
        >
          {t("name")}
        </a>
      </figcaption>
      <div aria-hidden className="borzik-peek hidden bg-paper p-2 pb-5 lg:block">
        <div className="relative aspect-square overflow-hidden bg-paper-2">
          <Image src="/borzik-in-bowl.webp" alt="" fill sizes="10rem" className="object-cover object-[50%_45%]" />
        </div>
      </div>
    </figure>
  )
}
