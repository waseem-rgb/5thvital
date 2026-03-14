import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Booking from "./pages/Booking";
import OrderDetails from "./pages/OrderDetails";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import PackageDetails from "./pages/PackageDetails";
import CMSPage from "./pages/CMSPage";
import NotFound from "./pages/NotFound";
import { ConfigErrorBanner } from "./components/ConfigErrorBanner";
import PromoBanner from "./components/PromoBanner";
import ErrorBoundary from "./components/ErrorBoundary";
/** Redirects legacy /package/:slug to /packages/:slug */
const PackageRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/packages/${slug}`} replace />;
};

const queryClient = new QueryClient();

const App = () => {
  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PromoBanner />
            <Routes>
              <Route path="/" element={<Booking />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/order/:orderId" element={<OrderDetails />} />
              <Route path="/package/:slug" element={<PackageRedirect />} />
              <Route path="/packages/:slug" element={<PackageDetails />} />
              <Route path="/page/:slug" element={<CMSPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
