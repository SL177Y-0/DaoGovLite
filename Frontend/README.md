# DAOGovLite - Frontend Application

This directory contains the frontend application for the DAOGovLite governance platform, providing a user interface for interacting with the blockchain contracts.

## Technology Stack

- **Framework**: Next.js 13 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain Interaction**: ethers.js
- **State Management**: React Context API

## Features

- **Wallet Connection**: Seamless integration with MetaMask and other Web3 wallets
- **Proposal Management**:
  - Create new governance proposals
  - Vote on active proposals
  - Execute passed proposals
- **Dashboard**: View and manage your governance activities
- **Responsive Design**: Works on mobile and desktop devices

## Directory Structure

```
frontend/
├── app/                  # Next.js App Router pages
│   ├── proposals/        # Proposal listing and details
│   ├── execution/        # Proposal execution interface
│   ├── create-proposal/  # Proposal creation form
│   └── layout.tsx        # Main layout component
├── components/           # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── proposal-card.tsx # Proposal display component
│   └── ...
├── contexts/             # React Context providers
│   └── Web3Context.tsx   # Blockchain connectivity
├── contracts/            # Contract ABIs and addresses
│   ├── DAOGovLite-abi.json
│   ├── DAOGovLite-address.json
│   └── ...
├── lib/                  # Utility functions
│   ├── contracts/        # Contract utilities
│   └── utils.ts          # Helper functions
└── styles/               # Global styling
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env.local` file based on `.env.example`:
   ```
   NEXT_PUBLIC_DAO_CONTRACT_ADDRESS=your_dao_contract_address
   NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS=your_token_contract_address
   ```

## Running the Application

Development mode:
```
npm run dev
```

Production build:
```
npm run build
npm start
```

## Contract Integration

The frontend integrates with the blockchain contracts through:

1. **JSON Contract Files**: Located in the `contracts/` directory:
   - ABI files containing contract interfaces
   - Address files with deployed contract addresses

2. **Web3Context**: Provides blockchain connectivity:
   - Wallet connection handling
   - Contract instance creation
   - Transaction management

## Environment Configuration

- Configure contract addresses in `.env.local` file
- Supports multiple networks (localhost, testnet, mainnet)
- Network switching is handled automatically

## Development Notes

- Use `app/` directory for creating new pages (Next.js App Router)
- Component styling is done with Tailwind utility classes
- Contract interaction should be done through the Web3Context 