
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WalletState } from '@/types';
import { toast } from 'sonner';

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  requestAccount: () => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  address: null,
  balance: '0',
  chainId: null,
  connecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  requestAccount: async () => null,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: '0',
    chainId: null,
    connecting: false,
    error: null,
  });

  const checkIfWalletIsConnected = async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum !== 'undefined') {
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const address = accounts[0];
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const balanceHex = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest'],
          });
          
          const balance = parseInt(balanceHex, 16) / 1e18; // Convert from wei to ETH
          
          setWalletState({
            connected: true,
            address,
            balance: balance.toFixed(4),
            chainId,
            connecting: false,
            error: null,
          });
        }
      }
    } catch (error) {
      console.error('Failed to check if wallet is connected:', error);
      setWalletState(prev => ({
        ...prev,
        error: 'Failed to check wallet connection'
      }));
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();

    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          disconnect();
        } else {
          // Account changed
          checkIfWalletIsConnected();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        checkIfWalletIsConnected();
      });
    }

    return () => {
      if (window.ethereum && window.ethereum.removeAllListeners) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const connect = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        setWalletState(prev => ({ ...prev, connecting: true }));
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          await checkIfWalletIsConnected();
          toast.success('Wallet connected successfully');
        }
      } else {
        toast.error('MetaMask is not installed', {
          description: 'Please install MetaMask to use this feature',
        });
        setWalletState(prev => ({
          ...prev,
          connecting: false,
          error: 'MetaMask is not installed',
        }));
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet', {
        description: error.message || 'Please try again',
      });
      setWalletState(prev => ({
        ...prev,
        connecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  };

  const disconnect = () => {
    setWalletState({
      connected: false,
      address: null,
      balance: '0',
      chainId: null,
      connecting: false,
      error: null,
    });
    toast.info('Wallet disconnected');
  };

  const requestAccount = async (): Promise<string | null> => {
    if (!walletState.connected) {
      await connect();
    }
    return walletState.address;
  };

  return (
    <WalletContext.Provider value={{
      ...walletState,
      connect,
      disconnect,
      requestAccount,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

// Define Ethereum on Window for TypeScript
declare global {
  interface Window {
    ethereum: any;
  }
}
