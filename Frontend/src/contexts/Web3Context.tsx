import { createContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { ethers } from 'ethers';
import { Proposal } from '../lib/daoService';
import { setBlockchainMode } from '../lib/daoService';
import DAOGovLiteABI from '../contracts/DAOGovLiteABI';
import GovernanceTokenABI from '../contracts/GovernanceTokenABI';
import { getContractAddress, RPC_ENDPOINTS, DEFAULT_NETWORK, USE_CUSTOM_RPC, NETWORKS, BLOCKCHAIN_CACHE_TIMES, getNetworkNameFromChainId } from '../contracts/addresses';
import logger from '../utils/logger';

// Add throttling function to limit RPC calls
const throttle = (fn: Function, delay: number) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
  };
};

// Cache for blockchain calls to reduce redundant RPC calls
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache TTL

// Enhanced logging function for RPC interactions
const logRPCInteraction = (action: string, details: any = {}) => {
  logger.debug(`[RPC] ${action}`, { 
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Add smarter rate limiting and backoff strategies for RPC calls
const GLOBAL_RPC_LIMITS = {
  maxCallsPerSecond: 10,
  maxCallsPerMinute: 100,
  callHistory: [] as number[],
  backoffMs: 1000, // Start with 1 second backoff
};

// Track RPC call history to implement adaptive rate limiting
const trackRPCCall = () => {
  const now = Date.now();
  GLOBAL_RPC_LIMITS.callHistory.push(now);
  
  // Clean up old calls (older than 1 minute)
  GLOBAL_RPC_LIMITS.callHistory = GLOBAL_RPC_LIMITS.callHistory.filter(
    time => now - time < 60000
  );
  
  // Check if we're exceeding limits
  const callsLastSecond = GLOBAL_RPC_LIMITS.callHistory.filter(
    time => now - time < 1000
  ).length;
  
  const callsLastMinute = GLOBAL_RPC_LIMITS.callHistory.length;
  
  if (callsLastSecond > GLOBAL_RPC_LIMITS.maxCallsPerSecond) {
    // Increase backoff if we're hitting rate limits
    GLOBAL_RPC_LIMITS.backoffMs = Math.min(GLOBAL_RPC_LIMITS.backoffMs * 1.5, 10000);
    logger.warn(`Increased RPC backoff to ${GLOBAL_RPC_LIMITS.backoffMs}ms due to rate limiting`);
    return true;
  } else if (callsLastMinute > GLOBAL_RPC_LIMITS.maxCallsPerMinute) {
    // Severe rate limiting - increase backoff significantly
    GLOBAL_RPC_LIMITS.backoffMs = Math.min(GLOBAL_RPC_LIMITS.backoffMs * 2, 30000);
    logger.warn(`Severe RPC rate limiting - increased backoff to ${GLOBAL_RPC_LIMITS.backoffMs}ms`);
    return true;
  } else if (callsLastSecond < GLOBAL_RPC_LIMITS.maxCallsPerSecond / 2 && 
             callsLastMinute < GLOBAL_RPC_LIMITS.maxCallsPerMinute / 2) {
    // Gradually reduce backoff if we're well under limits
    GLOBAL_RPC_LIMITS.backoffMs = Math.max(GLOBAL_RPC_LIMITS.backoffMs * 0.9, 500);
  }
  
  return false;
};

// Enhanced throttled call function with better RPC management
const throttledCall = async <T,>(
  cacheKey: string,
  fn: () => Promise<T>,
  forceRefresh = false,
  cacheDuration = 60000
): Promise<T> => {
  const cacheItem = responseCache.get(cacheKey);
  
  // Use cache if available and not forcing refresh
  if (!forceRefresh && cacheItem && Date.now() - cacheItem.timestamp < cacheDuration) {
    return cacheItem.data as T;
  }
  
  // Check if we need to apply backoff due to rate limiting
  const isRateLimited = trackRPCCall();
  if (isRateLimited) {
    // If rate limited but we have cached data, return that instead of waiting
    if (cacheItem) {
      logger.debug(`Using expired cache for ${cacheKey} due to rate limiting`);
      return cacheItem.data as T;
    }
    
    // Otherwise apply backoff
    logger.debug(`Applying RPC backoff of ${GLOBAL_RPC_LIMITS.backoffMs}ms before call`);
    await new Promise(resolve => setTimeout(resolve, GLOBAL_RPC_LIMITS.backoffMs));
  }
  
  // Execute the actual call
  try {
    const result = await fn();
    responseCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    return result;
  } catch (error) {
    // On error, if we have cached data, return that instead
    if (cacheItem) {
      logger.warn(`Error fetching fresh data for ${cacheKey}, using cached version`, error);
      return cacheItem.data as T;
    }
    throw error;
  }
};

// Helper function to get readable error messages
const getErrorMessage = (error: any): string => {
  logger.debug("Processing error for user display", error);
  
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle MetaMask errors
  if (error?.code === 4001) {
    return "Transaction rejected by user";
  }
  
  // Handle RPC errors
  if (error?.code === 'NETWORK_ERROR') {
    return "Network connection error. Please check your internet connection";
  }
  
  // Handle common blockchain errors
  if (error?.message) {
    // Extract message from ethers error
    if (error.message.includes("execution reverted")) {
      const match = error.message.match(/reason="([^"]+)"/);
      return match ? match[1] : "Transaction reverted";
    }
    
    if (error.message.includes("insufficient funds")) {
      return "Insufficient funds for transaction";
    }
    
    return error.message;
  }
  
  return "An unknown error occurred";
};

// Helper function to standardize contract error handling
const handleContractError = (error: any, context: string): string => {
  logger.error(`Contract error in ${context}:`, error);
  
  // Check for contract not found
  if (error.message?.includes("call revert exception") || 
      error.message?.includes("invalid address") ||
      error.message?.includes("contract not deployed")) {
    return "Smart contract not found at the specified address. Please check network settings.";
  }
  
  // Check for missing function
  if (error.message?.includes("function not found") || 
      error.message?.includes("not a function") ||
      error.message?.includes("has no method")) {
    return "Contract function not available. This might be an incompatible contract.";
  }
  
  // Check for network connectivity issues
  if (error.message?.includes("network error") || 
      error.message?.includes("timeout") ||
      error.message?.includes("failed to fetch")) {
    return "Network connection error. Please check your internet connection and try again.";
  }
  
  // Check for gas-related errors
  if (error.message?.includes("gas") && error.message?.includes("limit")) {
    return "Transaction failed due to gas limits. Try again with higher gas.";
  }
  
  // Return a standardized message
  return getErrorMessage(error);
};

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  provider: ethers.providers.Web3Provider | null;
  daoContract: ethers.Contract | null;
  tokenContract: ethers.Contract | null;
  tokenBalance: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getProposals: () => Promise<number[]>;
  getProposalById: (id: number) => Promise<Proposal | null>;
  createProposal: (title: string, description: string, duration: number) => Promise<number | null>;
  voteOnProposal: (proposalId: number, voteFor: boolean) => Promise<boolean>;
  executeProposal: (proposalId: number) => Promise<boolean>;
  hasVoted: (proposalId: number, voter?: string) => Promise<boolean>;
  forceRefresh: () => Promise<void>;
  error: string | null;
  isLoading: boolean;
  getExecutableProposals?: () => Promise<Proposal[]>;
  manualRefresh?: () => Promise<void>;
}

const initialContext: Web3ContextType = {
  account: null,
  chainId: null,
  isConnected: false,
  provider: null,
  daoContract: null,
  tokenContract: null,
  tokenBalance: "0",
  connectWallet: async () => {},
  disconnectWallet: () => {},
  getProposals: async () => [],
  getProposalById: async () => null,
  createProposal: async () => null,
  voteOnProposal: async () => false,
  executeProposal: async () => false,
  hasVoted: async () => false,
  forceRefresh: async () => {},
  error: null,
  isLoading: false
};

export const Web3Context = createContext<Web3ContextType>(initialContext);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  // State declarations
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [daoContract, setDaoContract] = useState<ethers.Contract | null>(null);
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [network, setNetwork] = useState<string>(DEFAULT_NETWORK);
  const [networkChainId, setNetworkChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean>(false);
  
  // Refs for tracking connection state
  const connectionAttemptRef = useRef(0);
  const maxConnectionAttempts = 3;
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const providerInitializedRef = useRef(false);
  const connectingRef = useRef(false); // Track if connection is in progress
  const lastConnectionAttemptRef = useRef(0); // Track when last connection was attempted
  const autoConnectAttemptsRef = useRef(0); // Track auto-connect attempts
  
  // New ref to track successful proposal fetches to reduce flickering
  const successfulProposalsRef = useRef<Record<number, Proposal>>({});
  const lastFetchTimestampRef = useRef<Record<number, number>>({});
  const proposalFetchErrorsRef = useRef<Record<number, number>>({});
  // Track current proposals fetch request
  const proposalsFetchingRef = useRef(false);
  const proposalDetailsFetchingRef = useRef<Record<number, boolean>>({});
  
  // Add state for tracking refresh intervals
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds default
  
  // Add global refresh coordinator
  const lastGlobalRefreshRef = useRef<number>(Date.now());
  const refreshInProgressRef = useRef<boolean>(false);

  // Function to initialize the provider and contracts
  const initializeProvider = useCallback(async () => {
    // If provider is already initialized or we're in the process, return
    if (providerInitializedRef.current || provider) {
      logger.debug("Provider already initialized or in progress", { 
        isInitializing: providerInitializedRef.current, 
        hasProvider: !!provider 
      });
      return;
    }
    
    try {
      logger.group("Provider Initialization");
      logger.info("Starting provider initialization");
      providerInitializedRef.current = true;
      
      if (!window.ethereum) {
        logger.error("No Ethereum provider found in window.ethereum");
        throw new Error("No Ethereum provider found. Please install MetaMask.");
      }
      
      logger.debug("Provider detection successful", { 
        isMetaMask: window.ethereum.isMetaMask,
        hasMultipleProviders: !!(window.ethereum as any).providers
      });
      
      // Use a timeout to prevent hanging on RPC calls
      const timeoutPromise = new Promise((_, reject) => {
        const timeout = setTimeout(() => {
          logger.error("Provider initialization timed out");
          reject(new Error("Provider initialization timed out. Please try again."));
        }, 5000); // 5 second timeout
        
        // Clear the timeout reference when done
        return () => clearTimeout(timeout);
      });
      
      // Create a custom provider with better RPC endpoint if enabled
      let web3Provider;
      let networkData;
      
      // First get the network ID from MetaMask to determine which RPC to use
      const tempProvider = new ethers.providers.Web3Provider(window.ethereum);
      try {
        logger.debug("Requesting network information from provider");
        networkData = await Promise.race([
          tempProvider.getNetwork(),
          timeoutPromise
        ]);
        logger.info("Network data received", networkData);
      } catch (err) {
        logger.error("Error getting network from provider:", err);
        throw new Error("Failed to get network from provider");
      }
      
      // Map network ID to our network names
      let networkName = "LOCALHOST";
      if (networkData && typeof networkData === 'object') {
        const chainId = networkData.chainId;
        setNetworkChainId(chainId);
        
        if (chainId === 1) {
          networkName = "MAINNET";
        } else if (chainId === 11155111) {
          networkName = "SEPOLIA";
        } else if (chainId === 5) {
          networkName = "GOERLI";
        }
      }
      
      if (USE_CUSTOM_RPC) {
        // Use a custom JSON-RPC provider instead of MetaMask's
        const rpcUrl = RPC_ENDPOINTS[networkName];
        console.log(`Using custom RPC provider: ${rpcUrl} for network: ${networkName}`);
        
        // Create a provider with both the custom RPC and MetaMask's signer
        // Use StaticJsonRpcProvider to avoid excessive requests on each instantiation
        const customProvider = new ethers.providers.StaticJsonRpcProvider(rpcUrl);
        
        // We need to wait for it to be ready
        await customProvider.ready;
        
        // Create a Web3Provider that uses MetaMask for signing
        web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Save the provider state
        await setProviderAndInitializeContracts(web3Provider, networkName);
      } else {
        // Use the standard Web3Provider with MetaMask
        web3Provider = await Promise.race([
          new Promise<ethers.providers.Web3Provider>((resolve) => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            resolve(provider);
          }),
          timeoutPromise
        ]) as ethers.providers.Web3Provider;
        
        // Save the provider state and initialize contracts
        await setProviderAndInitializeContracts(web3Provider, networkName);
      }
    } catch (err: any) {
      console.error("Failed to initialize provider:", err);
      setError(err.message || "Failed to initialize Web3 provider");
    } finally {
      providerInitializedRef.current = false;
    }
  }, [provider]);

  // Initialize contracts based on connected network
  const initializeContracts = useCallback(async (signer: ethers.Signer, chainId: number) => {
    logger.group("Contract Initialization");
    try {
      logger.info(`Initializing contracts for network ${chainId}`);
      
      // Get network name from chain ID
      const networkName = getNetworkNameFromChainId(chainId);
      if (!networkName) {
        logger.error(`Unknown network with chain ID ${chainId}`);
        return { daoContract: null, tokenContract: null };
      }
      
      // Get contract addresses
      const daoAddress = getContractAddress("DAOGovLite", networkName);
      const tokenAddress = getContractAddress("GovernanceToken", networkName);
      
      logger.debug("Contract addresses resolved", {
        networkName,
        daoAddress,
        tokenAddress,
        chainId
      });
      
      if (!daoAddress || !tokenAddress) {
        logger.error(`Missing contract addresses for network ${networkName}`, {
          availableNetworks: Object.keys(NETWORKS),
          chainId
        });
        return { daoContract: null, tokenContract: null };
      }
      
      // Create contract instances
      logger.debug("Creating contract instances with addresses", { daoAddress, tokenAddress });
      const daoContract = new ethers.Contract(daoAddress, DAOGovLiteABI, signer);
      const tokenContract = new ethers.Contract(tokenAddress, GovernanceTokenABI, signer);
      
      // Verify contracts by checking if bytecode exists instead of calling specific methods
      try {
        logger.debug("Verifying contract bytecode existence");
        
        // Get the provider from the signer
        const provider = signer.provider;
        if (!provider) {
          throw new Error("Signer has no provider");
        }
        
        // Check if there is bytecode at the contract addresses
        const daoCode = await provider.getCode(daoAddress);
        const tokenCode = await provider.getCode(tokenAddress);
        
        if (daoCode === '0x' || daoCode === '0x0') {
          logger.error("DAO contract has no bytecode at address", { daoAddress });
          return { daoContract: null, tokenContract: null };
        }
        
        if (tokenCode === '0x' || tokenCode === '0x0') {
          logger.error("Token contract has no bytecode at address", { tokenAddress });
          return { daoContract: null, tokenContract: null };
        }
        
        logger.debug("Contract bytecode verification successful", {
          daoCodeLength: daoCode.length,
          tokenCodeLength: tokenCode.length
        });
      } catch (verificationError) {
        logger.warn("Contract verification warning - continuing anyway", verificationError);
        // Continue with initialization even if verification fails
        // The contracts might still work even if we can't verify them
      }
      
      logger.info("Contract interfaces created successfully");
      
      // Initialize blockchain mode - only if this function is available
      try {
        setBlockchainMode(true);
      } catch (e) {
        logger.debug("setBlockchainMode not available or failed", e);
      }
      
      // Return contract instances
      return { daoContract, tokenContract };
    } catch (error) {
      logger.error("Failed to initialize contracts", error);
      logger.error("Contract initialization error details", {
        errorMessage: error?.message || "Unknown error",
        errorCode: error?.code,
        chainId,
        providerInfo: signer?.provider && {
          network: (signer.provider as any)._network?.name,
          blockNumber: await (signer.provider as any).getBlockNumber().catch(() => "Unknown")
        }
      });
      return { daoContract: null, tokenContract: null };
    } finally {
      logger.groupEnd();
    }
  }, []);

  // Initialize contracts with improved error handling, retry logic
  const initializeContractsWithSigner = useCallback(async (signer: ethers.Signer, chainId: number) => {
    if (!signer || !chainId) {
      logger.warn("Cannot initialize contracts - missing signer or chainId", {
        hasSigner: !!signer,
        chainId
      });
      return { daoContract: null, tokenContract: null };
    }
    
    const MAX_INIT_RETRIES = 2;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount <= MAX_INIT_RETRIES) {
      try {
        // Create a cache key based on the signer address and chainId to avoid redundant calls
        let signerAddress;
        try {
          signerAddress = await signer.getAddress();
        } catch (e) {
          logger.warn("Failed to get signer address", e);
          signerAddress = "unknown";
        }
        
        const cacheKey = `contract-init-${signerAddress}-${chainId}`;
        
        // Define a reasonable default cache time for contract initialization (5 minutes)
        const CONTRACT_INIT_CACHE_TIME = BLOCKCHAIN_CACHE_TIMES.GLOBAL_STATE || 300000;

        // Check if we have a cached initialization result
        const cachedResult = responseCache.get(cacheKey);
        if (cachedResult && 
            Date.now() - cachedResult.timestamp < CONTRACT_INIT_CACHE_TIME && 
            cachedResult.data.daoContract && 
            cachedResult.data.tokenContract) {
          logger.debug("Using cached contract initialization", { cacheKey });
          
          const { daoContract, tokenContract } = cachedResult.data;
          
          // Update state
          setDaoContract(daoContract);
          setTokenContract(tokenContract);
          
          // Update token balance will be called after state updates
          
          return cachedResult.data;
        }
        
        if (retryCount > 0) {
          logger.debug(`Contract initialization retry attempt ${retryCount}/${MAX_INIT_RETRIES}`);
          // Add exponential backoff for retries
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
        }
        
        const { daoContract, tokenContract } = await initializeContracts(signer, chainId);
        
        // Set state only if contracts were successfully initialized
        if (daoContract && tokenContract) {
          setDaoContract(daoContract);
          setTokenContract(tokenContract);
          
          // Cache the result for future use
          responseCache.set(cacheKey, {
            data: { daoContract, tokenContract },
            timestamp: Date.now()
          });
          
          // Token balance will be updated after state updates
          
          logger.info("Contracts initialized and set to state");
          return { daoContract, tokenContract };
        } else {
          logger.warn("Contract initialization returned null contracts");
          throw new Error("Contract initialization failed - null contracts returned");
        }
      } catch (error) {
        logger.error(`Contract initialization attempt ${retryCount + 1} failed:`, error);
        lastError = error;
        retryCount++;
        
        // If this was the last retry, rethrow
        if (retryCount > MAX_INIT_RETRIES) {
          logger.error(`Contract initialization failed after ${MAX_INIT_RETRIES} retries`);
          throw error;
        }
      }
    }
    
    // This should not be reached due to the throw above, but TypeScript doesn't know that
    logger.error("Contract initialization failed - max retries exceeded");
    return { daoContract: null, tokenContract: null };
  }, [initializeContracts, setDaoContract, setTokenContract]);

  // Initialize DAO contract
  const initializeDAOContract = useCallback(async () => {
    if (!signer || !networkChainId) {
      logger.warn("Cannot initialize DAO contract - missing signer or chainId", { 
        hasSigner: !!signer, 
        chainId: networkChainId 
      });
      return null;
    }
    
    try {
      const networkName = getNetworkNameFromChainId(networkChainId);
      logger.debug("Initializing DAO contract", { networkChainId, networkName });
      
      if (!networkName) {
        logger.error("Unknown network chainId", { chainId: networkChainId });
        return null;
      }
      
      const daoAddress = getContractAddress("DAOGovLite", networkName);
      if (!daoAddress) {
        logger.error("DAO contract address not found", { networkName });
        return null;
      }
      
      logger.info("Creating DAO contract instance", { daoAddress, networkName });
      const contract = new ethers.Contract(daoAddress, DAOGovLiteABI, signer);
      setDaoContract(contract);
      return contract;
    } catch (error) {
      logger.error("Failed to initialize DAO contract", error);
      return null;
    }
  }, [signer, networkChainId]);

  // Initialize Token contract
  const initializeTokenContract = useCallback(async () => {
    if (!signer || !networkChainId) {
      logger.warn("Cannot initialize Token contract - missing signer or chainId", { 
        hasSigner: !!signer, 
        chainId: networkChainId 
      });
      return null;
    }
    
    try {
      const networkName = getNetworkNameFromChainId(networkChainId);
      logger.debug("Initializing Token contract", { networkChainId, networkName });
      
      if (!networkName) {
        logger.error("Unknown network chainId", { chainId: networkChainId });
        return null;
      }
      
      const tokenAddress = getContractAddress("GovernanceToken", networkName);
      if (!tokenAddress) {
        logger.error("Token contract address not found", { networkName });
        return null;
      }
      
      logger.info("Creating Token contract instance", { tokenAddress, networkName });
      const contract = new ethers.Contract(tokenAddress, GovernanceTokenABI, signer);
      setTokenContract(contract);
      return contract;
    } catch (error) {
      logger.error("Failed to initialize token contract", error);
      return null;
    }
  }, [signer, networkChainId]);

  // Update token balance
  const updateTokenBalance = useCallback(async () => {
    if (!tokenContract || !account) {
      logger.debug("Cannot update token balance", { 
        hasTokenContract: !!tokenContract,
        hasAccount: !!account
      });
      setTokenBalance("0");
      return "0";
    }
    
    try {
      logger.debug("Requesting token balance", { account });
      const balance = await tokenContract.balanceOf(account);
      const formattedBalance = ethers.utils.formatEther(balance);
      logger.info("Token balance updated", { 
        account, 
        rawBalance: balance.toString(), 
        formattedBalance 
      });
      setTokenBalance(formattedBalance);
      return formattedBalance;
    } catch (error) {
      logger.error("Failed to update token balance", error);
      setTokenBalance("0");
      return "0";
    }
  }, [tokenContract, account, setTokenBalance]);
  
  // Helper function to set provider and initialize contracts in one go
  const setProviderAndInitializeContracts = async (provider: ethers.providers.Web3Provider, networkName: string) => {
    // Set provider first
    setProvider(provider);
    
    // Get contract addresses
    const daoAddress = getContractAddress("DAOGovLite", networkName);
    const tokenAddress = getContractAddress("GovernanceToken", networkName);
    
    if (!daoAddress || !tokenAddress) {
      throw new Error(`Contracts not deployed on network ${networkName}`);
    }
    
    logger.debug(`Setting up contracts with addresses: DAO=${daoAddress}, Token=${tokenAddress}`);
    
    try {
      const signer = provider.getSigner();
      
      // Create contract instances
      const daoContractInstance = new ethers.Contract(
        daoAddress,
        DAOGovLiteABI,
        signer
      );
      
      const tokenContractInstance = new ethers.Contract(
        tokenAddress,
        GovernanceTokenABI,
        signer
      );
      
      logger.debug("Contract instances created");
      
      // Set contracts synchronously to avoid race conditions
      setDaoContract(daoContractInstance);
      setTokenContract(tokenContractInstance);
      
      return { daoContract: daoContractInstance, tokenContract: tokenContractInstance };
    } catch (err) {
      logger.error("Error creating contract instances:", err);
      throw new Error("Failed to initialize contracts");
    }
  };

  // Transactions helper with advanced error handling
  const handleTransaction = useCallback(async (tx: any) => {
    try {
      logger.debug("[Transaction] Waiting for confirmation...");
      const receipt = await tx.wait();
      logger.debug("[Transaction] Confirmed:", receipt);
      
      // Wait a short delay to ensure blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update balance after transaction
      if (account) {
        logger.debug("[Transaction] Updating balance after transaction");
        await updateTokenBalance();
      }
      
      return receipt;
    } catch (error) {
      logger.error("[Transaction] Error:", error);
      
      // Use our standardized error handler
      const errorMessage = handleContractError(error, 'transaction');
      setError(errorMessage);
      
      throw new Error(errorMessage);
    }
  }, [account, updateTokenBalance, setError]);

  // Connect wallet with improved error handling, retry limit, and debounce
  const connectWallet = useCallback(async () => {
    // Add debounce to prevent multiple simultaneous connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;
    const MIN_CONNECTION_INTERVAL = 2000; // 2 seconds
    
    // Skip if already connecting or connected correctly
    if (connectingRef.current) {
      logger.debug("Connect wallet skipped - already in progress");
      return;
    }
    
    // Skip if we already have a working connection
    if (connected && account && daoContract && tokenContract) {
      logger.debug("Connect wallet skipped - already connected with working contracts");
      return;
    }
    
    // Apply connection attempt debounce
    if (timeSinceLastAttempt < MIN_CONNECTION_INTERVAL) {
      logger.debug(`Connection attempt debounced (last attempt ${timeSinceLastAttempt}ms ago)`);
      return;
    }
    
    // Set flags to prevent duplicate calls
    connectingRef.current = true;
    lastConnectionAttemptRef.current = now;
    connectionAttemptRef.current += 1;
    
    // Check if we've exceeded max connection attempts
    if (connectionAttemptRef.current > maxConnectionAttempts) {
      logger.warn(`Exceeded maximum connection attempts (${maxConnectionAttempts}). Resetting counter.`);
      connectionAttemptRef.current = 1; // Reset to 1 (this current attempt)
      // Wait longer between attempts after max tries
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    logger.group("Wallet Connection Flow");
    try {
      logger.info("Connecting wallet - starting connection flow", {
        attempt: connectionAttemptRef.current,
        timestamp: new Date().toISOString()
      });
      
      if (!window.ethereum) {
        logger.error("Ethereum provider not found in browser");
        setError("MetaMask not installed. Please install MetaMask to connect.");
        return;
      }

      logger.debug("Requesting Ethereum accounts");
      setIsLoading(true);
      
      // Request account access
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      logger.debug("Sending eth_requestAccounts RPC request");
      const accounts = await provider.send("eth_requestAccounts", []);
      logger.info(`Accounts received: ${accounts.length}`, {
        firstAccount: accounts[0] ? `${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}` : 'none'
      });

      if (accounts.length === 0) {
        logger.warn("No accounts returned after connection request");
        setError("No accounts returned. Please unlock your wallet and try again.");
        setIsLoading(false);
        return;
      }

      const signer = provider.getSigner();
      const address = await signer.getAddress();
      logger.info(`Connected account address: ${address}`);
      
      // Get network information
      logger.debug("Requesting network information");
      const network = await provider.getNetwork();
      logger.info(`Connected to network ${network.name} (${network.chainId})`, {
        name: network.name,
        chainId: network.chainId,
        isSupported: [1, 5, 11155111, 31337].includes(network.chainId)
      });
      
      setAccount(address);
      setSigner(signer);
      setProvider(provider);
      setNetworkChainId(network.chainId);
      setConnected(true);
      
      // Initialize contracts with new signer
      logger.debug("Initializing contract interfaces");
      const contracts = await initializeContractsWithSigner(signer, network.chainId);
      logger.debug("Contract initialization result", {
        hasDAOContract: !!contracts?.daoContract,
        hasTokenContract: !!contracts?.tokenContract
      });
      
      // Update token balance
      logger.debug("Fetching initial token balance");
      const balance = await updateTokenBalance();
      logger.info("Initial token balance", { balance });
      
      localStorage.setItem("connected", "true");
      logger.info("Wallet connection successful", { address, chainId: network.chainId });
    } catch (error) {
      logger.error("Wallet connection failed", error);
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      connectingRef.current = false;
      logger.groupEnd();
    }
  }, [account, daoContract, tokenContract, connected, updateTokenBalance, initializeContractsWithSigner, setAccount, setSigner, setProvider, setNetworkChainId, setConnected, setError, setIsLoading, setTokenBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      // Clear MetaMask cached connection if possible
      if (window.ethereum) {
        try {
          // Try to reset connections if the method exists
          const anyEthereum = window.ethereum as any;
          if (typeof anyEthereum._handleDisconnect === 'function') {
            anyEthereum._handleDisconnect();
          }
          
          // Force disconnect via request method (standard approach)
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          }).catch(() => {
            // Ignore errors, this is just an attempt to reset
            logger.debug("Error requesting permissions during disconnect");
          });
        } catch (e) {
          logger.debug("Could not clear provider cache", e);
        }
      }
      
      // Reset all state variables
    setProvider(null);
    setAccount(null);
      setNetworkChainId(null);
    setDaoContract(null);
    setTokenContract(null);
    setTokenBalance("0");
      setConnected(false);
    setError(null);
      
      // Clear local storage to prevent auto-reconnection
      localStorage.removeItem('walletConnected');
      
      // Reset all caches
      responseCache.clear();
      
      logger.info("Wallet disconnected successfully");
      return true;
    } catch (err) {
      logger.error("Error disconnecting wallet:", err);
      return false;
    }
  }, [setProvider, setAccount, setNetworkChainId, setDaoContract, setTokenContract, setTokenBalance, setConnected, setError]);

  // Get all proposals - significantly enhanced for reliability with persistent caching
  const getProposals = useCallback(async (options: { forceRefresh?: boolean, skipRateLimit?: boolean } = {}): Promise<number[]> => {
    const { forceRefresh = false, skipRateLimit = false } = options;
    
    // Implement smart refresh coordination - wait if another refresh is in progress
    if (refreshInProgressRef.current && !forceRefresh) {
      logger.debug("Skipping proposals refresh - another refresh already in progress");
      const cachedIds = Object.keys(successfulProposalsRef.current).map(Number);
      if (cachedIds.length > 0) {
        return cachedIds;
      }
      
      // Wait for current refresh to finish before proceeding
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!refreshInProgressRef.current) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }
    
    // If already fetching, use the last result to prevent duplicate calls
    if (proposalsFetchingRef.current && !forceRefresh) {
      logger.debug("Proposals fetch already in progress, returning last known IDs");
      const cachedIds = Object.keys(successfulProposalsRef.current).map(Number);
      if (cachedIds.length > 0) {
        return cachedIds;
      }
    }
    
    // Check if we've refreshed very recently (within 10 seconds) to avoid hammering
    const now = Date.now();
    if (!forceRefresh && now - lastGlobalRefreshRef.current < 10000) {
      logger.debug(`Skipping proposals refresh - refreshed ${(now - lastGlobalRefreshRef.current) / 1000}s ago`);
      const cachedIds = Object.keys(successfulProposalsRef.current).map(Number);
      if (cachedIds.length > 0) {
        return cachedIds;
      }
    }
    
    refreshInProgressRef.current = true;
    proposalsFetchingRef.current = true;
    setIsLoading(true);
    logger.group("Retrieving Proposals");
    
    try {
      if (!daoContract) {
        logger.warn("Attempt to get proposals without initialized contract");
        setError("Contract not initialized - please connect your wallet");
        setIsLoading(false);
        proposalsFetchingRef.current = false;
        refreshInProgressRef.current = false;
        return [];
      }
      
      // Create a cache key that includes the contract address to ensure uniqueness
      const cacheKey = `all-proposals-${daoContract.address}`;
      
      // Increase cache time for proposals list to reduce RPC calls
      const PROPOSALS_CACHE_TIME = BLOCKCHAIN_CACHE_TIMES.PROPOSALS || 300000; // 5 minutes default
      
      // Check if we have a cached proposal list with a longer TTL
      const cachedProposals = responseCache.get(cacheKey);
      if (cachedProposals && 
          Date.now() - cachedProposals.timestamp < PROPOSALS_CACHE_TIME &&
          Array.isArray(cachedProposals.data) && 
          cachedProposals.data.length > 0) {
        logger.debug("Using cached proposals list", { 
          count: cachedProposals.data.length,
          cacheAge: (Date.now() - cachedProposals.timestamp) / 1000
        });
        
        proposalsFetchingRef.current = false;
        return cachedProposals.data;
      }
      
      // Add retry with exponential backoff for RPC rate limiting
      const MAX_RETRIES = 2;
      
      const getProposalsWithRetry = async (retryCount = 0): Promise<number[]> => {
        try {
          let proposals;
          // Try different methods with fallbacks
          // Method 1: Try getProposals() function
          if (typeof daoContract.getProposals === 'function') {
            try {
              logger.debug("Using getProposals() method");
              const result = await daoContract.getProposals();
              
              if (result && (Array.isArray(result) || typeof result === 'object')) {
                proposals = result;
                logger.info("Retrieved proposals using getProposals() method", {
                  count: Array.isArray(result) ? result.length : 'object'
                });
              }
            } catch (err) {
              logger.warn("Error in getProposals contract call - trying alternatives", err);
            }
          }
          
          // Method 2: Try proposalCount() + getProposal(i) for each i
          if (!proposals && typeof daoContract.proposalCount === 'function') {
            try {
              logger.debug("Using proposalCount() method");
              const count = await daoContract.proposalCount();
              const countNumber = count.toNumber ? count.toNumber() : parseInt(count.toString());
              
              logger.debug(`Found ${countNumber} proposals using proposalCount()`);
              
              if (countNumber > 0 && countNumber < 100) { // Sanity check
                const proposalIds = [];
                for (let i = 1; i <= countNumber; i++) {
                  proposalIds.push(i);
                }
                proposals = proposalIds;
                logger.info("Retrieved proposals using proposalCount() method", {
                  count: proposalIds.length
                });
              }
            } catch (err) {
              logger.warn("Error in proposalCount() call - trying next alternative", err);
            }
          }
          
          // Method 3: Try numProposals or proposalLength if they exist
          if (!proposals) {
            for (const method of ['numProposals', 'proposalLength', 'proposalsLength', 'getProposalCount']) {
              if (typeof daoContract[method] === 'function') {
                try {
                  logger.debug(`Using ${method}() method`);
                  const count = await daoContract[method]();
                  const countNumber = count.toNumber ? count.toNumber() : parseInt(count.toString());
                  
                  logger.debug(`Found ${countNumber} proposals using ${method}()`);
                  
                  if (countNumber > 0 && countNumber < 100) { // Sanity check
                    const proposalIds = [];
                    for (let i = 1; i <= countNumber; i++) {
                      proposalIds.push(i);
                    }
                    proposals = proposalIds;
                    logger.info(`Retrieved proposals using ${method}() method`, {
                      count: proposalIds.length
                    });
                    break; // Exit loop if we found a working method
                  }
                } catch (err) {
                  logger.warn(`Error in ${method}() call - continuing`, err);
                }
              }
            }
          }
          
          // Method 4: Last resort - try a fixed number of proposals (1-20)
          // This assumes proposals are numbered sequentially starting from 1
          if (!proposals) {
            logger.debug("Using fixed number fallback (1-20)");
            proposals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
            logger.info("Using fallback proposal list", { count: proposals.length });
          }
          
          // Safely map the results, handling possible non-array responses
          let proposalIds: number[] = [];
          
          if (Array.isArray(proposals)) {
            proposalIds = proposals.map((id: ethers.BigNumber | number | string) => {
              try {
                if (typeof id === 'number') return id;
                if (typeof id === 'string') return parseInt(id);
                return id.toNumber ? id.toNumber() : parseInt(id.toString());
              } catch (e) {
                logger.warn("Failed to convert proposal ID to number", { id, error: e });
                return 0; // Default value if conversion fails
              }
            }).filter(id => id > 0); // Filter out invalid IDs
          } else if (proposals && typeof proposals === 'object') {
            // Try to extract proposal IDs if the response is an object
            try {
              // Some contracts might return an object with numeric keys
              const keys = Object.keys(proposals).filter(key => /^\d+$/.test(key));
              proposalIds = keys.map(Number).filter(id => id > 0);
              
              if (proposalIds.length === 0 && proposals.length !== undefined) {
                // It might be an array-like object
                for (let i = 0; i < proposals.length; i++) {
                  if (proposals[i] !== undefined) {
                    const id = parseInt(proposals[i].toString());
                    if (!isNaN(id) && id > 0) proposalIds.push(id);
                  }
                }
              }
            } catch (e) {
              logger.warn("Failed to extract proposal IDs from object", { proposals, error: e });
            }
          }
          
          // Filter out proposalIds that we know have repeatedly failed to retrieve
          const maxFailures = 5; // Number of consecutive failures before we stop trying
          const filteredIds = proposalIds.filter(id => {
            const failures = proposalFetchErrorsRef.current[id] || 0;
            return failures < maxFailures;
          });
          
          // If filtering removed too many ids, restore them with a warning
          if (filteredIds.length < proposalIds.length / 2) {
            logger.warn("Too many proposal IDs were filtered due to fetch errors, restoring all", {
              original: proposalIds.length,
              filtered: filteredIds.length
            });
            // Reset error counters and give all proposals another chance
            proposalFetchErrorsRef.current = {};
          } else {
            proposalIds = filteredIds;
          }
          
          // Use long-lived cache for proposal IDs list to reduce RPC calls
          responseCache.set(cacheKey, {
            data: proposalIds,
            timestamp: Date.now()
          });
          
          logger.info("Proposals retrieved successfully", { count: proposalIds.length, ids: proposalIds });
          
          // Start caching individual proposals in the background (without awaiting)
          // This will reduce the flickering by pre-fetching some proposals
          if (proposalIds.length > 0) {
            // Only prefetch a few to avoid rate limits
            const idsToPrefetch = proposalIds.slice(0, 3);
            idsToPrefetch.forEach(id => {
              // Don't await, let these fetch in background
              setTimeout(() => {
                // Skip if already fetched recently
                if (lastFetchTimestampRef.current[id] && 
                    Date.now() - lastFetchTimestampRef.current[id] < 60000) {
                  return;
                }
                getProposalById(id).catch(err => {
                  logger.debug(`Background prefetch of proposal ${id} failed`, err);
                });
              }, id * 500); // Stagger requests by 500ms per ID
            });
          }
          
          return proposalIds;
        } catch (error) {
          // If it's not the final retry, wait and try again with exponential backoff
          if (retryCount < MAX_RETRIES) {
            const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s...
            logger.debug(`Retrying getProposals in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return getProposalsWithRetry(retryCount + 1);
          }
          
          // Log error details for diagnosis
          logger.error("Failed to fetch proposals after all retries", {
            error,
            retries: retryCount,
            contractAddress: daoContract.address,
            availableMethods: Object.keys(daoContract.functions)
              .filter(k => k.includes('proposal'))
          });
          
          throw error;
        }
      };
      
      // Use throttledCall with our retry function but with a much longer cache time
      const result = await throttledCall(
        cacheKey,
        getProposalsWithRetry,
        false,
        BLOCKCHAIN_CACHE_TIMES.PROPOSALS || 300000 // 5 minutes cache
      );
      
      return result;
    } catch (err: any) {
      logger.error("Error fetching proposals:", err);
      setError(err.message || "Failed to fetch proposals");
      return [];
    } finally {
      setIsLoading(false);
      logger.groupEnd();
      proposalsFetchingRef.current = false;
      refreshInProgressRef.current = false;
    }
  }, [daoContract]);

  // Get proposal by ID with improved caching, persistence, and rate limiting
  const getProposalById = useCallback(async (id: number): Promise<Proposal | null> => {
    // Check if this proposal is already being fetched to prevent duplicate requests
    if (proposalDetailsFetchingRef.current[id]) {
      logger.debug(`Proposal ${id} fetch already in progress, returning last successful result`);
      return successfulProposalsRef.current[id] || null;
    }
    
    // Return from in-memory cache for very recent fetches to prevent flickering
    const MEMORY_CACHE_TTL = 60000; // 1 minute memory cache
    if (successfulProposalsRef.current[id] && 
        lastFetchTimestampRef.current[id] && 
        Date.now() - lastFetchTimestampRef.current[id] < MEMORY_CACHE_TTL) {
      logger.debug(`Using in-memory cached proposal ${id}`, {
        ageSeconds: (Date.now() - lastFetchTimestampRef.current[id]) / 1000
      });
      return successfulProposalsRef.current[id];
    }
    
    // Mark this proposal as being fetched
    proposalDetailsFetchingRef.current[id] = true;
    
    setIsLoading(true);
    logger.group(`[Proposal] Fetching proposal ${id}`);
    
    try {
      if (!daoContract) {
        logger.warn("Attempt to get proposal without initialized contract");
        setError("Contract not initialized - please connect your wallet");
        setIsLoading(false);
        proposalDetailsFetchingRef.current[id] = false;
        return null;
      }
      
      // Enhanced contract introspection with much more detailed logging
      logger.debug("Contract state for proposal fetch:", {
        address: daoContract.address,
        provider: daoContract.provider instanceof ethers.providers.JsonRpcProvider ? 
          daoContract.provider.connection.url : 'unknown',
        signer: await daoContract.signer.getAddress().catch(() => 'unknown'),
        methods: Object.keys(daoContract.interface.functions),
        hasProposals: typeof daoContract.proposals === 'function',
        hasGetProposal: typeof daoContract.getProposal === 'function',
        hasProposal: typeof daoContract.proposal === 'function',
        hasGetProposalDetails: typeof daoContract.getProposalDetails === 'function'
      });

      // Create a cache key including ID and contract address to ensure uniqueness
      const cacheKey = `proposal-${id}-${daoContract.address}`;
      
      let proposal;
      try {
        // Add exponential backoff retry for RPC rate limiting
        const MAX_RETRIES = 2;
        const getProposalWithRetry = async (retryCount = 0): Promise<any> => {
          try {
            // Method 1: Try direct proposals mapping
            try {
              if (typeof daoContract.proposals === 'function') {
                logger.debug(`[Method 1] Trying daoContract.proposals(${id})`);
                const result = await daoContract.proposals(id);
                logger.debug(`[Method 1] Raw result:`, result);
                if (result && typeof result === 'object') {
                  // Verify we got actual data
                  if (Object.keys(result).length > 0) {
                    logger.info(`[Method 1] Successfully retrieved proposal ${id} using proposals mapping`);
                    return result;
                  }
                }
              }
            } catch (error) {
              logger.warn(`[Method 1] Error using proposals(${id}):`, error);
            }

            // Method 2: Try getProposal
            try {
              if (typeof daoContract.getProposal === 'function') {
                logger.debug(`[Method 2] Trying daoContract.getProposal(${id})`);
                const result = await daoContract.getProposal(id);
                logger.debug(`[Method 2] Raw result:`, result);
                if (result) {
                  logger.info(`[Method 2] Successfully retrieved proposal ${id} using getProposal`);
                  return result;
                }
              }
            } catch (error) {
              logger.warn(`[Method 2] Error using getProposal(${id}):`, error);
            }

            // Method 3: Try proposal
            try {
              if (typeof daoContract.proposal === 'function') {
                logger.debug(`[Method 3] Trying daoContract.proposal(${id})`);
                const result = await daoContract.proposal(id);
                logger.debug(`[Method 3] Raw result:`, result);
                if (result) {
                  logger.info(`[Method 3] Successfully retrieved proposal ${id} using proposal`);
                  return result;
                }
              }
            } catch (error) {
              logger.warn(`[Method 3] Error using proposal(${id}):`, error);
            }

            // Method 4: Try getProposalDetails
            try {
              if (typeof daoContract.getProposalDetails === 'function') {
                logger.debug(`[Method 4] Trying daoContract.getProposalDetails(${id})`);
                const result = await daoContract.getProposalDetails(id);
                logger.debug(`[Method 4] Raw result:`, result);
                if (result) {
                  logger.info(`[Method 4] Successfully retrieved proposal ${id} using getProposalDetails`);
                  return result;
                }
              }
            } catch (error) {
              logger.warn(`[Method 4] Error using getProposalDetails(${id}):`, error);
            }
            
            // Method 5: Try direct contract query (works for some contracts)
            try {
              logger.debug(`[Method 5] Trying daoContract direct query for proposal ${id}`);
              // Some contracts store proposals in a mapping at slot 0
              const result = await daoContract.functions[Object.keys(daoContract.functions)
                .find(name => name.includes('proposal') && !name.includes('(')) || 'proposals'](id);
              logger.debug(`[Method 5] Raw result:`, result);
              if (result && result.length > 0) {
                logger.info(`[Method 5] Successfully retrieved proposal ${id} using direct function call`);
                return result[0]; // Most contract functions return arrays
              }
            } catch (error) {
              logger.warn(`[Method 5] Error using direct function call for proposal ${id}:`, error);
            }

            // If we get here, all methods failed
            throw new Error(`All methods failed to retrieve proposal ${id}`);
          } catch (error) {
            // If it's not the final retry, wait and try again
            if (retryCount < MAX_RETRIES) {
              const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
              logger.debug(`Retrying getProposal for id ${id} in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              return getProposalWithRetry(retryCount + 1);
            } else {
              // Log available contract methods to help diagnose
              logger.error(`Failed to retrieve proposal ${id} after ${MAX_RETRIES} attempts`, {
                error
              });
              return null;
            }
          }
        };

        // Check for recently cached success before making new RPC call
        const cachedProposal = responseCache.get(cacheKey);
        if (cachedProposal && 
            Date.now() - cachedProposal.timestamp < BLOCKCHAIN_CACHE_TIMES.PROPOSAL_DETAILS) {
          logger.debug(`Using cached proposal ${id}`, {
            cacheAge: (Date.now() - cachedProposal.timestamp) / 1000
          });
          proposal = cachedProposal.data;
        } else {
          // If no valid cache or forcing refresh, make the actual call
          const CALL_DELAY_MS = 500; // Minimum time between proposal fetch calls
          const lastCallTime = lastFetchTimestampRef.current[id] || 0;
          
          if (Date.now() - lastCallTime < CALL_DELAY_MS) {
            // Too soon after last call, wait a bit
            const delayMs = CALL_DELAY_MS - (Date.now() - lastCallTime);
            logger.debug(`Delaying proposal ${id} fetch by ${delayMs}ms to avoid rate limits`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          // Record this fetch attempt timestamp
          lastFetchTimestampRef.current[id] = Date.now();
          
          // Make the actual call
          proposal = await throttledCall(
            cacheKey,
            () => getProposalWithRetry(),
            false,
            BLOCKCHAIN_CACHE_TIMES.PROPOSAL_DETAILS
          );
        }
      } catch (error) {
        logger.error(`Failed to fetch proposal ${id} from contract after trying all methods`, error);
        // Increment error counter for this proposal ID
        proposalFetchErrorsRef.current[id] = (proposalFetchErrorsRef.current[id] || 0) + 1;
        return null;
      }

      // If proposal is null or undefined after all attempts, return previous successful proposal if available
      if (!proposal) {
        logger.warn(`Proposal ${id} not found or returned null after trying all methods`, {
          proposalValue: proposal,
          proposalType: typeof proposal,
          contractMethods: Object.keys(daoContract.interface.functions)
        });
        
        // Increment error counter but use last successful result if available
        proposalFetchErrorsRef.current[id] = (proposalFetchErrorsRef.current[id] || 0) + 1;
        
        // If we've stored a successful result before, use that instead
        if (successfulProposalsRef.current[id]) {
          logger.debug(`Using last successful proposal ${id} to avoid flickering`);
          return successfulProposalsRef.current[id];
        }
        
        return null;
      }

      // Log the raw proposal structure
      logger.debug(`Raw proposal ${id} structure:`, {
        keys: Object.keys(proposal),
        values: Object.entries(proposal).map(([key, value]) => ({
          key,
          type: typeof value,
          value: value?.toString?.() || value
        }))
      });

      // Process the proposal data with detailed logging
      let endTime: number;
      let startTime: number = 0;
      let forVotes: string = "0";
      let againstVotes: string = "0";
      let proposer: string = "Unknown";
      let title: string = `Proposal ${id}`;
      let description: string = "No description available";
      let executed: boolean = false;
      let canceled: boolean = false;

      // Log each field extraction attempt
      logger.debug(`Processing proposal ${id} fields`, {
        hasEndTime: proposal.endTime !== undefined,
        hasDeadline: proposal.deadline !== undefined,
        hasEndBlock: proposal.endBlock !== undefined,
        hasStartTime: proposal.startTime !== undefined,
        hasCreateTime: proposal.createTime !== undefined,
        hasForVotes: proposal.forVotes !== undefined,
        hasAgainstVotes: proposal.againstVotes !== undefined
      });

      // Extract endTime with logging
      if (typeof proposal.endTime !== 'undefined') {
        try {
          endTime = proposal.endTime.toNumber();
          logger.debug(`Extracted endTime: ${endTime}`);
        } catch (e) {
          endTime = parseInt(proposal.endTime.toString());
          logger.debug(`Parsed endTime from string: ${endTime}`);
        }
      } else if (typeof proposal.deadline !== 'undefined') {
        try {
          endTime = proposal.deadline.toNumber();
          logger.debug(`Extracted deadline as endTime: ${endTime}`);
        } catch (e) {
          endTime = parseInt(proposal.deadline.toString());
          logger.debug(`Parsed deadline from string: ${endTime}`);
        }
      } else if (typeof proposal.endBlock !== 'undefined') {
        try {
          endTime = proposal.endBlock.toNumber();
          logger.debug(`Extracted endBlock as endTime: ${endTime}`);
        } catch (e) {
          endTime = parseInt(proposal.endBlock.toString());
          logger.debug(`Parsed endBlock from string: ${endTime}`);
        }
      } else {
        endTime = Math.floor(Date.now() / 1000) + 86400;
        logger.warn(`No valid end time found for proposal ${id}, using fallback: ${endTime}`);
      }

      // Extract other properties with fallbacks
      if (typeof proposal.startTime !== 'undefined') {
        try {
          startTime = proposal.startTime.toNumber();
        } catch (e) {
          startTime = parseInt(proposal.startTime.toString());
        }
      } else if (typeof proposal.createTime !== 'undefined') {
        try {
          startTime = proposal.createTime.toNumber();
        } catch (e) {
          startTime = parseInt(proposal.createTime.toString());
        }
      }
      
      // Extract vote counts
      if (typeof proposal.forVotes !== 'undefined') {
        try {
          forVotes = ethers.utils.formatUnits(proposal.forVotes || 0, 18);
        } catch (e) {
          forVotes = proposal.forVotes.toString();
        }
      }
      
      if (typeof proposal.againstVotes !== 'undefined') {
        try {
          againstVotes = ethers.utils.formatUnits(proposal.againstVotes || 0, 18);
        } catch (e) {
          againstVotes = proposal.againstVotes.toString();
        }
      }
      
      // Extract other metadata
      if (typeof proposal.proposer !== 'undefined') {
        proposer = proposal.proposer;
      } else if (typeof proposal.creator !== 'undefined') {
        proposer = proposal.creator;
      }
      
      if (typeof proposal.title !== 'undefined') {
        title = proposal.title;
      } else if (typeof proposal.description !== 'undefined' && proposal.description.includes('|')) {
        // Some contracts store title|description
        const parts = proposal.description.split('|');
        title = parts[0].trim();
        description = parts.slice(1).join('|').trim();
      }
      
      if (typeof proposal.description !== 'undefined') {
        description = proposal.description;
      }
      
      if (typeof proposal.executed !== 'undefined') {
        executed = proposal.executed;
      }
      
      if (typeof proposal.canceled !== 'undefined') {
        canceled = proposal.canceled;
      }
      
      // Calculate time remaining
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = Math.max(0, endTime - now);
      
      // Format time remaining
      const days = Math.floor(secondsRemaining / 86400);
      const hours = Math.floor((secondsRemaining % 86400) / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      const seconds = secondsRemaining % 60;
      
      const timeRemaining = 
        days > 0 
          ? `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` 
          : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Determine status - safely check for properties
      let status: 'Active' | 'Pending' | 'Executed' | 'Failed';
      
      if (executed) {
        status = 'Executed';
      } else if (canceled) {
        status = 'Failed';
      } else if (now > endTime) {
        const forVotesNum = parseFloat(forVotes);
        const againstVotesNum = parseFloat(againstVotes);
        status = forVotesNum > againstVotesNum ? 'Pending' : 'Failed';
      } else {
        status = 'Active';
      }

      // Create standardized proposal object
      const standardProposal: Proposal = {
        id,
        title,
        description,
        status,
        timeRemaining,
        votesFor: parseFloat(forVotes),
        votesAgainst: parseFloat(againstVotes),
        quorum: 2000000, // Fixed quorum for now, could be made dynamic
        createdBy: proposer,
        createdAt: startTime ? 
          new Date(startTime * 1000).toISOString().split('T')[0] :
          new Date().toISOString().split('T')[0]
      };
      
      // Store successful proposal in memory to prevent flickering
      successfulProposalsRef.current[id] = standardProposal;
      
      // Reset error counter since we successfully retrieved it
      proposalFetchErrorsRef.current[id] = 0;
      
      // Log the final processed proposal
      logger.info(`Successfully processed proposal ${id}`, {
        proposal: standardProposal,
        rawEndTime: endTime,
        rawStartTime: startTime,
        rawVotes: {
          for: forVotes,
          against: againstVotes
        }
      });

      return standardProposal;
    } catch (err: any) {
      logger.error(`Error processing proposal ${id}:`, err);
      setError(err.message || `Failed to fetch proposal ${id}`);
      
      // Use last successful result for this ID if we have one
      if (successfulProposalsRef.current[id]) {
        logger.debug(`Falling back to last successful proposal ${id} after error`);
        return successfulProposalsRef.current[id];
      }
      
      return null;
    } finally {
      setIsLoading(false);
      logger.groupEnd();
      
      // Mark this proposal as no longer being fetched
      proposalDetailsFetchingRef.current[id] = false;
    }
  }, [daoContract]);

  // Create a new proposal
  const createProposal = useCallback(async (title: string, description: string, duration: number): Promise<number | null> => {
    setIsLoading(true);
    try {
      if (!daoContract || !account) {
        throw new Error("Contract not initialized or wallet not connected");
      }
      
      // Convert duration from days to seconds
      const durationInSeconds = duration * 24 * 60 * 60;
      
      const tx = await daoContract.createProposal(title, description, durationInSeconds);
      const receipt = await tx.wait();
      
      // Find the ProposalCreated event to get the proposal ID
      const event = receipt.events?.find((e: any) => e.event === 'ProposalCreated');
      
      if (!event) {
        throw new Error("Proposal creation event not found");
      }
      
      const proposalId = event.args.proposalId.toNumber();
      
      // Clear proposal cache to ensure fresh data
      responseCache.clear();
      
      // Update token balance since creating a proposal costs tokens
      await updateTokenBalance();
      
      return proposalId;
    } catch (err: any) {
      console.error("Error creating proposal:", err);
      setError(err.message || "Failed to create proposal");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [daoContract, account, updateTokenBalance]);

  // Force refresh function to completely reset the Web3 connection
  const forceRefresh = useCallback(async () => {
    logger.debug("Force refreshing Web3 connection...");
    setIsLoading(true);
    
    try {
      // Reset all state
      setTokenContract(null);
      setDaoContract(null);
      setProvider(null);
      
      // Clear MetaMask cache if possible - using safer approach to avoid TypeScript errors
      if (window.ethereum) {
        try {
          // Use generic object access for MetaMask-specific properties
          const anyEthereum = window.ethereum as any;
          
          // Try to clear cached provider if the method exists
          if (typeof anyEthereum.clearCachedProvider === 'function') {
            anyEthereum.clearCachedProvider();
          }
          
          // Try to reset connections if the method exists
          if (typeof anyEthereum._handleDisconnect === 'function') {
            anyEthereum._handleDisconnect();
          }
          
          // Force disconnect via request method (standard approach)
          try {
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
          } catch (e) {
            // Ignore errors, this is just an attempt to reset
          }
        } catch (e) {
          logger.debug("Could not clear provider cache", e);
        }
      }
      
      // Ensure we're starting fresh
      providerInitializedRef.current = false;
      
      // Small delay to allow things to reset
      await new Promise(r => setTimeout(r, 1000));
      
      // Try to initialize everything fresh
      if (account) {
        await initializeProvider();
        
        // Force get accounts again
        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
              setAccount(accounts[0]);
              
              // If we have a provider now, check the balance with a fresh contract
              if (provider) {
                await updateTokenBalance();
              }
            }
          } catch (e) {
            logger.error("Error getting accounts during refresh:", e);
          }
        }
      }
      
      logger.debug("Force refresh completed");
    } catch (err) {
      logger.error("Error during force refresh:", err);
      setError("Failed to refresh connection. Please reload the page.");
    } finally {
      setIsLoading(false);
    }
  }, [initializeProvider, account, updateTokenBalance]);

  // Vote on a proposal
  const voteOnProposal = useCallback(async (proposalId: number, voteFor: boolean): Promise<boolean> => {
    setIsLoading(true);
    const voteStartTime = performance.now();
    logger.group(`[Vote] Proposal ${proposalId}`);
    logger.info(`Starting vote process for proposal ${proposalId}`, {
      support: voteFor,
      account,
      timestamp: new Date().toISOString()
    });
    
    try {
      if (!daoContract || !account) {
        const error = "Contract not initialized or wallet not connected";
        logger.error(`Vote failed: ${error}`, { daoContract: !!daoContract, account });
        throw new Error(error);
      }
      
      // First check if proposal exists and is active - use cache if possible
      const cacheKey = `proposal-${proposalId}`;
      const cachedProposal = responseCache.get(cacheKey);
      let proposal = null;
      
      if (cachedProposal && Date.now() - cachedProposal.timestamp < 10000) { // 10s cache for voting
        logger.debug(`Using cached proposal ${proposalId} data for voting validation`);
        proposal = cachedProposal.data;
      } else {
        logger.debug(`Fetching fresh proposal ${proposalId} data for voting validation`);
        proposal = await getProposalById(proposalId);
      }
      
      // Check if proposal exists
      if (!proposal) {
        const error = `Proposal ${proposalId} not found or could not be loaded`;
        logger.error(error);
        setError(error);
        return false;
      }
      
      if (proposal.status !== 'Active') {
        const error = `Cannot vote on a ${proposal.status.toLowerCase()} proposal`;
        logger.error(error);
        setError(error);
        return false;
      }
      
      // Then check if user has already voted - catch errors here
      let hasAlreadyVoted = false;
      try {
        // Use cache for hasVoted check if available
        const hasVotedCacheKey = `has-voted-${proposalId}-${account}`;
        const cachedHasVoted = responseCache.get(hasVotedCacheKey);
        
        if (cachedHasVoted && Date.now() - cachedHasVoted.timestamp < 30000) { // 30s cache
          hasAlreadyVoted = cachedHasVoted.data;
          logger.debug(`Using cached hasVoted check: ${hasAlreadyVoted}`);
        } else {
          hasAlreadyVoted = await daoContract.hasVoted(proposalId, account);
          logger.debug(`Fresh hasVoted check: ${hasAlreadyVoted}`);
          responseCache.set(hasVotedCacheKey, { 
            data: hasAlreadyVoted, 
            timestamp: Date.now() 
          });
        }
      } catch (error) {
        logger.warn("Error checking vote status, proceeding anyway", error);
      }
      
      if (hasAlreadyVoted) {
        const error = "You have already voted on this proposal";
        logger.error(error);
        setError(error);
        return false;
      }
      
      // Consolidate method checks to reduce RPC calls
      let voteMethod: (proposalId: number, support: any) => Promise<any>;
      let supportValue: any = voteFor; // Default to boolean value
      
      if (typeof daoContract.vote === 'function') {
        logger.debug("Using standard vote(proposalId, support) method");
        voteMethod = daoContract.vote;
      } else if (typeof daoContract.castVote === 'function') {
        logger.debug("Using alternative castVote(proposalId, support) method");
        voteMethod = daoContract.castVote;
        supportValue = voteFor ? 1 : 0; // Convert boolean to number for some contracts
      } else {
        const error = "This contract does not support any known voting function";
        logger.error(error);
        setError(error);
        return false;
      }
      
      // Execute the vote transaction
      logger.info(`Submitting vote: proposalId=${proposalId}, support=${voteFor}, voter=${account}`);
      
      try {
        const tx = await voteMethod.call(daoContract, proposalId, supportValue);
      await handleTransaction(tx);
      
        // Clear proposal-related cache with specific keys only, not all cache
        responseCache.delete(`proposal-${proposalId}`);
        responseCache.delete(`has-voted-${proposalId}-${account}`);
        
        // Wait a bit before updating token balance to ensure blockchain state is updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update the user's token balance as voting may lock tokens
        if (account) {
          await updateTokenBalance();
        }
        
        logger.info(`Vote submitted successfully for proposal ${proposalId}`);
      return true;
      } catch (error) {
        // Try direct call if the method.call approach failed
        try {
          logger.debug("First vote attempt failed, trying direct method call");
          let tx;
          
          if (typeof daoContract.vote === 'function') {
            tx = await daoContract.vote(proposalId, voteFor);
          } else if (typeof daoContract.castVote === 'function') {
            tx = await daoContract.castVote(proposalId, voteFor ? 1 : 0);
          } else {
            throw new Error("No valid voting method available");
          }
          
          await handleTransaction(tx);
          
          // Clear only relevant cache keys
          responseCache.delete(`proposal-${proposalId}`);
          responseCache.delete(`has-voted-${proposalId}-${account}`);
          
          // Update token balance
          await updateTokenBalance();
          
          logger.info(`Vote submitted successfully for proposal ${proposalId} using direct call`);
          return true;
        } catch (secondError) {
          const errorMessage = handleContractError(secondError, `vote on proposal ${proposalId}`);
          setError(errorMessage);
          return false;
        }
      }
    } catch (err: any) {
      const errorMessage = handleContractError(err, `vote on proposal ${proposalId}`);
      logger.error(`Error voting on proposal ${proposalId}:`, err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
      logger.groupEnd();
    }
  }, [daoContract, account, getProposalById, updateTokenBalance, handleTransaction]);

  // Execute a proposal
  const executeProposal = useCallback(async (proposalId: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (!daoContract || !account) {
        throw new Error("Contract not initialized or wallet not connected");
      }
      
      const tx = await daoContract.executeProposal(proposalId);
      await handleTransaction(tx);
      
      // Clear cache for this proposal to get fresh data
      responseCache.clear();
      
      return true;
    } catch (err: any) {
      console.error(`Error executing proposal ${proposalId}:`, err);
      setError(err.message || `Failed to execute proposal ${proposalId}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [daoContract, account]);

  // Check if an address has voted on a proposal
  const hasVoted = useCallback(async (proposalId: number, voter?: string): Promise<boolean> => {
    try {
      if (!daoContract) {
        logger.warn("hasVoted called with uninitialized contract");
        return false;
      }
      
      const voterAddress = voter || account;
      
      if (!voterAddress) {
        logger.warn("hasVoted called without a voter address and no connected account");
        return false;
      }
      
      // Ensure the proposal exists before checking vote status
      try {
        // This check ensures the proposal actually exists before checking votes
        const proposalExists = await daoContract.callStatic._proposalExists?.(proposalId)
          .catch(() => null);
          
        // If the contract has a method to check if the proposal exists and it returns false,
        // we know for sure the user hasn't voted
        if (proposalExists === false) {
          logger.warn(`Proposal ${proposalId} doesn't exist, so user couldn't have voted`);
          return false;
        }
      } catch (error) {
        // If the _proposalExists method doesn't exist or errors, continue with the hasVoted check
        logger.debug("Couldn't check if proposal exists, continuing with vote check", error);
      }
      
      // Clear the cache to ensure fresh data
      const hasVotedCacheKey = `has-voted-${proposalId}-${voterAddress}`;
      responseCache.delete(hasVotedCacheKey);
      
      // Force fresh request without caching
      try {
        // Use callStatic to ensure we're not modifying state
        const voted = await daoContract.callStatic.hasVoted(proposalId, voterAddress);
        logger.debug(`hasVoted check for proposal ${proposalId}, address ${voterAddress}: ${voted}`);
        
        // Only cache the result if it's a definitive true
        // This prevents false positives from being cached
        if (voted === true) {
          // Store in cache with very short TTL
          responseCache.set(hasVotedCacheKey, {
            data: true,
            timestamp: Date.now()
          });
        }
        
        return voted;
      } catch (error) {
        // If the callStatic approach fails, try the regular call
        try {
          const voted = await daoContract.hasVoted(proposalId, voterAddress);
          logger.debug(`Regular hasVoted check for proposal ${proposalId}: ${voted}`);
          return voted;
        } catch (fallbackError) {
          // If both approaches fail, assume the user hasn't voted
          logger.error(`Failed to check vote status for proposal ${proposalId}:`, fallbackError);
          return false;
        }
      }
    } catch (err: any) {
      logger.error(`Error checking vote status for proposal ${proposalId}:`, err);
      // Default to false (not voted) on error - prevents users from being blocked
      return false;
    }
  }, [daoContract, account]);

  // useEffect hooks
  
  // Update token balance when account or token contract changes
  useEffect(() => {
    // Update token balance whenever account or tokenContract changes
    if (account && tokenContract) {
      updateTokenBalance();
    }
  }, [account, tokenContract, updateTokenBalance]);

  // Add memory tracking and global performance monitoring
  useEffect(() => {
    // Track and log memory usage periodically
    let memoryInterval: NodeJS.Timeout | null = null;
    
    // Only run in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_MEMORY_TRACKING === 'true') {
      logger.debug("Starting memory usage tracking");
      
      memoryInterval = setInterval(() => {
        // Only works in Chrome - falls back gracefully in other browsers
        const memoryInfo = (performance as any).memory;
        
        if (memoryInfo) {
          const memoryUsageMB = Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024));
          const memoryLimitMB = Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024));
          
          if (memoryUsageMB > memoryLimitMB * 0.8) {
            logger.warn("High memory usage detected", { 
              usageMB: memoryUsageMB, 
              limitMB: memoryLimitMB,
              percentUsed: Math.round((memoryUsageMB / memoryLimitMB) * 100)
            });
          }
        }
      }, 30000); // Check every 30 seconds
      }
      
      return () => {
      if (memoryInterval) {
        clearInterval(memoryInterval);
      }
    };
  }, []);

  // Optimize frequent RPC calls with proper caching
  useEffect(() => {
    // Batch related RPC calls and cache results
    const prefetchCommonData = async () => {
      if (!connected || !daoContract || !tokenContract || !account) return;
      
      logger.debug("Prefetching common blockchain data");
      
      try {
        // Batch together common data fetches to reduce separate RPC calls
        const fetchData = async () => {
          // Fetch these in parallel to reduce waiting time
          const promises = await Promise.allSettled([
            updateTokenBalance(),
            getProposals()
          ]);
          
          // Safely extract results
          const tokenBalancePromise = promises[0];
          const getProposalsPromise = promises[1];
          
          logger.debug("Prefetch complete", {
            tokenBalanceSuccess: tokenBalancePromise && tokenBalancePromise.status === 'fulfilled',
            proposalsSuccess: getProposalsPromise && getProposalsPromise.status === 'fulfilled',
            tokenBalanceValue: tokenBalancePromise?.status === 'fulfilled' ? tokenBalancePromise.value : 'failed',
            proposalsCount: getProposalsPromise?.status === 'fulfilled' ? 
              (Array.isArray(getProposalsPromise.value) ? getProposalsPromise.value.length : 'not-array') : 'failed'
          });
        };
        
        // Throttle the batch fetching to avoid spamming the RPC
        await throttledCall('prefetch-common-data', fetchData, false, 30000); // 30s cache time
      } catch (error) {
        logger.warn("Error prefetching common data", error);
      }
    };
    
    // Run the prefetch when connection state changes
    if (connected && daoContract && tokenContract) {
      prefetchCommonData();
    }
  }, [connected, daoContract, tokenContract, account, updateTokenBalance, getProposals]);

  // Auto-connect wallet if previously connected with improved safety
  useEffect(() => {
    // Define constants here but moved the useRef up to component level
    const MAX_AUTO_CONNECT_ATTEMPTS = 3;
    const AUTO_CONNECT_DELAY = 2000; // ms between attempts
    let autoConnectTimeout: NodeJS.Timeout | null = null;
    
    const autoConnect = async () => {
      // Only auto-connect if the user has explicitly connected before
      // Check for an explicit flag instead of just assuming
      if (localStorage.getItem('walletConnected') !== 'true' || isLoading || connectingRef.current) {
        logger.debug("Auto-connect skipped: no explicit connection or already connecting", {
          walletConnected: localStorage.getItem('walletConnected'),
          isLoading,
          connecting: connectingRef.current
        });
        return;
      }
      
      // Safety check to prevent infinite loops
      if (autoConnectAttemptsRef.current >= MAX_AUTO_CONNECT_ATTEMPTS) {
        logger.warn(`Auto-connect abandoned after ${MAX_AUTO_CONNECT_ATTEMPTS} attempts`);
        // Reset the counter after a longer delay to allow future attempts
        setTimeout(() => {
          autoConnectAttemptsRef.current = 0;
        }, 60000); // 1 minute
        return;
      }
      
      // Increment attempt counter
      autoConnectAttemptsRef.current++;
      
      try {
        if (!window.ethereum) {
          logger.error("No Ethereum provider found for auto-connection");
          return;
        }
        
        // Log provider info for debugging - use type casting for non-standard properties
        const ethereumExt = window.ethereum as any;
        logger.debug("Provider detection for auto-connect", {
          isMetaMask: window.ethereum.isMetaMask,
          providerInfo: {
            isMetaMask: window.ethereum.isMetaMask,
            chainId: ethereumExt.chainId,
            selectedAddress: ethereumExt.selectedAddress,
            isConnected: ethereumExt.isConnected?.() || "Unknown"
          },
          attempt: autoConnectAttemptsRef.current
        });
        
        // Check if ethereum is properly initialized first
        if (typeof window.ethereum.isMetaMask === 'undefined') {
          logger.debug("Ethereum provider not fully initialized, delaying auto-connect");
          
          // Schedule another attempt with increasing delay
          autoConnectTimeout = setTimeout(autoConnect, AUTO_CONNECT_DELAY * autoConnectAttemptsRef.current);
          return;
        }
        
        // Use eth_accounts (non-intrusive) instead of eth_requestAccounts (shows prompt)
        // to check if we're already connected
        logger.debug("Checking for connected accounts without prompting");
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts',
          params: []
        }).catch(err => {
          logger.error("Error checking accounts:", err);
          return [];
        });
        
        logger.debug("eth_accounts response", { 
          accountsFound: accounts?.length || 0,
          firstAccount: accounts && accounts.length > 0 ? accounts[0] : "None"
        });
        
        if (accounts && accounts.length > 0) {
          // Don't call connectWallet if already connected to the same account
          if (account === accounts[0] && connected) {
            logger.debug("Already connected to the correct account");
            return;
          }
          
          // Only call connect if we have a valid account and aren't already connected
          // and the user has explicitly connected before
          logger.info("Auto-connecting with existing account");
          connectWallet().catch(err => {
            logger.error("Error during auto-connect:", err);
          });
        } else {
          // If no accounts available, don't auto-connect - require user action
          logger.debug("No accounts found during auto-connect check");
          localStorage.removeItem('walletConnected');
        }
      } catch (error) {
        logger.error("Error auto-connecting wallet:", error);
      }
    };
    
    // Run auto-connect on mount but only if explicitly enabled before
    if (!connected && localStorage.getItem('walletConnected') === 'true') {
      autoConnect();
    }
    
    // Also auto-connect when account changes in the wallet
    const handleAccountsChanged = (accounts: string[]) => {
      logger.debug("Account change detected", {
        newAccounts: accounts,
        previousAccount: account
      });
      
      if (accounts.length > 0 && accounts[0] !== account) {
        logger.debug(`Account changed to ${accounts[0]}, reconnecting...`);
        
        // Reset counter for the new account connection
        autoConnectAttemptsRef.current = 0;
        connectWallet().catch(err => {
          logger.error("Error connecting after account change:", err);
        });
      } else if (accounts.length === 0 && account) {
        logger.debug("All accounts disconnected in wallet");
        disconnectWallet();
      }
    };
    
    // Listen for account changes
    if (window.ethereum) {
      logger.debug("Setting up ethereum event listeners");
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Log network changes too
      window.ethereum.on('chainChanged', (chainId: string) => {
        logger.debug("Network changed", { 
          newChainId: chainId,
          newChainIdDecimal: parseInt(chainId, 16),
          previousChainId: networkChainId 
        });
        
        // Reload the page on chain change as recommended by MetaMask
        window.location.reload();
      });
      
      // Remove listener on cleanup
    return () => {
        logger.debug("Removing ethereum event listeners");
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        
        // Clear any pending auto-connect timeouts
        if (autoConnectTimeout) {
          clearTimeout(autoConnectTimeout);
        }
      };
    }
  }, [connectWallet, account, connected, isLoading, networkChainId, disconnectWallet]);

  // Listen for chain changes
  useEffect(() => {
    // Handle chain change (network switching)
    const handleChainChanged = (chainIdHex: string) => {
      logger.debug(`Chain changed to ${chainIdHex}, reloading...`);
      
      // MetaMask requires a page reload on chain change
      window.location.reload();
    };
    
      if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Log provider state on debug
  useEffect(() => {
    logger.debug("Web3Context state updated", {
      isConnected: connected,
      account: account ? `${account.substring(0, 6)}...${account.substring(38)}` : null,
      chainId: networkChainId,
      hasContracts: !!daoContract && !!tokenContract,
      proposalsCount: proposals.length
    });
  }, [connected, account, networkChainId, daoContract, tokenContract, proposals]);

  // Clean up resources and connections on component unmount
  useEffect(() => {
    // Initialize event listeners for Web3 provider
    const setupListeners = () => {
      if (!window.ethereum) return;
      
      // Set up debugging and error tracking for provider events
      const ethereumExt = window.ethereum as any;
      
      // Track connection status changes
      if (typeof ethereumExt.on === 'function') {
        // Log any connect events
        ethereumExt.on('connect', (connectInfo: { chainId: string }) => {
          logger.debug('MetaMask connected event', { 
            chainId: connectInfo.chainId,
            chainIdDecimal: parseInt(connectInfo.chainId, 16)
          });
        });
        
        // Log any disconnect events
        ethereumExt.on('disconnect', (error: { code: number; message: string }) => {
          logger.warn('MetaMask disconnect event', { 
            code: error.code,
            message: error.message
          });
          
          // Handle unexpected disconnections
          if (connected) {
            setError("Wallet unexpectedly disconnected. Please reconnect.");
            setConnected(false);
          }
        });
      }
    };
    
    // Initial setup
    setupListeners();
    
    // Cleanup function that runs when component unmounts
    return () => {
      logger.debug("Web3Context unmounting - cleaning up resources");
      
      // Clean up any pending timeouts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      // Clear all caches to prevent stale data on remount
      responseCache.clear();
      
      // Remove all ethereum event listeners if possible
        if (window.ethereum) {
        const ethereumExt = window.ethereum as any;
        
        // Some providers have a removeAllListeners method
        if (typeof ethereumExt.removeAllListeners === 'function') {
          try {
            ethereumExt.removeAllListeners();
            logger.debug("Removed all ethereum event listeners");
          } catch (e) {
            logger.warn("Error removing ethereum event listeners", e);
          }
        }
      }
      
      // Reset connection tracking
      providerInitializedRef.current = false;
      connectingRef.current = false;
      connectionAttemptRef.current = 0;
    };
  }, [connected]);

  // Enhanced prefetch with smarter polling
  const prefetchCommonData = useCallback(async () => {
    if (connected && daoContract && tokenContract) {
      try {
        // Start with a timestamp to track total time
        const startTime = Date.now();
        
        // Don't hammer RPC with frequent refreshes when inactive
        const timeSinceLastRefresh = startTime - lastGlobalRefreshRef.current;
        // Much longer interval for automatic refresh (2 minutes) to reduce frequent reloading
        if (timeSinceLastRefresh < refreshInterval * 4 && Object.keys(successfulProposalsRef.current).length > 0) {
          logger.debug(`Skipping prefetch - last refresh was ${timeSinceLastRefresh / 1000}s ago, interval is ${refreshInterval / 1000}s`);
          return;
        }
        
        // If prefetch is already running, don't start another one
        if (refreshInProgressRef.current) {
          logger.debug("Skipping prefetch - already in progress");
          return;
        }
        
        refreshInProgressRef.current = true;
        
        // Function to fetch data with error handling for each step
        const fetchData = async () => {
          try {
            // First, get token balance - it's lightweight and essential
            await updateTokenBalance();
            
            // Then get proposal IDs but don't fetch details immediately
            const proposalIds = await getProposals({ skipRateLimit: true });
            
            // Only fetch details for proposals that are visible/active
            // This is much more efficient than fetching all proposals
            if (proposalIds.length > 0) {
              // Calculate which proposals would be visible in UI (first 6 or active ones)
              const visibleProposalIds = proposalIds.slice(0, 6);
              
              // Fetch these in sequence with slight delays between each
              for (const id of visibleProposalIds) {
                // Skip if already fetched recently (within 2 minutes)
                if (lastFetchTimestampRef.current[id] && 
                    Date.now() - lastFetchTimestampRef.current[id] < 120000) {
                  continue;
                }
                
                try {
                  await getProposalById(id);
                  // Small delay between proposal fetches to avoid rate limiting
                  await new Promise(resolve => setTimeout(resolve, 300));
                } catch (err) {
                  // Just log errors but continue with other proposals
                  logger.error(`Error prefetching proposal ${id}:`, err);
                }
              }
            }
            
            // Log total prefetch time for performance monitoring
            const duration = Date.now() - startTime;
            logger.debug(`Completed prefetch cycle in ${duration}ms for ${proposalIds.length} proposals`);
            
            // Adjust refresh interval based on prefetch time
            // If it took a long time, increase the interval to reduce load
            if (duration > 5000) {
              setRefreshInterval(prev => Math.min(prev * 1.5, 180000)); // Max 3 minutes
            } else if (duration < 1000) {
              setRefreshInterval(prev => Math.max(prev * 0.8, 45000)); // Min 45 seconds
            }
          } catch (err) {
            logger.error("Error in data prefetch:", err);
          }
        };
        
        await fetchData();
      } catch (error) {
        logger.error("Error in prefetchCommonData:", error);
      } finally {
        refreshInProgressRef.current = false;
      }
    }
  }, [connected, daoContract, tokenContract, updateTokenBalance, getProposals, getProposalById, refreshInterval]);

  // Use the adjusted refresh interval for useEffect with a much longer interval for automatic refreshes
  useEffect(() => {
    // Initial prefetch
    prefetchCommonData();
    
    // Set up prefetch interval with much longer delay
    const intervalId = setInterval(() => {
      prefetchCommonData();
    }, refreshInterval * 4); // 4x the normal refresh interval to reduce frequent refreshes
    
    return () => clearInterval(intervalId);
  }, [prefetchCommonData, refreshInterval]);

  // Convert raw proposals to UI-ready format with better filtering for execution page
  const getExecutableProposals = useCallback(async (): Promise<Proposal[]> => {
    try {
      // Get all proposal IDs first (using cached results if available)
      const proposalIds = await getProposals({ skipRateLimit: true });
      
      // For each ID, get the full proposal details
      const proposalPromises = proposalIds.map(id => 
        // Use cached proposal data when available
        successfulProposalsRef.current[id] || getProposalById(id)
      );
      
      // Wait for all promises to resolve
      const proposals = await Promise.all(proposalPromises);
      
      // Include both active and pending proposals for the execution page
      return proposals
        .filter(Boolean) // Remove null results
        .filter(p => p.status === 'Pending' || p.status === 'Active') // Include active and pending
        .sort((a, b) => {
          // Sort by status first (Pending first, then Active)
          if (a.status === 'Pending' && b.status !== 'Pending') return -1;
          if (a.status !== 'Pending' && b.status === 'Pending') return 1;
          // Then sort by ID
          return a.id - b.id;
        });
      
    } catch (error) {
      logger.error("Failed to get executable proposals:", error);
      return [];
    }
  }, [getProposals, getProposalById]);

  // Add a manual refresh function that applications can call on user action
  const manualRefresh = useCallback(async () => {
    // Skip if refresh is already in progress
    if (refreshInProgressRef.current) {
      logger.debug("Manual refresh requested but refresh already in progress");
      return;
    }
    
    logger.info("Manual refresh requested by user");
    lastGlobalRefreshRef.current = 0; // Reset last refresh time to force update
    await prefetchCommonData(); // Trigger immediate refresh
  }, [prefetchCommonData]);

  // Now include the new functions in the context value
  const contextValue: Web3ContextType = {
    account,
    chainId: networkChainId,
    isConnected: connected,
    provider,
    daoContract,
    tokenContract,
    tokenBalance,
    connectWallet,
    disconnectWallet,
    getProposals,
    getProposalById,
    createProposal,
    voteOnProposal,
    executeProposal,
    hasVoted,
    forceRefresh,
    error,
    isLoading,
    getExecutableProposals,
    manualRefresh, // Add manual refresh function
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider; 