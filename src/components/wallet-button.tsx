'use client';

import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, LogOut } from 'lucide-react';

export function WalletButton() {
  const { isConnected, address, connect, disconnect, isConnecting } = useWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <Button 
        onClick={connect} 
        disabled={isConnecting}
        className="bg-purple-600 hover:bg-purple-700 transition-all"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </>
        )}
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      onClick={disconnect}
      className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white transition-all"
    >
      <Wallet className="h-4 w-4 mr-2" />
      {formatAddress(address!)}
      <LogOut className="h-4 w-4 ml-2" />
    </Button>
  );
}
