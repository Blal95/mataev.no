"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-midnight/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const t = useTranslations("a11y")
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "tone-night scrollbar-thin fixed outline-none left-1/2 top-1/2 z-50 grid w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-6 overflow-hidden overflow-y-auto border border-line bg-ground p-6 text-fg sm:p-8 max-h-[90dvh]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[97%] data-[state=open]:zoom-in-[97%] data-[state=closed]:slide-out-to-bottom-[4%] data-[state=open]:slide-in-from-bottom-[10%] duration-[380ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:duration-200 motion-reduce:ease-out",
        className
      )}
      {...props}
    >
      {/* A short rule of the action colour on the top edge. */}
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-1 w-16 bg-act" />
      {children}
      <DialogPrimitive.Close
        aria-label={t("closeDialog")}
        className="absolute right-3 top-3 grid size-11 place-items-center text-fg-3 transition-colors hover:bg-ground-2 hover:text-fg"
      >
        <X className="size-[18px]" />
        <span className="sr-only">{t("closeDialog")}</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  )
})
DialogContent.displayName = "DialogContent"

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2 pr-10", className)} {...props} />
)

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "display text-4xl sm:text-5xl text-fg text-balance",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-fg-2 text-base text-pretty", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"
