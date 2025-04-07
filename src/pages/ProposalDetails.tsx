
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Proposal, Vote } from '@/types';
import { useWallet } from '@/context/WalletContext';
import CountdownTimer from '@/components/common/CountdownTimer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

// Mock data for proposals
const mockProposals: Record<string, Proposal> = {
  "1": {
    id: "1",
    title: "Treasury allocation for Q2 development",
    description: "Allocate 500 ETH from the treasury for Q2 development activities and team expansion. This will include:\n\n- Hiring 3 additional smart contract developers\n- Security audit for the v2 protocol\n- Marketing initiatives for wider adoption\n- Community incentives program\n\nThe funds will be disbursed over a period of 3 months with monthly reports provided to the community.",
    creator: "0x1234...5678",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    endTime: Date.now() + 2 * 24 * 60 * 60 * 1000,
    status: "active",
    votesFor: 25000,
    votesAgainst: 12000,
  },
  "2": {
    id: "2",
    title: "Protocol upgrade to v2.5",
    description: "Implement protocol upgrade to version 2.5 with improved security features and gas optimizations.",
    creator: "0xabcd...efgh",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    endTime: Date.now() + 1 * 24 * 60 * 60 * 1000,
    status: "active",
    votesFor: 31000,
    votesAgainst: 15000,
  },
  "3": {
    id: "3",
    title: "Community grants program",
    description: "Establish a community grants program with 200 ETH initial funding.",
    creator: "0x7890...1234",
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
    status: "executed",
    votesFor: 45000,
    votesAgainst: 5000,
    executed: true
  },
};

// Mock user vote data
const mockVotes: Record<string, Vote> = {};

const ProposalDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { connected, address, connect } = useWallet();
  const [isVoting, setIsVoting] = useState(false);
  
  // Get proposal data
  const proposal = id ? mockProposals[id] : undefined;
  
  // Check if user has already voted
  const hasVoted = connected && address && id ? !!mockVotes[`${id}-${address}`] : false;
  
  // Format timestamp to date string
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Calculate voting percentages
  const totalVotes = proposal ? proposal.votesFor + proposal.votesAgainst : 0;
  const forPercentage = totalVotes > 0 ? (proposal!.votesFor / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal!.votesAgainst / totalVotes) * 100 : 0;
  
  // Chart data
  const chartData = [
    { name: 'For', votes: proposal?.votesFor || 0 },
    { name: 'Against', votes: proposal?.votesAgainst || 0 },
  ];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'executed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'defeated':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  
  const handleVote = async (support: boolean) => {
    if (!connected) {
      await connect();
      return;
    }
    
    setIsVoting(true);
    
    try {
      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock vote submission
      if (id && address) {
        mockVotes[`${id}-${address}`] = {
          proposalId: id,
          voter: address,
          support,
          weight: 1000, // Mock token balance
          timestamp: Date.now(),
        };
        
        // Update proposal vote count (this would be done via the blockchain in a real app)
        if (proposal) {
          if (support) {
            proposal.votesFor += 1000;
          } else {
            proposal.votesAgainst += 1000;
          }
        }
      }
      
      toast.success('Vote submitted successfully', {
        description: `You voted ${support ? 'for' : 'against'} this proposal`,
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to submit vote', {
        description: 'Please try again',
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  if (!proposal) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Proposal not found</p>
        <Link to="/proposals">
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to proposals
          </Button>
        </Link>
      </div>
    );
  }
  
  const canExecute = proposal.status === 'active' && 
                     proposal.endTime < Date.now() && 
                     proposal.votesFor > proposal.votesAgainst;
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link to="/proposals">
          <Button variant="outline" size="sm" className="border-border/50 hover:bg-background/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to proposals
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-6">
          <div className="glass-card rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <Badge variant="outline" className={`${getStatusColor(proposal.status)}`}>
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </Badge>
              <div className="text-sm text-muted-foreground">
                ID: {proposal.id}
              </div>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{proposal.title}</h1>
            
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm text-muted-foreground mb-6">
              <div>
                <div className="mb-1">Creator</div>
                <div className="font-mono">{proposal.creator}</div>
              </div>
              <div>
                <div className="mb-1">Created on</div>
                <div>{formatDate(proposal.createdAt)}</div>
              </div>
            </div>
            
            <div className="prose prose-invert max-w-none">
              {proposal.description.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
          
          {/* Execute section */}
          {canExecute && (
            <Card className="glass-card border-primary/30">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Proposal Passed</h3>
                    <p className="text-muted-foreground">
                      This proposal has passed and is ready to be executed on-chain.
                    </p>
                  </div>
                  <Link to={`/execute/${proposal.id}`}>
                    <Button className="glow-btn bg-primary text-white hover:bg-primary/80">
                      Execute Proposal
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="lg:w-80 xl:w-96 space-y-6">
          {/* Voting card */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Cast Your Vote</h3>
              
              {proposal.status === 'active' ? (
                <>
                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground mb-1">Time Remaining</div>
                    <CountdownTimer endTime={proposal.endTime} className="text-lg font-semibold" />
                  </div>
                  
                  {hasVoted ? (
                    <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg p-4 text-center">
                      You have already voted on this proposal
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex gap-2 items-center"
                        disabled={!connected || isVoting}
                        onClick={() => handleVote(true)}
                      >
                        {isVoting ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="h-5 w-5" />}
                        Vote For
                      </Button>
                      <Button 
                        className="bg-rose-600 hover:bg-rose-700 text-white flex gap-2 items-center"
                        disabled={!connected || isVoting}
                        onClick={() => handleVote(false)}
                      >
                        {isVoting ? <LoadingSpinner size="sm" /> : <XCircle className="h-5 w-5" />}
                        Vote Against
                      </Button>
                      
                      {!connected && (
                        <div className="mt-2 text-center text-sm text-muted-foreground">
                          Connect your wallet to vote
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-muted/50 text-muted-foreground rounded-lg p-4 text-center">
                  Voting {proposal.status === 'pending' ? 'has not started' : 'has ended'}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Results card */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Results</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">For</span>
                    <span className="text-sm">{forPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${forPercentage}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Against</span>
                    <span className="text-sm">{againstPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full" 
                      style={{ width: `${againstPercentage}%` }}
                    />
                  </div>
                </div>
                
                <div className="h-48 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(24, 24, 27, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                        }}
                      />
                      <Bar 
                        dataKey="votes" 
                        barSize={40} 
                        fill="url(#colorGradient)" 
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Total votes: {(totalVotes).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProposalDetails;
