"use client"

import { Plus, Minus } from "lucide-react"
import { type MenuItem } from "@/data/menu"
import { useCart } from "@/context/CartContext"
import { toast } from "sonner"
import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { MagicCard } from "@/components/magicui/magic-card"
import { Lens } from "../ui/lens"
import { motion, AnimatePresence } from "framer-motion"
import { getOptimizedImageUrl } from "@/lib/uploadImage"

interface ProductCardProps {
  item: MenuItem
  onAddPosition?: (position: { x: number; y: number }) => void
}

const categoryColors: Record<string, string> = {
  "All": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "Fresh Juices": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "Milkshakes": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Special Milkshake": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "Cold Coffee": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Burgers": "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  "Sandwich": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Momos": "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  "Noodles": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Fries": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Snacks": "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  "Egg Items": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Bakery": "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
  "Desserts": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Hot Beverages": "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  "Fresh Juice": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "Fruite Milk Shake": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Food Factory Special": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "Soda": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  "Lassi": "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "Smoothie": "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
  "Falooda": "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  "Mojito": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  "Health Drinks": "bg-lime-100 text-lime-700 dark:bg-lime-900/50 dark:text-lime-300",
  "Non Veg Sandwich": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Maggie": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Maggi": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Non Veg Maggi": "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  "Juice": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "Coffee": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Tea": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Shake": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Milk Shake": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Ice Cream": "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
};

