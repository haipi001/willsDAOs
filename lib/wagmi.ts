import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  hardhat,
} from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'WillsDAO - Decentralized Will Management',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia, hardhat],
  ssr: true, // If your dApp uses server side rendering (SSR)
})

// Contract addresses - these would be updated with deployed contract addresses
export const CONTRACT_ADDRESSES = {
  [sepolia.id]: {
    willsNFT: '0x0000000000000000000000000000000000000000', // Replace with deployed address
    willExecutor: '0x0000000000000000000000000000000000000000', // Replace with deployed address
  },
  [hardhat.id]: {
    willsNFT: '0x0000000000000000000000000000000000000000', // Replace with local deployment
    willExecutor: '0x0000000000000000000000000000000000000000', // Replace with local deployment
  },
  // Add other networks as needed
}

export const SUPPORTED_CHAINS = [sepolia, hardhat] // Chains we actually support