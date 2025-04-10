const fs = require("fs");
const path = require("path");
const solc = require("solc");

// Read the contract source
const contractPath = path.join(__dirname, "DAOGovLiteWithToken.sol");
const contractSource = fs.readFileSync(contractPath, "utf8");

// Function to find all import statements in the contract
function findImports(importPath) {
  try {
    // Handle relative imports and OpenZeppelin imports
    let resolvedPath;
    if (importPath.startsWith('@openzeppelin')) {
      resolvedPath = path.resolve(__dirname, 'node_modules', importPath);
    } else {
      resolvedPath = path.resolve(path.dirname(contractPath), importPath);
    }
    
    return { contents: fs.readFileSync(resolvedPath, 'utf8') };
  } catch (e) {
    console.error(`Error finding import ${importPath}: ${e.message}`);
    return { error: `File not found: ${importPath}` };
  }
}

function compileContract() {
  console.log("Compiling DAOGovLiteWithToken contract...");
  
  // Prepare input for solc compiler
  const input = {
    language: "Solidity",
    sources: {
      "DAOGovLiteWithToken.sol": {
        content: contractSource,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
      optimizer: {
        enabled: true,
        runs: 200, // Balance between deployment cost and function call cost
      },
    },
  };

  // Compile with solc
  console.log("Running solc compiler...");
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );

  // Check for errors
  if (output.errors) {
    let hasError = false;
    output.errors.forEach((error) => {
      if (error.severity === "error") {
        console.error(error.formattedMessage);
        hasError = true;
      } else {
        console.warn(error.formattedMessage);
      }
    });

    if (hasError) {
      console.error("Compilation failed");
      process.exit(1);
    }
  }

  const contractOutput = output.contracts["DAOGovLiteWithToken.sol"]["DAOGovLiteWithToken"];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  // Save ABI and bytecode to files
  const buildDir = path.join(__dirname, "build");
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  // Save with standard names
  fs.writeFileSync(
    path.join(buildDir, "DAOGovLiteWithToken.abi"),
    JSON.stringify(abi)
  );
  fs.writeFileSync(
    path.join(buildDir, "DAOGovLiteWithToken.bin"), 
    bytecode
  );
  
  console.log("Contract compiled successfully");
  console.log(`ABI saved to: ${path.join(buildDir, "DAOGovLiteWithToken.abi")}`);
  console.log(`Bytecode saved to: ${path.join(buildDir, "DAOGovLiteWithToken.bin")}`);
  
  return { abi, bytecode };
}

// Run compilation if this script is executed directly
if (require.main === module) {
  compileContract();
}

module.exports = {
  compileContract,
  findImports
}; 