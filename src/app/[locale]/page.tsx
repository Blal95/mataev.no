import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { AboutPanel } from "@/components/panels/AboutPanel"
import { ContactPanel } from "@/components/panels/ContactPanel"
import { EducationPanel } from "@/components/panels/EducationPanel"
import { AvailableStamp } from "@/components/site/AvailableStamp"
import { BorzikTag } from "@/components/site/BorzikTag"
import { CabinDoor } from "@/components/site/CabinDoor"
import { Chapter } from "@/components/site/Chapter"
import { ContactEmail } from "@/components/site/ContactEmail"
import { CVButton } from "@/components/site/CVButton"
import { Desk } from "@/components/site/Desk"
import { Folio, FOLIO_BOOT } from "@/components/site/Folio"
import { FolioChrome } from "@/components/site/FolioChrome"
import { InkArt } from "@/components/site/InkArt"
import { Panel } from "@/components/site/Panel"
import { ProjectCard } from "@/components/site/ProjectCard"
import { StretchName } from "@/components/site/StretchName"
import { WorkRow } from "@/components/site/WorkRow"
import { Button } from "@/components/ui/Button"
import { Colophon } from "@/components/ui/Colophon"
import { monthIndex } from "@/config/education"
import { projects } from "@/config/projects"
import { site } from "@/config/site"
import { routing } from "@/i18n/routing"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/**
 * The folio: four chapters on one track. On a desktop the page scrolls
 * sideways through them — I the name, II the work, III the person, IV the
 * way to write, and after it the door to the cabin — and everywhere else it
 * is the same page, top to bottom.
 */
export default async function FolioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("site")
  // "Bilal R. Mataev" → the two lines the hero sets: first name, family name.
  const parts = site.ownerName.split(" ")
  const nameLines = [parts[0], parts[parts.length - 1]]

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FOLIO_BOOT }} />
      <main id="main">
        <Folio chrome={<FolioChrome />}>
          {/* I — the name */}
          <Panel
            id="home"
            className="flex min-h-[100svh] flex-col px-4 pb-24 pt-20 sm:px-8 lg:px-12 folio:w-screen folio:px-[5vw] folio:pb-[max(4.5rem,10svh)] folio:pt-[max(4.5rem,11svh)]"
          >
            {/* The name, then what he does, then the way in, with the stamp
                beside it: status next to the action. Borzik sleeps in the
                corner, named, and on a phone after all of it. */}
            <div className="grid content-start gap-x-8 gap-y-10 lg:grid-cols-[minmax(0,1fr)_auto] folio:gap-y-[min(2.5rem,4svh)]">
              <StretchName
                lines={nameLines}
                className="text-[length:clamp(5.25rem,16.2vw,16rem)] folio:text-[length:min(16.2vw,26svh)]"
              />
              <div className="arrive-fade max-w-[42rem] [animation-delay:250ms] lg:col-start-1">
                <p className="text-[clamp(1.375rem,2.1vw,2rem)] leading-[1.2] tracking-[-0.015em] text-balance">
                  {t("hero.lede")}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-8 folio:mt-[min(2rem,3.5svh)]">
                  <Button asChild size="lg">
                    <a href="#work">
                      {t("hero.ctaWork")}
                      <ArrowRight />
                    </a>
                  </Button>
                  <AvailableStamp />
                </div>
              </div>
              <BorzikTag className="w-[min(14rem,44vw)] justify-self-end lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-4 lg:w-[min(17vw,19rem)] folio:w-[min(15vw,21svh)]" />
            </div>
          </Panel>

          {/* II — the work */}
          <Chapter id="work">
            <Panel className="px-4 pb-16 pt-6 sm:px-8 lg:px-12 folio:w-max folio:py-[max(4.5rem,11svh)] folio:pl-[var(--spine-w)] folio:pr-0">
              <WorkRow>
                {projects.map((p) => (
                  <ProjectCard key={p.slug} project={p} />
                ))}
              </WorkRow>
            </Panel>
          </Chapter>

          {/* III — the person */}
          <Chapter id="about">
            <Panel className="px-4 pb-16 pt-6 sm:px-8 lg:px-12 folio:w-max folio:py-[max(4.5rem,11svh)] folio:pl-[calc(var(--spine-w)+4vw)] folio:pr-[4vw]">
              <div className="min-w-0 folio:h-full">
                <AboutPanel />
              </div>
            </Panel>
            <Panel id="desk" tone="blue" labelledBy="desk-title" className="folio:w-[108vw]">
              <Desk />
            </Panel>
            <Panel
              id="background"
              labelledBy="background-title"
              className="px-4 py-16 sm:px-8 lg:px-12 folio:flex folio:w-max folio:flex-col folio:justify-center folio:py-[max(4.5rem,11svh)] folio:pl-[calc(var(--spine-w)+3vw)] folio:pr-[4vw]"
            >
              <h3
                id="background-title"
                className="mb-8 max-w-[22ch] text-[clamp(1.75rem,2.4vw,2.5rem)] font-bold leading-[1] tracking-[-0.02em] text-balance [font-stretch:78%]"
              >
                {t("about.backgroundTitle")}
              </h3>
              <EducationPanel groupHeading="h4" now={monthIndex(new Date())} />
            </Panel>
          </Chapter>

          {/* IV — the way to write */}
          <Chapter id="contact">
            <Panel className="px-4 pb-28 pt-6 sm:px-8 lg:px-12 folio:grid folio:w-screen folio:grid-cols-[minmax(0,1fr)_min(26rem,32vw)] folio:items-center folio:gap-[4vw] folio:py-[max(4.5rem,11svh)] folio:pl-[calc(var(--spine-w)+4vw)] folio:pr-[5vw]">
              <div className="flex min-w-0 flex-col">
                <p className="mt-2 max-w-[36rem] text-[clamp(1.125rem,1.4vw,1.375rem)] leading-snug text-fg-2 text-pretty folio:mt-0">
                  {t("contact.open")}
                </p>
                <div className="mt-5">
                  <ContactEmail />
                </div>
                <p className="label mt-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-fg-2">
                  <a
                    href={`tel:${site.phoneHref}`}
                    className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:text-fg hover:decoration-act"
                  >
                    {site.phone}
                  </a>
                  <a
                    href={site.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:text-fg hover:decoration-act"
                  >
                    LinkedIn ↗
                  </a>
                  <a
                    href={site.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:text-fg hover:decoration-act"
                  >
                    GitHub ↗
                  </a>
                  {/* Sideways the CV is always in the corner. */}
                  <CVButton variant="label" className="folio:hidden" />
                </p>
                <div className="mt-10 flex items-end gap-6 folio:mt-8">
                  <InkArt pose="cheese" pull="view" className="w-[min(12rem,40vw)] folio:w-[min(8vw,16svh)]" />
                  <Colophon className="pb-2" />
                </div>
              </div>
              <div className="mt-14 min-w-0 folio:mt-0">
                <ContactPanel direct={false} />
              </div>
            </Panel>
          </Chapter>

          <CabinDoor />
        </Folio>
      </main>
    </>
  )
}
