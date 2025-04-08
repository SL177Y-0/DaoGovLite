import React, { useState, useEffect } from 'react';
import { Wallet, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { useWeb3 } from '@/hooks/use-web3';

interface ConnectWalletButtonProps {
  onClick?: () => void;
  className?: string;
}

const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({ onClick, className = '' }) => {
  const { isConnected, account, connectWallet, disconnectWallet, isLoading, error, rpcOverload, resetCircuitBreaker } = useWeb3();
  const [isClicked, setIsClicked] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  
  // Track account changes
  useEffect(() => {
    if (account !== currentAccount) {
      setCurrentAccount(account);
    }
  }, [account, currentAccount]);
  
  const handleClick = async () => {
    // Prevent multiple rapid clicks
    if (isClicked || isLoading) return;
    
    if (onClick) {
      onClick();
    } else {
      setIsClicked(true);
      
      try {
        if (isConnected) {
          await disconnectWallet();
          
          // Force clear local metadata after disconnection
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('lastConnectedAccount');
          
          // Clear any connection attempts
          setCurrentAccount(null);
        } else {
          // Save connection intent to localStorage
          localStorage.setItem('walletConnected', 'true');
          
          // Use promise with timeout to prevent hanging
          const connectionPromise = connectWallet();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Connection timed out")), 10000)
          );
          
          await Promise.race([connectionPromise, timeoutPromise])
            .catch(err => {
              console.error("Connection error:", err);
              localStorage.removeItem('walletConnected');
            });
        }
      } catch (err) {
        console.error("Wallet operation failed:", err);
      } finally {
        // Add a small delay before allowing next click
        setTimeout(() => setIsClicked(false), 1000);
      }
    }
  };
  
  // If we're detecting an RPC overload
  if (rpcOverload) {
    return (
      <div className="flex flex-col items-center">
        <button
          onClick={resetCircuitBreaker}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 hover-glow"
        >
          <RefreshCw size={18} />
          Reset Connection
        </button>
        <div className="flex items-center text-orange-400 mt-2 text-sm">
          <AlertTriangle size={14} className="mr-1" />
          <span className="truncate max-w-[200px]">Too many MetaMask requests. Reset to continue.</span>
        </div>
      </div>
    );
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${className} bg-dao-neonPurple hover:bg-dao-neonPurple/80 text-white py-2 px-4 rounded flex items-center justify-center gap-2 transition-all ${
        isConnected ? 'bg-green-500 hover:bg-green-600' : ''
      } ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover-glow'}`}
    >
      {isLoading ? (
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
      ) : isConnected && account ? (
        <>
          <Check size={16} />
          {account.substring(0, 6)}...{account.substring(account.length - 4)}
        </>
      ) : (
        <>
          <Wallet size={16} />
          Connect Wallet
        </>
      )}
    </button>
  );
};

export default ConnectWalletButton;
