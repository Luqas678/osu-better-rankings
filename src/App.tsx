import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OsuHeader from "@/components/OsuHeader";
import ThemeToggle from "@/components/ThemeToggle";
import Index from "./pages/Index";
import Rankings from "./pages/Rankings";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <OsuHeader />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
      <ThemeToggle />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
