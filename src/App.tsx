
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProposalList from "./pages/ProposalList";
import ProposalDetails from "./pages/ProposalDetails";
import CreateProposal from "./pages/CreateProposal";
import ExecuteProposal from "./pages/ExecuteProposal";
import RootLayout from "./components/layout/RootLayout";

// This structure mimics Next.js routing with layouts
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/proposals" element={<ProposalList />} />
        <Route path="/proposals/:id" element={<ProposalDetails />} />
        <Route path="/create" element={<CreateProposal />} />
        <Route path="/execute/:id" element={<ExecuteProposal />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
