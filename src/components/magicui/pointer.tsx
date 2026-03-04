"use client"

import { motion, useMotionValue, useSpring } from "motion/react"
import { useEffect } from "react"

interface PointerProps {
  className?: string
  children?: React.ReactNode
}

export function Pointer({ className = "", children }: PointerProps) {
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)

  const springConfig = { damping: 25, stiffness: 700 }
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16)
      cursorY.set(e.clientY - 16)
    }

    window.addEventListener("mousemove", moveCursor)

    return () => {
      window.removeEventListener("mousemove", moveCursor)
    }
  }, [cursorX, cursorY])

  return (
    <motion.div
      className={`pointer-events-none fixed left-0 top-0 z-50 ${className}`}
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
      }}
    >
      {children || (
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="fill-orange-500"
        >
          <path
            d="M12 3L3 11L11 12L12 21L21 12L20 11L29 3H12Z"
            fill="currentColor"
          />
          <circle cx="12" cy="11" r="3" fill="white" />
        </svg>
      )}
    </motion.div>
  )
}
