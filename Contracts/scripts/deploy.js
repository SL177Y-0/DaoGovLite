// This script is for deploying contracts using Hardhat
// To use this script:
// 1. Install Hardhat: npm install --save-dev hardhat
// 2. Run: npx hardhat run scripts/deploy.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts to Sepolia testnet...");

  // Deploy GovernanceToken
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get initial balance
  const initialBalance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(initialBalance));

  // Deploy GovernanceToken
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy("VoteVerse Token", "VOTE");
  await governanceToken.waitForDeployment();
  console.log("GovernanceToken deployed to:", await governanceToken.getAddress());

  // Deploy DAOGovLite using the token address
  const DAOGovLite = await ethers.getContractFactory("DAOGovLite");
  const daoGovLite = await DAOGovLite.deploy(await governanceToken.getAddress());
  await daoGovLite.waitForDeployment();
  console.log("DAOGovLite deployed to:", await daoGovLite.getAddress());

  // Get final balance to calculate gas used
  const finalBalance = await deployer.provider.getBalance(deployer.address);
  console.log(
    "Deployment cost:",
    ethers.formatEther(initialBalance - finalBalance),
    "ETH"
  );

  console.log("Update the contract addresses in frontend/src/contracts/addresses.ts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 