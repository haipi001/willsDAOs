import { hardhat, sepolia } from 'wagmi/chains'

// Import contract ABIs
import WillsNFTABI from '../artifacts/contracts/WillsNFT.sol/WillsNFT.json'
import WillExecutorABI from '../artifacts/contracts/WillExecutor.sol/WillExecutor.json'

// Contract addresses configuration
export const CONTRACT_ADDRESSES = {
  [hardhat.id]: {
    willsNFT: process.env.NEXT_PUBLIC_WILLS_NFT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default Hardhat deployment
    willExecutor: process.env.NEXT_PUBLIC_WILL_EXECUTOR_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Default Hardhat deployment
  },
  [sepolia.id]: {
    willsNFT: process.env.NEXT_PUBLIC_WILLS_NFT_ADDRESS_SEPOLIA || '0x0000000000000000000000000000000000000000',
    willExecutor: process.env.NEXT_PUBLIC_WILL_EXECUTOR_ADDRESS_SEPOLIA || '0x0000000000000000000000000000000000000000',
  },
}

// Contract configurations with ABIs
export const WILLS_NFT_CONTRACT = {
  address: CONTRACT_ADDRESSES,
  abi: WillsNFTABI.abi,
} as const

export const WILL_EXECUTOR_CONTRACT = {
  address: CONTRACT_ADDRESSES,
  abi: WillExecutorABI.abi,
} as const

// Helper functions to get contract addresses for current chain
export function getWillsNFTAddress(chainId: number): string {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  return addresses.willsNFT
}

export function getWillExecutorAddress(chainId: number): string {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  return addresses.willExecutor
}

// Load deployment addresses from local file (for development)
export async function loadDeploymentAddresses() {
  try {
    const response = await fetch('/api/deployment-addresses')
    if (response.ok) {
      const deployment = await response.json()
      return deployment
    }
  } catch (error) {
    console.warn('Could not load deployment addresses:', error)
  }
  return null
}