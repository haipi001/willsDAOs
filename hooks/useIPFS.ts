import { useState, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { 
  ipfsService, 
  encryptAndStoreWill, 
  retrieveAndDecryptWill,
  storeFileToIPFS,
  retrieveFileFromIPFS,
  type WillContent 
} from '@/lib/ipfs'
import { WalletEncryption, EncryptionService } from '@/lib/encryption'

interface UseIPFSReturn {
  // States
  isStoring: boolean
  isRetrieving: boolean
  error: string | null
  
  // Functions
  storeWill: (willContent: WillContent, password?: string) => Promise<string | null>
  retrieveWill: (ipfsHash: string, password?: string) => Promise<{ willContent: WillContent; metadata: any } | null>
  storeFile: (file: File) => Promise<string | null>
  retrieveFile: (ipfsHash: string) => Promise<Uint8Array | null>
  clearError: () => void
}

export function useIPFS(): UseIPFSReturn {
  const [isStoring, setIsStoring] = useState(false)
  const [isRetrieving, setIsRetrieving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const storeWill = useCallback(async (
    willContent: WillContent, 
    password?: string
  ): Promise<string | null> => {
    if (!address) {
      setError('Wallet not connected')
      return null
    }

    setIsStoring(true)
    setError(null)

    try {
      let encryptionKey = password

      // If no password provided, derive one from wallet signature
      if (!encryptionKey) {
        const message = WalletEncryption.createSigningMessage(
          willContent.title, 
          willContent.createdAt
        )
        
        try {
          const signature = await signMessageAsync({ message })
          encryptionKey = await WalletEncryption.deriveKeyFromSignature(message, signature)
        } catch (signError) {
          setError('Failed to sign message for encryption')
          return null
        }
      }

      const ipfsHash = await encryptAndStoreWill(
        willContent,
        encryptionKey,
        address
      )

      // Pin the content for persistence
      await ipfsService.pinContent(ipfsHash)

      return ipfsHash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store will'
      setError(errorMessage)
      return null
    } finally {
      setIsStoring(false)
    }
  }, [address, signMessageAsync])

  const retrieveWill = useCallback(async (
    ipfsHash: string, 
    password?: string
  ): Promise<{ willContent: WillContent; metadata: any } | null> => {
    if (!address) {
      setError('Wallet not connected')
      return null
    }

    if (!ipfsService.isValidIPFSHash(ipfsHash)) {
      setError('Invalid IPFS hash format')
      return null
    }

    setIsRetrieving(true)
    setError(null)

    try {
      let decryptionKey = password

      // If no password provided, try to derive from wallet signature
      if (!decryptionKey) {
        try {
          // First try to get metadata to determine creation details
          const tempResult = await retrieveAndDecryptWill(ipfsHash, 'temp')
          // This will fail but we can catch it and prompt for signature
        } catch {
          // Prompt for signature to derive key
          const message = WalletEncryption.createSigningMessage(
            'Unknown Will', // We don't know the title yet
            new Date().toISOString()
          )
          
          try {
            const signature = await signMessageAsync({ message })
            decryptionKey = await WalletEncryption.deriveKeyFromSignature(message, signature)
          } catch (signError) {
            setError('Failed to sign message for decryption')
            return null
          }
        }
      }

      if (!decryptionKey) {
        setError('Decryption key required')
        return null
      }

      const result = await retrieveAndDecryptWill(ipfsHash, decryptionKey)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve will'
      setError(errorMessage)
      return null
    } finally {
      setIsRetrieving(false)
    }
  }, [address, signMessageAsync])

  const storeFile = useCallback(async (file: File): Promise<string | null> => {
    setIsStoring(true)
    setError(null)

    try {
      const ipfsHash = await storeFileToIPFS(file)
      await ipfsService.pinContent(ipfsHash)
      return ipfsHash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store file'
      setError(errorMessage)
      return null
    } finally {
      setIsStoring(false)
    }
  }, [])

  const retrieveFile = useCallback(async (ipfsHash: string): Promise<Uint8Array | null> => {
    if (!ipfsService.isValidIPFSHash(ipfsHash)) {
      setError('Invalid IPFS hash format')
      return null
    }

    setIsRetrieving(true)
    setError(null)

    try {
      const fileContent = await retrieveFileFromIPFS(ipfsHash)
      return fileContent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve file'
      setError(errorMessage)
      return null
    } finally {
      setIsRetrieving(false)
    }
  }, [])

  return {
    isStoring,
    isRetrieving,
    error,
    storeWill,
    retrieveWill,
    storeFile,
    retrieveFile,
    clearError
  }
}

// Hook for password management and encryption utilities
interface UseEncryptionReturn {
  generatePassword: () => string
  validatePassword: (password: string) => { isValid: boolean; score: number; feedback: string[] }
  encryptText: (text: string, password: string) => string | null
  decryptText: (encryptedText: string, password: string) => string | null
  hashPassword: (password: string) => string
  error: string | null
  clearError: () => void
}

export function useEncryption(): UseEncryptionReturn {
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const generatePassword = useCallback(() => {
    return EncryptionService.generateSecurePassword()
  }, [])

  const validatePassword = useCallback((password: string) => {
    const validation = EncryptionService.derivePasswordFromInput(password)
    return {
      isValid: password.length >= 8,
      score: Math.min(password.length / 2, 5),
      feedback: password.length < 8 ? ['Password must be at least 8 characters'] : []
    }
  }, [])

  const encryptText = useCallback((text: string, password: string): string | null => {
    try {
      setError(null)
      return EncryptionService.encryptText(text, password)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Encryption failed'
      setError(errorMessage)
      return null
    }
  }, [])

  const decryptText = useCallback((encryptedText: string, password: string): string | null => {
    try {
      setError(null)
      return EncryptionService.decryptText(encryptedText, password)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Decryption failed'
      setError(errorMessage)
      return null
    }
  }, [])

  const hashPassword = useCallback((password: string): string => {
    return EncryptionService.hashPassword(password)
  }, [])

  return {
    generatePassword,
    validatePassword,
    encryptText,
    decryptText,
    hashPassword,
    error,
    clearError
  }
}

// Hook for wallet-based encryption
interface UseWalletEncryptionReturn {
  signForEncryption: (willTitle: string) => Promise<string | null>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export function useWalletEncryption(): UseWalletEncryptionReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signMessageAsync } = useSignMessage()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const signForEncryption = useCallback(async (willTitle: string): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const message = WalletEncryption.createSigningMessage(
        willTitle, 
        new Date().toISOString()
      )
      
      const signature = await signMessageAsync({ message })
      const encryptionKey = await WalletEncryption.deriveKeyFromSignature(message, signature)
      
      return encryptionKey
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign for encryption'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [signMessageAsync])

  return {
    signForEncryption,
    isLoading,
    error,
    clearError
  }
}