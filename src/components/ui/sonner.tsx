"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #fff 0%, #fefefe 100%)',
          border: '2px solid rgba(255, 107, 153, 0.5)',
          boxShadow: '0 0 30px rgba(255, 107, 153, 0.25), 0 10px 40px rgba(0, 0, 0, 0.1)',
          borderRadius: '16px',
          padding: '12px 16px',
        },
        classNames: {
          toast: `
            group toast 
            bg-white dark:bg-gray-900
            border-2 border-pink-300 dark:border-pink-600
            shadow-[0_0_20px_rgba(255,107,153,0.2)]
            rounded-2xl
            overflow-hidden
          `,
          icon: `
            flex items-center justify-center w-10 h-10 rounded-full
            bg-gradient-to-br from-pink-400 to-rose-500
            text-white text-lg
            shadow-lg
          `,
          title: `
            font-bold text-sm
            text-gray-800 dark:text-white
          `,
          description: `
            text-xs 
            text-gray-500 dark:text-gray-400
          `,
          actionButton: 
            "group-[.toast]:bg-pink-500 group-[.toast]:text-white",
          cancelButton: 
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600",
          closeButton: 
            "group-[.toast]:bg-pink-100 group-[.toast]:text-pink-500 group-[.toast]:hover:bg-pink-200",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
