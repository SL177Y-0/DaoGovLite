# DAOGovLite - Blockchain

This directory contains the smart contracts for the DAOGovLite governance platform, implementing a decentralized autonomous organization (DAO) with proposal and voting capabilities.

## Contracts

### DAOGovLite.sol

The main governance contract that handles:
- Proposal creation and management
- Voting mechanisms
- Execution of approved proposals
- Access control based on token holdings

### GovernanceToken.sol

An ERC20 token with voting capabilities:
- ERC20 compliant with additional voting features
- Extends ERC20Votes from OpenZeppelin
- Configurable token supply with minting functionality
- Delegated voting power

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. The contracts use OpenZeppelin libraries (v4.9.0) for secure implementations of:
   - ERC20 token standard
   - Voting extensions
   - Access control

## Compilation

Compile the contracts using the custom compilation script:

```
npm run compile
```

This will:
1. Read the Solidity source files
2. Compile using solc compiler
3. Generate ABI and bytecode files in the `build/` directory
4. Output separate files for each contract and interface

## Contract Deployment

To deploy the contracts:

1. Create a `.env` file with your configuration:
   ```
   PRIVATE_KEY=your_wallet_private_key
   RPC_URL=your_rpc_endpoint
   ```

2. Deploy the GovernanceToken first
3. Use the token address when deploying the DAOGovLite contract

## Integration with Frontend

The frontend application uses:
1. Contract ABIs from the `build` directory
2. Contract addresses specified during deployment

## Development Notes

- Contracts use Solidity 0.8.20
- The `compile.js` script handles imports from OpenZeppelin automatically
- Proposal threshold is set to 1000 tokens (adjustable in the contract)
- Function access is restricted based on token holdings 