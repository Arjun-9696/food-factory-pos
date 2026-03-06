"use client"

import React, { useCallback, useEffect, useState } from "react"
import { motion, useMotionTemplate, useMotionValue } from "motion/react"
import { cn } from "@/lib/utils"

interface MagicCardProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  style?: React.CSSProperties
}

const darkNeonColors = [
  ["#00F5FF", "#FF00E5"],
  ["#00FFA3", "#00C2FF"],
  ["#FF4DFF", "#6A5CFF"],
  ["#00FFF0", "#FF7A18"],
  ["#FF2DF7", "#00DBDE"],
  ["#00F260", "#0575E6"],
]

const lightModeColors = [
  ["#8EC5FC", "#E0C3FC"],
  ["#FBC2EB", "#A6C1EE"],
  ["#FAD0C4", "#FFD1FF"],
  ["#FFDEE9", "#B5FFFC"],
  ["#C1FBA4", "#A0C4FF"],
  ["#FFD6A5", "#BDB2FF"],
]

export function MagicCard({
  children,
  className,
  gradientSize = 220,
  style,
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)

  const [gradientFrom, setGradientFrom] = useState("#00F5FF")
  const [gradientTo, setGradientTo] = useState("#FF00E5")

  const reset = useCallback(() => {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }, [gradientSize, mouseX, mouseY])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [mouseX, mouseY]
  )

  // detect theme + random color change
  useEffect(() => {
    const changeGradient = () => {
      const isDark = document.documentElement.classList.contains("dark")

      const palette = isDark ? darkNeonColors : lightModeColors
      const random = palette[Math.floor(Math.random() * palette.length)]

      setGradientFrom(random[0])
      setGradientTo(random[1])
    }

    changeGradient()
    const interval = setInterval(changeGradient, 1200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={cn("group relative rounded-xl transition-all", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerEnter={reset}
      style={style}
    >
      {/* Border glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: useMotionTemplate`
          radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
          ${gradientFrom},
          ${gradientTo},
          transparent 100%)
          `,
        }}
      />

      {/* Card background */}
      <div className="absolute inset-[1px] rounded-xl bg-white dark:bg-zinc-900" />

      {/* Glow layer */}
      <motion.div
        className="pointer-events-none absolute inset-[1px] rounded-xl opacity-0 group-hover:opacity-80 transition-opacity duration-300"
        style={{
          background: useMotionTemplate`
          radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
          ${gradientFrom},
          transparent 80%)
          `,
        }}
      />

      <div className="relative p-[1px]">{children}</div>
    </div>
  )
}