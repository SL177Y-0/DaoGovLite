
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProposalList from "./pages/ProposalList";
import ProposalDetails from "./pages/ProposalDetails";
import CreateProposal from "./pages/CreateProposal";
import ExecuteProposal from "./pages/ExecuteProposal";
import { WalletProvider } from "./context/WalletContext";
import AppLayout from "./components/layout/AppLayout";
import Footer from "./components/layout/Footer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/proposals" element={<ProposalList />} />
              <Route path="/proposals/:id" element={<ProposalDetails />} />
              <Route path="/create" element={<CreateProposal />} />
              <Route path="/execute/:id" element={<ExecuteProposal />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          {/* Fixed: Removed className prop since Footer doesn't accept it */}
          <Footer />
        </BrowserRouter>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
