"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog"
import { cn } from "@/lib/cn"

// The chat is the cabin's own Borzik panel; it loads the first time someone
// asks, never with the page.
const BorzikPanel = dynamic(
  () => import("@/components/panels/BorzikPanel").then((m) => m.BorzikPanel),
  { ssr: false },
)

/** Borzik's speech bubble. Pressing it opens a chat with him. */
export function AskBorzik({
  label,
  title,
  intro,
  className,
}: {
  label: string
  title: string
  intro: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex min-h-11 items-center rounded-2xl rounded-bl-sm bg-paper px-4 py-2.5 text-left text-[15px] font-medium text-deep",
            "shadow-[0_14px_32px_-14px_rgba(8,12,60,0.6)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:-rotate-1",
            "focus-visible:outline-paper",
            className,
          )}
        >
          {label}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* The panel prints the same intro itself; this one is for screen readers. */}
          <DialogDescription className="sr-only">{intro}</DialogDescription>
        </DialogHeader>
        {open && <BorzikPanel />}
      </DialogContent>
    </Dialog>
  )
}
