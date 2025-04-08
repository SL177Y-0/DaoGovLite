import { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../contexts/Web3Context';

// Track circuit breaker status globally
let circuitBreakerActive = false;
let circuitRecoveryTimeout: NodeJS.Timeout | null = null;

// Cache for MetaMask RPC requests
interface CacheEntry {
  value: any;
  timestamp: number;
}

const requestCache: {[key: string]: CacheEntry} = {};
const pendingRequests: {[key: string]: Promise<any>} = {};

// Cache expiration times (ms)
const CACHE_TIMES = {
  eth_accounts: 10000,    // 10 seconds
  eth_chainId: 15000,     // 15 seconds
  eth_call: 5000,         // 5 seconds
  default: 3000           // 3 seconds for other calls
};

// Track and limit RPC calls
let rpcCallCount = 0;
let rpcCallsByType: {[key: string]: number} = {};
let lastRpcReset = Date.now();
let monkeyPatchApplied = false;

// Enhanced debounce implementation to avoid excessive RPC calls
interface DebouncedCall {
  timer: NodeJS.Timeout;
  resolver: (value: any) => void;
  rejecter: (reason: any) => void;
}

const debouncedCalls: {[key: string]: DebouncedCall} = {};

// Debounce function for RPC calls
function debounceRpcCall(key: string, fn: () => Promise<any>, delay: number): Promise<any> {
  // Cancel previous call if it exists
  if (debouncedCalls[key]) {
    clearTimeout(debouncedCalls[key].timer);
  }
  
  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
        delete debouncedCalls[key];
      } catch (error) {
        reject(error);
        delete debouncedCalls[key];
      }
    }, delay);
    
    debouncedCalls[key] = { timer, resolver: resolve, rejecter: reject };
  });
}

// Limits for different RPC methods
const RPC_LIMITS = {
  eth_accounts: 5,      // Increased from 3 to 5
  eth_chainId: 5,       // Increased from 3 to 5
  eth_call: 12,         // Increased from 8 to 12
  default: 20           // Increased from 15 to 20
};

// Reset period for call counting (ms)
const RESET_PERIOD = 10000; // Increased from 5000 to 10000 (10 seconds)

// Intercept and optimize MetaMask RPC requests
function monkeyPatchEthereum() {
  if (monkeyPatchApplied || !window.ethereum || !window.ethereum.request) {
    return;
  }
  
  monkeyPatchApplied = true;
  
  // Store original request method
  const originalRequest = window.ethereum.request;
  
  // Replace with our optimized version
  window.ethereum.request = function(args: any) {
    const method = args.method;
    const params = args.params || [];
    const cacheKey = `${method}-${JSON.stringify(params)}`;
    const now = Date.now();
    
    // Track calls by type for circuit breaker
    rpcCallCount++;
    rpcCallsByType[method] = (rpcCallsByType[method] || 0) + 1;
    
    // Reset counters after RESET_PERIOD
    if (now - lastRpcReset > RESET_PERIOD) {
      const callReport = {...rpcCallsByType, total: rpcCallCount};
      
      // Log if the rate seems excessive
      const maxMethod = Object.entries(callReport).sort((a, b) => b[1] - a[1])[0];
      if (maxMethod && maxMethod[1] > RPC_LIMITS.default) {
        console.warn(`High RPC call rate detected: ${JSON.stringify(callReport)} in ${RESET_PERIOD/1000}s`);
      }
      
      rpcCallCount = 0;
      rpcCallsByType = {};
      lastRpcReset = now;
    }
    
    // If circuit breaker is active, return cached data or throttle
    if (circuitBreakerActive) {
      // For read operations, return cached data if available
      if (method === 'eth_accounts' || method === 'eth_chainId' || method === 'eth_call') {
        if (requestCache[cacheKey] && requestCache[cacheKey].value) {
          console.log(`Circuit breaker: returning cached ${method}`);
          return Promise.resolve(requestCache[cacheKey].value);
        }
        
        // If no cache available, throttle instead of blocking completely
        console.log(`Circuit breaker: throttling ${method}`);
        return new Promise(resolve => {
          setTimeout(() => {
            originalRequest.call(window.ethereum, args)
              .then((result: any) => {
                // Cache the result even during circuit breaker
                requestCache[cacheKey] = { value: result, timestamp: Date.now() };
                resolve(result);
              })
              .catch((err: any) => {
                console.error(`Error in throttled ${method}:`, err);
                resolve(null); // Resolve with null instead of rejecting to prevent UI errors
              });
          }, 3000); // Significant delay during circuit breaker active
        });
      }
      
      // For other operations, let them through with warning but with a delay
      console.warn(`Circuit breaker: allowing ${method} to proceed with delay`);
      return new Promise(resolve => {
        setTimeout(() => {
          originalRequest.call(window.ethereum, args)
            .then(resolve)
            .catch((err: any) => {
              console.error(`Error in delayed ${method}:`, err);
              resolve(null);
            });
        }, 1000);
      });
    }
    
    // Check if request is already pending
    if (pendingRequests[cacheKey]) {
      return pendingRequests[cacheKey];
    }
    
    // Check cache for repeated calls
    const cacheTime = CACHE_TIMES[method] || CACHE_TIMES.default;
    if (requestCache[cacheKey] && now - requestCache[cacheKey].timestamp < cacheTime) {
      return Promise.resolve(requestCache[cacheKey].value);
    }
    
    // If we hit RPC limit for this method type, use debouncing
    const methodLimit = RPC_LIMITS[method] || RPC_LIMITS.default;
    if (rpcCallsByType[method] > methodLimit && !circuitBreakerActive) {
      console.warn(`RPC limit exceeded for ${method}, debouncing`);
      
      // Use debouncing for frequently called methods
      return debounceRpcCall(`debounce-${cacheKey}`, () => {
        return originalRequest.call(window.ethereum, args)
          .then((result: any) => {
            // Cache the result
            requestCache[cacheKey] = { value: result, timestamp: Date.now() };
            return result;
          });
      }, 1500);
    }
    
    // Make the actual request and cache the result
    const request = originalRequest.call(window.ethereum, args)
      .then((result: any) => {
        // Cache successful results
        requestCache[cacheKey] = { value: result, timestamp: Date.now() };
        return result;
      })
      .catch((err: any) => {
        console.error(`Error in ${method}:`, err);
        throw err;
      })
      .finally(() => {
        // Remove from pending requests
        delete pendingRequests[cacheKey];
      });
    
    // Store as pending
    pendingRequests[cacheKey] = request;
    return request;
  };
  
  console.log("MetaMask RPC requests optimized with enhanced caching");
}

