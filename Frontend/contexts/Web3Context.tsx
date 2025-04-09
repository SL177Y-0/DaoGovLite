"use client"

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { DAOGovLiteABI } from '@/lib/contracts/DAOGovLiteABI';
import { GovernanceTokenABI } from '@/lib/contracts/GovernanceTokenABI';
import { getContractAddress, DEFAULT_NETWORK, getNetworkNameFromChainId, BLOCKCHAIN_CACHE_TIMES, RPC_ENDPOINTS } from '@/lib/contracts/addresses';
import { Proposal, Web3StateType } from '@/lib/types';
import { calculateTimeRemaining, formatAddress, getProposalStatus } from '@/lib/utils';

// Extend Window type to include ethereum property
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextProps extends Web3StateType {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  getProposals: () => Promise<number[]>;
  getProposalById: (id: number) => Promise<Proposal | null>;
  createProposal: (title: string, description: string, duration: number) => Promise<number | null>;
  voteOnProposal: (proposalId: number, voteFor: boolean) => Promise<boolean>;
  executeProposal: (proposalId: number) => Promise<boolean>;
  getVoteInfo: (proposalId: number) => Promise<{ hasVoted: boolean; support: boolean | null; votingPower: number }>;
}

// Create the context with default values
export const Web3Context = createContext<Web3ContextProps>({
  account: null,
  chainId: null,
  isConnected: false,
  provider: null,
  daoContract: null,
  tokenContract: null,
  tokenBalance: '0',
  isLoading: false,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  getProposals: async () => [],
  getProposalById: async () => null,
  createProposal: async () => null,
  voteOnProposal: async () => false,
  executeProposal: async () => false,
  getVoteInfo: async () => ({ hasVoted: false, support: null, votingPower: 0 }),
});

// Cache for responses to minimize RPC calls
interface CacheEntry {
  value: any;
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheEntry;
}

