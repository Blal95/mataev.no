import type { Pose } from "./borzik"

/** What a Work column shows over its name. */
type Art =
  | {
      /**
       * Borzik at the job, in `public/art/borzik/`: a camera for the photo
       * archive, a rubber stamp for the certificate-policy thesis, a knight for
       * the chess game. The cabin's Get Info window shows the flat print of it.
       */
      pose: Pose
      print?: undefined
    }
  | {
      /**
       * A site he designed, as its visitors first see it: the screenshot
       * printed in the one ink (`public/art/prints/<slug>-*.webp`, made by
       * `scripts/ink-prints.py`), its size in px. Where there is a design to
       * show, the column shows the real thing.
       */
      print: readonly [number, number]
      pose?: undefined
    }

export type Project = Art & {
  slug: string
  titleKey: string
  summaryKey: string
  roleKey: string
  /** How it came about: via the studio, a thesis, a project of his own. */
  contextKey: string
  year: string
  /** Still running: the year reads "2026–". */
  ongoing?: boolean
  tech: string[]
  url?: string
  repoUrl?: string
  featured: boolean
  /** Sideways, a column half as wide again: the one to look at first. */
  wide?: boolean
  /** Borzik doing the job: the frame the Work column re-prints into on hover. */
  action?: Pose
}

/** Every print is cut from a 1440×900 screenshot. */
const PRINT = [640, 400] as const

export const projects: Project[] = [
  {
    slug: "mash-partners",
    print: PRINT,
    action: "highfive-go",
    ongoing: true,
    titleKey: "projects.mash.title",
    summaryKey: "projects.mash.summary",
    roleKey: "projects.mash.role",
    contextKey: "projects.mash.context",
    year: "2025",
    tech: ["Next.js", "TypeScript", "Automation"],
    url: "https://mashpartners.no",
    featured: true,
  },
  {
    slug: "kaybeo",
    print: PRINT,
    titleKey: "projects.kaybeo.title",
    summaryKey: "projects.kaybeo.summary",
    roleKey: "projects.kaybeo.role",
    contextKey: "projects.kaybeo.context",
    year: "2026",
    tech: ["Next.js", "TypeScript", "Spotify Embed API", "Cloudflare Pages"],
    url: "https://kaybeo.no",
    featured: true,
  },
  {
    slug: "gallery",
    pose: "camera",
    action: "camera-go",
    titleKey: "projects.gallery.title",
    summaryKey: "projects.gallery.summary",
    roleKey: "projects.gallery.role",
    contextKey: "projects.gallery.context",
    year: "2026",
    tech: ["Next.js", "Cloudflare Workers", "D1", "R2", "REST API"],
    url: "https://gallery.mataev.no",
    featured: true,
  },
  {
    slug: "loyvetmitt",
    print: PRINT,
    action: "taxi-go",
    wide: true,
    titleKey: "projects.loyvetmitt.title",
    summaryKey: "projects.loyvetmitt.summary",
    roleKey: "projects.loyvetmitt.role",
    contextKey: "projects.loyvetmitt.context",
    year: "2026",
    tech: ["Next.js", "TypeScript", "Fastify", "PostgreSQL", "BullMQ", "Stripe"],
    url: "https://www.loyvetmitt.no",
    featured: true,
  },
  {
    slug: "buypass",
    pose: "stamp",
    action: "stamp-go",
    titleKey: "projects.buypass.title",
    summaryKey: "projects.buypass.summary",
    roleKey: "projects.buypass.role",
    contextKey: "projects.buypass.context",
    year: "2025",
    tech: ["Python", "GitLab CI/CD"],
    featured: false,
  },
  {
    slug: "myboard",
    pose: "knight",
    action: "knight-go",
    titleKey: "projects.myboard.title",
    summaryKey: "projects.myboard.summary",
    roleKey: "projects.myboard.role",
    contextKey: "projects.myboard.context",
    year: "2024",
    tech: ["C++", "Firebase", "Bash"],
    featured: false,
  },
]
