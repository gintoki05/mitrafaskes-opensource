"use client"

import { useTheme } from "next-themes"
import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "hsl(var(--popover))",
          "--normal-text": "hsl(var(--popover-foreground))",
          "--normal-border": "hsl(var(--border))",
          "--success-bg": "hsl(var(--success))",
          "--success-text": "hsl(var(--success-foreground))",
          "--success-border": "hsl(var(--success))",
          "--info-bg": "hsl(var(--info))",
          "--info-text": "hsl(var(--info-foreground))",
          "--info-border": "hsl(var(--info))",
          "--warning-bg": "hsl(var(--warning))",
          "--warning-text": "hsl(var(--warning-foreground))",
          "--warning-border": "hsl(var(--warning))",
          "--error-bg": "hsl(var(--destructive))",
          "--error-text": "hsl(var(--destructive-foreground))",
          "--error-border": "hsl(var(--destructive))",
          "--border-radius": "var(--radius-control)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group border bg-popover text-popover-foreground shadow-lg",
          title: "text-sm font-semibold",
          description: "text-xs text-current/80",
          success: "!border-success !bg-success !text-success-foreground",
          info: "!border-info !bg-info !text-info-foreground",
          warning: "!border-warning !bg-warning !text-warning-foreground",
          error: "!border-destructive !bg-destructive !text-destructive-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
