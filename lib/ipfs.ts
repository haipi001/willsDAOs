import { createHelia, type Helia } from 'helia'
import { unixfs, type UnixFS } from '@helia/unixfs'
import { json, type JSON } from '@helia/json'
import CryptoJS from 'crypto-js'
import type { CID } from 'multiformats/cid'

// Types for will data
interface WillContent {
  title: string
  content: string
  beneficiaries: Array<{
    name: string
    address: string
    allocation: string
    assetType: 'ETH' | 'ERC20' | 'ERC721'
    tokenContract?: string
    tokenId?: string
  }>
  executorInstructions: string
  createdAt: string
  lastModified: string
}

interface WillMetadata {
  title: string
  creator: string
  createdAt: string
  lastModified: string
  version: string
}

interface EncryptedWillData {
  encryptedContent: string
  metadata: WillMetadata
}

class IPFSService {
  private helia: Helia | null = null
  private fs: UnixFS | null = null
  private jsonService: JSON | null = null

  async initialize() {
    if (!this.helia) {
      try {
        this.helia = await createHelia()
        this.fs = unixfs(this.helia)
        this.jsonService = json(this.helia)
        console.log('IPFS initialized successfully')
      } catch (error) {
        console.error('Failed to initialize IPFS:', error)
        throw new Error('IPFS initialization failed')
      }
    }
  }

  async shutdown() {
    if (this.helia) {
      await this.helia.stop()
      this.helia = null
      this.fs = null
      this.jsonService = null
    }
  }

  // Encrypt will content with user's password/key
  encryptWillContent(willContent: WillContent, password: string): string {
    try {
      const jsonString = JSON.stringify(willContent)
      const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString()
      return encrypted
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt will content')
    }
  }

  // Decrypt will content
  decryptWillContent(encryptedContent: string, password: string): WillContent {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedContent, password)
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8)
      
      if (!decryptedString) {
        throw new Error('Invalid password or corrupted data')
      }
      
      return JSON.parse(decryptedString)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt will content - check your password')
    }
  }

  // Store encrypted will data to IPFS
  async storeEncryptedWill(
    willContent: WillContent,
    password: string,
    creatorAddress: string
  ): Promise<string> {
    await this.initialize()

    try {
      // Encrypt the will content
      const encryptedContent = this.encryptWillContent(willContent, password)

      // Create metadata (non-sensitive info)
      const encryptedWillData: EncryptedWillData = {
        encryptedContent,
        metadata: {
          title: willContent.title,
          creator: creatorAddress,
          createdAt: willContent.createdAt,
          lastModified: willContent.lastModified,
          version: '1.0'
        }
      }

      // Store to IPFS using JSON service
      const cid = await this.jsonService.add(encryptedWillData)
      console.log('Will stored to IPFS with CID:', cid.toString())
      
      return cid.toString()
    } catch (error) {
      console.error('Failed to store will to IPFS:', error)
      throw new Error('Failed to store will to IPFS')
    }
  }

  // Retrieve and decrypt will data from IPFS
  async retrieveAndDecryptWill(
    ipfsHash: string, 
    password: string
  ): Promise<{ willContent: WillContent; metadata: WillMetadata }> {
    await this.initialize()

    try {
      // Retrieve from IPFS
      const cid = { toString: () => ipfsHash } as CID
      const encryptedWillData: EncryptedWillData = await this.jsonService.get(cid)

      // Decrypt the content
      const willContent = this.decryptWillContent(encryptedWillData.encryptedContent, password)

      return {
        willContent,
        metadata: encryptedWillData.metadata
      }
    } catch (error) {
      console.error('Failed to retrieve will from IPFS:', error)
      throw new Error('Failed to retrieve or decrypt will from IPFS')
    }
  }

  // Store file attachments to IPFS
  async storeFile(file: File): Promise<string> {
    await this.initialize()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      const cid = await this.fs.addFile({
        content: uint8Array
      })

      console.log('File stored to IPFS with CID:', cid.toString())
      return cid.toString()
    } catch (error) {
      console.error('Failed to store file to IPFS:', error)
      throw new Error('Failed to store file to IPFS')
    }
  }

  // Retrieve file from IPFS
  async retrieveFile(ipfsHash: string): Promise<Uint8Array> {
    await this.initialize()

    try {
      const cid = { toString: () => ipfsHash } as CID
      let content = new Uint8Array()
      
      for await (const chunk of this.fs.cat(cid)) {
        const newContent = new Uint8Array(content.length + chunk.length)
        newContent.set(content)
        newContent.set(chunk, content.length)
        content = newContent
      }

      return content
    } catch (error) {
      console.error('Failed to retrieve file from IPFS:', error)
      throw new Error('Failed to retrieve file from IPFS')
    }
  }

  // Generate IPFS gateway URL for viewing
  getGatewayUrl(ipfsHash: string, gateway = 'https://gateway.pinata.cloud'): string {
    return `${gateway}/ipfs/${ipfsHash}`
  }

  // Pin content to ensure persistence (would work with pinning services)
  async pinContent(ipfsHash: string): Promise<void> {
    await this.initialize()

    try {
      const cid = { toString: () => ipfsHash } as CID
      await this.helia.pins.add(cid)
      console.log('Content pinned:', ipfsHash)
    } catch (error) {
      console.error('Failed to pin content:', error)
      // Don't throw here as pinning failure shouldn't break the main flow
    }
  }

  // Validate IPFS hash format
  isValidIPFSHash(hash: string): boolean {
    // Basic validation for IPFS hash format
    const ipfsRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^bafy[a-z2-7]{55}$|^bafk[a-z2-7]{55}$/
    return ipfsRegex.test(hash)
  }
}

// Singleton instance
const ipfsService = new IPFSService()

// Export the service and types
export { ipfsService, type WillContent, type EncryptedWillData }

// Utility functions for easier use
export const encryptAndStoreWill = async (
  willContent: WillContent,
  password: string,
  creatorAddress: string
): Promise<string> => {
  return ipfsService.storeEncryptedWill(willContent, password, creatorAddress)
}

export const retrieveAndDecryptWill = async (
  ipfsHash: string,
  password: string
): Promise<{ willContent: WillContent; metadata: WillMetadata }> => {
  return ipfsService.retrieveAndDecryptWill(ipfsHash, password)
}

export const storeFileToIPFS = async (file: File): Promise<string> => {
  return ipfsService.storeFile(file)
}

export const retrieveFileFromIPFS = async (ipfsHash: string): Promise<Uint8Array> => {
  return ipfsService.retrieveFile(ipfsHash)
}