import { useReadContract, useWriteContract, useAccount, useChainId } from 'wagmi'
import { parseEther } from 'viem'
import { useState, useEffect } from 'react'
import WillsNFTABI from '@/artifacts/contracts/WillsNFT.sol/WillsNFT.json'
import WillExecutorABI from '@/artifacts/contracts/WillExecutor.sol/WillExecutor.json'

// Hook to get contract addresses based on current chain and deployment file
export function useContractAddresses() {
  const chainId = useChainId()
  const [addresses, setAddresses] = useState<{
    willsNFT: string | undefined
    willExecutor: string | undefined
  }>({ willsNFT: undefined, willExecutor: undefined })
  
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        // Try to load from deployment file first
        const response = await fetch('/api/deployment-addresses')
        if (response.ok) {
          const deployment = await response.json()
          if (deployment.contracts) {
            setAddresses({
              willsNFT: deployment.contracts.WillsNFT?.address,
              willExecutor: deployment.contracts.WillExecutor?.address,
            })
            return
          }
        }
        
        // Fall back to default local addresses for development
        setAddresses({
          willsNFT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          willExecutor: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        })
      } catch (error) {
        console.error('Error loading contract addresses:', error)
        // Use default hardhat deployment addresses
        setAddresses({
          willsNFT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          willExecutor: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        })
      }
    }
    
    loadAddresses()
  }, [chainId])
  
  return addresses
}

// WillsNFT Contract Hooks
export function useWillsNFT() {
  const { willsNFT } = useContractAddresses()
  
  return {
    address: willsNFT as `0x${string}` | undefined,
    abi: WillsNFTABI.abi,
  }
}

export function useWillExecutor() {
  const { willExecutor } = useContractAddresses()
  
  return {
    address: willExecutor as `0x${string}` | undefined,
    abi: WillExecutorABI.abi,
  }
}

// Read hooks for WillsNFT
export function useGetNextTokenId() {
  const contract = useWillsNFT()
  
  return useReadContract({
    ...contract,
    functionName: 'getNextTokenId',
  })
}

export function useGetUserWills(userAddress?: string) {
  const contract = useWillsNFT()
  
  return useReadContract({
    ...contract,
    functionName: 'getUserWills',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    }
  })
}

export function useGetWillData(tokenId?: bigint) {
  const contract = useWillsNFT()
  
  return useReadContract({
    ...contract,
    functionName: 'getWillData',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    }
  })
}

export function useCanEmergencyExecute(tokenId?: bigint) {
  const contract = useWillsNFT()
  
  return useReadContract({
    ...contract,
    functionName: 'canEmergencyExecute',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    }
  })
}

// Write hooks for WillsNFT
export function useCreateWill() {
  const contract = useWillsNFT()
  
  return useWriteContract()
}

export function useUpdateWill() {
  const contract = useWillsNFT()
  
  return useWriteContract()
}

export function useUpdateExecutor() {
  const contract = useWillsNFT()
  
  return useWriteContract()
}

export function useExecuteWill() {
  const contract = useWillsNFT()
  
  return useWriteContract()
}

// Read hooks for WillExecutor
export function useGetExecutionStatus(tokenId?: bigint) {
  const contract = useWillExecutor()
  
  return useReadContract({
    ...contract,
    functionName: 'getExecutionStatus',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    }
  })
}

export function useCanExecuteWill(tokenId?: bigint) {
  const contract = useWillExecutor()
  
  return useReadContract({
    ...contract,
    functionName: 'canExecuteWill',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    }
  })
}

// Write hooks for WillExecutor
export function useExecuteWillWithInstructions() {
  const contract = useWillExecutor()
  
  return useWriteContract()
}

export function useEmergencyExecuteWill() {
  const contract = useWillExecutor()
  
  return useWriteContract()
}

// Types for better TypeScript support
export interface WillData {
  ipfsHash: string
  creator: string
  executor: string
  createdAt: bigint
  lastUpdateAt: bigint
  emergencyDelay: bigint
  isExecuted: boolean
}

export interface ExecutionStatus {
  isExecuted: boolean
  isInitiated: boolean
  executionTimestamp: bigint
  executor: string
  failureReason: string
}

export interface ExecutionInstruction {
  ethDistributions: Array<{
    beneficiary: string
    amount: bigint
  }>
  erc20Distributions: Array<{
    beneficiary: string
    tokenContract: string
    amount: bigint
  }>
  erc721Distributions: Array<{
    beneficiary: string
    tokenContract: string
    tokenId: bigint
  }>
  instructionHash: string
}