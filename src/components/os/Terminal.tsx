"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { projects } from "@/config/projects"
import { site } from "@/config/site"
import { useWindowStore } from "./windowStore"

interface Line {
  prompt: boolean
  text: string
}

export function Terminal() {
  const t = useTranslations("os")
  const openWindow = useWindowStore((s) => s.open)
  const [history, setHistory] = useState<Line[]>([
    { prompt: false, text: t("terminalBanner") },
  ])
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [history])

  const print = (lines: string[]) =>
    setHistory((h) => [...h, ...lines.map((text) => ({ prompt: false, text }))])

  const run = (raw: string) => {
    const cmd = raw.trim()
    setHistory((h) => [...h, { prompt: true, text: cmd }])
    const [name, ...rest] = cmd.toLowerCase().split(/\s+/)
    const arg = rest.join(" ")

    switch (name) {
      case "":
        break
      case "help":
        print(t.raw("terminalHelp") as string[])
        break
      case "whoami":
        print(t.raw("terminalWhoami") as string[])
        break
      case "ls":
      case "projects":
        print(projects.map((p) => `  ${p.slug.padEnd(16)} ${p.year}`))
        break
      case "open": {
        const match = projects.find(
          (p) => p.slug === arg || p.slug.startsWith(arg) || arg === "mash",
        )
        const target =
          arg === "mash"
            ? projects.find((p) => p.slug === "mash-partners")
            : match
        if (target?.url) {
          print([t("terminalOpeningSite", { url: target.url })])
          openWindow({
            id: `${target.slug}-site`,
            kind: "site",
            title: new URL(target.url).hostname.replace(/^www\./, ""),
            url: target.url,
          })
        } else if (target) {
          print([t("terminalNoPublicSite", { project: target.slug })])
        } else {
          print([t("terminalNoProject", { project: arg })])
        }
        break
      }
      case "resume":
      case "cv":
        openWindow({ id: "resume", kind: "resume", title: "Résumé.pdf" })
        print([t("terminalOpeningResume")])
        break
      case "contact":
        print([
          `${t("terminalContactMail")}${site.email}`,
          `${t("terminalContactGithub")}${site.github.replace(/^https?:\/\//, "")}`,
          t("terminalContactHint"),
        ])
        break
      case "borzik":
        print(t.raw("terminalBorzik") as string[])
        break
      case "clear":
        setHistory([])
        return
      default:
        print([t("terminalCommandNotFound", { command: name })])
    }
  }

  return (
    <div
      className="h-full cursor-text bg-midnight p-3 font-mono text-[12px] leading-relaxed text-steel"
      onClick={() => inputRef.current?.focus()}
    >
      {history.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap break-words">
          {l.prompt ? <span className="text-signal">borzik@hytte ~ % </span> : null}
          {l.text}
        </div>
      ))}
      <div className="flex">
        <span className="text-signal">borzik@hytte ~ %&nbsp;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              run(input)
              setInput("")
            }
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          spellCheck={false}
          className="flex-1 bg-transparent text-text caret-signal outline-none"
        />
      </div>
      <div ref={endRef} />
    </div>
  )
}
