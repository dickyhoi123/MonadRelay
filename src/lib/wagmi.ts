import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

// 自定义 Monad Testnet 链配置
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
} as const;

// 配置 - 仅使用 Monad Testnet
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
