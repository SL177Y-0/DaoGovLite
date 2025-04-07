
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useWallet } from '@/context/WalletContext';
import { Wallet } from 'lucide-react';

const Header = () => {
  const { connected, address, connect, disconnect } = useWallet();
  
  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            DAOGovLite
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link to="/" className="text-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <Link to="/proposals" className="text-foreground hover:text-primary transition-colors">
            Proposals
          </Link>
          <Link to="/create" className="text-foreground hover:text-primary transition-colors">
            Create Proposal
          </Link>
        </nav>

        <div className="flex items-center">
          {connected ? (
            <div className="flex items-center">
              <span className="hidden md:inline-block mr-4 text-sm bg-secondary/50 py-1 px-3 rounded-full border border-border">
                {formatAddress(address || '')}
              </span>
              <Button
                variant="outline"
                onClick={disconnect}
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connect}
              className="glow-btn bg-primary text-white hover:bg-primary/80"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
