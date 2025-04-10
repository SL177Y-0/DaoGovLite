const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { compileContract } = require("./compile");

async function main() {
  try {
    console.log("Starting deployment process for DAOGovLiteWithToken contract...");
    
    // Step 1: Compile the contract and get ABI and bytecode
    console.log("Compiling contract...");
    const { abi, bytecode } = compileContract();
    
    if (!abi || !bytecode) {
      console.error("Compilation failed: Missing ABI or bytecode");
      process.exit(1);
    }
    
    console.log("Contract compiled successfully");

    // Provider setup
    const providerUrl = process.env.ETH_PROVIDER_URL || "https://eth-sepolia.g.alchemy.com/v2/b20Yg4jZMHRLeuzNknS1pSAgta1Plerw";
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    // Get current network gas prices
    const feeData = await provider.getFeeData();
    console.log(`Current gas price: ${ethers.utils.formatUnits(feeData.gasPrice, "gwei")} gwei`);

    // Wallet setup
    const privateKey = process.env.PRIVATE_KEY || "8bc708c3614cb179e59ba85d2f161ab59bc38fff75659ca5310fc2219e84ae6d"
    const wallet = new ethers.Wallet(privateKey, provider);

    // Check wallet balance
    const balance = await wallet.getBalance();
    console.log(`Deploying from wallet: ${wallet.address}`);
    console.log(`Current wallet balance: ${ethers.utils.formatEther(balance)} ETH`);

    if (parseFloat(ethers.utils.formatEther(balance)) < 0.02) {
      console.warn("Warning: Low ETH balance. You may need more ETH to deploy.");
    }

    // Token details
    const tokenName = "DAOGovToken";
    const tokenSymbol = "DGT";

    console.log(`Deploying DAOGovLiteWithToken contract with name=${tokenName} and symbol=${tokenSymbol}...`);

    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Using EIP-1559 gas settings
    const maxFeePerGas = feeData.maxFeePerGas.mul(130).div(100); // 30% higher than current
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.mul(110).div(100); // 10% higher than current
    
    console.log(`Using maxFeePerGas: ${ethers.utils.formatUnits(maxFeePerGas, "gwei")} gwei`);
    console.log(`Using maxPriorityFeePerGas: ${ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei")} gwei`);
    
    // Deploy with optimized gas settings
    const deploymentOptions = {
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit: 5000000 // Fixed gas limit
    };

    // Deploy contract - FIXED: Constructor args (tokenName, tokenSymbol) and transaction overrides object
    console.log("Deploying with correct constructor arguments...");
    // First two parameters are constructor arguments, then options object as SEPARATE parameter
    const contract = await factory.deploy(
      tokenName,  // First constructor arg
      tokenSymbol, // Second constructor arg
      deploymentOptions // This is NOT a constructor arg - it's a transaction overrides object
    );
    console.log(`Deployment transaction hash: ${contract.deployTransaction.hash}`);

    console.log("Waiting for transaction to be mined...");
    await contract.deployed();

    console.log(`Contract deployed successfully at address: ${contract.address}`);

    // Save deployment information
    const receipt = await contract.deployTransaction.wait();
    const deploymentInfo = {
      contractAddress: contract.address,
      transactionHash: contract.deployTransaction.hash,
      tokenName: tokenName,
      tokenSymbol: tokenSymbol,
      deployer: wallet.address,
      timestamp: new Date().toISOString(),
      network: (await provider.getNetwork()).name,
      gasUsed: receipt.gasUsed.toString(),
      totalCost: ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)),
      defaultTokenAmount: "500",
      features: ["FixedVoting", "AutoVotingPower", "IncreasedDefaultTokens", "AutoDelegation"]
    };

    fs.writeFileSync(
      path.join(__dirname, "deployment-fixed-voting-info.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Save contract address to frontend directory
    try {
      const frontendContractDir = path.join(__dirname, '../frontend/contracts');
      if (fs.existsSync(frontendContractDir)) {
        const addressFile = path.join(frontendContractDir, 'DAOGovLiteWithToken-address.json');
        fs.writeFileSync(
          addressFile,
          JSON.stringify({ address: contract.address }, null, 2)
        );
        console.log(`Contract address saved to frontend at: ${addressFile}`);
      }
    } catch (error) {
      console.warn("Could not update frontend contract address:", error.message);
    }

    console.log(`Deployment information saved to deployment-fixed-voting-info.json`);
    console.log(`\nFrontend Integration Instructions:`);
    console.log(`1. Update your frontend config with the new contract address: ${contract.address}`);
    console.log(`2. Users will now automatically get 500 DGT tokens with voting power when they claim tokens`);
    console.log(`3. No need for separate delegation transactions - voting power is auto-delegated`);
    console.log(`4. Voting display will now correctly show user's actual vote choice`);

  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

main(); 