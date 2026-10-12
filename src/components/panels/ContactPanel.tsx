"use client"

import dynamic from "next/dynamic"

/**
 * Split point for the contact form: react-hook-form and zod load only when
 * the form mounts. The skeleton is the same ruled lines, empty.
 */
const ContactPanelClient = dynamic(
  () => import("./ContactPanelClient").then((m) => m.ContactPanelClient),
  { ssr: false, loading: () => <ContactSkeleton /> },
)

function ContactSkeleton() {
  return (
    <div aria-hidden className="space-y-9">
      <div className="h-6 border-b border-fg" />
      <div className="h-5 w-2/3 bg-ground-2" />
      <div className="h-12 border-b border-line" />
      <div className="h-12 border-b border-line" />
      <div className="h-32 border-b border-line" />
    </div>
  )
}

export function ContactPanel({ direct = true }: { direct?: boolean }) {
  return <ContactPanelClient direct={direct} />
}
