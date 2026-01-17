'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createConfig, http } from 'wagmi';
import { monadTestnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// 配置
export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo' }),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
});

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = async () => {
    setIsConnecting(true);
    try {
      // 模拟钱包连接（实际应用中使用 RainbowKit）
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockAddress = '0x' + Math.random().toString(16).slice(2, 42);
      setAddress(mockAddress);
      setIsConnected(true);
      localStorage.setItem('walletAddress', mockAddress);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    localStorage.removeItem('walletAddress');
  };

  useEffect(() => {
    // 检查本地存储的地址
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setAddress(savedAddress);
      setIsConnected(true);
    }
  }, []);

  return (
    <WalletContext.Provider value={{ isConnected, address, connect, disconnect, isConnecting }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
