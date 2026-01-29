import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Booking from "./pages/Booking";
import OrderDetails from "./pages/OrderDetails";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import HealthPackageDetails from "./pages/HealthPackageDetails";
import NotFound from "./pages/NotFound";
import { ConfigErrorBanner } from "./components/ConfigErrorBanner";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  // Show configuration error page if Supabase env vars are missing
  if (!isSupabaseConfigured) {
    return <ConfigErrorBanner />;
  }

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
            <Route path="/" element={<Booking />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/order/:orderId" element={<OrderDetails />} />
            <Route path="/package/:slug" element={<HealthPackageDetails />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
