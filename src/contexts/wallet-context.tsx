'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAccount } from 'wagmi';

interface WalletContextType {
  isConnected: boolean;
  address: `0x${string}` | null;
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  address: null,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const { isConnected, address } = useAccount();

  return (
    <WalletContext.Provider value={{ isConnected, address: address || null }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
