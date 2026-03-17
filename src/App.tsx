import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BgmAudioProvider } from "@/components/BgmAudioProvider";
import SquirrelCursorFx from "@/components/SquirrelCursorFx";
import Index from "./pages/Index";
import TreeProfile from "./pages/TreeProfile";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();
const FOREST_BGM_AUDIO_URL = "/assets/forest-bgm.mp3";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BgmAudioProvider audioUrl={FOREST_BGM_AUDIO_URL} autoPlay>
        <SquirrelCursorFx />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tree/:treeId" element={<TreeProfile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BgmAudioProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
