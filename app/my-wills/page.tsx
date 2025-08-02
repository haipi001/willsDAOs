'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useWillsNFT } from '@/hooks/useContracts'
import { useIPFS } from '@/hooks/useIPFS'
import { FileText, Eye, Edit, Clock, Shield, AlertCircle, Calendar } from 'lucide-react'
import Link from 'next/link'
import type { WillContent } from '@/lib/ipfs'

interface Will {
  tokenId: bigint
  ipfsHash: string
  executor: string
  isExecuted: boolean
  emergencyDelay: bigint
  createdAt: bigint
}

export default function MyWillsPage() {
  const { address, isConnected } = useAccount()
  const { address: contractAddress, abi } = useWillsNFT()
  const { retrieveWill } = useIPFS()
  
  const [wills, setWills] = useState<Will[]>([])
  const [selectedWill, setSelectedWill] = useState<Will | null>(null)
  const [willContent, setWillContent] = useState<WillContent | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get user's token count
  const { data: tokenCount } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  })

  // Load user's wills
  useEffect(() => {
    const loadUserWills = async () => {
      if (!address || !contractAddress || !tokenCount || tokenCount === 0n) {
        setWills([])
        return
      }

      try {
        const userWills: Will[] = []
        
        // We need to iterate through all tokens to find the user's tokens
        // This is a simplified approach - in production, you'd want to use events or indexing
        for (let i = 1n; i <= 100n; i++) { // Check first 100 tokens
          try {
            // This will throw if token doesn't exist or user doesn't own it
            const response = await fetch('/api/contracts/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: contractAddress,
                abi: abi,
                functionName: 'ownerOf',
                args: [i]
              })
            })
            
            if (response.ok) {
              const result = await response.json()
              if (result.data && result.data.toLowerCase() === address.toLowerCase()) {
                // Get will details
                const willResponse = await fetch('/api/contracts/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    address: contractAddress,
                    abi: abi,
                    functionName: 'getWill',
                    args: [i]
                  })
                })
                
                if (willResponse.ok) {
                  const willData = await willResponse.json()
                  if (willData.data) {
                    const [ipfsHash, executor, isExecuted, emergencyDelay, createdAt] = willData.data
                    userWills.push({
                      tokenId: i,
                      ipfsHash,
                      executor,
                      isExecuted,
                      emergencyDelay,
                      createdAt
                    })
                  }
                }
              }
            }
          } catch (error) {
            // Token doesn't exist or user doesn't own it, continue
            continue
          }
        }
        
        setWills(userWills)
      } catch (error) {
        console.error('Error loading user wills:', error)
        setError('Failed to load your wills')
      }
    }

    loadUserWills()
  }, [address, contractAddress, abi, tokenCount])

  // Load will content
  const handleViewWill = async (will: Will) => {
    setSelectedWill(will)
    setIsLoadingContent(true)
    setError(null)

    try {
      const content = await retrieveWill(will.ipfsHash)
      setWillContent(content)
    } catch (error) {
      console.error('Error loading will content:', error)
      setError('Failed to decrypt will content. Please check your password or wallet connection.')
    } finally {
      setIsLoadingContent(false)
    }
  }

  // Format date
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  // Format emergency delay
  const formatDelay = (seconds: bigint) => {
    const days = Number(seconds) / (24 * 60 * 60)
    return `${days} days`
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
                Please connect your wallet to view your wills
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
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Wills</h1>
              <p className="text-muted-foreground">
                Manage and view your decentralized wills
              </p>
            </div>
            <Link href="/create">
              <Button size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Create New Will
              </Button>
            </Link>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {wills.length === 0 ? (
            <Card className="text-center py-16">
              <CardHeader>
                <CardTitle>No Wills Found</CardTitle>
                <CardDescription>
                  You haven&apos;t created any wills yet. Get started by creating your first will.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/create">
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Create Your First Will
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wills.map((will) => (
                <Card key={will.tokenId.toString()} className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        Will #{will.tokenId.toString()}
                      </CardTitle>
                      <Badge variant={will.isExecuted ? 'destructive' : 'default'}>
                        {will.isExecuted ? 'Executed' : 'Active'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Created {formatDate(will.createdAt)}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Executor: {will.executor.slice(0, 6)}...{will.executor.slice(-4)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Emergency delay: {formatDelay(will.emergencyDelay)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>IPFS: {will.ipfsHash.slice(0, 12)}...</span>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewWill(will)}
                            disabled={will.isExecuted}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Will #{will.tokenId.toString()}</DialogTitle>
                            <DialogDescription>
                              Decrypted will content from IPFS
                            </DialogDescription>
                          </DialogHeader>
                          
                          {isLoadingContent ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : willContent ? (
                            <div className="space-y-6">
                              <div>
                                <h3 className="font-semibold mb-2">Title</h3>
                                <p className="text-sm">{willContent.title}</p>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold mb-2">Will Content</h3>
                                <div className="bg-muted p-4 rounded-lg">
                                  <pre className="whitespace-pre-wrap text-sm">{willContent.content}</pre>
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold mb-2">Beneficiaries</h3>
                                <div className="space-y-2">
                                  {willContent.beneficiaries.map((beneficiary, index) => (
                                    <div key={index} className="bg-muted p-3 rounded-lg text-sm">
                                      <p><strong>Name:</strong> {beneficiary.name}</p>
                                      <p><strong>Address:</strong> {beneficiary.address}</p>
                                      <p><strong>Allocation:</strong> {beneficiary.allocation} {beneficiary.assetType}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold mb-2">Executor Instructions</h3>
                                <div className="bg-muted p-4 rounded-lg">
                                  <pre className="whitespace-pre-wrap text-sm">{willContent.executorInstructions}</pre>
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                <p>Created: {willContent.createdAt}</p>
                                <p>Last Modified: {willContent.lastModified}</p>
                              </div>
                            </div>
                          ) : error && (
                            <Alert className="border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                {error}
                              </AlertDescription>
                            </Alert>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={will.isExecuted}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}