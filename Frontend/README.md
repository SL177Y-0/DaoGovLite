## DaoGovLite

A decentralized governance application built on Ethereum, enabling token holders to create, vote on, and execute proposals in a transparent and decentralized manner.

## Features

- **Wallet Connection**: Connect with MetaMask or other Web3 wallets
- **Proposal Creation**: Create governance proposals with customizable voting periods
- **Token-Weighted Voting**: Cast votes with weight proportional to your token holdings
- **Real-time Updates**: View proposal status, voting results, and timers in real-time
- **On-chain Execution**: Execute passed proposals directly through the application
- **Responsive Design**: Fully responsive interface with a sleek, modern aesthetic

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Smart Contracts**: Solidity (ERC-20 Governance Token & DAO Governance contract)
- **Web3 Integration**: ethers.js for blockchain interaction
- **Styling**: Custom Tailwind components with glassmorphism effects

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MetaMask or another Web3 wallet
- Access to Ethereum (mainnet, testnet, or local network)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/
   cd /NextJS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_DEFAULT_NETWORK=sepolia
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

### Connecting Your Wallet

1. Click the "Connect Wallet" button in the sidebar
2. Approve the connection request in your wallet

### Creating a Proposal

1. Navigate to "Create Proposal" in the sidebar
2. Fill in the proposal title and description
3. Set the voting period (in days)
4. Submit the proposal

### Voting on Proposals

1. Browse active proposals on the homepage
2. Click on a proposal to view details
3. Cast your vote "For" or "Against"

### Executing Proposals

1. Navigate to the "Execution" page
2. Find proposals in the "Ready for Execution" section
3. Click "Execute" on any passed proposal

## Smart Contract Integration

The application interacts with two main contracts:

- **GovernanceToken**: ERC-20 token that grants voting power
- **DAOGovLite**: Handles proposal creation, voting, and execution

Contract ABIs are stored in the `lib/contracts` directory.

## Folder Structure

```
NextJS/
├── app/                # Next.js 14 app directory
│   ├── create-proposal/ # Proposal creation page
│   ├── execution/       # Proposal execution page
│   ├── proposals/       # Proposal details pages
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Homepage
├── components/          # Reusable React components
├── contexts/            # React contexts (Web3Context)
├── lib/                 # Utility functions and contract ABIs
│   ├── contracts/       # Smart contract ABIs and addresses
│   ├── types.ts         # TypeScript type definitions
│   └── utils.ts         # Helper functions
├── public/              # Static assets
└── README.md            # Project documentation
```
