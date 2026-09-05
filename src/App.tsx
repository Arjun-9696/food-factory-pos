import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { LightRays } from "@/components/magicui/light-rays";
import Index from "./pages/Index";
import Login from "./pages/Login";
import OrderHistory from "./pages/OrderHistory";
import Admin from "./pages/Admin";
import SalesReport from "./pages/SalesReport";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Profile from "./pages/Profile";
import CoinWallet from "./pages/CoinWallet";
import AdminLoyalty from "./pages/AdminLoyalty";
import NotFound from "./pages/NotFound";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar } from "@capacitor/status-bar";

// Product detail page is code-split — it's a distinct landing surface.
const ProductDetail = lazy(() => import("./pages/ProductDetail"));

const queryClient = new QueryClient();

function CapacitorInit({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setStyle({ style: "light" as never });
        StatusBar.setBackgroundColor({ color: "#ea580c" });
      } catch {
        // Capacitor may not be available
      }
      try {
        SplashScreen.hide();
      } catch {
        // Capacitor may not be available
      }
      
      document.documentElement.classList.add("platform-android");
    }
  }, []);

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
        <div className="min-h-screen bg-background relative fullscreen-app no-overscroll">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <LightRays className="text-orange-500" />
          </div>

          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <CapacitorInit>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/product/:slug"
                  element={
                    <Suspense
                      fallback={
                        <div className="flex min-h-screen items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" aria-label="Loading" />
                        </div>
                      }
                    >
                      <ProductDetail />
                    </Suspense>
                  }
                />
                <Route path="/orders" element={<OrderHistory />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/sales" element={<SalesReport />} />
                <Route path="/admin/customers" element={<Customers />} />
                <Route path="/admin/orders" element={<Orders />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/account/coins" element={<CoinWallet />} />
                <Route path="/admin/loyalty" element={<AdminLoyalty />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
            </CapacitorInit>
          </BrowserRouter>
        </div>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
