import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

// Hardhat 本地测试网
export const hardhatLocal = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const;

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

// 配置
export const config = createConfig({
  chains: [hardhatLocal, monadTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo' }),
  ],
  transports: {
    [hardhatLocal.id]: http(),
    [monadTestnet.id]: http(),
  },
});
