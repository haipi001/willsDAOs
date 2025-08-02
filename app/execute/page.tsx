'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWillsNFT, useWillExecutor } from '@/hooks/useContracts'
import { useIPFS } from '@/hooks/useIPFS'
import { Shield, Calendar, FileText, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react'
import type { WillContent } from '@/lib/ipfs'

interface ExecutableWill {
  tokenId: bigint
  owner: string
  ipfsHash: string
  isExecuted: boolean
  emergencyDelay: bigint
  createdAt: bigint
  canExecute: boolean
  canEmergencyExecute: boolean
}

export default function ExecutePage() {
  const { address, isConnected } = useAccount()
  const { address: willsContract, abi: willsAbi } = useWillsNFT()
  const { address: executorContract, abi: executorAbi } = useWillExecutor()
  
  const { writeContract, data: hash, error: contractError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  
  const { retrieveWill } = useIPFS()
  
  const [executableWills, setExecutableWills] = useState<ExecutableWill[]>([])
  const [selectedWill, setSelectedWill] = useState<ExecutableWill | null>(null)
  const [willContent, setWillContent] = useState<WillContent | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionPassword, setExecutionPassword] = useState('')
  const [showExecutionDialog, setShowExecutionDialog] = useState(false)

  // Load executable wills for current user
  useEffect(() => {
    const loadExecutableWills = async () => {
      if (!address || !willsContract) {
        setExecutableWills([])
        return
      }

      try {
        const wills: ExecutableWill[] = []
        
        // Check first 100 tokens for wills where user is executor
        for (let i = 1n; i <= 100n; i++) {
          try {
            // Get will details
            const willResponse = await fetch('/api/contracts/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: willsContract,
                abi: willsAbi,
                functionName: 'getWill',
                args: [i]
              })
            })
            
            if (willResponse.ok) {
              const willData = await willResponse.json()
              if (willData.data) {
                const [ipfsHash, executor, isExecuted, emergencyDelay, createdAt] = willData.data
                
                // Check if current user is the executor
                if (executor.toLowerCase() === address.toLowerCase()) {
                  // Get will owner
                  const ownerResponse = await fetch('/api/contracts/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      address: willsContract,
                      abi: willsAbi,
                      functionName: 'ownerOf',
                      args: [i]
                    })
                  })
                  
                  if (ownerResponse.ok) {
                    const ownerData = await ownerResponse.json()
                    const owner = ownerData.data
                    
                    // Check if can execute normally
                    const canExecuteResponse = await fetch('/api/contracts/read', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        address: willsContract,
                        abi: willsAbi,
                        functionName: 'canExecuteWill',
                        args: [i, address]
                      })
                    })
                    
                    const canExecute = canExecuteResponse.ok ? (await canExecuteResponse.json()).data : false
                    
                    // Check if can emergency execute
                    const now = Math.floor(Date.now() / 1000)
                    const emergencyTime = Number(createdAt) + Number(emergencyDelay)
                    const canEmergencyExecute = now >= emergencyTime && !isExecuted
                    
                    wills.push({
                      tokenId: i,
                      owner,
                      ipfsHash,
                      isExecuted,
                      emergencyDelay,
                      createdAt,
                      canExecute,
                      canEmergencyExecute
                    })
                  }
                }
              }
            }
          } catch (error) {
            // Token doesn't exist, continue
            continue
          }
        }
        
        setExecutableWills(wills)
      } catch (error) {
        console.error('Error loading executable wills:', error)
        setError('Failed to load executable wills')
      }
    }

    loadExecutableWills()
  }, [address, willsContract, willsAbi])

  // Load will content for viewing
  const handleViewWill = async (will: ExecutableWill) => {
    setSelectedWill(will)
    setIsLoadingContent(true)
    setError(null)

    try {
      const content = await retrieveWill(will.ipfsHash, executionPassword || undefined)
      setWillContent(content)
    } catch (error) {
      console.error('Error loading will content:', error)
      setError('Failed to decrypt will content. The will may be password-protected.')
    } finally {
      setIsLoadingContent(false)
    }
  }

  // Execute will
  const handleExecuteWill = async (will: ExecutableWill, isEmergency = false) => {
    if (!willsContract || !address) {
      setError('Contract not available or wallet not connected')
      return
    }

    try {
      const functionName = isEmergency ? 'emergencyExecuteWill' : 'executeWill'
      
      writeContract({
        address: willsContract,
        abi: willsAbi,
        functionName,
        args: [will.tokenId],
      })
      
      setShowExecutionDialog(false)
    } catch (error) {
      console.error('Failed to execute will:', error)
      setError('Failed to execute will: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Format date
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  // Format delay
  const formatDelay = (seconds: bigint) => {
    const days = Number(seconds) / (24 * 60 * 60)
    return `${days} days`
  }

  // Calculate emergency execution date
  const getEmergencyDate = (createdAt: bigint, delay: bigint) => {
    const emergencyTime = Number(createdAt) + Number(delay)
    return new Date(emergencyTime * 1000).toLocaleDateString()
  }

  // Check if emergency period has passed
  const isEmergencyPeriodPassed = (createdAt: bigint, delay: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const emergencyTime = Number(createdAt) + Number(delay)
    return now >= emergencyTime
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
                Please connect your wallet to view executable wills
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Execute Wills</h1>
            <p className="text-muted-foreground">
              Manage and execute wills where you are designated as executor
            </p>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {isConfirmed && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Will executed successfully!</strong>
                <br />
                Transaction Hash: {hash}
              </AlertDescription>
            </Alert>
          )}

          {executableWills.length === 0 ? (
            <Card className="text-center py-16">
              <CardHeader>
                <CardTitle>No Executable Wills</CardTitle>
                <CardDescription>
                  You are not designated as an executor for any wills, or all wills have been executed.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-6">
              {executableWills.map((will) => (
                <Card key={will.tokenId.toString()} className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        Will #{will.tokenId.toString()}
                      </h3>
                      <p className="text-muted-foreground">
                        Owner: {will.owner.slice(0, 6)}...{will.owner.slice(-4)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={will.isExecuted ? 'destructive' : 'default'}>
                        {will.isExecuted ? 'Executed' : 'Pending'}
                      </Badge>
                      {will.canExecute && !will.isExecuted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Ready to Execute
                        </Badge>
                      )}
                      {will.canEmergencyExecute && !will.isExecuted && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          Emergency Executable
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created: {formatDate(will.createdAt)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Emergency after: {formatDelay(will.emergencyDelay)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Emergency date: {getEmergencyDate(will.createdAt, will.emergencyDelay)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          onClick={() => handleViewWill(will)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Will
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Will #{will.tokenId.toString()} - Content</DialogTitle>
                          <DialogDescription>
                            Decrypted will content and executor instructions
                          </DialogDescription>
                        </DialogHeader>
                        
                        {!willContent && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="executionPassword">
                                Password (if will is password-protected)
                              </Label>
                              <Input
                                id="executionPassword"
                                type="password"
                                value={executionPassword}
                                onChange={(e) => setExecutionPassword(e.target.value)}
                                placeholder="Enter password to decrypt will"
                              />
                            </div>
                            <Button onClick={() => handleViewWill(will)}>
                              Load Will Content
                            </Button>
                          </div>
                        )}
                        
                        {isLoadingContent ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : willContent ? (
                          <div className="space-y-6">
                            <div>
                              <h3 className="font-semibold mb-2 text-green-600">Executor Instructions</h3>
                              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                <pre className="whitespace-pre-wrap text-sm">{willContent.executorInstructions}</pre>
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold mb-2">Will Title</h3>
                              <p className="text-sm">{willContent.title}</p>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold mb-2">Beneficiaries & Asset Distribution</h3>
                              <div className="space-y-3">
                                {willContent.beneficiaries.map((beneficiary, index) => (
                                  <div key={index} className="bg-muted p-4 rounded-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <p><strong>Name:</strong> {beneficiary.name}</p>
                                      <p><strong>Address:</strong> {beneficiary.address}</p>
                                      <p><strong>Asset Type:</strong> {beneficiary.assetType}</p>
                                      <p><strong>Allocation:</strong> {beneficiary.allocation}</p>
                                      {beneficiary.tokenContract && (
                                        <p><strong>Token Contract:</strong> {beneficiary.tokenContract}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold mb-2">Full Will Content</h3>
                              <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm">{willContent.content}</pre>
                              </div>
                            </div>
                          </div>
                        ) : error && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              {error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </DialogContent>
                    </Dialog>

                    {!will.isExecuted && will.canExecute && (
                      <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <Shield className="h-4 w-4 mr-2" />
                            Execute Will
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Will Execution</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to execute Will #{will.tokenId.toString()}? 
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="flex gap-3 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => setShowExecutionDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleExecuteWill(will)}
                              disabled={isPending || isConfirming}
                            >
                              {isPending || isConfirming ? 'Executing...' : 'Confirm Execution'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {!will.isExecuted && will.canEmergencyExecute && (
                      <Button
                        variant="destructive"
                        onClick={() => handleExecuteWill(will, true)}
                        disabled={isPending || isConfirming}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Emergency Execute
                      </Button>
                    )}
                  </div>

                  {isEmergencyPeriodPassed(will.createdAt, will.emergencyDelay) && !will.isExecuted && (
                    <Alert className="mt-4 border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <strong>Emergency period has passed.</strong> This will can now be executed by anyone if the designated executor is unavailable.
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}