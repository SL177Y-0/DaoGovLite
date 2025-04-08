// Minimal script to check token balance directly
const { ethers } = require('ethers');
require('dotenv').config();

// Minimal ABI for balanceOf
const tokenABI = ["function balanceOf(address account) view returns (uint256)"];

async function main() {
  const TARGET_ADDRESS = process.argv[2] || "0x775F664e9AdD6C351473C4DF154a7740c52316b5";
  const TOKEN_ADDRESS = "0x66fb2eedc540ec7e3db84543a8227c9682e16c75"; // New token address
  
  try {
    // Connect to Sepolia
    const SEPOLIA_RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    
    console.log(`Checking balance of ${TARGET_ADDRESS} at token contract ${TOKEN_ADDRESS}`);
    
    // Create token contract instance
    const token = new ethers.Contract(TOKEN_ADDRESS, tokenABI, provider);
    
    // Get balance
    const balance = await token.balanceOf(TARGET_ADDRESS);
    console.log(`Raw balance: ${balance.toString()}`);
    console.log(`Formatted balance: ${ethers.formatUnits(balance, 18)} VOTE`);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main(); 