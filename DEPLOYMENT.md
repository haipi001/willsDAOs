# WillsDAO Deployment Guide

This guide covers the deployment process for WillsDAO smart contracts and frontend application.

## Smart Contract Deployment

### Local Development

1. **Start Hardhat Network**
```bash
npx hardhat node
```

2. **Deploy Contracts**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. **Verify Deployment**
The deployment script will:
- Deploy WillsNFT contract
- Deploy WillExecutor contract
- Authorize the executor contract
- Save deployment addresses to `deployment-addresses.json`

### Testnet Deployment (Sepolia)

1. **Configure Environment**
```bash
# Add to .env.local
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. **Update Hardhat Config**
```javascript
// hardhat.config.js
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

3. **Deploy to Sepolia**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

4. **Verify Contracts**
```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

## Frontend Deployment

### Environment Configuration

Create `.env.local` file:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_wallet_connect_project_id
NEXT_PUBLIC_WILLS_NFT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_WILL_EXECUTOR_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_WILLS_NFT_ADDRESS_SEPOLIA=deployed_sepolia_address
NEXT_PUBLIC_WILL_EXECUTOR_ADDRESS_SEPOLIA=deployed_sepolia_address
```

### Build and Deploy

1. **Build Application**
```bash
npm run build
```

2. **Start Production Server**
```bash
npm start
```

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Environment Variables**
Configure the same environment variables in your Vercel dashboard.

## Post-Deployment Checklist

- [ ] Contracts deployed and verified
- [ ] Frontend deployed and accessible
- [ ] Wallet connection working
- [ ] IPFS integration functional
- [ ] Contract interactions working
- [ ] All pages loading correctly
- [ ] Mobile responsiveness tested
- [ ] Security audit completed (for mainnet)

## Monitoring and Maintenance

### Contract Events
Monitor key contract events:
- WillCreated
- WillUpdated
- WillExecuted
- ViewerAuthorized

### Error Tracking
Set up error tracking for:
- Transaction failures
- IPFS connection issues
- Wallet connection problems
- UI/UX issues

### Analytics
Track key metrics:
- Number of wills created
- Execution success rate
- User engagement
- Gas consumption patterns