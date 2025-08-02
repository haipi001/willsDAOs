'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { useTheme } from 'next-themes'

import { config } from '@/lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export function Web3Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  
  const rainbowKitTheme = React.useMemo(() => {
    return theme === 'dark' ? darkTheme() : lightTheme()
  }, [theme])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={rainbowKitTheme}
          appInfo={{
            appName: 'WillsDAO',
            learnMoreUrl: 'https://willsdao.com',
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}