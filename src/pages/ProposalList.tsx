
import React, { useState } from 'react';
import ProposalCard from '@/components/common/ProposalCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Proposal, ProposalStatus } from '@/types';
import { Search } from 'lucide-react';

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
  },
  {
    id: "4",
    title: "Liquidity mining rewards adjustment",
    description: "Adjust liquidity mining rewards distribution to incentivize long-term liquidity providers.",
    creator: "0xdefg...5678",
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
    endTime: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    status: "defeated",
    votesFor: 15000,
    votesAgainst: 35000,
  },
  {
    id: "5",
    title: "Governance parameter changes",
    description: "Update voting thresholds and timelock periods for more efficient governance.",
    creator: "0x2468...1357",
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    endTime: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
    status: "active",
    votesFor: 12000,
    votesAgainst: 8000,
  },
  {
    id: "6",
    title: "Partnership with DeFi protocol",
    description: "Establish strategic partnership with leading DeFi protocol to expand ecosystem.",
    creator: "0x9876...5432",
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    endTime: Date.now() + 6 * 24 * 60 * 60 * 1000, // 6 days from now
    status: "active",
    votesFor: 5000,
    votesAgainst: 1000,
  },
];

const ProposalList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');

  const filteredProposals = mockProposals.filter(proposal => {
    const matchesSearch = proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proposal.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Proposals</h1>
      
      <div className="mb-8 glass-card p-4 rounded-lg">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by title or ID"
              className="pl-10 bg-background border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ProposalStatus | 'all')}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="executed">Executed</SelectItem>
                <SelectItem value="defeated">Defeated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {filteredProposals.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredProposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No proposals found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default ProposalList;
