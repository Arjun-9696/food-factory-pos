"use client"

import { useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import { type MenuItem } from "@/data/menu"
import { Search, X, Plus, Minus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

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

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAdd()
    if (quantity === 0) {
      toast.success(`${item.name} added to cart!`, { 
        duration: 2000,
        style: {
          background: '#fff',
          border: '2px solid #ff6b35',
          boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)',
        }
      })
    } else {
      toast.success(`+1 ${item.name}`, {
        duration: 1000,
        style: {
          background: "#fff",
          border: "2px solid #ff6b35",
          boxShadow: "0 0 15px rgba(255, 107, 53, 0.25)",
        },
      })
    }
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-border/30 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all shadow-sm"
    >
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-sm">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-foreground dark:text-white">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">₹{item.price}</p>
      </div>

      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {quantity === 0 ? (
          <motion.button
            whileTap={{ scale: 0.55 }}
            onClick={handleAddClick}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        ) : (
          <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-full shadow-md border border-border/30">
            <button
              onClick={handleRemoveClick}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary dark:hover:bg-gray-600 transition-colors"
            >
              <Minus className="w-3.5 h-3.5 text-muted-foreground dark:text-gray-400" />
            </button>
            <span className="w-6 text-center text-xs font-bold text-foreground dark:text-white">{quantity}</span>
            <motion.button
              whileTap={{ scale: 0.55 }}
              onClick={handleAddClick}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary dark:hover:bg-gray-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground dark:text-gray-400" />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function SearchResults({
  query,
  products,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onClose,
}: {
  query: string
  products: MenuItem[]
  cartItems: { item: MenuItem; quantity: number }[]
  onAddToCart: (item: MenuItem) => void
  onUpdateQuantity: (itemId: string, qty: number) => void
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const searchLower = query.toLowerCase().trim()
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower)
    ).slice(0, 8)
  }, [query, products])

  const getQuantity = (itemId: string) => {
    const cartItem = cartItems.find((ci) => ci.item.id === itemId)
    return cartItem?.quantity || 0
  }

  if (!query.trim()) return null

  return (
    <AnimatePresence mode="wait">
      {query.trim() && (
        <motion.div
          ref={containerRef}
          data-search-results
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute left-0 right-0 top-full mt-2 w-full max-w-md mx-auto rounded-2xl border bg-background dark:bg-gray-900 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-orange-500/5 to-red-500/5 dark:from-orange-500/10 dark:to-red-500/10">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-foreground dark:text-white">
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="p-1.5 rounded-full hover:bg-secondary dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            >
              <X className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
            </button>
          </div>

          <div className="overflow-y-auto scrollbar-hide p-2 space-y-1 max-h-[400px]">
            {searchResults.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {searchResults.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <SearchResultItem
                      item={item}
                      quantity={getQuantity(item.id)}
                      onAdd={() => onAddToCart(item)}
                      onRemove={() => {
                        const qty = getQuantity(item.id)
                        if (qty > 0) onUpdateQuantity(item.id, qty - 1)
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-secondary/50 dark:bg-gray-800/50 flex items-center justify-center mb-3">
                  <Search className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground dark:text-white">No items found</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching for something else</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function MobileSearchResults({
  query,
  products,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onClose,
}: {
  query: string
  products: MenuItem[]
  cartItems: { item: MenuItem; quantity: number }[]
  onAddToCart: (item: MenuItem) => void
  onUpdateQuantity: (itemId: string, qty: number) => void
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const searchLower = query.toLowerCase().trim()
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower)
    ).slice(0, 10)
  }, [query, products])

  const getQuantity = (itemId: string) => {
    const cartItem = cartItems.find((ci) => ci.item.id === itemId)
    return cartItem?.quantity || 0
  }

  if (!query.trim()) return null

  return (
    <AnimatePresence>
      {query.trim() && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute left-0 right-0 top-full z-50 mt-2 mx-4 rounded-2xl border bg-background dark:bg-gray-900 shadow-2xl overflow-hidden max-h-[70vh]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-orange-500/5 to-red-500/5 dark:from-orange-500/10 dark:to-red-500/10 sticky top-0">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-foreground dark:text-white">
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="p-1.5 rounded-full hover:bg-secondary dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            >
              <X className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
            </button>
          </div>

          <div className="overflow-y-auto scrollbar-hide p-2 space-y-1 max-h-[calc(70vh-60px)]">
            {searchResults.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {searchResults.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <SearchResultItem
                      item={item}
                      quantity={getQuantity(item.id)}
                      onAdd={() => onAddToCart(item)}
                      onRemove={() => {
                        const qty = getQuantity(item.id)
                        if (qty > 0) onUpdateQuantity(item.id, qty - 1)
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-secondary/50 dark:bg-gray-800/50 flex items-center justify-center mb-3">
                  <Search className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground dark:text-white">No items found</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching for something else</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
