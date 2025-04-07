
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProposalCard from '@/components/common/ProposalCard';
import { useWallet } from '@/context/WalletContext';
import { Proposal } from '@/types';
import { ArrowRight } from 'lucide-react';

// Mock data for proposals
const mockProposals: Proposal[] = [
  {
    id: "1",
    title: "Treasury allocation for Q2 development",
    description: "Allocate 500 ETH from the treasury for Q2 development activities and team expansion.",
    creator: "0x1234...5678",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    endTime: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
    status: "active",
    votesFor: 25000,
    votesAgainst: 12000,
  },
  {
    id: "2",
    title: "Protocol upgrade to v2.5",
    description: "Implement protocol upgrade to version 2.5 with improved security features and gas optimizations.",
    creator: "0xabcd...efgh",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    endTime: Date.now() + 1 * 24 * 60 * 60 * 1000, // 1 day from now
    status: "active",
    votesFor: 31000,
    votesAgainst: 15000,
  },
  {
    id: "3",
    title: "Community grants program",
    description: "Establish a community grants program with 200 ETH initial funding.",
    creator: "0x7890...1234",
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
    endTime: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    status: "executed",
    votesFor: 45000,
    votesAgainst: 5000,
    executed: true
  }
];

const Index = () => {
  const { connected, connect } = useWallet();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-dao-gradient opacity-30"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Decentralized Governance Unleashed
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              Participate in transparent decision-making on the blockchain. Create, vote, and execute proposals with full transparency and security.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {!connected ? (
                <Button 
                  onClick={connect} 
                  className="glow-btn bg-primary/90 text-white hover:bg-primary animate-pulse-glow"
                  size="lg"
                >
                  Connect Wallet
                </Button>
              ) : (
                <Link to="/create">
                  <Button 
                    className="glow-btn bg-primary/90 text-white hover:bg-primary"
                    size="lg"
                  >
                    Create Proposal
                  </Button>
                </Link>
              )}
              <Link to="/proposals">
                <Button 
                  variant="outline" 
                  className="border-white/20 hover:bg-white/10"
                  size="lg"
                >
                  Browse Proposals
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Active Proposals Section */}
      <section className="py-16 bg-black/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Active Proposals</h2>
            <Link to="/proposals" className="text-primary hover:text-primary/80 flex items-center">
              View All <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {mockProposals.filter(p => p.status === 'active').map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Governance Made Simple</h2>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
            <div className="glass-card p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Create Proposals</h3>
              <p className="text-muted-foreground">
                Submit governance proposals with clear objectives and implementation details.
              </p>
            </div>
            <div className="glass-card p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Vote with Tokens</h3>
              <p className="text-muted-foreground">
                Cast your vote using token-weighted voting power. More tokens, more influence.
              </p>
            </div>
            <div className="glass-card p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Execute On-Chain</h3>
              <p className="text-muted-foreground">
                Approved proposals are executed transparently on the blockchain.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
