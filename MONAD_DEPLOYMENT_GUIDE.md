# Monad Testnet Deployment Guide

本文档说明如何将 MonadRelay 项目部署到 Monad 测试网。

## 前置条件

1. 确保 Hardhat 节点已配置并可以访问 Monad 测试网
2. 已安装 Node.js 18+ 和 pnpm
3. 有 Monad 测试网的测试币 MON

## 1. 配置 Hardhat 网络

在 `contracts/hardhat.config.js` 中添加 Monad 测试网配置：

```javascript
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    monadTestnet: {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000, // 10 Gwei
    },
  },
  paths: {
    sources: "./contracts/src",
    tests: "./contracts/test",
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts",
  },
};
```

## 2. 配置环境变量

在 `contracts/.env` 文件中添加：

```env
# 私钥（用于部署，请勿提交到 GitHub）
PRIVATE_KEY=your_private_key_here

# Monad 测试网 RPC
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
```

**重要**: 将 `.env` 文件添加到 `.gitignore`，确保私钥不会被提交。

## 3. 部署合约到 Monad 测试网

### 3.1 获取测试币

访问 [Monad Faucet](https://faucet.monad.xyz/) 获取测试币 MON。

### 3.2 部署合约

```bash
cd contracts
npx hardhat run scripts/deploy.js --network monadTestnet
```

部署成功后，会输出合约地址，并保存到 `contracts/deployment.json`：

```json
{
  "network": "unknown",
  "chainId": "10143",
  "TrackNFT": "0x...",
  "MasterComposition": "0x...",
  "MusicSession": "0x...",
  "deployer": "0x...",
  "timestamp": "2026-01-17T..."
}
```

## 4. 更新前端配置

将部署后的合约地址更新到 `src/lib/contracts.config.ts`：

```typescript
export const MONAD_TESTNET_ADDRESSES = {
  trackNFT: '0x...', // 替换为实际部署的地址
  musicSession: '0x...', // 替换为实际部署的地址
  masterComposition: '0x...' // 替换为实际部署的地址
} as const;
```

## 5. 部署前端到 Vercel

### 5.1 安装 Vercel CLI

```bash
npm install -g vercel
```

### 5.2 登录 Vercel

```bash
vercel login
```

### 5.3 部署

```bash
vercel --prod
```

按照提示完成部署。

### 5.4 配置环境变量（可选）

如果需要配置环境变量，在 Vercel Dashboard 中添加：

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect 项目 ID（可选）

## 6. 验证部署

### 6.1 验证合约部署

在 [Monad Explorer](https://testnet.monadexplorer.com) 中搜索合约地址，确认部署成功。

### 6.2 测试前端功能

1. 访问 Vercel 部署的网站
2. 连接钱包（确保切换到 Monad 测试网）
3. 测试创建 Session
4. 测试铸造 Track NFT
5. 测试 NFT 解码功能

## 7. 完整流程测试

### 创建 Session → 铸造 NFT → 提交 → Finalize → Master NFT → 解码

1. **创建 Session**: 点击 "Create Session" 按钮，填写信息并确认交易
2. **编辑音轨**: 打开 Music Editor，创建音乐片段
3. **铸造 Track NFT**: 点击 "Mint Track NFT" 按钮，铸造 NFT
4. **提交到 Session**: 将 NFT 提交到 Session（需要实现 `joinAndCommit`）
5. **Finalize Session**: 当所有轨道都完成后，Finalize Session
6. **获取 Master NFT**: 获得 Master Composition NFT
7. **解码 Master NFT**: 在 NFT Decoder 页面输入 Master NFT ID，解码所有音轨并播放

## 8. 常见问题

### Q: 部署失败，提示 gas 不足
A: 确保账户有足够的测试币，可以从 Faucet 获取更多。

### Q: 前端无法连接到 Monad 测试网
A: 确保钱包切换到 Chain ID 10143，并且 RPC URL 配置正确。

### Q: 交易失败，提示 "revert"
A: 检查合约逻辑是否正确，确保所有前置条件都满足。

## 9. 安全建议

1. **私钥管理**: 永远不要将私钥提交到 Git，使用 `.env` 文件管理
2. **代码审计**: 在部署到主网前，务必进行专业的代码审计
3. **测试充分**: 在测试网上充分测试所有功能后再部署到主网
4. **逐步升级**: 先部署到测试网，验证所有功能，再考虑主网部署

## 10. 联系方式

如有问题，请查阅项目文档或在 GitHub 上提交 Issue。

---

**注意**: 本项目目前处于测试阶段，所有合约和数据仅用于测试目的，不具备生产环境安全性。
