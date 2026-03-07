import { ShoppingCart } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { motion, AnimatePresence } from "framer-motion"

interface CartFABProps {
  onClick: () => void
}

export function CartFAB({ onClick }: CartFABProps) {
  const { totalItems, grandTotal } = useCart()

  if (totalItems === 0) return null

  return (
    <motion.button
      data-cart-button
      initial={{ y: 100, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 
      bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 
      text-white rounded-full shadow-2xl shadow-orange-500/40 
      hover:shadow-orange-500/60 transition-all"
    >
      <div className="relative">
        <ShoppingCart className="w-5 h-5" />
        <AnimatePresence>
          <motion.div
            key={totalItems}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2 bg-white text-orange-600 text-xs font-bold 
            w-5 h-5 rounded-full flex items-center justify-center shadow"
          >
            {totalItems}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-px h-6 bg-white/30" />

      <motion.span
        key={grandTotal}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="font-bold text-lg"
      >
        ₹{grandTotal}
      </motion.span>
    </motion.button>
  )
}
