import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

export interface ProposalCardProps {
  id: number;
  title: string;
  status: 'Active' | 'Pending' | 'Executed' | 'Failed' | 'Rejected';
  timeRemaining: string;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  id,
  title,
  status,
  timeRemaining: initialTimeRemaining,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  
  // Update the timer locally for active proposals
  useEffect(() => {
    if (status !== 'Active') return;
    
    // Parse the time remaining string
    let totalSeconds = 0;
    
    if (initialTimeRemaining.includes('d')) {
      // Format: "Xd HH:MM:SS"
      const parts = initialTimeRemaining.split('d ');
      const days = parseInt(parts[0]);
      const [hours, minutes, seconds] = parts[1].split(':').map(Number);
      totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    } else {
      // Format: "HH:MM:SS"
      const [hours, minutes, seconds] = initialTimeRemaining.split(':').map(Number);
      totalSeconds = hours * 3600 + minutes * 60 + seconds;
    }
    
    // Update every second
    const timer = setInterval(() => {
      totalSeconds--;
      
      if (totalSeconds <= 0) {
        clearInterval(timer);
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
      
      setTimeRemaining(formattedTime);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [initialTimeRemaining, status]);
  
  return (
    <Link to={`/proposals/${id}`}>
      <div className="proposal-card h-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              status === 'Active' ? 'bg-green-500/20 text-green-400' :
              status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
              status === 'Executed' ? 'bg-dao-lightBlue/20 text-dao-lightBlue' :
              status === 'Failed' ? 'bg-red-500/20 text-red-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {status}
            </div>
            <div className="text-dao-lightPurple text-sm">
              ID: {id}
            </div>
          </div>
          
          <h3 className="text-xl font-syne font-semibold text-white mb-4 line-clamp-2">
            {title}
          </h3>
          
          <div className="flex items-center text-sm text-dao-lightPurple">
            <Clock size={14} className="mr-2" />
            <span>Time Remaining</span>
          </div>
          <div className="text-dao-lightBlue font-medium mt-1">
            {timeRemaining}
          </div>
        </div>
      </div>
    </Link>
  );
};
