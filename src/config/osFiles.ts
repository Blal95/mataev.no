import { projects, type Project } from "@/config/projects"

export type OSFileKind = "info" | "site" | "repo"

export interface OSFile {
  id: string
  label: string
  kind: OSFileKind
  url?: string
}

export interface OSFolder {
  id: string
  slug: string
  label: string
  files: OSFile[]
}

// Human label per project slug (folder name on the desktop).
const FOLDER_LABEL: Record<string, string> = {
  loyvetmitt: "Loyvetmitt",
  gallery: "Gallery",
  "mash-partners": "Mash Partners",
  kaybeo: "Kaybeo",
  buypass: "Buypass",
  myboard: "Myboard",
}

function siteFileLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "website"
  }
}

function filesFor(p: Project): OSFile[] {
  const files: OSFile[] = [
    { id: `${p.slug}-readme`, label: "README", kind: "info" },
  ]
  if (p.url) {
    files.push({
      id: `${p.slug}-site`,
      label: siteFileLabel(p.url),
      kind: "site",
      url: p.url,
    })
  }
  if (p.repoUrl) {
    files.push({
      id: `${p.slug}-repo`,
      label: "source ↗",
      kind: "repo",
      url: p.repoUrl,
    })
  }
  return files
}

export const OS_FOLDERS: OSFolder[] = projects.map((p) => ({
  id: `folder-${p.slug}`,
  slug: p.slug,
  label: FOLDER_LABEL[p.slug] ?? p.slug,
  files: filesFor(p),
}))

export function folderBySlug(slug: string): OSFolder | undefined {
  return OS_FOLDERS.find((f) => f.slug === slug)
}
