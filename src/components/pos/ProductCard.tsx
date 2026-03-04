"use client"

import { Plus, Minus } from "lucide-react"
import { type MenuItem } from "@/data/menu"
import { useCart } from "@/context/CartContext"
import { toast } from "sonner"
import { useState } from "react"
import { NeonGradientCard } from "@/components/ui/neon-gradient-card"

interface ProductCardProps {
  item: MenuItem
}

export function ProductCard({ item }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart()
  const cartItem = items.find(i => i.item.id === item.id)
  const qty = cartItem?.quantity ?? 0
  const [imgLoaded, setImgLoaded] = useState(false)

  const handleAdd = () => {
    addItem(item)
    toast.success(`${item.name} added to cart!`, { 
      duration: 2000,
      style: {
        background: '#fff',
        border: '2px solid #ff6b35',
        boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)',
      }
    })
  }

  return (
    <NeonGradientCard 
      className="group relative overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
      neonColors={{ firstColor: "#ff6b35", secondColor: "#f7c548" }}
      borderSize={2}
      borderRadius={16}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 animate-pulse" />
        )}
        
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80`
          }}
          className={`
            w-full h-full object-cover transition-all duration-500
            ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
            group-hover:scale-110
          `}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top Row: Veg/Non-veg + Category */}
        <div className="absolute top-3 left-0 right-3 flex justify-between items-start z-20">
          {/* Veg/Non-veg indicator - left */}
          <div className={item.isVeg ? "veg-indicator" : "nonveg-indicator"} />
          
          {/* Category tag - right */}
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/95 dark:bg-black/80 text-foreground shadow-lg backdrop-blur-sm">
            {item.category}
          </span>
        </div>

        {/* Quantity badge */}
        {qty > 0 && (
          <div className="absolute bottom-3 right-3 z-20">
            <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500 text-white shadow-lg shadow-orange-500/50">
              {qty} in cart
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 relative z-10 bg-white dark:bg-gray-900">
        <div className="flex flex-col gap-1.5">
          {/* Product Name */}
          <h3 className="font-bold text-base text-foreground truncate leading-tight dark:text-white">
            {item.name}
          </h3>
          
          {/* Description */}
          <p className="text-xs text-muted-foreground truncate dark:text-gray-400">
            {item.description}
          </p>
          
          {/* Price & Add Button */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground dark:text-gray-500">Price</span>
              <span className="text-xl font-extrabold text-orange-600 dark:text-orange-400">
                ₹{item.price}
              </span>
            </div>

            {qty === 0 ? (
              <button
                onClick={handleAdd}
                className="px-5 py-2.5 rounded-xl text-sm font-bold 
                  bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 
                  text-white shadow-lg shadow-orange-500/30 
                  hover:shadow-orange-500/50 hover:scale-105 
                  active:scale-95 transition-all duration-200"
              >
                ADD
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 rounded-xl p-1.5 shadow-md">
                <button
                  onClick={() => updateQuantity(item.id, qty - 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center 
                    bg-red-500 text-white font-bold text-sm 
                    hover:bg-red-600 transition-colors shadow-md"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold text-foreground dark:text-white w-6 text-center">
                  {qty}
                </span>
                <button
                  onClick={() => { 
                    updateQuantity(item.id, qty + 1)
                    toast.success(`+1 ${item.name}`, { 
                      duration: 1000,
                      style: {
                        background: '#fff',
                        border: '2px solid #ff6b35',
                        boxShadow: '0 0 15px rgba(255, 107, 53, 0.25)',
                      }
                    })
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center 
                    bg-green-500 text-white font-bold text-sm 
                    hover:bg-green-600 transition-colors shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </NeonGradientCard>
  )
}
