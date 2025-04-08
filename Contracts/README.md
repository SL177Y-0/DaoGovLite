# VoteVerse Smart Contracts

This repository contains the smart contracts for the VoteVerse decentralized governance platform. The contracts are written in Solidity and include the DAO governance contract and the governance token contract.

## Contracts Overview

1. **DAOGovLite.sol**
   - Main governance contract
   - Handles proposal creation, voting, and execution
   - Manages proposal lifecycle and state

2. **GovernanceToken.sol**
   - ERC20 token for governance
   - Used for voting power
   - Implements standard ERC20 functionality

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Hardhat
- MetaMask or other Web3 wallet
- Access to a supported blockchain network (Sepolia, Goerli, or Localhost)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/voteverse.git
cd voteverse/Contract
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory:
```env
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=your_sepolia_rpc_url
GOERLI_RPC_URL=your_goerli_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Contract Deployment

1. **Compile Contracts**
```bash
npx hardhat compile
```

2. **Deploy to Local Network**
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

3. **Deploy to Testnet**
```bash
# For Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# For Goerli
npx hardhat run scripts/deploy.ts --network goerli
```

## Contract Architecture

### DAOGovLite Contract

```solidity
struct Proposal {
    uint256 id;
    string title;
    string description;
    uint256 startTime;
    uint256 endTime;
    uint256 forVotes;
    uint256 againstVotes;
    bool executed;
    bool canceled;
    address proposer;
}

// Key Functions
- createProposal(title, description, duration)
- vote(proposalId, support)
- executeProposal(proposalId)
- getProposal(proposalId)
- getProposals()
```

### GovernanceToken Contract

```solidity
// Standard ERC20 Implementation
- totalSupply()
- balanceOf(account)
- transfer(to, amount)
- approve(spender, amount)
- transferFrom(from, to, amount)
```

## Testing

Run the test suite:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/DAOGovLite.test.ts
```

## Security Considerations

1. **Access Control**
   - Only token holders can create proposals
   - One vote per token holder per proposal
   - Time-locked execution

2. **Gas Optimization**
   - Batch operations where possible
   - Efficient storage patterns
   - Minimal state changes

3. **Reentrancy Protection**
   - Checks-Effects-Interactions pattern
   - ReentrancyGuard implementation

## Contract Interactions

1. **Creating a Proposal**
   - User must hold governance tokens
   - Proposal must have valid duration
   - Title and description must be non-empty

2. **Voting**
   - Only during active proposal period
   - One vote per token holder
   - Votes are weighted by token balance

3. **Execution**
   - Only after voting period ends
   - Requires majority support
   - Can only be executed once

## Deployment Checklist

1. [ ] Compile contracts
2. [ ] Run test suite
3. [ ] Deploy to testnet
4. [ ] Verify contract addresses
5. [ ] Update frontend configuration
6. [ ] Test end-to-end functionality

## Verification

Verify contracts on Etherscan:
```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "Constructor arguments"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Submit a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 