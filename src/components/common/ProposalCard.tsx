
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Proposal } from '@/types';
import CountdownTimer from './CountdownTimer';

interface ProposalCardProps {
  proposal: Proposal;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal }) => {
  const { id, title, status, endTime, votesFor, votesAgainst } = proposal;
  
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

  const totalVotes = votesFor + votesAgainst;
  const forPercentage = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
  
  return (
    <Link to={`/proposals/${id}`}>
      <Card className="glass-card h-full transition-all duration-300 hover:border-primary/50 hover:scale-[1.02]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <Badge variant="outline" className={`${getStatusColor(status)}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            <div className="text-xs text-muted-foreground">ID: {id}</div>
          </div>
          <CardTitle className="text-lg mt-2 line-clamp-2">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {status === 'active' && (
              <div className="flex flex-col gap-1">
                <div className="text-xs text-muted-foreground">Time Remaining</div>
                <CountdownTimer endTime={endTime} className="text-sm font-semibold" />
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Votes</span>
                <span>{forPercentage.toFixed(1)}% For</span>
              </div>
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full" 
                  style={{ width: `${forPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProposalCard;
