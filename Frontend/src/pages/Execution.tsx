import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../hooks/use-web3';
import { Proposal } from '../lib/daoService';
import '../styles/Execution.css';
import { ArrowLeft, CheckCircle, AlertTriangle, BarChart, Loader, RefreshCw } from 'lucide-react';
import logger from '../utils/logger';

const Execution: React.FC = () => {
  const { getExecutableProposals, executeProposal, isLoading, manualRefresh } = useWeb3();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const fetchProposals = async () => {
    if (!getExecutableProposals) return;
    
    try {
      setLoading(true);
      logger.debug("Fetching proposals for execution page");
      const fetchedProposals = await getExecutableProposals();
      
      const pendingProposals = fetchedProposals.filter(p => p.status === 'Pending');
      const activeProposals = fetchedProposals.filter(p => p.status === 'Active');
      
      logger.info(`Found ${pendingProposals.length} pending proposals ready for execution`);
      logger.info(`Found ${activeProposals.length} active proposals in voting period`);
      
      setProposals(fetchedProposals);
      setLastRefreshTime(new Date());
    } catch (error) {
      logger.error("Error fetching proposals for execution:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProposals();
    // No interval refresh - we'll use manual refresh instead
  }, [getExecutableProposals]);

  const handleExecute = async (proposalId: number) => {
    if (!executeProposal) return;
    
    try {
      // Find the proposal
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        logger.error(`Proposal ${proposalId} not found`);
        return;
      }
      
      // Only allow execution of proposals in Pending status
      if (proposal.status !== 'Pending') {
        logger.warn(`Cannot execute proposal ${proposalId} with status ${proposal.status}`);
        alert(`This proposal cannot be executed yet. Status: ${proposal.status}`);
        return;
      }
      
      await executeProposal(proposalId);
      // Refresh the list after execution
      fetchProposals();
    } catch (error) {
      logger.error(`Error executing proposal ${proposalId}:`, error);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    if (manualRefresh) {
      await manualRefresh();
    }
    fetchProposals();
  };

  const renderLastRefreshTime = () => {
    if (!lastRefreshTime) return null;
    
    return (
      <div className="last-refresh">
        Last updated: {lastRefreshTime.toLocaleTimeString()}
      </div>
    );
  };

  // ProposalCard component embedded directly to avoid import issues
  const ProposalCard = ({ proposal, executionView = false, votingView = false, onExecute }: {
    proposal: Proposal;
    executionView?: boolean;
    votingView?: boolean;
    onExecute?: (id: number) => void;
  }) => {
    return (
      <div className="glassmorphism rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div>
            <div className="text-dao-lightPurple text-sm">Proposal #{proposal.id}</div>
            <h3 className="text-xl font-medium text-white">{proposal.title}</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            proposal.status === 'Active' ? 'bg-blue-500/20 text-blue-400' :
            proposal.status === 'Pending' ? 'bg-green-500/20 text-green-400' : 
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {proposal.status}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-dao-lightPurple">For</div>
              <div className="text-white">{Math.round((proposal.votesFor / (proposal.votesFor + proposal.votesAgainst || 1)) * 100)}%</div>
            </div>
            <div className="w-32 h-2 bg-dao-darkPurple rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500"
                style={{ width: `${Math.round((proposal.votesFor / (proposal.votesFor + proposal.votesAgainst || 1)) * 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-dao-lightPurple">
              {proposal.votesFor.toLocaleString()}
            </div>
          </div>

          {executionView && (
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  proposal.status === 'Pending' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm text-dao-lightPurple">
                  {proposal.status === 'Pending' 
                    ? 'Ready to execute' 
                    : 'Not ready for execution'}
                </span>
              </div>
            </div>
          )}
          
          {votingView && (
            <div className="text-dao-lightPurple">
              <span className="text-sm">Time remaining: {proposal.timeRemaining}</span>
            </div>
          )}
        </div>

        {executionView && proposal.status === 'Pending' && onExecute && (
          <div className="flex justify-end">
            <button
              onClick={() => onExecute(proposal.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-dao-neonPurple text-white hover:bg-dao-neonPurple/80"
            >
              <BarChart size={16} />
              Execute
            </button>
          </div>
        )}
      </div>
    );
  };

  // LoadingSpinner component embedded directly to avoid import issues
  const LoadingSpinner = () => (
    <div className="animate-spin h-8 w-8 border-2 border-dao-neonPurple border-t-transparent rounded-full"></div>
  );

  return (
    <div className="execution-container">
      <div className="execution-header">
        <h1>Execute Proposals</h1>
       
        {renderLastRefreshTime()}
      </div>
      
      {loading && !proposals.length ? (
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading proposals...</p>
        </div>
      ) : (
        <>
          {proposals.length > 0 ? (
            <div className="proposals-section">
              {proposals.some(p => p.status === 'Pending') && (
                <section className="pending-proposals">
                  <h2>Ready for Execution</h2>
                  <div className="proposals-grid">
                    {proposals
                      .filter(proposal => proposal.status === 'Pending')
                      .map(proposal => (
                        <ProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          onExecute={handleExecute}
                          executionView
                        />
                      ))}
                  </div>
                </section>
              )}
              
              {proposals.some(p => p.status === 'Active') && (
                <section className="active-proposals">
                  <h2>Active Voting Proposals</h2>
                  <p className="info-text">These proposals are still in the voting period and cannot be executed yet.</p>
                  <div className="proposals-grid">
                    {proposals
                      .filter(proposal => proposal.status === 'Active')
                      .map(proposal => (
                        <ProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          votingView
                        />
                      ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="no-proposals">
              <h2>No proposals available for execution</h2>
              <p>There are no proposals ready to be executed at this time.</p>
              <p>Proposals become executable after their voting period ends with more FOR votes than AGAINST votes.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Execution;
