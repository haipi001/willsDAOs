'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIPFS } from '@/hooks/useIPFS'
import { useWillsNFT } from '@/hooks/useContracts'
import { Plus, Trash2, AlertCircle, CheckCircle, FileText } from 'lucide-react'
import type { WillContent } from '@/lib/ipfs'

interface Beneficiary {
  name: string
  address: string
  allocation: string
  assetType: 'ETH' | 'ERC20' | 'ERC721'
  tokenContract?: string
  tokenId?: string
}

export default function CreateWillPage() {
  const { address, isConnected } = useAccount()
  const { address: contractAddress, abi } = useWillsNFT()
  const { writeContract, data: hash, error: contractError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  
  const { storeWill, isStoring, error: ipfsError, clearError } = useIPFS()

  // Form states
  const [willTitle, setWillTitle] = useState('')
  const [willContent, setWillContent] = useState('')
  const [executorAddress, setExecutorAddress] = useState('')
  const [executorInstructions, setExecutorInstructions] = useState('')
  const [emergencyDelay, setEmergencyDelay] = useState('30') // days
  const [encryptionMethod, setEncryptionMethod] = useState<'wallet' | 'password'>('wallet')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { name: '', address: '', allocation: '', assetType: 'ETH' }
  ])

  const [currentTab, setCurrentTab] = useState('basic')
  const [createdWillHash, setCreatedWillHash] = useState<string | null>(null)

  // Add beneficiary
  const addBeneficiary = () => {
    setBeneficiaries([...beneficiaries, { name: '', address: '', allocation: '', assetType: 'ETH' }])
  }

  // Remove beneficiary
  const removeBeneficiary = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index))
  }

  // Update beneficiary
  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string) => {
    const updated = beneficiaries.map((b, i) => 
      i === index ? { ...b, [field]: value } : b
    )
    setBeneficiaries(updated)
  }

  // Validate form
  const validateForm = (): string[] => {
    const errors: string[] = []
    
    if (!willTitle.trim()) errors.push('Will title is required')
    if (!willContent.trim()) errors.push('Will content is required')
    if (!executorAddress.trim()) errors.push('Executor address is required')
    if (executorAddress === address) errors.push('You cannot be your own executor')
    if (!executorInstructions.trim()) errors.push('Executor instructions are required')
    
    if (encryptionMethod === 'password') {
      if (!password) errors.push('Password is required for encryption')
      if (password !== confirmPassword) errors.push('Passwords do not match')
      if (password.length < 8) errors.push('Password must be at least 8 characters')
    }
    
    const invalidBeneficiaries = beneficiaries.filter(b => 
      !b.name.trim() || !b.address.trim() || !b.allocation.trim()
    )
    if (invalidBeneficiaries.length > 0) {
      errors.push('All beneficiary fields must be completed')
    }
    
    return errors
  }

  // Create will
  const handleCreateWill = async () => {
    clearError()
    
    // Validate form
    const errors = validateForm()
    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'))
      return
    }

    if (!contractAddress || !address) {
      alert('Contract not available or wallet not connected')
      return
    }

    try {
      // Prepare will content
      const willData: WillContent = {
        title: willTitle,
        content: willContent,
        beneficiaries,
        executorInstructions,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }

      // Store encrypted will to IPFS
      const ipfsHash = await storeWill(
        willData, 
        encryptionMethod === 'password' ? password : undefined
      )

      if (!ipfsHash) {
        throw new Error('Failed to store will to IPFS')
      }

      // Convert days to seconds for emergency delay
      const emergencyDelaySeconds = BigInt(parseInt(emergencyDelay) * 24 * 60 * 60)

      // Create will NFT
      writeContract({
        address: contractAddress,
        abi: abi,
        functionName: 'createWill',
        args: [ipfsHash, executorAddress as `0x${string}`, emergencyDelaySeconds],
      })

      setCreatedWillHash(ipfsHash)
      
    } catch (error) {
      console.error('Failed to create will:', error)
      alert('Failed to create will: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle>Wallet Connection Required</CardTitle>
              <CardDescription>
                Please connect your wallet to create a will
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Create Your Will</h1>
            <p className="text-muted-foreground">
              Secure your legacy with blockchain technology and decentralized storage
            </p>
          </div>

          {/* Success Message */}
          {isConfirmed && createdWillHash && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Will created successfully!</strong>
                <br />
                IPFS Hash: {createdWillHash}
                <br />
                Transaction Hash: {hash}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Messages */}
          {(contractError || ipfsError) && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {contractError?.message || ipfsError}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Will Creation Form
              </CardTitle>
              <CardDescription>
                Fill out all required information to create your decentralized will
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
                  <TabsTrigger value="executor">Executor</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                {/* Basic Information */}
                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label htmlFor="willTitle">Will Title *</Label>
                    <Input
                      id="willTitle"
                      value={willTitle}
                      onChange={(e) => setWillTitle(e.target.value)}
                      placeholder="My Last Will and Testament"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="willContent">Will Content *</Label>
                    <Textarea
                      id="willContent"
                      value={willContent}
                      onChange={(e) => setWillContent(e.target.value)}
                      placeholder="I, [Your Name], being of sound mind and body, hereby declare this to be my last will and testament..."
                      className="mt-1 min-h-[200px]"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Write your complete will document. This will be encrypted and stored securely.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentTab('beneficiaries')}>
                      Next: Beneficiaries
                    </Button>
                  </div>
                </TabsContent>

                {/* Beneficiaries */}
                <TabsContent value="beneficiaries" className="space-y-4">
                  <div>
                    <Label>Beneficiaries *</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add people or entities who will receive assets according to your will
                    </p>
                    
                    {beneficiaries.map((beneficiary, index) => (
                      <Card key={index} className="p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={beneficiary.name}
                              onChange={(e) => updateBeneficiary(index, 'name', e.target.value)}
                              placeholder="John Doe"
                            />
                          </div>
                          
                          <div>
                            <Label>Wallet Address</Label>
                            <Input
                              value={beneficiary.address}
                              onChange={(e) => updateBeneficiary(index, 'address', e.target.value)}
                              placeholder="0x..."
                            />
                          </div>
                          
                          <div>
                            <Label>Asset Type</Label>
                            <Select
                              value={beneficiary.assetType}
                              onValueChange={(value: 'ETH' | 'ERC20' | 'ERC721') => 
                                updateBeneficiary(index, 'assetType', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ETH">ETH</SelectItem>
                                <SelectItem value="ERC20">ERC20 Token</SelectItem>
                                <SelectItem value="ERC721">NFT</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Allocation</Label>
                            <Input
                              value={beneficiary.allocation}
                              onChange={(e) => updateBeneficiary(index, 'allocation', e.target.value)}
                              placeholder={
                                beneficiary.assetType === 'ETH' ? '1.5 ETH' :
                                beneficiary.assetType === 'ERC20' ? '1000 tokens' : 
                                'Token ID'
                              }
                            />
                          </div>
                          
                          {beneficiary.assetType !== 'ETH' && (
                            <div className="md:col-span-2">
                              <Label>Token Contract Address</Label>
                              <Input
                                value={beneficiary.tokenContract || ''}
                                onChange={(e) => updateBeneficiary(index, 'tokenContract', e.target.value)}
                                placeholder="0x..."
                              />
                            </div>
                          )}
                        </div>
                        
                        {beneficiaries.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => removeBeneficiary(index)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </Card>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addBeneficiary}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Beneficiary
                    </Button>
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentTab('basic')}
                    >
                      Previous
                    </Button>
                    <Button onClick={() => setCurrentTab('executor')}>
                      Next: Executor
                    </Button>
                  </div>
                </TabsContent>

                {/* Executor */}
                <TabsContent value="executor" className="space-y-4">
                  <div>
                    <Label htmlFor="executorAddress">Executor Wallet Address *</Label>
                    <Input
                      id="executorAddress"
                      value={executorAddress}
                      onChange={(e) => setExecutorAddress(e.target.value)}
                      placeholder="0x..."
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This person will be authorized to execute your will when the time comes
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="executorInstructions">Instructions for Executor *</Label>
                    <Textarea
                      id="executorInstructions"
                      value={executorInstructions}
                      onChange={(e) => setExecutorInstructions(e.target.value)}
                      placeholder="Detailed instructions for the executor on how to handle the will execution..."
                      className="mt-1 min-h-[120px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="emergencyDelay">Emergency Delay (days)</Label>
                    <Input
                      id="emergencyDelay"
                      type="number"
                      min="30"
                      max="365"
                      value={emergencyDelay}
                      onChange={(e) => setEmergencyDelay(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      After this period, anyone can execute the will in case the designated executor is unavailable
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentTab('beneficiaries')}
                    >
                      Previous
                    </Button>
                    <Button onClick={() => setCurrentTab('security')}>
                      Next: Security
                    </Button>
                  </div>
                </TabsContent>

                {/* Security */}
                <TabsContent value="security" className="space-y-4">
                  <div>
                    <Label>Encryption Method *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose how your will content will be encrypted before storage
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="wallet"
                          name="encryption"
                          value="wallet"
                          checked={encryptionMethod === 'wallet'}
                          onChange={() => setEncryptionMethod('wallet')}
                        />
                        <Label htmlFor="wallet" className="cursor-pointer">
                          <strong>Wallet Signature (Recommended)</strong>
                          <br />
                          <span className="text-sm text-muted-foreground">
                            Uses your wallet to generate a unique encryption key
                          </span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="password"
                          name="encryption"
                          value="password"
                          checked={encryptionMethod === 'password'}
                          onChange={() => setEncryptionMethod('password')}
                        />
                        <Label htmlFor="password" className="cursor-pointer">
                          <strong>Custom Password</strong>
                          <br />
                          <span className="text-sm text-muted-foreground">
                            Set a custom password for encryption
                          </span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  {encryptionMethod === 'password' && (
                    <>
                      <div>
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter a strong password"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentTab('executor')}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={handleCreateWill}
                      disabled={isPending || isStoring || isConfirming}
                      size="lg"
                    >
                      {isPending || isStoring ? 'Creating Will...' :
                       isConfirming ? 'Confirming...' : 'Create Will'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}