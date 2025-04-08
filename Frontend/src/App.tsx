import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProposalList from "./pages/ProposalList";
import ProposalDetail from "./pages/ProposalDetail";
import CreateProposal from "./pages/CreateProposal";
import Execution from "./pages/Execution";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import { Web3Provider } from "./contexts/Web3Context";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3Provider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/proposals" element={<Layout><ProposalList /></Layout>} />
            <Route path="/proposals/:id" element={<Layout><ProposalDetail /></Layout>} />
            <Route path="/create-proposal" element={<Layout><CreateProposal /></Layout>} />
            <Route path="/execution" element={<Layout><Execution /></Layout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;
