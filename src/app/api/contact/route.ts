import { NextResponse } from "next/server"
import { z } from "zod"
import { Resend } from "resend"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { site } from "@/config/site"

/**
 * Read runtime config. On Cloudflare Workers (OpenNext) secrets live on the
 * Worker `env`, NOT on `process.env` — so a `wrangler secret put RESEND_API_KEY`
 * is only visible via getCloudflareContext().env. Fall back to process.env for
 * local/dev and other hosts.
 */
function readEnv(): Record<string, string | undefined> {
  try {
    const env = getCloudflareContext().env as unknown as Record<
      string,
      string | undefined
    >
    return { ...process.env, ...env }
  } catch {
    return process.env as Record<string, string | undefined>
  }
}

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  message: z.string().min(8).max(4000),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 })
  }

  const { name, email, message } = parsed.data
  const env = readEnv()
  const apiKey = env.RESEND_API_KEY

  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not configured — skipping send")
    return NextResponse.json({ ok: true, dev: true })
  }

  // Minimal HTML escaping for the user-supplied fields in the HTML body.
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")

  const resend = new Resend(apiKey)
  try {
    const { error } = await resend.emails.send({
      // Default works out-of-box (Resend test sender). Once mataev.no is
      // verified in Resend, set RESEND_FROM="Mataev.no <noreply@mataev.no>".
      from: env.RESEND_FROM ?? "Mataev.no <onboarding@resend.dev>",
      to: site.email,
      replyTo: email,
      subject: `mataev.no — new message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.5;color:#0f181e">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#505d65">New message · mataev.no</p>
  <p style="margin:0 0 12px"><strong>${esc(name)}</strong> &lt;<a href="mailto:${esc(email)}">${esc(email)}</a>&gt;</p>
  <div style="white-space:pre-wrap;border-left:3px solid #343f47;padding-left:12px">${esc(message)}</div>
</div>`,
    })
    if (error) {
      console.error("[contact] resend error", {
        name: error.name,
        message: error.message,
        from: env.RESEND_FROM ?? "onboarding@resend.dev",
        to: site.email,
      })
      return NextResponse.json(
        { error: "Send failed", detail: error.message, code: error.name },
        { status: 502 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[contact] send threw", msg)
    return NextResponse.json({ error: "Send failed", detail: msg }, { status: 500 })
  }
}