// Periodically clean up stale cache entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const key in requestCache) {
    const entry = requestCache[key];
    // Use longer expiration for cleanup (3x normal cache time)
    const cacheMethod = key.split('-')[0];
    const expiryTime = (CACHE_TIMES[cacheMethod] || CACHE_TIMES.default) * 3;
    
    if (now - entry.timestamp > expiryTime) {
      delete requestCache[key];
    }
  }
}, 60000); // Run cleanup every minute

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  const [rpcOverload, setRpcOverload] = useState(false);
  
  // Apply MetaMask RPC optimization on first load
  useEffect(() => {
    if (window.ethereum && !monkeyPatchApplied) {
      monkeyPatchEthereum();
    }
    
    // Monitor for severe RPC overload
    const checkId = setInterval(() => {
      const now = Date.now();
      const totalCallsInPeriod = rpcCallCount;
      const timeSinceReset = now - lastRpcReset;
      
      // Use a more gradual approach to RPC limiting
      if (totalCallsInPeriod > 30 && timeSinceReset < 5000 && !circuitBreakerActive) {
        // First, try slowing down before activating circuit breaker
        console.warn(`High RPC call rate detected: ${totalCallsInPeriod} calls in ${timeSinceReset/1000}s - slowing down`);
        
        // Slow down by clearing caches for non-essential data
        Object.keys(requestCache).forEach(key => {
          // Keep essential data like account and chainId
          if (!key.includes('eth_accounts') && !key.includes('eth_chainId')) {
            delete requestCache[key];
          }
        });
        
        // Only activate circuit breaker if call rate is extremely high
        if (totalCallsInPeriod > 50 && timeSinceReset < 3000) {
          console.warn(`RPC overload detected: ${totalCallsInPeriod} calls in ${timeSinceReset/1000}s - activating circuit breaker`);
          circuitBreakerActive = true;
          setRpcOverload(true);
          
          // Auto-recover after cooling period
          if (circuitRecoveryTimeout) clearTimeout(circuitRecoveryTimeout);
          
          circuitRecoveryTimeout = setTimeout(() => {
            console.log("Circuit breaker reset");
            circuitBreakerActive = false;
            setRpcOverload(false);
            
            // Clear caches on recovery
            for (const key in requestCache) {
              delete requestCache[key];
            }
          }, 15000); // 15-second cooling period (reduced from 20s)
        }
      }
    }, 1000);
    
    return () => {
      clearInterval(checkId);
      if (circuitRecoveryTimeout) {
        clearTimeout(circuitRecoveryTimeout);
      }
    };
  }, []);
  
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  
  // Inject the circuit breaker status and reset function
  return {
    ...context,
    rpcOverload,
    resetCircuitBreaker: () => {
      if (circuitRecoveryTimeout) clearTimeout(circuitRecoveryTimeout);
      circuitBreakerActive = false;
      setRpcOverload(false);
      
      // Clear caches on manual reset
      for (const key in requestCache) {
        delete requestCache[key];
      }
      
      // Reset call counters
      rpcCallCount = 0;
      rpcCallsByType = {};
      lastRpcReset = Date.now();
    }
  };
};

export default useWeb3; 