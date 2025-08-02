import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const deploymentPath = path.join(process.cwd(), 'deployment-addresses.json')
    
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = fs.readFileSync(deploymentPath, 'utf8')
      const deployment = JSON.parse(deploymentData)
      
      return NextResponse.json(deployment)
    } else {
      return NextResponse.json({ error: 'Deployment addresses not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error reading deployment addresses:', error)
    return NextResponse.json({ error: 'Failed to read deployment addresses' }, { status: 500 })
  }
}