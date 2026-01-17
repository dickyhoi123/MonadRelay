import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// 自定义 Monad Testnet 链配置
export const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer-testnet.monad.xyz' },
  },
  testnet: true,
} as const;

// 配置
export const config = getDefaultConfig({
  appName: 'Monad Music',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [monadTestnet],
  ssr: true, // Next.js 需要这个
});
