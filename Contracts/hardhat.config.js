require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// Define tasks
task("mint-tokens", "Mints governance tokens to a specified address")
  .addParam("to", "The address that will receive the tokens")
  .addParam("amount", "The amount of tokens to mint")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    
    // Get token address based on network
    let tokenAddress;
    const network = hre.network.name;
    
    if (network === "sepolia") {
      tokenAddress = "0xf5D7B1036762a28b127881aFC28934DeF0E59bfB";
    } else if (network === "localhost") {
      tokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    } else {
      console.error(`Network ${network} not supported or token address not configured`);
      return;
    }
    
    // Connect to the token contract
    const [deployer] = await ethers.getSigners();
    console.log("Minting with account:", deployer.address);
    
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.attach(tokenAddress);
    
    console.log(`Minting ${taskArgs.amount} tokens to ${taskArgs.to}...`);
    
    // Convert amount to wei
    const amountInWei = ethers.parseEther(taskArgs.amount.toString());
    
    // Execute mint transaction
    const tx = await token.mint(taskArgs.to, amountInWei);
    await tx.wait();
    
    console.log(`Successfully minted ${taskArgs.amount} tokens to ${taskArgs.to}`);
    console.log(`Transaction hash: ${tx.hash}`);
    
    // Get updated balance
    const balance = await token.balanceOf(taskArgs.to);
    console.log(`New balance of ${taskArgs.to}: ${ethers.formatEther(balance)} tokens`);
  });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./src",
    tests: "./test",
  },
}; 