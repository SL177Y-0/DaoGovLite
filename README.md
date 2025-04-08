
DaoGovLite is a full-stack decentralized governance platform that enables users to create, vote on, and execute proposals on the blockchain. This platform combines a modern React frontend with secure Solidity smart contracts to deliver a complete DAO governance solution.

## 📋 Features

- **Proposal Management**
  - Create proposals with title, description, and voting duration
  - Vote on active proposals (for/against)
  - Execute passed proposals
  - Track proposal lifecycle and status

- **Wallet Integration**
  - Seamless MetaMask integration 
  - Account management and network switching
  - Transaction handling with error recovery

- **Performance Optimizations**
  - Smart caching system to reduce RPC calls
  - Rate limiting to prevent API throttling
  - Circuit breaker pattern for stability

- **User Experience**
  - Real-time updates for proposal status
  - Responsive design for all devices
  - Detailed transaction feedback

## 🏗️ Architecture

The project consists of two main components:

### Smart Contracts (Backend)

- **DAOGovLite**: Main governance contract that handles proposals, voting, and execution
- **GovernanceToken**: ERC20 token that provides voting power to participants

### Frontend Application

- Built with React, TypeScript, and ethers.js
- Communicates with blockchain via Web3 provider
- Features a responsive UI with modern design principles

## 🔍 Technical Overview

### Smart Contracts

The smart contracts implement:
- Proposal creation with configurable parameters
- Secure voting mechanism with one-vote-per-address enforcement
- Time-locked execution system for pending proposals
- Access control based on token holdings

### Frontend

The React application provides:
- Wallet connection and management
- Proposal browsing, filtering, and creation
- Voting interface with real-time status updates
- Execution page for finalized proposals

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask wallet extension
- Access to Ethereum network (Sepolia testnet recommended for testing)

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/your-username/voteverse.git
cd voteverse
```

#### 2. Smart Contracts Setup

```bash
cd Contracts
npm install

# Create .env file with your configuration
cp .env.example .env
# Edit .env with your values
```

Required environment variables for Contracts:
- `PRIVATE_KEY`: Your Ethereum wallet private key for deployment
- `SEPOLIA_RPC_URL`: RPC endpoint for Sepolia testnet
- `ETHERSCAN_API_KEY`: For contract verification (optional)

#### 3. Deploy Smart Contracts

```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Verify contracts (optional)
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "Constructor arguments"
```

#### 4. Frontend Setup

```bash
cd ../Frontend
npm install

# Create .env file with your configuration
cp .env.example .env
# Edit .env with the deployed contract addresses
```

Required environment variables for Frontend:
- `VITE_DEFAULT_NETWORK`: Default network to connect to (e.g., SEPOLIA)
- `VITE_USE_CUSTOM_RPC`: Whether to use custom RPC endpoints
- `VITE_RPC_SEPOLIA`: RPC endpoint for Sepolia Testnet
- `VITE_CONTRACT_DAO_SEPOLIA`: Deployed DAO contract address on Sepolia
- `VITE_CONTRACT_TOKEN_SEPOLIA`: Deployed Token contract address on Sepolia

#### 5. Start the Frontend Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📖 Usage Guide

### Connecting Your Wallet

1. Open the VoteVerse application
2. Click the "Connect Wallet" button in the header
3. Approve the connection request in MetaMask
4. Ensure you're on the correct network (Sepolia testnet for testing)

### Creating a Proposal

1. Navigate to the "Create Proposal" page
2. Fill in the proposal details:
   - Title: A clear and concise title
   - Description: Detailed explanation of the proposal
   - Duration: Voting period length in days
3. Click "Submit Proposal" and confirm the transaction in MetaMask
4. Wait for transaction confirmation

### Voting on Proposals

1. Browse the "Proposals" page to see active proposals
2. Click on a proposal to view details
3. Choose "Vote For" or "Vote Against"
4. Confirm the transaction in MetaMask
5. Your vote will be recorded on the blockchain

### Executing Proposals

1. Navigate to the "Execution" page
2. Browse proposals that have completed their voting period
3. Proposals with majority "For" votes will be executable
4. Click "Execute" on a pending proposal
5. Confirm the transaction in MetaMask

## 🔧 Troubleshooting

### Common Issues

1. **Wallet Connection Problems**
   - Ensure MetaMask is installed and unlocked
   - Verify you're on the correct network (Sepolia for testing)
   - Try disconnecting and reconnecting

2. **Transaction Failures**
   - Check your ETH balance for gas
   - Verify proposal status before voting/executing
   - Check console for detailed error messages

3. **Missing Proposals**
   - Ensure contracts are properly deployed
   - Verify RPC endpoint connectivity
   - Check that you're connected to the correct network

## 🛠️ Development

### Project Structure

```
VoteVerse/
├── Contracts/               # Smart contracts
│   ├── src/                 # Solidity contract files
│   ├── scripts/             # Deployment scripts
│   └── test/                # Contract tests
│
└── Frontend/
    ├── src/
    │   ├── components/      # Reusable UI components
    │   ├── contexts/        # React contexts (Web3, etc.)
    │   ├── hooks/           # Custom React hooks
    │   ├── pages/           # Page components
    │   └── styles/          # Global styles and themes
    ├── public/              # Static assets
    └── index.html           # Entry HTML file
```

### Running Tests

```bash
# Smart contract tests
cd Contracts
npx hardhat test

# Frontend tests
cd Frontend
npm test
```

## 🔐 Security Considerations

- The contracts implement access control mechanisms
- One vote per address per proposal is enforced
- Execution is time-locked until voting completion
- The frontend implements rate limiting and circuit breakers
