"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

/* One primary action, in the tone's action colour: ultramarine on paper, paper
   on a blue flood, light ultramarine in the cabin. Hover drops every tone to
   the same deep ultramarine, so it reads as one gesture everywhere. Square:
   nothing on this site that you press is rounded. */
const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-semibold tracking-[-0.01em] transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-0.5",
  {
    variants: {
      variant: {
        primary: "bg-act text-on-act hover:bg-deep hover:text-paper",
        quiet: "border border-fg text-fg hover:bg-fg hover:text-ground",
      },
      size: {
        md: "h-12 px-6 text-[15px]",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
