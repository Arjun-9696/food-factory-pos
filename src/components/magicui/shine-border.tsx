"use client"

import { motion } from "motion/react"

import { cn } from "@/lib/utils"

interface ShineBorderProps {
  color?: string | string[]
  className?: string
  borderRadius?: number
  children?: React.ReactNode
}

export function ShineBorder({
  color = "#A07CFE",
  className,
  borderRadius = 16,
  children,
}: ShineBorderProps) {
  const colors = Array.isArray(color) ? color : [color]
  const gradient = colors.map((c, i) => {
    const percent = (i / (colors.length - 1)) * 100
    return `${c} ${percent}%`
  }).join(", ")

  return (
    <div
      className={cn(
        "relative group rounded-[inherit]",
        className
      )}
      style={{
        "--shine-border-gradient": `linear-gradient(90deg, ${gradient})`,
        borderRadius: `${borderRadius}px`,
      } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 rounded-[inherit] p-[2px]"
        style={{
          background: `linear-gradient(90deg, ${gradient})`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      >
        <motion.div
          className="absolute inset-0 rounded-[inherit]"
          style={{
            background: `linear-gradient(90deg, ${gradient})`,
            filter: "blur(8px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      <div className="relative rounded-[inherit] bg-background">
        {children}
      </div>
    </div>
  )
}
