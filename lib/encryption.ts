import CryptoJS from 'crypto-js'

export class EncryptionService {
  // Generate a secure random password
  static generateSecurePassword(length = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }
    
    return password
  }

  // Generate a password from user input with salt
  static derivePasswordFromInput(userInput: string, salt?: string): string {
    const saltToUse = salt || CryptoJS.lib.WordArray.random(256/8).toString()
    const iterations = 10000
    
    const derivedKey = CryptoJS.PBKDF2(userInput, saltToUse, {
      keySize: 256/32,
      iterations: iterations
    })
    
    return derivedKey.toString()
  }

  // Generate salt for password derivation
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString()
  }

  // Encrypt text with AES
  static encryptText(text: string, password: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(text, password)
      return encrypted.toString()
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt text')
    }
  }

  // Decrypt text with AES
  static decryptText(encryptedText: string, password: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, password)
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
      
      if (!decryptedText) {
        throw new Error('Invalid password or corrupted data')
      }
      
      return decryptedText
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt text')
    }
  }

  // Hash password for verification (without storing the actual password)
  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString()
  }

  // Verify password against hash
  static verifyPassword(password: string, hash: string): boolean {
    const passwordHash = this.hashPassword(password)
    return passwordHash === hash
  }

  // Encrypt file content
  static encryptFile(fileContent: Uint8Array, password: string): string {
    try {
      // Convert Uint8Array to WordArray for CryptoJS
      const wordArray = CryptoJS.lib.WordArray.create(Array.from(fileContent))
      const encrypted = CryptoJS.AES.encrypt(wordArray, password)
      return encrypted.toString()
    } catch (error) {
      console.error('File encryption error:', error)
      throw new Error('Failed to encrypt file')
    }
  }

  // Decrypt file content
  static decryptFile(encryptedContent: string, password: string): Uint8Array {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, password)
      
      if (!decrypted.sigBytes) {
        throw new Error('Invalid password or corrupted file')
      }
      
      // Convert WordArray back to Uint8Array
      const typedArray = new Uint8Array(decrypted.sigBytes)
      for (let i = 0; i < decrypted.sigBytes; i++) {
        typedArray[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
      }
      
      return typedArray
    } catch (error) {
      console.error('File decryption error:', error)
      throw new Error('Failed to decrypt file')
    }
  }

  // Create a secure signature for data integrity
  static createSignature(data: string, secretKey: string): string {
    return CryptoJS.HmacSHA256(data, secretKey).toString()
  }

  // Verify data integrity using signature
  static verifySignature(data: string, signature: string, secretKey: string): boolean {
    const expectedSignature = this.createSignature(data, secretKey)
    return expectedSignature === signature
  }

  // Generate a random encryption key
  static generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString()
  }

  // Split a secret into multiple parts (simple implementation)
  static splitSecret(secret: string, parts: number, threshold: number): string[] {
    if (threshold > parts) {
      throw new Error('Threshold cannot be greater than total parts')
    }
    
    // Simple implementation - in production, use Shamir's Secret Sharing
    const shares: string[] = []
    
    for (let i = 0; i < parts; i++) {
      const shareData = {
        index: i,
        threshold,
        totalParts: parts,
        encryptedSecret: CryptoJS.AES.encrypt(secret, `share-${i}-${Date.now()}`).toString()
      }
      shares.push(JSON.stringify(shareData))
    }
    
    return shares
  }

  // Combine secret parts (simple implementation)
  static combineSecretParts(shares: string[], passwords: string[]): string {
    if (shares.length !== passwords.length) {
      throw new Error('Number of shares and passwords must match')
    }
    
    try {
      // Simple combination - decrypt all shares and verify they match
      let reconstructedSecret = ''
      
      for (let i = 0; i < shares.length; i++) {
        const shareData = JSON.parse(shares[i])
        const decryptedSecret = CryptoJS.AES.decrypt(
          shareData.encryptedSecret, 
          passwords[i]
        ).toString(CryptoJS.enc.Utf8)
        
        if (!reconstructedSecret) {
          reconstructedSecret = decryptedSecret
        } else if (reconstructedSecret !== decryptedSecret) {
          throw new Error('Secret parts do not match')
        }
      }
      
      return reconstructedSecret
    } catch (error) {
      console.error('Secret combination error:', error)
      throw new Error('Failed to combine secret parts')
    }
  }
}

// Password strength validation
export class PasswordValidator {
  static validateStrength(password: string): {
    isValid: boolean
    score: number
    feedback: string[]
  } {
    const feedback: string[] = []
    let score = 0

    // Length check
    if (password.length >= 12) {
      score += 2
    } else if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('Password should be at least 8 characters long')
    }

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1
    else feedback.push('Include lowercase letters')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('Include uppercase letters')

    if (/[0-9]/.test(password)) score += 1
    else feedback.push('Include numbers')

    if (/[^A-Za-z0-9]/.test(password)) score += 1
    else feedback.push('Include special characters')

    // Avoid common patterns
    if (!/(.)\1{2,}/.test(password)) score += 1
    else feedback.push('Avoid repeating characters')

    const isValid = score >= 5
    
    return {
      isValid,
      score,
      feedback
    }
  }

  static generateStrongPassword(): string {
    return EncryptionService.generateSecurePassword(16)
  }
}

// Key derivation for wallet-based encryption
export class WalletEncryption {
  // Derive encryption key from wallet signature
  static async deriveKeyFromSignature(
    message: string,
    signature: string
  ): Promise<string> {
    // Use the signature as entropy for key derivation
    const hash = CryptoJS.SHA256(signature + message)
    return hash.toString()
  }

  // Create a message for wallet signing that includes will metadata
  static createSigningMessage(willTitle: string, createdAt: string): string {
    return `WillsDAO Encryption Key
    
Will Title: ${willTitle}
Created: ${createdAt}
Timestamp: ${Date.now()}

By signing this message, you authorize the creation of an encryption key for your will document.`
  }
}