# VoteVerse Frontend

VoteVerse is a decentralized governance platform that allows users to create, vote on, and execute proposals on the blockchain. This is the frontend application built with React, TypeScript, and ethers.js.

## Features

- 🏠 Home page with active proposals overview
- 📝 Create new proposals
- ✅ Vote on active proposals
- ⚡ Execute passed proposals
- 💼 Wallet integration with MetaMask
- 🔄 Real-time updates for proposal status
- 🎨 Modern and responsive UI

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask wallet extension
- Access to a supported blockchain network (Sepolia, Goerli, or Localhost)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/voteverse.git
cd voteverse/Frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory with the following variables:
```env
VITE_DAO_CONTRACT_ADDRESS=your_contract_address
VITE_TOKEN_CONTRACT_ADDRESS=your_token_contract_address
VITE_RPC_URL=your_rpc_url
```

## Development

To start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Project Structure

```
Frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Web3, etc.)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and services
│   ├── pages/          # Page components
│   └── styles/         # Global styles and themes
├── public/             # Static assets
└── index.html          # Entry HTML file
```

## Usage Guide

1. **Connecting Wallet**
   - Click the wallet icon in the sidebar
   - Connect your MetaMask wallet
   - Ensure you're on the correct network

2. **Viewing Proposals**
   - Active proposals are shown on the home page
   - Click "View All" to see all proposals
   - Each proposal card shows:
     - Title
     - Status
     - Time remaining
     - Vote counts

3. **Creating Proposals**
   - Navigate to "Create Proposal"
   - Fill in the proposal details:
     - Title
     - Description
     - Duration (in days)
   - Submit the proposal

4. **Voting**
   - Select an active proposal
   - Choose to vote "For" or "Against"
   - Confirm the transaction in MetaMask

5. **Executing Proposals**
   - Navigate to the Execution page
   - View proposals that have passed
   - Click "Execute" to execute a proposal
   - Confirm the transaction in MetaMask

## Troubleshooting

1. **Wallet Connection Issues**
   - Ensure MetaMask is installed and unlocked
   - Check if you're on the correct network
   - Try refreshing the page

2. **Transaction Failures**
   - Check your wallet balance
   - Ensure you have enough gas
   - Verify network congestion

3. **UI Issues**
   - Clear browser cache
   - Try a different browser
   - Check console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Environment Variables

The application now uses environment variables for configuration. Copy the `.env.example` file to `.env` and modify the values as needed:

```bash
cp .env.example .env
```

### Available Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| REACT_APP_DEFAULT_NETWORK | Default network to connect to | SEPOLIA |
| REACT_APP_USE_CUSTOM_RPC | Whether to use custom RPC endpoints | true |
| REACT_APP_RPC_LOCALHOST | RPC endpoint for local development | http://localhost:8545 |
| REACT_APP_RPC_MAINNET | RPC endpoint for Ethereum Mainnet | https://eth-mainnet.public.blastapi.io |
| REACT_APP_RPC_SEPOLIA | RPC endpoint for Sepolia Testnet | https://eth-sepolia.g.alchemy.com/v2/demo |
| REACT_APP_CONTRACT_DAO_* | Contract addresses for the DAO contract | See .env.example |
| REACT_APP_CONTRACT_TOKEN_* | Contract addresses for the Token contract | See .env.example |
| REACT_APP_CACHE_* | Cache duration settings in milliseconds | See .env.example |

## Recent Fixes

### Proposal Data Error Handling

- Fixed error: `TypeError: Cannot read properties of undefined (reading 'endTime')` 
- Added null checking for proposal data before accessing properties
- Improved error handling in the `getProposalById` function

### Wallet Connection

- Modified auto-connect behavior to be less aggressive
- Only auto-connect if the user has explicitly connected before (using localStorage)
- Fixed dependencies in React hook functions
- Added safeguards to prevent multiple simultaneous connection attempts

### Configuration Management

- Moved sensitive URLs and contract addresses to environment variables
- Created `.env.example` for documentation and easy setup
- Improved caching system with configurable durations 