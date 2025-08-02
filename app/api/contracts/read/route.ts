import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http()
})

export async function POST(request: NextRequest) {
  try {
    const { address, abi, functionName, args } = await request.json()

    if (!address || !abi || !functionName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const result = await publicClient.readContract({
      address: address as `0x${string}`,
      abi,
      functionName,
      args: args || []
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Contract read error:', error)
    return NextResponse.json(
      { error: 'Failed to read contract', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}