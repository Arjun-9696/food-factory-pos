"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(() => {
    if (!buttonRef.current || isAnimating) return
    
    setIsAnimating(true)
    
    const newTheme = !isDark
    
    // Smooth background transition
    document.documentElement.classList.add('theme-transitioning')
    
    // Animate the icon with rotation - only spin sun (light mode)
    const iconElement = buttonRef.current.querySelector('.theme-icon')
    if (iconElement && !newTheme) {
      (iconElement as HTMLElement).style.animation = 'none'
      setTimeout(() => {
        (iconElement as HTMLElement).style.animation = 'spin-slow 2s linear infinite'
      }, 10)
    }
    
    // Toggle theme
    setIsDark(newTheme)
    document.documentElement.classList.toggle("dark")
    localStorage.setItem("theme", newTheme ? "dark" : "light")
    
    // Add smooth transition class
    document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease'
    setTimeout(() => {
      document.documentElement.style.transition = ''
      document.documentElement.classList.remove('theme-transitioning')
      setIsAnimating(false)
    }, 300)
    
  }, [isDark, isAnimating])

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        className,
        "relative overflow-hidden rounded-xl"
      )}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="theme-icon"
          >
            <Sun className="w-5 h-5 text-orange-500" />
          </motion.div>
        ) : (
         
            <Moon className="w-5 h-5 text-primary" />
        )}
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
