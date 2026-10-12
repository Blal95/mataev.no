export type SkillCategory =
  | "languages"
  | "frameworks"
  | "infra"
  | "tools"

export interface Skill {
  id: string
  label: string
  category: SkillCategory
}

// Order = order on the tree
// (top → bottom). Keep short labels — they're rendered as ornaments.
export const SKILLS: Skill[] = [
  { id: "ts", label: "TypeScript", category: "languages" },
  { id: "cpp", label: "C++", category: "languages" },
  { id: "py", label: "Python", category: "languages" },
  { id: "js", label: "JavaScript", category: "languages" },
  { id: "sql", label: "SQL", category: "languages" },
  { id: "go", label: "Go", category: "languages" },
  { id: "java", label: "Java", category: "languages" },
  { id: "bash", label: "Bash", category: "languages" },
  { id: "next", label: "Next.js", category: "frameworks" },
  { id: "react", label: "React", category: "frameworks" },
  { id: "node", label: "Node", category: "frameworks" },
  { id: "pg", label: "Postgres", category: "infra" },
  { id: "mongo", label: "MongoDB", category: "infra" },
  { id: "fb", label: "Firebase", category: "infra" },
  { id: "docker", label: "Docker", category: "infra" },
  { id: "azure", label: "Azure", category: "infra" },
  { id: "linux", label: "Linux", category: "infra" },
  { id: "git", label: "Git", category: "tools" },
  { id: "figma", label: "Figma", category: "tools" },
  { id: "latex", label: "LaTeX", category: "tools" },
]
