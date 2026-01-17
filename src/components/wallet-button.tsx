'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const formatAddress = (addr: string) => {
    // 从 0x 后面开始显示，只显示2位
    const withoutPrefix = addr.startsWith('0x') ? addr.slice(2) : addr;
    return `${withoutPrefix.slice(0, 2)}...${withoutPrefix.slice(-2)}`;
  };

  const monadChainId = 10143;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {!isConnected ? (
        <Button
          variant="default"
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
          className={`${chainId === monadChainId
            ? 'border-green-500 text-green-400'
            : 'border-red-500 text-red-400'
            } hover:bg-slate-800 transition-all`}
          onClick={() => {
            if (chainId !== monadChainId) {
              switchChain({ chainId: monadChainId });
            } else {
              disconnect();
            }
          }}
        >
          <Wallet className="h-4 w-4 mr-2" />
          {chainId === monadChainId ? formatAddress(address!) : 'Wrong Network'}
          {chainId === monadChainId ? <LogOut className="h-4 w-4 ml-2" /> : null}
        </Button>
      )}
    </>
  );
}
