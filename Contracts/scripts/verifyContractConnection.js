// Script to comprehensively verify and diagnose contract connectivity
const { ethers } = require('ethers');
require('dotenv').config();

// Minimal ABIs - just the functions we need
const tokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function owner() view returns (address)"
];

const daoABI = [
  "function governanceToken() view returns (address)"
];

async function main() {
  const TARGET_ADDRESS = process.argv[2];
  if (!TARGET_ADDRESS) {
    console.error("Please provide a target address as a command line argument");
    console.log("Example: node scripts/verifyContractConnection.js 0xYourAddress");
    return;
  }

  try {
    // Connect to Sepolia with our API key
    const SEPOLIA_RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    
    console.log("Connected to Sepolia network");
    
    // Check for deployed contracts - use both addresses that might be in the system
    const addresses = [
      {
        name: "Original Token",
        address: "0xf5d7b1036762a28b127881afc28934def0e59bfb" // Old address
      },
      {
        name: "New Token", 
        address: "0x66fb2eedc540ec7e3db84543a8227c9682e16c75" // New address
      }
    ];
    
    console.log(`\nChecking target address: ${TARGET_ADDRESS}`);
    
    for (const contractInfo of addresses) {
      console.log(`\n----- ${contractInfo.name} (${contractInfo.address}) -----`);
      
      try {
        const code = await provider.getCode(contractInfo.address);
        
        if (code === '0x') {
          console.log(`❌ NO CONTRACT detected at this address`);
          continue;
        }
        
        console.log(`✅ Contract exists at this address`);
        
        // Create contract instance
        const contract = new ethers.Contract(contractInfo.address, tokenABI, provider);
        
        // Get basic contract info
        try {
          const name = await contract.name();
          const symbol = await contract.symbol();
          const totalSupply = await contract.totalSupply();
          const decimals = await contract.decimals();
          
          console.log(`✅ Contract info successfully retrieved:`);
          console.log(`    Name: ${name}`);
          console.log(`    Symbol: ${symbol}`);
          console.log(`    Decimals: ${decimals}`);
          console.log(`    Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
          
          // Try to get the owner if possible
          try {
            const owner = await contract.owner();
            console.log(`    Owner: ${owner}`);
            
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            console.log(`    Our wallet: ${wallet.address}`);
            
            if (wallet.address.toLowerCase() === owner.toLowerCase()) {
              console.log(`    ✅ Our wallet IS the contract owner`);
            } else {
              console.log(`    ❌ Our wallet is NOT the contract owner`);
            }
          } catch (err) {
            console.log(`    ⚠️  Unable to get owner: ${err.message}`);
          }
          
          // Try to check target address balance
          try {
            const balance = await contract.balanceOf(TARGET_ADDRESS);
            console.log(`    Target balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
            
            if (balance > 0) {
              console.log(`    ✅ Target address HAS tokens at this contract`);
            } else {
              console.log(`    ❌ Target address has NO tokens at this contract`);
            }
          } catch (err) {
            console.log(`    ❌ Error getting balance: ${err.message}`);
          }
        } catch (err) {
          console.log(`❌ Error getting basic contract info: ${err.message}`);
        }
      } catch (err) {
        console.log(`❌ Error connecting to contract: ${err.message}`);
      }
    }
    
    console.log("\n----- Frontend Configuration Check -----");
    // Check frontend configuration - use package.json to find the project root
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Try to read the addresses configuration file
      const configPath = path.join(__dirname, '..', '..', 'Frontend', 'src', 'contracts', 'addresses.ts');
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        console.log("Frontend configuration file exists");
        
        // Check which addresses are in the config
        console.log("\nAddresses in frontend config:");
        addresses.forEach(addr => {
          // Make the check case-insensitive by converting both to lowercase
          if (configContent.toLowerCase().includes(addr.address.toLowerCase())) {
            console.log(`- ✅ ${addr.name} (${addr.address}) IS in the frontend config`);
          } else {
            console.log(`- ❌ ${addr.name} (${addr.address}) is NOT in the frontend config`);
          }
        });
      } else {
        console.log("❌ Could not find frontend configuration file");
      }
    } catch (err) {
      console.log(`❌ Error reading frontend config: ${err.message}`);
    }
    
    console.log("\n----- DIAGNOSIS SUMMARY -----");
    console.log("1. Ensure the address in Frontend/src/contracts/addresses.ts matches a deployed contract");
    console.log("2. Clear browser cache and localStorage if you recently deployed new contracts");
    console.log("3. Make sure MetaMask is connected to Sepolia testnet");
    console.log("4. Check browser console for any errors when connecting wallet");
    
  } catch (error) {
    console.error("Error in verification:", error);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 