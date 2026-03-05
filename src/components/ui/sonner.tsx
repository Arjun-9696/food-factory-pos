"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

const toastStyles = `
  .toaster .toast {
    background: hsl(var(--card)) !important;
    border: 1px solid hsl(var(--border)) !important;
    color: hsl(var(--foreground)) !important;
  }
  .toaster .toast-icon-success {
    background: hsl(var(--veg)) !important;
  }
  .toaster .toast-icon-error {
    background: hsl(var(--destructive)) !important;
  }
  .toaster .title {
    color: hsl(var(--foreground)) !important;
    font-weight: 600 !important;
  }
  .toaster .description {
    color: hsl(var(--muted-foreground)) !important;
  }
  .toaster .action-button {
    background: hsl(var(--primary)) !important;
    color: hsl(var(--primary-foreground)) !important;
  }
  .toaster .cancel-button {
    background: hsl(var(--secondary)) !important;
    color: hsl(var(--secondary-foreground)) !important;
  }
  .toaster .close-button {
    background: hsl(var(--accent)) !important;
    color: hsl(var(--accent-foreground)) !important;
  }
`

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme()

  return (
    <>
      <style>{toastStyles}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position="top-center"
        toastOptions={{
          duration: 3000,
          classNames: {
            toast: `
              group toast
              rounded-2xl
              border border-border
              shadow-lg
              p-4
              bg-card text-foreground
            `,
            icon: `
              mr-2 flex items-center justify-center w-10 h-10 rounded-full
              bg-gradient-to-br from-orange-400 to-rose-500
              text-white shadow-lg
            `,
            title: `
              font-semibold text-sm
              text-foreground
            `,
            description: `
              text-xs
              text-muted-foreground
            `,
            actionButton: `
              bg-primary text-primary-foreground font-semibold
              hover:opacity:90
            `,
            cancelButton: `
              bg-secondary text-secondary-foreground font-semibold
            `,
            closeButton: `
              bg-accent text-accent-foreground
              hover:bg-accent/80
            `,
          },
        }}
        {...props}
      />
    </>
  )
}

export type { ToasterProps }
