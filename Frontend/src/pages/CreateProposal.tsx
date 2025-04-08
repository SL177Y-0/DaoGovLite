import React, { useState } from 'react';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../hooks/use-web3';
import { useToast } from '../hooks/use-toast';

const CreateProposal = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7); // Default 7 days
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createProposal, isConnected, tokenBalance, isLoading, error } = useWeb3();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a proposal",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user has enough tokens
    if (parseFloat(tokenBalance) < 1000) {
      toast({
        title: "Insufficient tokens",
        description: "You need at least 1000 governance tokens to create a proposal",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const proposalId = await createProposal(title, description, duration);
      
      if (proposalId) {
        toast({
          title: "Proposal created",
          description: `Your proposal has been created with ID: ${proposalId}`,
        });
        
        // Reset form and redirect to proposal page
        setTitle('');
        setDescription('');
        navigate(`/proposals/${proposalId}`);
      } else {
        throw new Error("Failed to create proposal");
      }
    } catch (err: any) {
      console.error("Error creating proposal:", err);
      toast({
        title: "Failed to create proposal",
        description: err.message || "An error occurred while creating the proposal",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-6">
 
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-dao-neonPurple/20 flex items-center justify-center">
            <FileText size={24} className="text-dao-neonPurple" />
          </div>
          <h1 className="text-3xl font-syne font-bold text-white">Create Proposal</h1>
        </div>

        <div className="glassmorphism rounded-xl p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-dao-lightPurple mb-2" htmlFor="title">
                Proposal Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                className="w-full py-3 px-4 bg-dao-darkPurple/50 border border-dao-lightPurple/20 rounded-lg text-white focus-glow"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-dao-lightPurple mb-2" htmlFor="description">
                Proposal Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of your proposal"
                className="w-full py-3 px-4 bg-dao-darkPurple/50 border border-dao-lightPurple/20 rounded-lg text-white focus-glow min-h-[200px]"
                required
              />
            </div>
            
            <div className="mb-8">
              <label className="block text-dao-lightPurple mb-2" htmlFor="duration">
                Voting Duration (days)
              </label>
              <input
                id="duration"
                type="number"
                min="1"
                max="30"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full py-3 px-4 bg-dao-darkPurple/50 border border-dao-lightPurple/20 rounded-lg text-white focus-glow"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isLoading || !isConnected}
                className={`bg-gradient-to-r from-dao-neonPurple to-dao-lightBlue text-white font-medium py-3 px-8 rounded-lg hover:opacity-90 transition-all duration-300 flex items-center gap-2 ${
                  (isSubmitting || isLoading || !isConnected) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Proposal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 p-6 bg-dao-darkPurple/30 border border-dao-lightPurple/20 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Before You Submit</h3>
          <ul className="text-dao-lightPurple space-y-2">
            <li className="flex items-start gap-2">
              <div className="min-w-[6px] h-6 flex items-center">•</div>
              <div>Ensure your proposal is clear, concise and addresses a specific need</div>
            </li>
            <li className="flex items-start gap-2">
              <div className="min-w-[6px] h-6 flex items-center">•</div>
              <div>Proposals require a minimum of 1000 governance tokens to create</div>
            </li>
            <li className="flex items-start gap-2">
              <div className="min-w-[6px] h-6 flex items-center">•</div>
              <div>Voting period can be set between 1-30 days</div>
            </li>
            <li className="flex items-start gap-2">
              <div className="min-w-[6px] h-6 flex items-center">•</div>
              <div>You'll need to pay a small gas fee to submit on-chain</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateProposal;
