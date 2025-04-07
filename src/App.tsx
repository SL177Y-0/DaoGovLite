
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProposalList from "./pages/ProposalList";
import ProposalDetails from "./pages/ProposalDetails";
import CreateProposal from "./pages/CreateProposal";
import ExecuteProposal from "./pages/ExecuteProposal";
import AppLayout from "./components/layout/AppLayout";
import PageLayout from "./components/layout/PageLayout";

const App = () => (
  <PageLayout>
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
    </BrowserRouter>
  </PageLayout>
);

export default App;
