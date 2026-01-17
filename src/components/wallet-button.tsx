'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr: string) => {
    // 从 0x 后面开始显示，只显示2位
    const withoutPrefix = addr.startsWith('0x') ? addr.slice(2) : addr;
    return `${withoutPrefix.slice(0, 2)}...${withoutPrefix.slice(-2)}`;
  };

  return (
    <>
      {!isConnected ? (
        <Button 
          onClick={() => connect({ connector: connectors[0] })}
          disabled={isPending}
          className="bg-purple-600 hover:bg-purple-700 transition-all"
        >
          {isPending ? (
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
      ) : (
        <Button 
          variant="outline" 
          onClick={() => disconnect()}
          className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white transition-all"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {formatAddress(address!)}
          <LogOut className="h-4 w-4 ml-2" />
        </Button>
      )}
    </>
  );
}
