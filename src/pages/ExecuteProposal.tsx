
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Proposal } from '@/types';
import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

// Mock data for proposals
const mockProposals: Record<string, Proposal> = {
  "1": {
    id: "1",
    title: "Treasury allocation for Q2 development",
    description: "Allocate 500 ETH from the treasury for Q2 development activities and team expansion.",
    creator: "0x1234...5678",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
    status: "active",
    votesFor: 25000,
    votesAgainst: 12000,
  },
};

const ExecuteProposal = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { connected, connect } = useWallet();
  
  const [proposal, setProposal] = useState<Proposal | undefined>(undefined);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);
  
  useEffect(() => {
    // Get proposal data
    if (id && mockProposals[id]) {
      setProposal(mockProposals[id]);
    }
  }, [id]);
  
  const handleExecute = async () => {
    if (!connected) {
      await connect();
      return;
    }
    
    if (!proposal) return;
    
    setIsExecuting(true);
    
    try {
      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In a real app, this would send a transaction to execute the proposal on-chain
      console.log('Executing proposal:', proposal);
      
      // Update proposal status
      setProposal({
        ...proposal,
        status: 'executed',
        executed: true,
      });
      
      setIsExecuted(true);
      toast.success('Proposal executed successfully');
    } catch (error) {
      console.error('Error executing proposal:', error);
      toast.error('Failed to execute proposal', {
        description: 'Please try again',
      });
    } finally {
      setIsExecuting(false);
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
  
  const canExecute = proposal.votesFor > proposal.votesAgainst && 
                     proposal.endTime < Date.now() && 
                     !proposal.executed;
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link to={`/proposals/${id}`}>
          <Button variant="outline" size="sm" className="border-border/50 hover:bg-background/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to proposal details
          </Button>
        </Link>
      </div>
      
      <Card className="glass-card max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Execute Proposal</CardTitle>
          <CardDescription>
            This action will execute the proposal on the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="glass-card rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">{proposal.title}</h2>
              <div className="text-sm text-muted-foreground">
                ID: {proposal.id}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">Votes For</div>
                <div className="font-semibold">{proposal.votesFor.toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Votes Against</div>
                <div className="font-semibold">{proposal.votesAgainst.toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Result</div>
                <div className="font-semibold">
                  {proposal.votesFor > proposal.votesAgainst ? (
                    <span className="text-emerald-400">Passed</span>
                  ) : (
                    <span className="text-rose-400">Rejected</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              {isExecuted ? (
                <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Proposal Executed</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This proposal has been successfully executed on-chain
                  </p>
                  <Button onClick={() => navigate('/proposals')} variant="outline">
                    View All Proposals
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleExecute}
                    className="w-full glow-btn bg-primary text-white hover:bg-primary/80"
                    disabled={isExecuting || !canExecute || !connected}
                  >
                    {isExecuting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Executing Proposal...
                      </>
                    ) : (
                      'Execute Proposal'
                    )}
                  </Button>
                  
                  {!canExecute && !proposal.executed && (
                    <p className="text-center text-sm text-rose-400 mt-2">
                      This proposal cannot be executed because it did not pass the vote
                    </p>
                  )}
                  
                  {proposal.executed && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      This proposal has already been executed
                    </p>
                  )}
                  
                  {!connected && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      You need to connect your wallet to execute this proposal
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecuteProposal;
