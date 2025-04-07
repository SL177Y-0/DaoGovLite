
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Proposal } from '@/types';

const CreateProposal = () => {
  const navigate = useNavigate();
  const { connected, connect, address } = useWallet();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected) {
      await connect();
      return;
    }
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock proposal creation
      const newProposal: Proposal = {
        id: `${Date.now()}`,
        title,
        description,
        creator: address || '0x0000',
        createdAt: Date.now(),
        endTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
        status: 'active',
        votesFor: 0,
        votesAgainst: 0,
      };
      
      // In a real app, we would persist this to the blockchain and/or Supabase
      console.log('New proposal created:', newProposal);
      
      toast.success('Proposal created successfully');
      navigate('/proposals');
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Failed to create proposal', {
        description: 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Create Proposal</h1>
      
      <Card className="glass-card max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Governance Proposal</CardTitle>
          <CardDescription>
            Create a new proposal for the DAO to vote on. Be clear and specific about what you're proposing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                className="bg-background border-border"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of your proposal"
                className="min-h-[200px] bg-background border-border"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Include all relevant details, implementation plans, and any associated costs
              </p>
            </div>
            
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full glow-btn bg-primary text-white hover:bg-primary/80"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating Proposal...
                  </>
                ) : (
                  'Submit Proposal'
                )}
              </Button>
              
              {!connected && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  You'll need to connect your wallet to submit a proposal
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProposal;
