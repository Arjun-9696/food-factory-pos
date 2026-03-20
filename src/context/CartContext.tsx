import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { type MenuItem } from "@/data/menu";

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, qty?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  gst: number;
  discount: number;
  setDiscount: (d: number) => void;
  grandTotal: number;
  showCelebration: boolean;
  triggerCelebration: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

const STORAGE_KEY = "food-factory-cart";
const ORDER_KEY = "food-factory-order-num";
const FIRST_ADD_KEY = "food-factory-first-add";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [discount, setDiscount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const triggerCelebration = useCallback(() => {
    const hasShownCelebration = localStorage.getItem(FIRST_ADD_KEY);
    if (!hasShownCelebration) {
      localStorage.setItem(FIRST_ADD_KEY, "true");
      setCelebrationKey(prev => prev + 1);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, []);

  const addItem = useCallback((item: MenuItem, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { item, quantity: qty }];
    });
    triggerCelebration();
  }, [triggerCelebration]);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.item.id !== itemId));
    } else {
      setItems(prev => prev.map(i => i.item.id === itemId ? { ...i, quantity: qty } : i));
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.item.price * i.quantity, 0);
  const validDiscount = Math.min(discount, subtotal);
  const gst = Math.round((subtotal - validDiscount) * 0.05);
  const grandTotal = subtotal - validDiscount + gst;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      totalItems, subtotal, gst, discount: validDiscount, setDiscount,
      grandTotal, showCelebration, triggerCelebration
    }}>
      {children}
      {showCelebration && <FirstAddCelebration key={celebrationKey} />}
    </CartContext.Provider>
  );
}

function FirstAddCelebration() {
  const [sparkles, setSparkles] = useState<Array<{id: number, x: number, y: number, color: string}>>([]);
  const [confetti, setConfetti] = useState<Array<{id: number, x: number, color: string, delay: number}>>([]);

  useEffect(() => {
    // Create sparkles
    const newSparkles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8ff8', '#00f303'][Math.floor(Math.random() * 6)]
    }));
    setSparkles(newSparkles);

    // Create confetti
    const newConfetti = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8ff8', '#ff9f43'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 2
    }));
    setConfetti(newConfetti);

    // Cleanup after animation
    const timer = setTimeout(() => {
      setSparkles([]);
      setConfetti([]);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Sparkles */}
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          className="celebration-sparkle"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            backgroundColor: sparkle.color,
            animation: `sparkle-float 1.5s ease-out forwards`,
            boxShadow: `0 0 10px ${sparkle.color}, 0 0 20px ${sparkle.color}`
          }}
        />
      ))}

      {/* Confetti */}
      {confetti.map(c => (
        <div
          key={c.id}
          className="confetti-piece"
          style={{
            left: c.x,
            backgroundColor: c.color,
            animationDelay: `${c.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}

      {/* Hurray Text */}
      <div className="celebration-hurray">
        🎉 Yayy! First Item! 🎉
      </div>
    </>
  );
}
