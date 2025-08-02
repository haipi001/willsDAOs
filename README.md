# WillsDAO - Decentralized Will Management System

A complete Web3 application for creating, managing, and executing digital wills using blockchain technology and decentralized storage.

## 🌟 Features

- **Secure Will Creation**: NFT-based will management with ERC-721 standard
- **Decentralized Storage**: IPFS integration for permanent document storage
- **Advanced Encryption**: Client-side AES encryption with wallet or password-based keys
- **Smart Execution**: Automated will execution through smart contracts
- **Access Control**: Fine-grained permissions for viewers and executors
- **Emergency Protocols**: Time-based emergency execution mechanisms
- **Multi-Chain Support**: Ready for Ethereum testnets and mainnet
- **Modern UI**: Beautiful, responsive interface with dark/light mode

## 🏗️ Architecture

### Smart Contracts Layer
- **WillsNFT Contract**: Core will management with ERC-721 NFT standard
- **WillExecutor Contract**: Handles will execution and asset distribution
- **Access Control**: Ownable and ReentrancyGuard security patterns

### Frontend Layer
- **Next.js 15**: React framework with TypeScript
- **Wagmi + RainbowKit**: Web3 wallet integration
- **Shadcn/ui**: Modern component library
- **Responsive Design**: Mobile-first approach

### Storage Layer
- **IPFS (Helia)**: Decentralized file storage
- **Client-side Encryption**: AES encryption before storage
- **Metadata Management**: Efficient data organization

### Integration Layer
- **Ethers.js**: Blockchain interactions
- **Crypto-js**: Client-side encryption
- **TypeScript**: Type-safe development

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Shadcn/ui
- **Web3**: Wagmi, RainbowKit, Ethers.js, Viem
- **Blockchain**: Solidity, Hardhat, OpenZeppelin
- **Storage**: IPFS (Helia)
- **Security**: Crypto-js, OpenZeppelin Security Patterns
- **Testing**: Hardhat Test Suite
- **Build Tool**: Next.js, ESLint, TypeScript

## 📋 Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible wallet
- Git
- Basic understanding of Web3/blockchain

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd willsdao
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env.local` file:
```env
# Wallet Connect Project ID (get from https://walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Contract addresses (will be set after deployment)
NEXT_PUBLIC_WILLS_NFT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_WILL_EXECUTOR_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# For testnet deployment
NEXT_PUBLIC_WILLS_NFT_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_WILL_EXECUTOR_ADDRESS_SEPOLIA=0x...
```

### 4. Run Smart Contract Tests
```bash
npx hardhat test
```

### 5. Deploy Smart Contracts (Local)
```bash
# Start local blockchain
npx hardhat node

# Deploy contracts (in another terminal)
npx hardhat run scripts/deploy.js --network localhost
```

### 6. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📖 Usage Guide

### Creating a Will

1. **Connect Wallet**: Click "Connect Wallet" and choose your preferred wallet
2. **Create Will**: Navigate to "Create Will" and fill out the form:
   - **Basic Info**: Will title and content
   - **Beneficiaries**: Add recipients with asset allocations
   - **Executor**: Designate someone to execute the will
   - **Security**: Choose encryption method (wallet or password)

3. **Review & Submit**: Review all details and submit the transaction

### Managing Wills

- **My Wills**: View all your created wills
- **Edit**: Update will content (before execution)
- **View**: Decrypt and read will contents
- **Share**: Grant viewing access to specific addresses

### Executing Wills

- **Executor Dashboard**: View wills you're designated to execute
- **Execute**: Process will execution and asset distribution
- **Emergency Execution**: Execute after emergency delay period

### Security Features

- **Encryption**: All will content is encrypted before IPFS storage
- **Access Control**: Only authorized parties can view will content
- **Emergency Protocols**: Automatic execution after designated time periods
- **Audit Trail**: All actions recorded on blockchain

## 🧪 Testing

### Smart Contract Tests
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/WillsNFT.test.js
npx hardhat test test/WillExecutor.test.js

# Run with coverage
npx hardhat coverage
```

### Frontend Testing
```bash
# Lint check
npm run lint

# Type check
npm run type-check

# Build test
npm run build
```

## 🚀 Deployment

### Local Development
1. Start Hardhat node: `npx hardhat node`
2. Deploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
3. Start frontend: `npm run dev`

### Testnet Deployment
1. Configure testnet RPC in `hardhat.config.js`
2. Deploy: `npx hardhat run scripts/deploy.js --network sepolia`
3. Update contract addresses in `.env.local`
4. Deploy frontend: `npm run build && npm start`

### Mainnet Deployment
⚠️ **Warning**: Mainnet deployment requires careful consideration of gas costs and thorough testing.

1. Audit smart contracts
2. Test extensively on testnets
3. Configure mainnet RPC
4. Deploy with proper gas fees
5. Verify contracts on Etherscan

## 🔐 Security Considerations

### Smart Contract Security
- ✅ OpenZeppelin security patterns
- ✅ Reentrancy protection
- ✅ Access control mechanisms
- ✅ Emergency pause functionality
- ✅ Comprehensive test coverage

### Frontend Security
- ✅ Client-side encryption
- ✅ Secure key management
- ✅ Input validation and sanitization
- ✅ XSS protection
- ✅ CSRF protection

### Storage Security
- ✅ Encrypted content before IPFS storage
- ✅ Metadata protection
- ✅ Content integrity verification
- ✅ Access control enforcement

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support & Help

### Common Issues
1. **Wallet Connection Issues**: Ensure MetaMask is installed and on the correct network
2. **Transaction Failures**: Check gas settings and account balance
3. **IPFS Errors**: Verify internet connection and IPFS node status
4. **Build Errors**: Clear cache with `rm -rf .next node_modules && npm install`

### Resources
- [Documentation](./docs/)
- [API Reference](./docs/api/)
- [Smart Contract Documentation](./docs/contracts/)
- [Security Best Practices](./docs/security/)

---

**Built with ❤️ for the decentralized future**

*WillsDAO enables secure, transparent, and immutable digital legacy management through blockchain technology.*