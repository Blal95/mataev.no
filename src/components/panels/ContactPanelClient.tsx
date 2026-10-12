"use client"

import { useState } from "react"
import { AnimatePresence, m } from "framer-motion"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Mail, Phone, Send } from "lucide-react"
import { GithubIcon, LinkedinIcon } from "@/components/ui/BrandIcons"
import { Button } from "@/components/ui/Button"
import { RevealChip } from "@/components/ui/RevealChip"
import { InkArt } from "@/components/site/InkArt"
import { site } from "@/config/site"
import { cn } from "@/lib/cn"
import { useGameStore } from "@/hooks/useGameStore"

/**
 * The mailbox: a letter you write, and the addresses you could use instead.
 * Fields are ruled lines (`.field`), not boxes. Colours come from the tone,
 * so it is the same form on the Contact chapter and in the cabin dialog. The
 * page prints the addresses itself, so it asks for the form alone
 * (`direct={false}`); the cabin's mailbox keeps them beside the form.
 */
export function ContactPanelClient({ direct = true }: { direct?: boolean }) {
  const t = useTranslations("contact")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const setContactSent = useGameStore((s) => s.setContactSent)

  const schema = z.object({
    name: z.string().min(1, t("errors.nameRequired")),
    email: z.string().email(t("errors.emailInvalid")),
    message: z.string().min(8, t("errors.messageShort")),
  })

  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    // Validate once a field has been touched (on blur), then keep it live on
    // change — feedback as you go, never nagging before you've typed.
    mode: "onTouched",
  })

  const onSubmit = async (data: Values) => {
    setPending(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Send failed")
      toast.success(t("sent"))
      setSent(true)
      setContactSent(true) // raises the mailbox flag in-world
      reset()
    } catch {
      toast.error(t("errorSend"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="@container">
      <AnimatePresence mode="wait">
        {sent && (
          <m.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10"
          >
            <InkArt pose="cheese" pull className="w-28" />
            <p className="display mt-5 text-4xl">{t("sent")}</p>
            <p className="label mt-3 text-fg-3">{t("replySoon")}</p>
          </m.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "grid gap-12",
          direct && "@xl:grid-cols-[minmax(0,1fr)_14rem] @xl:gap-10",
          sent && "hidden",
        )}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
          <Field id="contact-name" label={t("name")} required error={errors.name?.message}>
            <input
              {...register("name")}
              id="contact-name"
              type="text"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
              className="field"
              disabled={pending || sent}
            />
          </Field>

          <Field id="contact-email" label={t("email")} required error={errors.email?.message}>
            <input
              {...register("email")}
              id="contact-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
              className="field"
              disabled={pending || sent}
            />
          </Field>

          <Field id="contact-message" label={t("message")} required error={errors.message?.message}>
            <textarea
              {...register("message")}
              id="contact-message"
              rows={4}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? "contact-message-error" : undefined}
              className="field"
              disabled={pending || sent}
            />
          </Field>

          <Button type="submit" disabled={pending || sent} className="w-full sm:w-auto">
            {sent ? t("sent") : pending ? t("sending") : t("send")}
            <Send />
          </Button>
        </form>

        {direct && (
          <div>
            <p className="label border-b border-line pb-2 text-fg-3">{t("or")}</p>
            <div className="mt-3 flex flex-col">
              <RevealChip
                value={site.email}
                href={`mailto:${site.email}`}
                icon={<Mail className="size-3.5 shrink-0" />}
                label={t("emailLabel")}
                revealLabel={t("reveal", { label: t("emailLabel") })}
              />
              <RevealChip
                value={site.phone}
                href={`tel:${site.phoneHref}`}
                icon={<Phone className="size-3.5 shrink-0" />}
                label={t("phoneLabel")}
                revealLabel={t("reveal", { label: t("phoneLabel") })}
              />
              <DirectLink href={site.github} icon={<GithubIcon className="size-3.5" />}>
                github
              </DirectLink>
              <DirectLink href={site.linkedin} icon={<LinkedinIcon className="size-3.5" />}>
                linkedin
              </DirectLink>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="label flex items-center gap-1 text-fg-3">
        {label}
        {required && (
          <span className="text-act-ink" aria-hidden>
            *
          </span>
        )}
      </span>
      <span className="block">{children}</span>
      <AnimatePresence initial={false}>
        {error && (
          <m.span
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-1.5 block text-[13px] text-err"
          >
            {error}
          </m.span>
        )}
      </AnimatePresence>
    </label>
  )
}

function DirectLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 py-2 text-[15px] text-fg-2 underline decoration-fg-3 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
    >
      {icon}
      {children}
    </a>
  )
}
