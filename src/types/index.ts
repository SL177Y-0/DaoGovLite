
export type ProposalStatus = 'active' | 'pending' | 'executed' | 'defeated';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  creator: string;
  createdAt: number;
  endTime: number;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  executed?: boolean;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string;
  chainId: string | null;
  connecting: boolean;
  error: string | null;
}

export interface Vote {
  proposalId: string;
  voter: string;
  support: boolean;
  weight: number;
  timestamp: number;
}
