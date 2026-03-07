"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import { type MenuItem } from "@/data/menu"
import { Search, X, Plus, Minus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SearchResultItemProps {
  item: MenuItem
  quantity: number
  onAdd: () => void
  onRemove: () => void
}

function SearchResultItem({ item, quantity, onAdd, onRemove }: SearchResultItemProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = "/placeholder.svg"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-2 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
    >
      {/* Product Image */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate dark:text-white">{item.name}</p>
        <p className="text-xs text-muted-foreground">₹{item.price}</p>
      </div>

      {/* Quantity Controls */}
      <div className="flex-shrink-0">
        {quantity === 0 ? (
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors text-sm font-bold"
          >
            +
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-full shadow-sm">
            <button
              onClick={onRemove}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Minus className="w-3 h-3 dark:text-white" />
            </button>
            <span className="w-5 text-center text-xs font-bold dark:text-white">{quantity}</span>
            <button
              onClick={onAdd}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Plus className="w-3 h-3 dark:text-white" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface MobileSearchResultsProps {
  query: string
  products: MenuItem[]
  cartItems: { item: MenuItem; quantity: number }[]
  onAddToCart: (item: MenuItem) => void
  onUpdateQuantity: (itemId: string, qty: number) => void
  onClose: () => void
}

export function MobileSearchResults({
  query,
  products,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onClose,
}: MobileSearchResultsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (query.trim()) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [query])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const searchInput = document.querySelector('input[placeholder="Search menu..."]')
        if (searchInput && !(searchInput as HTMLElement).contains(event.target as Node)) {
          onClose()
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const searchLower = query.toLowerCase().trim()
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
    )
  }, [query, products])

  const getQuantity = (itemId: string) => {
    const cartItem = cartItems.find((ci) => ci.item.id === itemId)
    return cartItem?.quantity || 0
  }

  if (!query.trim()) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute left-0 right-0 top-full z-50 mt-2 mx-4 max-h-[60vh] overflow-y-auto rounded-2xl border bg-background/95 dark:bg-gray-900/95 shadow-xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-3 py-2 bg-background/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
            <span className="text-xs text-muted-foreground">
              {searchResults.length} results
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X className="w-4 h-4 dark:text-gray-400 text-muted-foreground" />
            </button>
          </div>

          {/* Results */}
          <div className="p-2 space-y-1">
            {searchResults.length > 0 ? (
              searchResults.slice(0, 8).map((item) => (
                <SearchResultItem
                  key={item.id}
                  item={item}
                  quantity={getQuantity(item.id)}
                  onAdd={() => onAddToCart(item)}
                  onRemove={() => {
                    const qty = getQuantity(item.id)
                    if (qty > 0) onUpdateQuantity(item.id, qty - 1)
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No items found</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
