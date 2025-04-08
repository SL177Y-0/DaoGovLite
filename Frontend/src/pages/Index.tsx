import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProposalCard } from '@/components/ProposalCard';
import { useWeb3 } from '@/hooks/use-web3';
import { Proposal } from '@/lib/daoService';
import logger from '@/utils/logger';

const Index = () => {
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);  // Start with false to show hero first
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  
  const { getProposals, getProposalById, isConnected } = useWeb3();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Debounced fetch function with error handling
  const fetchProposals = useCallback(async (force = false) => {
    try {
      const now = Date.now();
      // Don't fetch too frequently (at least 5 seconds between fetches unless forced)
      if (!force && now - lastFetchRef.current < 5000) {
        return;
      }
      
      lastFetchRef.current = now;
      
      // Only show loading if it's been more than 300ms and no proposals loaded yet
      const loadingTimeout = setTimeout(() => {
        if (isMountedRef.current && activeProposals.length === 0) {
          setLoading(true);
        }
      }, 300);
      
      // Get all proposal IDs
      if (!isConnected) {
        // Skip blockchain calls if not connected
        clearTimeout(loadingTimeout);
        if (isMountedRef.current) {
          setLoading(false);
          setActiveProposals([]);
        }
        return;
      }
      
      try {
        const proposalIds = await getProposals();
        
        if (!proposalIds || proposalIds.length === 0) {
          clearTimeout(loadingTimeout);
          if (isMountedRef.current) {
            setActiveProposals([]);
            setLoading(false);
            setError(null);
          }
          return;
        }
        
        // Fetch each proposal's details in batches to avoid RPC overload
        const batchSize = 3;
        const batches = [];
        
        for (let i = 0; i < proposalIds.length; i += batchSize) {
          batches.push(proposalIds.slice(i, i + batchSize));
        }
        
        const allProposals: Proposal[] = [];
        
        // Process each batch sequentially
        for (const batch of batches) {
          if (!isMountedRef.current) return; // Exit if component unmounted
          
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
        
        // Filter for active proposals only and limit to 3
        const activeProposalsList = allProposals
          .filter(p => p.status === 'Active')
          .sort((a, b) => b.id - a.id) // Sort by newest first
          .slice(0, 3); // Limit to 3 proposals
        
        clearTimeout(loadingTimeout);
        if (isMountedRef.current) {
          setActiveProposals(activeProposalsList);
          setError(null);
          setLoading(false);
        }
      } catch (error: any) {
        clearTimeout(loadingTimeout);
        logger.error("Error fetching proposals:", error);
        if (isMountedRef.current) {
          setError("Failed to load proposals");
          setLoading(false);
        }
      }
    } catch (error: any) {
      logger.error("Outer error fetching proposals:", error);
      if (isMountedRef.current) {
        setError("Failed to load proposals");
        setLoading(false);
      }
    }
  }, [getProposals, getProposalById, isConnected, activeProposals.length]);
  
  // Initial fetch and polling
  useEffect(() => {
    // Initial fetch with a slight delay to prevent immediate loading state
    const initialLoadTimeout = setTimeout(() => {
      fetchProposals(true);
    }, 1000);
    
    // Set up polling at a more reasonable interval
    const intervalId = setInterval(() => {
      fetchProposals();
    }, 15000); // Increased to 15 seconds to reduce glitching
    
    return () => {
      clearTimeout(initialLoadTimeout);
      clearInterval(intervalId);
    };
  }, [fetchProposals]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative py-20 w-full bg-gradient-to-b from-dao-neonPurple/10 to-transparent rounded-2xl overflow-hidden">
        <div className="relative container mx-auto h-full flex flex-col justify-center items-center px-4 z-10 py-16">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-syne font-bold text-center mb-6">
            <div>Decentralized</div>
            <div>Governance</div>
            <div className="gradient-text">Unleashed</div>
          </h1>
          
          <p className="text-dao-lightPurple text-center max-w-2xl mb-10 text-lg">
            Participate in transparent decision-making on the blockchain. Create, vote, and
            execute proposals with full transparency and security.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/proposals">
              <button className="glassmorphism text-white font-medium py-3 px-6 rounded-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-2">
                Browse Proposals
                <ArrowRight size={18} />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Active Proposals Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-syne font-bold text-white">Active Proposals</h2>
          <Link to="/proposals" className="text-dao-lightBlue hover:text-dao-lightPurple flex items-center gap-2 transition-colors">
            View All <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader size={32} className="text-dao-neonPurple animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => fetchProposals(true)} 
              className="text-dao-lightBlue hover:text-dao-neonPurple underline"
            >
              Try Again
            </button>
          </div>
        ) : activeProposals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProposals.map((proposal) => (
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
          <div className="text-center py-8">
            <p className="text-dao-lightPurple text-lg">No active proposals found</p>
            <Link to="/create-proposal">
              <button className="mt-4 bg-dao-neonPurple text-white font-medium py-2 px-6 rounded-lg hover:bg-dao-neonPurple/80 transition-colors duration-300">
                Create New Proposal
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
