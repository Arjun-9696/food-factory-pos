import { useEffect, useState } from "react";
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
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar } from "@capacitor/status-bar";

const queryClient = new QueryClient();

function CapacitorInit({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setStyle({ style: "light" as any });
        StatusBar.setBackgroundColor({ color: "#ea580c" });
      } catch (e) {}
      try {
        SplashScreen.hide();
      } catch (e) {}
      
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
                <Route path="/orders" element={<OrderHistory />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/sales" element={<SalesReport />} />
                <Route path="/admin/customers" element={<Customers />} />
                <Route path="/admin/orders" element={<Orders />} />
                <Route path="/profile" element={<Profile />} />
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
