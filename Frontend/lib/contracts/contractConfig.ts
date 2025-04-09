export const contractConfig = {
  // Contract addresses (these will need to be updated after deployment)
  addresses: {
    tokenContract: "0x123456789abcdef123456789abcdef123456789a", // Example address, update with actual deployment address
    governanceContract: "0x987654321abcdef987654321abcdef98765432b", // Example address, update with actual deployment address
  },
  
  // Network configuration
  network: {
    chainId: 1337, // Local Ganache/Hardhat instance by default
    name: "Local Development Chain",
    currency: "ETH",
    blockExplorer: "",
  },
  
  // RPC configuration
  rpc: {
    localRpcUrl: "http://localhost:8545", // Default local node URL
    defaultRpcUrl: "https://rpc.ankr.com/eth", // Fallback public node
  }
}; 