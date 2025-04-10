#!/bin/bash
# Script to compile and deploy the DAOGovLiteWithToken contract

# Ensure we're in the blockchain directory
cd "$(dirname "$0")"

echo "===== Starting Compile and Deploy Process ====="

# Step 1: Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Step 2: Compile the contract
echo "Compiling the contract..."
node compile.js

# Check if compilation succeeded
if [ ! -d "build" ] || [ ! -f "build/DAOGovLiteWithToken.abi" ]; then
  echo "Error: Compilation failed or build directory not found"
  exit 1
fi

echo "Compilation successful!"

# Step 3: Deploy the contract
echo "Deploying the contract..."
node deploy.js

echo "===== Process Complete =====" 