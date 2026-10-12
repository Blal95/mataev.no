import type { OSFileKind } from "@/config/osFiles"

export const FOLDER_GLYPH = "📁"
export const FOLDER_OPEN_GLYPH = "📂"

export function fileGlyph(kind: OSFileKind): string {
  switch (kind) {
    case "info":
      return "📄"
    case "site":
      return "🌐"
    case "repo":
      return "🐙"
  }
}
