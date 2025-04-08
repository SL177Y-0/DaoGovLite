import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, ThumbsUp, ThumbsDown, ArrowLeft, CheckCircle, Check, Zap, AlertTriangle, Loader } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWeb3 } from '../hooks/use-web3';
import { useToast } from '../hooks/use-toast';
import { Proposal } from '../lib/daoService';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { cn } from '../lib/utils';
import { formatAddress } from '../lib/utils';
import logger from '../utils/logger';
import EventMonitor from '../utils/contractEvents';

// Update the Proposal type to include 'Rejected' status
type ProposalStatus = 'Active' | 'Pending' | 'Executed' | 'Failed' | 'Rejected';

const ProposalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const { getProposalById, executeProposal, hasVoted, account, voteOnProposal, rpcOverload, daoContract } = useWeb3();
  const { toast } = useToast();
  
  // Track if the proposal details were successfully loaded
  const [proposalLoaded, setProposalLoaded] = useState(false);
  
  // Reference to store the last fetch time to prevent excessive polling
  const lastFetchRef = useRef<number>(0);
  
  // Dynamic polling intervals based on proposal status and activity
  const getPollingInterval = useCallback(() => {
    if (rpcOverload) {
      return 15000; // 15 seconds when RPC is overloaded (reduced from 30s)
    }
    
    if (!proposal) return 5000; // 5 seconds default (reduced from 10s)
    
    switch (proposal.status) {
      case 'Active':
        if (proposal.timeRemaining && !proposal.timeRemaining.includes('d') && 
            parseInt(proposal.timeRemaining.split(':')[0]) < 10) {
          return 3000; // 3 seconds for active proposals nearing completion
        }
        return 5000; // 5 seconds for active proposals
      case 'Pending':
        return 3000; // 3 seconds for pending proposals
      case 'Executed':
      case 'Rejected':
        return 10000; // 10 seconds for completed proposals
      default:
        return 5000; // 5 seconds default
    }
  }, [proposal, rpcOverload]);
  
  // Refresh proposal data with smarter caching
  const refreshProposal = useCallback(async (forceRefresh = false) => {
    if (!id) return;
    
    const now = Date.now();
    // Reduce debounce time from 5000ms to 2000ms
    if (!forceRefresh && now - lastFetchRef.current < 2000) {
      return;
    }
    
    try {
      lastFetchRef.current = now;
      console.log(`Refreshing proposal ${id} data`);
      const proposalData = await getProposalById(parseInt(id));
      
      if (proposalData) {
        // Always update to ensure UI is in sync with blockchain state
        setProposal(proposalData);
        setProposalLoaded(true);
        setCountdown(proposalData.timeRemaining);
      }
    } catch (error) {
      logger.error("Error fetching proposal:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, getProposalById]);
  
  // Check if the user has voted - improved function with better error handling
  const checkUserVote = useCallback(async () => {
    if (!id || !account || !daoContract) {
      setUserVote(null);
      return;
    }
    
    try {
      // Get the current proposal data to check its state
      const proposalData = await getProposalById(parseInt(id));
      if (!proposalData) {
        setUserVote(null);
        return;
      }
      
      // Only perform the hasVoted check if the proposal is Active
      if (proposalData.status === 'Active') {
        // Clear any previous cached vote status to ensure fresh check
        const cacheKey = `has-voted-${id}-${account}`;
        localStorage.removeItem(cacheKey);
        
        // Log the proposal vote counts for debugging
        console.log(`Checking vote status on proposal ${id} with ${proposalData.votesFor} FOR votes and ${proposalData.votesAgainst} AGAINST votes`);
        
        // Try multiple methods with fallbacks for maximum reliability
        let voteStatus = null;
        
        // Method 1: Try callStatic for most reliable result
        try {
          voteStatus = await daoContract.callStatic.hasVoted(parseInt(id), account);
          console.log(`Vote status (callStatic) for account ${account} on proposal ${id}: ${voteStatus}`);
        } catch (staticError) {
          console.warn("Static call failed, trying direct contract call", staticError);
          
          // Method 2: Try direct contract call
          try {
            voteStatus = await daoContract.hasVoted(parseInt(id), account);
            console.log(`Vote status (direct) for account ${account} on proposal ${id}: ${voteStatus}`);
          } catch (directError) {
            console.warn("Direct call failed, trying context method", directError);
            
            // Method 3: Fall back to context method
            try {
              voteStatus = await hasVoted(parseInt(id));
              console.log(`Vote status (context) for account ${account} on proposal ${id}: ${voteStatus}`);
            } catch (contextError) {
              console.error("All vote status checks failed", contextError);
              voteStatus = null;
            }
          }
        }
        
        // Set with confidence only if we got a definitive true
        if (voteStatus === true) {
          setUserVote(true);
        } else {
          // Default to not voted if any method returned false or null
          // This allows users to vote even if there's uncertainty
          setUserVote(false);
        }
      } else {
        // Reset vote status for non-active proposals
        console.log(`Resetting vote status for proposal ${id} (status: ${proposalData.status})`);
        setUserVote(null);
      }
    } catch (error) {
      console.error("Error checking vote status:", error);
      setUserVote(null);
    }
  }, [id, account, getProposalById, daoContract, hasVoted]);
  
  // Load proposal data and set up polling
  useEffect(() => {
    // Initial load
    refreshProposal(true);
    
    // Check user vote status on load and when account changes
    if (account) {
      checkUserVote();
    }
    
    // Dynamic polling with adaptive interval
    const pollingInterval = getPollingInterval();
    const intervalId = setInterval(() => {
      refreshProposal();
      if (account) {
        checkUserVote();
      }
    }, pollingInterval);
    
    // Cleanup interval on unmount or when interval changes
    return () => clearInterval(intervalId);
  }, [refreshProposal, getPollingInterval, checkUserVote, account]);
  
  // Real-time countdown timer update
  useEffect(() => {
    if (!proposal || proposal.status !== 'Active') return;
    
    // Parse the time remaining string
    let timeRemaining = proposal.timeRemaining;
    let totalSeconds = 0;
    
    if (timeRemaining.includes('d')) {
      // Format: "Xd HH:MM:SS"
      const parts = timeRemaining.split('d ');
      const days = parseInt(parts[0]);
      const [hours, minutes, seconds] = parts[1].split(':').map(Number);
      totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    } else {
      // Format: "HH:MM:SS"
      const [hours, minutes, seconds] = timeRemaining.split(':').map(Number);
      totalSeconds = hours * 3600 + minutes * 60 + seconds;
    }
    
    if (totalSeconds <= 0) return;
    
    // Update the countdown every second
    const timer = setInterval(() => {
      totalSeconds--;
      
      if (totalSeconds <= 0) {
        clearInterval(timer);
        refreshProposal(); // Refresh when timer reaches zero
        return;
      }
      
      // Format the countdown display
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      const formattedTime = days > 0
        ? `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setCountdown(formattedTime);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [proposal, refreshProposal]);
  
  // Handle voting
  const handleVote = async (voteFor: boolean) => {
    if (!id || !account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to vote.",
        variant: "destructive"
      });
      return;
    }
    
    // First verify the user hasn't already voted using both methods for reliability
    try {
      // Get fresh vote status using the context method
      const hasVotedContextCheck = await hasVoted(parseInt(id));
      
      // Directly check with contract for verification
      let hasVotedContractCheck = false;
      try {
        hasVotedContractCheck = await daoContract?.callStatic.hasVoted(parseInt(id), account);
      } catch (contractError) {
        console.warn("Contract direct check failed, continuing with context check", contractError);
        // Fall back to the context check result if contract call fails
      }
      
      // Only consider voted if both checks confirm it
      const userHasVoted = hasVotedContextCheck || hasVotedContractCheck;
      
      if (userHasVoted) {
        toast({
          title: "Already voted",
          description: "You have already voted on this proposal.",
          variant: "destructive"
        });
        setUserVote(true);
        return;
      }
      
      // If we're here, the user hasn't voted, proceed with voting
    } catch (error) {
      console.error("Error checking vote status:", error);
      // Continue with vote attempt even if checking fails
    }
    
    setIsVoting(true);
    try {
      const success = await voteOnProposal(parseInt(id), voteFor);
      
      if (success) {
        toast({
          title: "Vote successful",
          description: `You voted ${voteFor ? 'for' : 'against'} the proposal.`
        });
        
        // Wait briefly for blockchain to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force update proposal data
        await refreshProposal(true);
        
        // Set vote status directly
        setUserVote(true);
        
        // Schedule additional refreshes to ensure UI is updated
        setTimeout(() => refreshProposal(true), 3000);
        setTimeout(() => refreshProposal(true), 6000);
        setTimeout(() => checkUserVote(), 1500);
        setTimeout(() => checkUserVote(), 4500);
      }
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Vote failed",
        description: "There was an error submitting your vote.",
        variant: "destructive"
      });
      // Reset vote status
      setUserVote(null);
    } finally {
      setIsVoting(false);
    }
  };
  
  // Handle proposal execution with retry mechanism
  const handleExecute = async () => {
    if (!id || !account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to execute this proposal.",
        variant: "destructive"
      });
      return;
    }
    
    setExecutionLoading(true);
    try {
      // Double-check proposal status before execution
      const proposalData = await getProposalById(parseInt(id));
      if (!proposalData) {
        throw new Error("Proposal not found");
      }
      
      if (proposalData.status !== 'Pending') {
        throw new Error(`Cannot execute proposal with status: ${proposalData.status}`);
      }
      
      const totalVotes = proposalData.votesFor + proposalData.votesAgainst;
      if (proposalData.votesFor <= proposalData.votesAgainst) {
        throw new Error("Proposal has not passed (more against votes than for votes)");
      }
      
      if (totalVotes < proposalData.quorum) {
        throw new Error(`Quorum not reached (${totalVotes}/${proposalData.quorum})`);
      }
      
      console.log(`Executing proposal ${id} (status: ${proposalData.status}, votes: ${proposalData.votesFor}/${totalVotes})`);
      const success = await executeProposal(parseInt(id));
      
      if (success) {
        toast({
          title: "Execution successful",
          description: "The proposal has been executed."
        });
        
        // Force update the proposal immediately after execution
        await refreshProposal(true);
        
        // Set up additional quick refresh cycles to ensure UI updates
        const quickRefreshes = [1000, 3000, 6000, 10000];
        quickRefreshes.forEach(delay => {
          setTimeout(() => refreshProposal(true), delay);
        });
      } else {
        toast({
          title: "Execution failed",
          description: "There was an error executing the proposal.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error executing proposal:", error);
      toast({
        title: "Execution failed",
        description: error.message || "There was an error executing the proposal.",
        variant: "destructive"
      });
    } finally {
      setExecutionLoading(false);
    }
  };
  
  // Add a function to verify if the proposal is executable
  const isProposalExecutable = useCallback((proposal: Proposal): boolean => {
    if (!proposal) return false;
    
    // Must be in Pending status
    if (proposal.status !== 'Pending') return false;
    
    // Must have more For votes than Against votes
    if (proposal.votesFor <= proposal.votesAgainst) return false;
    
    // Must reach quorum
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes < proposal.quorum) return false;
    
    return true;
  }, []);
  
  // Add blockchain event listeners with the improved EventMonitor
  useEffect(() => {
    if (!daoContract || !id) return;

    // Create an event monitor for this component
    const eventMonitor = new EventMonitor(daoContract);

    // Listen for proposal-related events
    const voteFilter = daoContract.filters.VoteCast(id);
    const executeFilter = daoContract.filters.ProposalExecuted(id);
    const cancelFilter = daoContract.filters.ProposalCanceled(id);

    // Add handlers for each event
    eventMonitor.addEvent(voteFilter, () => {
      console.log(`Vote cast event detected for proposal ${id}`);
      refreshProposal(true);
    }, 'VoteCast');

    eventMonitor.addEvent(executeFilter, () => {
      console.log(`Proposal ${id} executed event detected`);
      refreshProposal(true);
    }, 'ProposalExecuted');

    eventMonitor.addEvent(cancelFilter, () => {
      console.log(`Proposal ${id} canceled event detected`);
      refreshProposal(true);
    }, 'ProposalCanceled');

    // Start listening for events
    eventMonitor.startListening();

    // Clean up when component unmounts
    return () => {
      eventMonitor.cleanup();
    };
  }, [daoContract, id, refreshProposal]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-96">
        <Loader className="animate-spin text-dao-neonPurple h-12 w-12" />
      </div>
    );
  }
  
  if (!proposal) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Proposal not found. It may have been removed or never existed.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/proposals')}>
            Back to Proposals
          </Button>
        </div>
      </div>
    );
  }
  
  // Calculate progress percentages
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
  const quorumPercentage = totalVotes > 0 ? (totalVotes / proposal.quorum) * 100 : 0;
  
  // Check if proposal can be executed using the isProposalExecutable function

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Proposal Header */}
        <div className="flex justify-between items-center">
          <div>
            <Button
              variant="outline"
              onClick={() => navigate('/proposals')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Button>
            <h1 className="text-3xl font-syne font-bold text-white">{proposal.title}</h1>
            <div className="flex items-center mt-2">
              <Badge
                className={cn(
                  "px-3 py-1 text-sm rounded-full",
                  proposal.status === 'Active' ? "bg-green-500" :
                  proposal.status === 'Pending' ? "bg-yellow-500" :
                  proposal.status === 'Executed' ? "bg-blue-500" :
                  "bg-red-500"
                )}
              >
                {proposal.status}
              </Badge>
              
              {proposal.status === 'Active' && (
                <div className="ml-4 text-dao-lightPurple flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{countdown}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Proposal Details Card */}
        <Card className="bg-dao-darkBlue/50 border-dao-neonPurple/20">
          <CardHeader>
            <CardTitle className="text-white">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-dao-lightPurple whitespace-pre-wrap">{proposal.description}</p>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 text-dao-lightPurple">
              <div>Created by: <span className="text-dao-lightBlue">{formatAddress(proposal.createdBy)}</span></div>
              <div>Created on: <span className="text-white">{proposal.createdAt}</span></div>
            </div>
          </CardContent>
        </Card>
        
        {/* Voting Section */}
        <Card className="bg-dao-darkBlue/50 border-dao-neonPurple/20">
          <CardHeader>
            <CardTitle className="text-white">Voting Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* For Votes */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-dao-lightPurple">For</span>
                  <span className="text-dao-lightBlue">{proposal.votesFor.toLocaleString()} votes ({forPercentage.toFixed(2)}%)</span>
              </div>
                <div className="w-full bg-dao-deepBlue rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: `${forPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Against Votes */}
                  <div>
                <div className="flex justify-between mb-1">
                  <span className="text-dao-lightPurple">Against</span>
                  <span className="text-dao-lightBlue">{proposal.votesAgainst.toLocaleString()} votes ({againstPercentage.toFixed(2)}%)</span>
                </div>
                <div className="w-full bg-dao-deepBlue rounded-full h-2.5">
                  <div 
                    className="bg-red-500 h-2.5 rounded-full" 
                    style={{ width: `${againstPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Quorum Progress */}
              <div className="mt-6">
                <div className="flex justify-between mb-1">
                  <span className="text-dao-lightPurple">Quorum Progress</span>
                  <span className="text-dao-lightBlue">{totalVotes.toLocaleString()} / {proposal.quorum.toLocaleString()} ({quorumPercentage.toFixed(2)}%)</span>
                </div>
                <div className="w-full bg-dao-deepBlue rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${quorumPercentage > 100 ? 100 : quorumPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Voting Controls */}
            {proposal.status === 'Active' && account && (
              <div className="mt-6">
                <h3 className="text-white font-semibold mb-3">Cast Your Vote</h3>
                
                {userVote === null || userVote === false ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => handleVote(true)}
                      className="bg-green-500 hover:bg-green-600 text-white"
                      disabled={isVoting}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Vote For
                    </Button>
                    <Button 
                      onClick={() => handleVote(false)}
                      className="bg-red-500 hover:bg-red-600 text-white"
                      disabled={isVoting}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Vote Against
                    </Button>
                    {isVoting && <span className="text-dao-lightPurple animate-pulse">Processing vote...</span>}
                  </div>
                ) : (
                  <div className="text-green-500 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>You have already voted on this proposal</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Execution Button (If Conditions Met) */}
            {isProposalExecutable(proposal) && account && (
              <div className="mt-6">
                <Alert className="mb-4 bg-yellow-500/20 border-yellow-500">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <AlertTitle>Ready for Execution</AlertTitle>
                  <AlertDescription>
                    This proposal has passed and reached quorum. It can now be executed.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleExecute}
                  className="bg-dao-neonPurple hover:bg-dao-neonPurple/80"
                  disabled={executionLoading}
                >
                  {executionLoading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Execute Proposal
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Status Information - Executed or Rejected */}
            {proposal.status === 'Executed' && (
              <div className="mt-6 text-green-500 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>This proposal has been executed successfully</span>
              </div>
            )}
            
            {proposal.status === 'Rejected' && (
              <div className="mt-6 text-red-500 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span>This proposal was rejected</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProposalDetail;