"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme()

  return (
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
      border-2 border-pink-300 dark:border-pink-600
      shadow-[0_0_20px_rgba(255,107,153,0.2)]
      p-4

      bg-white dark:bg-gray-900
      text-gray-800 dark:text-gray-100
    `,
    icon: `
      mr-2 flex items-center justify-center w-10 h-10 rounded-full
      bg-gradient-to-br from-pink-400 to-rose-500
      text-white shadow-lg
    `,
    title: `
      font-semibold text-sm
      text-gray-800 dark:text-white
    `,
    description: `
      text-xs
      text-gray-500 dark:text-gray-400
    `,
    actionButton: `
      bg-pink-500 text-white font-semibold
      hover:bg-pink-600
    `,
    cancelButton: `
      bg-gray-100 dark:bg-gray-800
      text-gray-600 dark:text-gray-300
      font-semibold
    `,
    closeButton: `
      bg-pink-100 dark:bg-pink-900
      text-pink-500 dark:text-pink-300
      hover:bg-pink-200 dark:hover:bg-pink-800
    `,
  },
}}
      {...props}
    />
  )
}

// Re-export toast for convenience
export type { ToasterProps }
