// Script to mint governance tokens using a lowercase address
const { ethers } = require('ethers');
require('dotenv').config();

// Load token ABI
const tokenABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)"
];

// Load private key from .env
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Please set PRIVATE_KEY in your .env file");
  process.exit(1);
}

// Network settings
const SEPOLIA_RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
// Use lowercase address to avoid checksum issues - updated to new address
const TOKEN_ADDRESS = "0x66fb2eedc540ec7e3db84543a8227c9682e16c75";

async function main() {
  // Get command line arguments
  const recipient = process.argv[2]; // Address to receive tokens
  const amount = process.argv[3]; // Amount of tokens to mint
  
  if (!recipient || !amount) {
    console.error("Please provide recipient address and amount as command line arguments");
    console.log("Example: node scripts/mintWithLowercaseAddress.js 0xRecipientAddress 1000");
    return;
  }
  
  try {
    // Connect to the Sepolia network
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log("Connected with address:", wallet.address);
    
    // Connect to the token contract
    const token = new ethers.Contract(TOKEN_ADDRESS, tokenABI, wallet);
    
    console.log(`Minting ${amount} tokens to ${recipient}...`);
    
    // Convert amount to wei
    const amountInWei = ethers.parseUnits(amount.toString(), 18);
    
    // Execute mint transaction
    const tx = await token.mint(recipient, amountInWei);
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    console.log(`Successfully minted ${amount} tokens to ${recipient}`);
    
    // Get updated balance
    const balance = await token.balanceOf(recipient);
    console.log(`New balance of ${recipient}: ${ethers.formatUnits(balance, 18)} tokens`);
    
  } catch (error) {
    console.error("Error minting tokens:", error);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 