const getCategoryColor = (category: string) => {
  return categoryColors[category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

const generateDescription = (item: MenuItem): string => {
  const descriptions: Record<string, string> = {
    "Fresh Lime": "Refreshing citrus drink perfect for hot summer days - tangy & cooling",
    "Jaljeera": "Traditional Indian spiced lemonade with roasted cumin - authentic taste",
    "Mint Lime": "Cooling mint blended with fresh lime - refreshing summer cooler",
    "Watermelon Juice": "Sweet & hydrating summer favorite - naturally delicious",
    "Apple Juice": "Freshly pressed organic apples - pure fruit goodness",
    "Pomegranate Juice": "Antioxidant-rich royal delight - healthy & delicious",
    "Papaya Juice": "Digestive & nutritious tropical treat - fresh papaya blend",
    "Pineapple Juice": "Tropical sweetness with digestive benefits - exotic taste",
    "Musk Melon Juice": "Light & refreshing summer cooler - naturally sweet",
    "Mango Shake": "King of fruits in a creamy shake - rich & indulgent",
    "Apple Shake": "Sweet apples blended to perfection - smooth & creamy",
    "Banana Shake": "Energy-boosting protein-rich shake - healthy & tasty",
    "Belgium Chocolate Shake": "Rich Belgian chocolate indulgence - ultimate treat",
    "Strawberry Shake": "Fresh strawberries in creamy milk - fruity delight",
    "Pista Shake": "Pistachio-flavored royal delight - exotic & rich",
    "Oreo Shake": "Crunchy Oreo cookies in thick shake - chocolate heaven",
    "Ferrero Shake": "Luxurious Ferrero rocher blend - premium indulgence",
    "Avil Milk": "Traditional Kerala milky beverage - nostalgic favorite",
    "Nutella Shake": "Creamy Nutella hazelnut perfection - heavenly blend",
    "Sharjah Shake": "Rich & creamy special blend - signature recipe",
    "KitKat Shake": "Crunchy KitKat in smooth shake - chocolate crunch",
    "Hard Rock Coffee": "Classic cold coffee with coffee kick - bold & refreshing",
    "Mud Coffee": "Thick chocolate coffee indulgence - rich & creamy",
    "Oreo Coffee": "Coffee blended with Oreo cookies - chocolate coffee delight",
    "Nutella Coffee": "Hazelnut coffee treat - creamy & indulgent",
    "Veg Burger": "Crispy veg patty with fresh veggies - classic favorite",
    "Veg Cheese Burger": "Loaded with melted cheese - gooey & delicious",
    "Chicken Burger": "Juicy chicken patty perfection - savory & satisfying",
    "Chicken Cheese Burger": "Double cheese chicken delight - ultimate burger",
    "Egg Burger": "Protein-packed egg patty burger - hearty & delicious",
    "Butter Grill": "Classic butter-grilled bread toast - simple perfection",
    "Veg Cheese Sandwich": "Melted cheese with fresh veggies - grilled to perfection",
    "Paneer Sandwich": "Cottage cheese grilled sandwich - protein-rich & tasty",
    "Club Grill Sandwich": "Triple-decker loaded sandwich - ultimate indulgence",
    "Chilli Cheese Sandwich": "Spicy cheese explosion - hot & flavorful",
    "Chicken Sandwich": "Grilled chicken in soft bread - protein-packed delight",
    "Veg Momos (6 pcs)": "Steamed dumplings with veg filling - soft & juicy",
    "Chicken Momos (6 pcs)": "Succulent chicken in soft wrapper - flavorful bites",
    "Fried Veg Momos (6 pcs)": "Crispy fried veg dumplings - crunchy outside",
    "Fried Paneer Momos (5 pcs)": "Crispy paneer pockets - spicy & tangy",
    "Veg Noodles": "Stir-fried vegetables with hakka noodles - indo-chinese favorite",
    "Chicken Noodles": "Chicken tossed with spicy noodles - protein-rich delight",
    "Egg Noodles": "Egg-fried savory noodles - quick & delicious",
    "French Fries": "Golden crispy salted fries - classic snack",
    "Peri Peri Fries": "Spicy peri peri seasoned fries - fiery & crunchy",
    "Cheese Fries": "Loaded with melted cheese - ultimate comfort snack",
  };
  
  if (descriptions[item.name]) {
    return descriptions[item.name];
  }
  
  // Generate dynamic description based on category
  const categoryDescriptions: Record<string, string> = {
    "Fresh Juices": "Freshly squeezed - healthy & refreshing",
    "Milkshakes": "Creamy & delicious - perfect blend",
    "Special Milkshake": "Premium shake - rich & indulgent",
    "Cold Coffee": "Chilled coffee bliss - refreshing pick-me-up",
    "Burgers": "Juicy & delicious - burger perfection",
    "Sandwich": "Grilled to perfection - tasty & satisfying",
    "Momos": "Steamed/fried dumplings - soft & flavorful",
    "Noodles": "Stir-fried to perfection - indo-chinese delight",
    "Fries": "Crispy & golden - perfect snack",
    "Snacks": "Tasty & satisfying - perfect accompaniment",
    "Egg Items": "Protein-rich eggs - delicious & filling",
    "Bakery": "Fresh from bakery - warm & inviting",
    "Desserts": "Sweet indulgence - dessert heaven",
    "Hot Beverages": "Warm & comforting - perfect sip",
  };
  
  return categoryDescriptions[item.category] || "Fresh & Delicious - Quality ingredients";
}

export function ProductCard({ item, onAddPosition }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart()
  const cartItem = items.find(i => i.item.id === item.id)
  const qty = cartItem?.quantity ?? 0
  const [imgLoaded, setImgLoaded] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const { theme } = useTheme()
  const addButtonRef = useRef<HTMLButtonElement>(null)

  const description = item.description || generateDescription(item)
  const isLongDescription = description.length > 40

  const handleAdd = (e?: React.MouseEvent) => {
    if (e && onAddPosition) {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      onAddPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
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
    <MagicCard
      className="group p-0 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
    >

  {/* Image Container */}
  <div className="relative aspect-[4/3] overflow-visible rounded-t-xl group-hover:rounded-t-xl transition-all duration-300">

    {!imgLoaded && (
      <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 animate-pulse" />
    )}
     <Lens
          zoomFactor={2}
          lensSize={150}
          isStatic={false}
          ariaLabel="Zoom Area"
        >
  <img
  src={getOptimizedImageUrl(item.image, 400)}
  alt={item.name}
  loading="lazy"
  onLoad={() => setImgLoaded(true)}
  onError={(e) => {
    (e.target as HTMLImageElement).src =
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80"
  }}
  className={`
    w-full h-full object-cover 
    transition-all duration-500 ease-out
    ${imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}
    group-hover:scale-125 group-hover:brightness-90
  `}
/>
</Lens>

    {/* Veg/Non-veg + Category */}
    <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 ">
      <div
        className={`w-5 h-5 rounded flex items-center justify-center border-2 backdrop-blur-md bg-white shadow-sm ${
          item.foodType === "veg" ? "border-green-500" : item.foodType === "egg" ? "border-yellow-500" : "border-red-500"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            item.foodType === "veg" ? "bg-green-500" : item.foodType === "egg" ? "bg-yellow-500" : "bg-red-500"
          }`}
        />
      </div>

      <span
        className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm ${getCategoryColor(
          item.category
        )}`}
      >
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
 <div className="py-4 px-2 relative z-10 
  bg-black/5 dark:bg-transparent
  backdrop-blur-lg 
  rounded-b-xl group-hover:rounded-b-xl
  transition-all duration-300">

    <div className="flex flex-col gap-1">

      {/* Product Name */}
      <h3 className="font-bold text-base text-foreground truncate leading-tight dark:text-white">
        {item.name}
      </h3>

      {/* Description */}
        <div className="text-xs text-muted-foreground dark:text-gray-400 min-h-[32px]">
        <span className={isLongDescription && !descExpanded ? 'line-clamp-1' : ''}>
          {description}
        </span>
        {isLongDescription && (
          <button 
            onClick={() => setDescExpanded(!descExpanded)}
            className={`text-orange-500 dark:text-orange-400 font-medium text-[10px] hover:underline ${descExpanded && "ml-1"}`}
          >
            {descExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Price + Add */}
      <div className="flex items-center justify-between mt-1 min-h-[40px] gap-1">
        <div className="flex flex-col">
          <span className="text-sm md:text-2xl  whitespace-nowrap flex-shrink-0 font-extrabold text-orange-600 dark:text-orange-400">
            ₹ {item.price}
          </span>
        </div>
        <AnimatePresence mode="popLayout">
          {qty === 0 ? (
            <motion.button
              key="add"
              layoutId={`add-${item.id}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd}
              className="relative px-8 md:px-6 py-2 md:py-[10px] rounded-full text-sm font-bold 
              bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 
              text-white shadow-lg shadow-orange-500/30 
              hover:shadow-orange-500/50 overflow-hidden group"
            >
              <span className="relative z-10">ADD</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </motion.button>
          ) : (
            <motion.div
              key="counter"
              layoutId={`add-${item.id}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center  gap-0 md:gap-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md 
              rounded-full  shadow-lg border border-white/20"
            >
              <motion.button
                whileTap={{ scale: 0.55 }}
                onClick={() => updateQuantity(item.id, qty - 1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center 
                bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm 
                hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-sm"
              >
                <Minus className="w-5 h-5 text-muted-foreground dark:text-gray-400" />
              </motion.button>

              <motion.span
                layout
                className="text-base font-bold text-orange-600 dark:text-orange-400 w-8 text-center"
              >
                {qty}
              </motion.span>

              <motion.button
                whileTap={{ scale: 0.55 }}
                onClick={() => {
                  updateQuantity(item.id, qty + 1)
                  toast.success(`+1 ${item.name}`, {
                    duration: 1000,
                    style: {
                      background: "#fff",
                      border: "2px solid #ff6b35",
                      boxShadow: "0 0 15px rgba(255, 107, 53, 0.25)",
                    },
                  })
                }}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center 
                bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm 
                hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>

</MagicCard>
  )
}
