import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import useWeb3 from '../hooks/use-web3';
import { getContractAddress } from '../contracts/addresses';
import GovernanceTokenABI from '../contracts/GovernanceTokenABI';
import { Button } from '../components/ui/button';
import { Loader } from 'lucide-react';

const Test = () => {
  const { account, isConnected, connectWallet, tokenBalance, provider, tokenContract, forceRefresh } = useWeb3();
  const [directBalance, setDirectBalance] = useState<string>('0');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // This function tries to fetch the token balance directly using ethers.js
  const fetchBalanceDirectly = async () => {
    if (!account || !window.ethereum) return;
    
    setIsLoading(true);
    setDebugInfo('');
    
    try {
      // Get the token address from our config
      const tokenAddress = getContractAddress('GovernanceToken');
      
      // Create a completely fresh provider, bypassing any React state
      const freshProvider = new ethers.providers.Web3Provider(window.ethereum);
      const freshSigner = freshProvider.getSigner();
      
      // Create a fresh contract instance directly, not using any cached instances
      const freshContract = new ethers.Contract(tokenAddress, GovernanceTokenABI, freshSigner);
      
      // Debug info
      let info = `Token address: ${tokenAddress}\n`;
      info += `Connected account: ${account}\n`;
      
      // Try to get basic token info
      try {
        const name = await freshContract.name();
        const symbol = await freshContract.symbol();
        const totalSupply = await freshContract.totalSupply();
        info += `Token name: ${name}\n`;
        info += `Token symbol: ${symbol}\n`;
        info += `Total supply: ${ethers.utils.formatUnits(totalSupply, 18)}\n`;
      } catch (err: any) {
        info += `Error getting token info: ${err.message}\n`;
      }
      
      // Try to get token balance - using the completely fresh contract
      try {
        const balance = await freshContract.balanceOf(account);
        const formattedBalance = ethers.utils.formatUnits(balance, 18);
        setDirectBalance(formattedBalance);
        info += `Direct balance check: ${formattedBalance}\n`;
      } catch (err: any) {
        info += `Error getting balance: ${err.message}\n`;
      }
      
      // Check Web3Context token contract
      if (tokenContract) {
        info += 'Token contract from Web3Context is available\n';
        
        try {
          const contextBalance = await tokenContract.balanceOf(account);
          info += `Web3Context balance: ${ethers.utils.formatUnits(contextBalance, 18)}\n`;
        } catch (err: any) {
          info += `Error getting Web3Context balance: ${err.message}\n`;
        }
      } else {
        info += 'Token contract from Web3Context is NOT available\n';
      }
      
      setDebugInfo(info);
    } catch (err: any) {
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // This function will manually clear cache and completely reinitialize
  const hardRefresh = async () => {
    setIsLoading(true);
    try {
      // First try the forceRefresh from context
      await forceRefresh();
      
      // Wait a moment for state updates to propagate
      await new Promise(r => setTimeout(r, 1500));
      
      // After refresh, check the balance directly too
      await fetchBalanceDirectly();
      
      // If we still don't have a valid balance in context, try to force set it
      if (tokenBalance === "0" && directBalance !== "0") {
        // Try to manually update the UI by reloading the page
        window.location.reload();
      }
    } catch (err) {
      console.error("Error during refresh:", err);
      setDebugInfo(`Error during refresh: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run a check when component mounts to ensure we have correct data
  useEffect(() => {
    if (isConnected && account) {
      fetchBalanceDirectly();
    }
  }, [isConnected, account]);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Web3 Connection Test</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        {isConnected ? (
          <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
            <p><span className="font-semibold">Connected:</span> {account}</p>
          </div>
        ) : (
          <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
            <p>Not connected</p>
            <Button onClick={connectWallet} className="mt-2">Connect Wallet</Button>
          </div>
        )}
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Token Balance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <p className="text-lg font-medium">From Web3Context</p>
            <p className="text-3xl font-bold">{tokenBalance}</p>
            {tokenBalance === "0" && directBalance !== "0" && (
              <p className="text-red-500 mt-2">Balance update failed!</p>
            )}
          </div>
          
          <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <p className="text-lg font-medium">Direct Check</p>
            <p className="text-3xl font-bold">{directBalance}</p>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-4 mb-6">
        <Button 
          onClick={fetchBalanceDirectly} 
          disabled={!isConnected || isLoading}
          className="flex items-center"
        >
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Check Balance Directly
        </Button>
        
        <Button 
          onClick={hardRefresh}
          variant="destructive"
          disabled={isLoading}
          className="flex items-center"
        >
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Force Refresh
        </Button>
        
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="flex items-center"
        >
          Reload Page
        </Button>
      </div>
      
      {debugInfo && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Debug Information</h2>
          <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg whitespace-pre-wrap overflow-x-auto">
            {debugInfo}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Test; 