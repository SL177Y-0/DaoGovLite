import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Loader } from 'lucide-react';
import { ProposalCard } from '../components/ProposalCard';
import { useWeb3 } from '../hooks/use-web3';
import { Proposal } from '../lib/daoService';
import logger from '../utils/logger';

type ProposalStatus = 'All' | 'Active' | 'Pending' | 'Executed' | 'Failed';

const ProposalList = () => {
  const [statusFilter, setStatusFilter] = useState<ProposalStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track the last fetch time to prevent excessive refreshes
  const lastFetchRef = useRef<number>(0);
  
  const { getProposals, getProposalById, isLoading, rpcOverload } = useWeb3();

  // Fetch proposals with optimized batching and error handling
  useEffect(() => {
    const fetchProposals = async () => {
      const now = Date.now();
      
      // Reduce polling frequency to avoid excessive RPC calls
      // Don't refetch if less than 10 seconds have passed since last fetch
      if (now - lastFetchRef.current < 10000 && proposals.length > 0) {
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        lastFetchRef.current = now;
        
        // Get all proposal IDs
        const proposalIds = await getProposals();
        
        // Skip processing if we don't have any proposals
        if (!proposalIds || proposalIds.length === 0) {
          setProposals([]);
          return;
        }
        
        // Batch proposal detail fetching in smaller chunks to avoid RPC overload
        const batchSize = rpcOverload ? 2 : 3; // Smaller batch size to reduce RPC load
        const batches = [];
        
        for (let i = 0; i < proposalIds.length; i += batchSize) {
          batches.push(proposalIds.slice(i, i + batchSize));
        }
        
        const allProposals: Proposal[] = [];
        
        // Process each batch sequentially to prevent overwhelming the RPC
        for (const batch of batches) {
          // Add a delay between batches to reduce RPC load
          if (allProposals.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const batchResults = await Promise.all(
            batch.map(async (id) => {
              try {
                return await getProposalById(id);
              } catch (err) {
                logger.error(`Error fetching proposal ${id}:`, err);
                return null;
              }
            })
          );
          
          // Add successful results to our collection
          allProposals.push(...batchResults.filter((p): p is Proposal => p !== null));
        }
        
        // Update state only if we have valid data and component is still mounted
        setProposals(allProposals);
      } catch (error) {
        logger.error("Error fetching proposals:", error);
        setError("Failed to load proposals. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProposals();
    
    // Set up a less aggressive polling interval
    const intervalId = setInterval(() => {
      fetchProposals();
    }, 15000); // Poll every 15 seconds instead of more frequently
    
    return () => clearInterval(intervalId);
  }, [getProposals, getProposalById, rpcOverload]);

  // Filter proposals based on status and search query
  const filteredProposals = proposals.filter(proposal => {
    const matchesStatus = statusFilter === 'All' || proposal.status === statusFilter;
    const matchesSearch = proposal.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-syne font-bold text-white mb-12">Proposals</h1>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-10">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-dao-lightPurple" />
          </div>
          <input
            type="text"
            placeholder="Search proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-3 pl-10 pr-4 bg-dao-darkPurple/30 border border-dao-lightPurple/20 rounded-lg text-white focus-glow"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-dao-lightPurple" />
          <span className="text-dao-lightPurple mr-2">Filter by:</span>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Active', 'Pending', 'Executed', 'Failed'] as ProposalStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  statusFilter === status
                    ? 'bg-dao-neonPurple text-white active-glow'
                    : 'bg-dao-darkPurple/30 text-dao-lightPurple hover:bg-dao-darkPurple hover-glow'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* RPC Overload Warning */}
      {rpcOverload && (
        <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg">
          <p className="text-yellow-400">
            High network activity detected. Data updates may be slower than usual.
          </p>
        </div>
      )}

      {/* Proposals Grid */}
      {loading || isLoading ? (
        <div className="text-center py-16 flex flex-col items-center justify-center">
          <Loader size={40} className="text-dao-neonPurple animate-spin mb-4" />
          <p className="text-dao-lightPurple text-lg">Loading proposals...</p>
        </div>
      ) : filteredProposals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProposals.map((proposal) => (
            <ProposalCard 
              key={proposal.id} 
              id={proposal.id}
              title={proposal.title}
              status={proposal.status}
              timeRemaining={proposal.timeRemaining}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-dao-lightPurple text-lg">No proposals match your filters</p>
        </div>
      )}
    </div>
  );
};

export default ProposalList;
