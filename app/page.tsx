'use client'

import { useAccount } from 'wagmi'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollText, Shield, Users, Zap } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const { address, isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-6">
            Decentralized Will Management
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Secure your legacy with blockchain technology. Create, manage, and execute wills with 
            complete decentralization, IPFS storage, and smart contract automation.
          </p>
          {!isConnected ? (
            <div className="space-x-4">
              <Button size="lg" className="text-lg px-8 py-4">
                Get Started
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                Learn More
              </Button>
            </div>
          ) : (
            <div className="space-x-4">
              <Link href="/create">
                <Button size="lg" className="text-lg px-8 py-4">
                  Create Your Will
                </Button>
              </Link>
              <Link href="/my-wills">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                  View My Wills
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Secure & Immutable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your will is stored securely on the blockchain, ensuring it cannot be tampered with or lost.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <UserCheckIcon className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Decentralized Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Will documents are encrypted and stored on IPFS, ensuring permanent accessibility without central control.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Smart Execution</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automated execution through smart contracts with designated executors and emergency protocols.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Access Control</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Fine-grained permissions for viewers and executors with multi-signature security options.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-8">How WillsDAO Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                1
              </div>
              <h3 className="text-xl font-semibold">Create Your Will</h3>
              <p className="text-muted-foreground">
                Write your will document, designate executors, and set emergency conditions.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                2
              </div>
              <h3 className="text-xl font-semibold">Encrypt & Store</h3>
              <p className="text-muted-foreground">
                Your will is encrypted and stored on IPFS, with metadata recorded as an NFT.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                3
              </div>
              <h3 className="text-xl font-semibold">Execute When Needed</h3>
              <p className="text-muted-foreground">
                Designated executors can execute the will, or emergency protocols activate automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section (if connected) */}
        {isConnected && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-8">Your Dashboard</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link href="/my-wills">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>Active Wills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">0</div>
                    <p className="text-muted-foreground">Wills you&apos;ve created</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/execute">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>Executor Roles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">0</div>
                    <p className="text-muted-foreground">Wills you can execute</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Card>
                <CardHeader>
                  <CardTitle>Authorized Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">0</div>
                  <p className="text-muted-foreground">Wills you can view</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Placeholder icon component
function UserCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}