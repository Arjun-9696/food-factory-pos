import { Plus, Minus } from "lucide-react";
import { type MenuItem } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useState } from "react";
import { PixelImage } from "@/components/magicui/pixel-image";
import { CoolMode } from "@/components/magicui/cool-mode";
import { MagicCard } from "@/components/magicui/magic-card";
import { BorderBeam } from "@/components/magicui/border-beam";

interface ProductCardProps {
  item: MenuItem;
}

export function ProductCard({ item }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find(i => i.item.id === item.id);
  const qty = cartItem?.quantity ?? 0;
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleAdd = () => {
    addItem(item);
    toast.success(`${item.name} added`, { duration: 1500 });
  };

  return (
    <MagicCard className="group relative overflow-hidden" gradientSize={200} gradientOpacity={0.8}>
      <BorderBeam size={50} duration={6} delay={0} colorFrom="#ffaa40" colorTo="#9c40ff" />
      
      {/* Image using PixelImage */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {!imgLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
        <PixelImage
          src={item.image}
          grid="6x4"
          grayscaleAnimation={true}
          pixelFadeInDuration={2000}
          maxAnimationDelay={2400}
          colorRevealDelay={2800}
        />
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80`;
          }}
          className={`
            absolute inset-0 w-full h-full object-cover transition-transform duration-500
            ${imgLoaded ? 'opacity-100' : 'opacity-0'}
            group-hover:scale-110
          `}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Veg/Non-veg indicator - left side */}
      <div className="absolute top-2 left-2 z-20">
        <div className={item.isVeg ? "veg-indicator" : "nonveg-indicator"} />
      </div>

      {/* Category tag - right side */}
      <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-background/90 dark:bg-black/50 text-foreground">
        {item.category}
      </span>

      {/* Quantity badge */}
      {qty > 0 && <span className="qty-badge z-20">{qty}</span>}

      {/* Info */}
      <div className="p-3 relative z-10 bg-background/90 backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-bold text-foreground">₹{item.price}</span>

          {qty === 0 ? (
            <CoolMode options={{ particle: "circle", speedHorz: 3, speedUp: 15 }}>
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 rounded-lg text-xs font-bold cart-gradient text-white transition-transform hover:scale-105 active:scale-95"
              >
                ADD
              </button>
            </CoolMode>
          ) : (
            <div className="flex items-center gap-1 bg-muted rounded-lg px-1">
              <button
                onClick={() => updateQuantity(item.id, qty - 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-bold text-foreground w-5 text-center">{qty}</span>
              <CoolMode options={{ particle: "circle", speedHorz: 3, speedUp: 15 }}>
                <button
                  onClick={() => { 
                    updateQuantity(item.id, qty + 1); 
                    toast.success(`${item.name} added`, { duration: 1000 }); 
                  }}
                  className="w-7 h-7 rounded-md flex items-center justify-center bg-green-500 text-white font-bold text-xs hover:bg-green-600 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </CoolMode>
            </div>
          )}
        </div>
      </div>
    </MagicCard>
  );
}
