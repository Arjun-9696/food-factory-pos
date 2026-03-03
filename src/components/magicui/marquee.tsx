"use client"

import { cn } from "@/lib/utils"
import { type HTMLAttributes } from "react"

interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  vertical?: boolean
  pauseOnHover?: boolean
  reverse?: boolean
}

export function Marquee({
  className,
  vertical = false,
  pauseOnHover = false,
  children,
  reverse = false,
  ...props
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group relative flex no-scrollbar [--duration:40s] [--gap:1rem]",
        vertical
          ? "flex-col overflow-hidden"
          : "flex-row overflow-hidden hover:overflow-x-auto",
        className
      )}
      {...props}
    >
      {/* First copy */}
      <div
        className={cn(
          "flex shrink-0 justify-around min-w-max gap-4",
          vertical ? "flex-col" : "flex-row",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>

      {/* Second copy for infinite */}
      <div
        className={cn(
          "flex shrink-0 justify-around min-w-max gap-4",
          vertical ? "flex-col" : "flex-row",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  )
}