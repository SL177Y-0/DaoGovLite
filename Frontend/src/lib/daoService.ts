// Define the Proposal interface
export interface Proposal {
  id: number;
  title: string;
  description: string;
  status: 'Active' | 'Pending' | 'Executed' | 'Failed' | 'Rejected';
  timeRemaining: string;
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  createdBy: string;
  createdAt: string;
}

// Mock data for proposals - used in fallback mode when not connected to blockchain
const mockProposals: Proposal[] = [
  {
    id: 1,
    title: 'Treasury allocation for Q2 development',
    description: "This proposal aims to allocate 500,000 DAO tokens from the treasury for Q2 development initiatives. The funds will be used to hire additional developers, conduct security audits, and accelerate the roadmap delivery.",
    status: 'Active',
    timeRemaining: '1d 23:47:50',
    votesFor: 1250000,
    votesAgainst: 450000,
    quorum: 2000000,
    createdBy: '0x1a2b...3c4d',
    createdAt: '2023-04-05'
  },
  {
    id: 2,
    title: 'Protocol upgrade to v2.5',
    description: "This proposal suggests upgrading our protocol to version 2.5, which includes security improvements, gas optimizations, and new features for token holders.",
    status: 'Active',
    timeRemaining: '23:47:50',
    votesFor: 980000,
    votesAgainst: 320000,
    quorum: 2000000,
    createdBy: '0x4e5f...6g7h',
    createdAt: '2023-04-06'
  },
  {
    id: 3,
    title: 'Community rewards distribution',
    description: "A proposal to distribute 200,000 DAO tokens as rewards to active community members based on their participation and contributions over the past quarter.",
    status: 'Active',
    timeRemaining: '3d 12:30:45',
    votesFor: 850000,
    votesAgainst: 150000,
    quorum: 2000000,
    createdBy: '0x8i9j...0k1l',
    createdAt: '2023-04-04'
  },
  {
    id: 4,
    title: 'Governance parameter adjustments',
    description: "This proposal seeks to adjust the governance parameters, including voting period duration, quorum requirements, and proposal threshold.",
    status: 'Executed',
    timeRemaining: '0:00:00',
    votesFor: 1800000,
    votesAgainst: 200000,
    quorum: 1500000,
    createdBy: '0x2m3n...4o5p',
    createdAt: '2023-03-28'
  },
  {
    id: 5,
    title: 'Partnership with DeFi protocol',
    description: "A strategic partnership proposal with a leading DeFi protocol to create synergies, increase liquidity, and expand the ecosystem.",
    status: 'Failed',
    timeRemaining: '0:00:00',
    votesFor: 600000,
    votesAgainst: 1400000,
    quorum: 1500000,
    createdBy: '0x6q7r...8s9t',
    createdAt: '2023-03-25'
  },
  {
    id: 6,
    title: 'Token buyback mechanism',
    description: "Implementation of a token buyback mechanism using protocol revenues to reduce supply and potentially increase token value.",
    status: 'Pending',
    timeRemaining: '5d 08:15:30',
    votesFor: 0,
    votesAgainst: 0,
    quorum: 2000000,
    createdBy: '0x0u1v...2w3x',
    createdAt: '2023-04-07'
  }
];

// The service works in two modes:
// 1. Mock mode - when blockchain is not available or user not connected
// 2. Blockchain mode - when connected to a web3 provider

// Mode detection - default to mock mode
let isBlockchainMode = false;

// Function to check if we're in blockchain mode
export const setBlockchainMode = (mode: boolean) => {
  isBlockchainMode = mode;
};

// Functions to interact with the mock data
export const getActiveProposals = () => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return [];
  }
  return mockProposals.filter(p => p.status === 'Active');
};

export const getAllProposals = () => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return [];
  }
  return mockProposals;
};

export const getProposalById = (id: number) => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return null;
  }
  return mockProposals.find(p => p.id === id);
};

// Wallet connection simulation
let isWalletConnected = false;
let currentAccount = '';

export const connectWallet = async (): Promise<{address: string, success: boolean}> => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return {
      address: "",
      success: false
    };
  }
  
  return new Promise((resolve) => {
    setTimeout(() => {
      isWalletConnected = true;
      currentAccount = '0x1234...5678';
      resolve({
        address: currentAccount,
        success: true
      });
    }, 1500);
  });
};

export const disconnectWallet = async (): Promise<boolean> => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return false;
  }
  
  return new Promise((resolve) => {
    setTimeout(() => {
      isWalletConnected = false;
      currentAccount = '';
      resolve(true);
    }, 500);
  });
};

export const getWalletStatus = () => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return {
      isConnected: false,
      account: ""
    };
  }
  
  return {
    isConnected: isWalletConnected,
    account: currentAccount
  };
};

export const getVotingPower = (): number => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return 0;
  }
  
  return isWalletConnected ? 50000 : 0;
};

// Vote on a proposal
export const voteOnProposal = async (proposalId: number, voteFor: boolean): Promise<boolean> => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return false;
  }
  
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!isWalletConnected) {
        resolve(false);
        return;
      }
      
      // In a real app, this would interact with a smart contract
      resolve(true);
    }, 2000);
  });
};

// Execute a proposal
export const executeProposal = async (proposalId: number): Promise<boolean> => {
  // If in blockchain mode, this will be handled by useWeb3 hook
  if (isBlockchainMode) {
    return false;
  }
  
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!isWalletConnected) {
        resolve(false);
        return;
      }
      
      // In a real app, this would interact with a smart contract
      resolve(true);
    }, 3000);
  });
};

const proposalStatusMap: Record<number, Proposal['status']> = {
  0: 'Pending',
  1: 'Active',
  2: 'Executed',
  3: 'Failed',
  4: 'Rejected'
};
