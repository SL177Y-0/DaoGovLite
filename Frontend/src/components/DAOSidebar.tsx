import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, Home, FileText, Plus, BarChart, Wallet, LogOut } from 'lucide-react';
import { cn, formatAddress } from '../lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../hooks/use-web3';

type SidebarLinkProps = {
  icon: React.ReactNode;
  text: string;
  href: string;
  isExpanded: boolean;
  isActive?: boolean;
};

const SidebarLink = ({ icon, text, href, isExpanded, isActive = false }: SidebarLinkProps) => {
  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300',
        isActive 
          ? 'bg-dao-neonPurple/20 text-white border-l-2 border-dao-neonPurple' 
          : 'text-gray-300 hover:bg-dao-darkPurple/30 hover:text-white'
      )}
    >
      <div className={cn(
        "transition-colors duration-300",
        isActive ? "text-dao-neonPurple" : "text-dao-lightBlue"
      )}>
        {icon}
      </div>
      {isExpanded && (
        <span className={cn(
          'transition-opacity duration-300 whitespace-nowrap',
          isExpanded ? 'opacity-100' : 'opacity-0'
        )}>
          {text}
        </span>
      )}
    </Link>
  );
};

// Memoize the wallet button to prevent unnecessary re-renders
const WalletButton = React.memo(({ 
  isConnected, 
  isLoading, 
  account, 
  tokenBalance, 
  onConnect, 
  onDisconnect, 
  isExpanded 
}: { 
  isConnected: boolean;
  isLoading: boolean;
  account: string | null;
  tokenBalance: string;
  onConnect: () => void;
  onDisconnect: () => void;
  isExpanded: boolean;
}) => {
  if (isExpanded) {
    return (
      <div className="glassmorphism p-4 rounded-lg">
        <div className="text-sm text-dao-lightPurple">Status</div>
        {isConnected && account ? (
          <>
            <div className="text-white font-medium mt-1">
              {formatAddress(account)}
            </div>
            <div className="text-dao-lightBlue text-sm mb-3">
              {parseFloat(tokenBalance).toLocaleString()} Governance Tokens
            </div>
            <button 
              onClick={onDisconnect}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md flex items-center justify-center gap-2 transition-colors duration-200 hover-glow-red"
            >
              Disconnect <LogOut size={14} />
            </button>
          </>
        ) : (
          <>
            <div className="text-white font-medium mt-1 mb-3">Wallet Not Connected</div>
            <button 
              onClick={onConnect}
              disabled={isLoading}
              className={`w-full bg-dao-neonPurple hover:bg-dao-neonPurple/80 text-white py-2 rounded-md flex items-center justify-center gap-2 transition-colors duration-200 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : 'hover-glow'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Connecting...
                </>
              ) : (
                <>
                  Connect Wallet <ChevronRight size={14} />
                </>
              )}
            </button>
          </>
        )}
      </div>
    );
  } else {
    return (
      <div className="flex justify-center">
        <button 
          onClick={isConnected ? onDisconnect : onConnect}
          className={`w-10 h-10 rounded-full ${
            isConnected 
              ? 'bg-dao-lightBlue/20 border border-dao-lightBlue/30' 
              : 'bg-dao-deepBlue hover:bg-dao-neonPurple/20 border border-dao-neonPurple/30'
          } flex items-center justify-center transition-colors duration-300`}
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-dao-neonPurple border-t-transparent rounded-full"></div>
          ) : (
            <Wallet size={18} className={isConnected ? 'text-dao-lightBlue' : 'text-dao-neonPurple'} />
          )}
        </button>
      </div>
    );
  }
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return prevProps.isConnected === nextProps.isConnected &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.account === nextProps.account &&
    prevProps.tokenBalance === nextProps.tokenBalance &&
    prevProps.isExpanded === nextProps.isExpanded;
});

// Set display name for debugging
WalletButton.displayName = 'WalletButton';

export const DAOSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isConnected, account, tokenBalance, connectWallet, disconnectWallet, isLoading } = useWeb3();
  const location = useLocation();

  // Memoized callbacks to prevent unnecessary re-renders
  const handleConnect = useCallback(() => {
    if (!isLoading) {
      connectWallet();
    }
  }, [connectWallet, isLoading]);
  
  const handleDisconnect = useCallback(() => {
    if (!isLoading) {
      disconnectWallet();
    }
  }, [disconnectWallet, isLoading]);

  // Check if a route is active
  const isRouteActive = useCallback((path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Add an effect that adjusts the main content margin when sidebar state changes
  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      // Add a small delay to make the transition smooth
      setTimeout(() => {
        mainContent.style.marginLeft = isExpanded ? '16rem' : '4rem';
        mainContent.style.transition = 'margin-left 0.3s ease';
      }, 50);
    }
    
    // Cleanup function to reset margin when component unmounts
    return () => {
      if (mainContent) {
        mainContent.style.marginLeft = '0';
      }
    };
  }, [isExpanded]);

  return (
    <div 
      className={cn(
        'h-screen fixed top-0 left-0 bg-dao-deepBlue/90 backdrop-blur-sm transition-all duration-300 border-r border-dao-neonPurple/20 z-40 hover:shadow-lg hover:shadow-dao-neonPurple/5',
        isExpanded ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          'flex items-center p-3 border-b border-dao-neonPurple/20',
          isExpanded ? 'justify-between' : 'justify-center'
        )}>
          {isExpanded && (
            <div className="flex items-center gap-2">
              <span className="font-syne font-bold text-white">DAOGovLite</span>
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-dao-lightPurple hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-dao-neonPurple/10"
          >
            <ChevronRight className={cn(
              "transition-transform duration-300",
              isExpanded ? "rotate-180" : "rotate-0"
            )} />
          </button>
        </div>

        <div className="flex flex-col flex-1 py-6 px-2 gap-2">
          <SidebarLink 
            icon={<Home size={20} />} 
            text="Home" 
            href="/" 
            isExpanded={isExpanded} 
            isActive={isRouteActive('/')}
          />
          <SidebarLink 
            icon={<FileText size={20} />} 
            text="Proposals" 
            href="/proposals" 
            isExpanded={isExpanded} 
            isActive={isRouteActive('/proposals')}
          />
          <SidebarLink 
            icon={<Plus size={20} />} 
            text="Create Proposal" 
            href="/create-proposal" 
            isExpanded={isExpanded} 
            isActive={isRouteActive('/create-proposal')}
          />
          <SidebarLink 
            icon={<BarChart size={20} />} 
            text="Execution" 
            href="/execution" 
            isExpanded={isExpanded} 
            isActive={isRouteActive('/execution')}
          />
        </div>

        <div className="mt-auto mb-6 mx-3">
          <WalletButton 
            isConnected={isConnected}
            isLoading={isLoading}
            account={account}
            tokenBalance={tokenBalance}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            isExpanded={isExpanded}
          />
        </div>
      </div>
    </div>
  );
};