const cache: CacheStore = {};

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<Web3StateType>({
    account: null,
    chainId: null,
    isConnected: false,
    provider: null,
    daoContract: null,
    tokenContract: null,
    tokenBalance: '0',
    isLoading: false,
  });

  // Initialize provider and contracts
  const initializeProviderAndContracts = useCallback(async () => {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      // Use a fallback provider for read-only operations if MetaMask is not available
      let ethersProvider;
      let signer = null;
      let account = null;
      
      if (window.ethereum) {
        ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts', // This doesn't prompt, just checks if already connected
          });
          
          if (accounts && accounts.length > 0) {
            signer = ethersProvider.getSigner();
            account = accounts[0];
          }
        } catch (error) {
          console.log('No connected accounts:', error);
        }
      } else {
        // Fallback to a public RPC for read-only operations
        const fallbackNetwork = DEFAULT_NETWORK;
        const fallbackRPC = RPC_ENDPOINTS[fallbackNetwork];
        ethersProvider = new ethers.providers.JsonRpcProvider(fallbackRPC);
        console.log('Using fallback provider for read-only operations');
      }
      
      const networkInfo = await ethersProvider.getNetwork();
      const networkName = getNetworkNameFromChainId(networkInfo.chainId);
      
      const daoAddress = getContractAddress('DAOGovLite', networkName);
      const tokenAddress = getContractAddress('GovernanceToken', networkName);

      // Create contracts with signer if available, otherwise use provider for read-only
      const contractProvider = signer || ethersProvider;
      const daoContract = new ethers.Contract(daoAddress, DAOGovLiteABI, contractProvider);
      const tokenContract = new ethers.Contract(tokenAddress, GovernanceTokenABI, contractProvider);

      // Get token balance if account is available
      let tokenBalance = '0';
      if (account) {
        try {
          const balanceWei = await tokenContract.balanceOf(account);
          tokenBalance = ethers.utils.formatUnits(balanceWei, 18);
        } catch (error) {
          console.error('Error fetching token balance:', error);
        }
      }

      setState(prev => ({
        ...prev,
        provider: ethersProvider,
        daoContract,
        tokenContract,
        chainId: networkInfo.chainId,
        account,
        isConnected: !!account,
        tokenBalance,
      }));

      return {
        provider: ethersProvider,
        daoContract,
        tokenContract,
        chainId: networkInfo.chainId,
        account,
        isConnected: !!account,
        tokenBalance,
      };
    } catch (error) {
      console.error('Failed to initialize provider and contracts:', error);
      return null;
    }
  }, []);

  // Initialize on first load
  useEffect(() => {
    initializeProviderAndContracts();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setState(prev => ({
            ...prev,
            account: null,
            isConnected: false,
            tokenBalance: '0',
          }));
        } else {
          // Reinitialize with new account
          initializeProviderAndContracts();
        }
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        // Reload the page on chain change
        window.location.reload();
      });
    }
    
    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [initializeProviderAndContracts]);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this application');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request accounts from MetaMask
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const contracts = await initializeProviderAndContracts();
        
        if (contracts) {
          setState(prev => ({
            ...prev,
            account: accounts[0],
            isConnected: true,
            tokenBalance: contracts.tokenBalance,
            isLoading: false,
          }));
        }
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
    }));
    
    // Small timeout to prevent UI flickering
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        account: null,
        isConnected: false,
        tokenBalance: '0',
        isLoading: false,
      }));
    }, 500);
  };

  // Get all proposal IDs
  const getProposals = async (): Promise<number[]> => {
    if (!state.daoContract) {
      console.error('DAO contract not initialized');
      return [];
    }

    const cacheKey = 'proposals';
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < BLOCKCHAIN_CACHE_TIMES.PROPOSALS) {
      return cache[cacheKey].value;
    }

    try {
      const proposalIds = await state.daoContract.getProposals();
      const result = proposalIds.map((id: ethers.BigNumber) => id.toNumber());
      
      // Cache the result
      cache[cacheKey] = {
        value: result,
        timestamp: Date.now(),
      };
      
      return result;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  };

  // Get proposal by ID
  const getProposalById = async (id: number): Promise<Proposal | null> => {
    if (!state.daoContract) {
      console.error('DAO contract not initialized');
      return null;
    }

    const cacheKey = `proposal-${id}`;
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < BLOCKCHAIN_CACHE_TIMES.PROPOSAL_DETAILS) {
      return cache[cacheKey].value;
    }

    try {
      const proposalData = await state.daoContract.getProposal(id);
      
      const [
        proposer,
        title,
        description,
        startTime,
        endTime,
        forVotes,
        againstVotes,
        executed,
        canceled
      ] = proposalData;
      
      // Safely handle large numbers by using string conversion and Number parsing
      const endTimeValue = endTime.toNumber(); // Safe for timestamps
      const startTimeValue = startTime.toNumber(); // Safe for timestamps
      
      // Handle large vote numbers safely
      const votesForValue = parseFloat(ethers.utils.formatUnits(forVotes, 18));
      const votesAgainstValue = parseFloat(ethers.utils.formatUnits(againstVotes, 18));
      
      const status = getProposalStatus(
        endTimeValue,
        executed,
        canceled,
        // Convert back to numbers but safely for comparison only
        forVotes,
        againstVotes
      );
      
      const timeRemaining = calculateTimeRemaining(endTimeValue);
      
      const proposal: Proposal = {
        id,
        title,
        description,
        status,
        timeRemaining,
        votesFor: votesForValue,
        votesAgainst: votesAgainstValue,
        quorum: 2000000, // Hardcoded for now, can be made dynamic
        createdBy: formatAddress(proposer),
        createdAt: new Date(startTimeValue * 1000).toISOString().split('T')[0],
      };
      
      // Cache the result
      cache[cacheKey] = {
        value: proposal,
        timestamp: Date.now(),
      };
      
      return proposal;
    } catch (error) {
      console.error(`Error fetching proposal #${id}:`, error);
      return null;
    }
  };

  // Create a new proposal
  const createProposal = async (title: string, description: string, duration: number): Promise<number | null> => {
    if (!state.daoContract || !state.account) {
      console.error('DAO contract not initialized or wallet not connected');
      return null;
    }

    // Convert duration from days to seconds
    const durationSeconds = duration * 24 * 60 * 60;

    try {
      // Call the contract method
      const tx = await state.daoContract.createProposal(title, description, durationSeconds);
      const receipt = await tx.wait();
      
      // Get the proposal ID from events
      const event = receipt.events?.find((e: any) => e.event === 'ProposalCreated');
      if (event && event.args) {
        const proposalId = event.args.proposalId.toNumber();
        
        // Clear proposals cache to reflect new proposal
        delete cache['proposals'];
        
        return proposalId;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating proposal:', error);
      return null;
    }
  };

  // Vote on a proposal
  const voteOnProposal = async (proposalId: number, voteFor: boolean): Promise<boolean> => {
    if (!state.daoContract || !state.account) {
      console.error('DAO contract not initialized or wallet not connected');
      return false;
    }

    try {
      // Call the vote function
      const tx = await state.daoContract.vote(proposalId, voteFor);
      const receipt = await tx.wait();
      
      // Clear cache for affected proposal
      delete cache[`proposal-${proposalId}`];
      
      return receipt.status === 1;
    } catch (error) {
      console.error(`Error voting on proposal #${proposalId}:`, error);
      return false;
    }
  };

  // Execute a proposal
  const executeProposal = async (proposalId: number): Promise<boolean> => {
    if (!state.daoContract || !state.account) {
      console.error('DAO contract not initialized or wallet not connected');
      return false;
    }

    try {
      // Call the execute function
      const tx = await state.daoContract.executeProposal(proposalId);
      const receipt = await tx.wait();
      
      // Clear cache for affected proposal
      delete cache[`proposal-${proposalId}`];
      
      return receipt.status === 1;
    } catch (error) {
      console.error(`Error executing proposal #${proposalId}:`, error);
      return false;
    }
  };

  // Get vote info for a proposal
  const getVoteInfo = async (proposalId: number): Promise<{ hasVoted: boolean; support: boolean | null; votingPower: number }> => {
    if (!state.daoContract || !state.account) {
      return { hasVoted: false, support: null, votingPower: 0 };
    }

    const cacheKey = `vote-${proposalId}-${state.account}`;
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < BLOCKCHAIN_CACHE_TIMES.VOTE_STATUS) {
      return cache[cacheKey].value;
    }

    try {
      // Get if user has voted
      const hasVoted = await state.daoContract.hasVoted(proposalId, state.account);
      
      // Get user's vote if they voted
      let support = null;
      if (hasVoted) {
        const voteData = await state.daoContract.getVote(proposalId, state.account);
        support = voteData.support;
      }
      
      // Get user's voting power
      const votingPower = parseFloat(ethers.utils.formatUnits(
        await state.tokenContract.balanceOf(state.account),
        18
      ));
      
      const result = { hasVoted, support, votingPower };
      
      // Cache the result
      cache[cacheKey] = {
        value: result,
        timestamp: Date.now(),
      };
      
      return result;
    } catch (error) {
      console.error(`Error getting vote info for proposal #${proposalId}:`, error);
      return { hasVoted: false, support: null, votingPower: 0 };
    }
  };

  // Prepare context value
  const contextValue: Web3ContextProps = {
    ...state,
    connectWallet,
    disconnectWallet,
    getProposals,
    getProposalById,
    createProposal,
    voteOnProposal,
    executeProposal,
    getVoteInfo,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider; 