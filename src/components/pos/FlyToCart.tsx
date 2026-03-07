"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"

interface FlyToCartProps {
  startPosition: { x: number; y: number }
  endPosition: { x: number; y: number }
  onComplete: () => void
  color?: string
}

export function FlyToCart({ startPosition, endPosition, onComplete, color = "#22c55e" }: FlyToCartProps) {
  return (
    <motion.div
      initial={{
        left: startPosition.x,
        top: startPosition.y,
        scale: 1,
        opacity: 1,
      }}
      animate={{
        left: endPosition.x,
        top: endPosition.y,
        scale: 0.2,
        opacity: 0,
      }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onAnimationComplete={onComplete}
      className="fixed w-12 h-12 rounded-full z-[9999] flex items-center justify-center pointer-events-none"
      style={{
        background: `radial-gradient(circle at 30% 30%, ${color}, ${color}dd)`,
        boxShadow: `0 4px 20px ${color}66`,
      }}
    >
      <div className="w-4 h-4 rounded-full bg-white/80" />
    </motion.div>
  )
}

export function useFlyToCart() {
  const [flyingItems, setFlyingItems] = useState<{
    id: number
    startPosition: { x: number; y: number }
    endPosition: { x: number; y: number }
    color: string
  }[]>([])

  const triggerFlyToCart = (startPosition: { x: number; y: number }, color: string = "#22c55e") => {
    const isMobile = window.innerWidth < 768
    
    let endPosition: { x: number; y: number }
    
    if (isMobile) {
      const cartButton = document.querySelector('[data-mobile-cart]')
      if (cartButton) {
        const rect = cartButton.getBoundingClientRect()
        endPosition = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      } else {
        endPosition = { x: window.innerWidth / 2, y: window.innerHeight - 60 }
      }
    } else {
      const cartButton = document.querySelector('[data-cart-button]')
      const endPos = cartButton
        ? cartButton.getBoundingClientRect()
        : { x: window.innerWidth - 80, y: window.innerHeight - 80 }
      endPosition = { x: endPos.x + 20, y: endPos.y + 20 }
    }

    const id = Date.now()
    setFlyingItems((prev) => [
      ...prev,
      {
        id,
        startPosition,
        endPosition,
        color,
      },
    ])
  }

  const removeFlyingItem = (id: number) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id))
  }

  return { flyingItems, triggerFlyToCart, removeFlyingItem }
}
