# NFT 音频编码解码系统测试指南

## 概述

本系统实现了基于 Monad 区块链的多人协作音乐创作平台的 NFT 音频编码解码功能。用户可以在音乐编辑器中创作音乐，将作品编码为 NFT 铸造到链上，然后从 NFT 解码回音乐并播放。

## 已完成的组件

### 1. 智能合约（Solidity）

合约已部署到 Hardhat 本地测试网（Chain ID: 31337）

- **TrackNFT**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
  - 代表个人创作的单一音轨
  - 支持在铸造时存储编码的音乐数据（JSON 格式）
  - 提供函数：`mintTrackWithMusicData`, `getMusicData`

- **MusicSession**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
  - 管理音乐创作的接力流程
  - 支持创建 Session、提交 Track、最终化

- **MasterComposition**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
  - 代表最终合成的完整音乐作品
  - 支持多方所有权和收益分配

### 2. 前端集成

- **音乐编码/解码工具** (`src/lib/music-encoder.ts`):
  - `encodeTracksToJSON`: 将音轨数据编码为 JSON
  - `decodeJSONToTracks`: 从 JSON 解码回音轨数据
  - `calculateTotalSixteenthNotes`: 计算 16 分音符总数
  - `validateEncodedData`: 验证编码数据有效性

- **Web3 合约交互 Hooks** (`src/lib/contract-hooks.ts`):
  - `useMintTrackNFT`: 铸造 Track NFT
  - `useGetTrackMusicData`: 从 NFT 读取音乐数据
  - `useCreateSession`: 创建 Music Session
  - `useJoinAndCommit`: 加入 Session 并提交 Track
  - `useGetSessionInfo`: 获取 Session 信息
  - `useGetMasterInfo`: 获取 Master NFT 信息

- **NFT 解码页面** (`src/app/nft-decoder/page.tsx`):
  - 支持输入 Token ID 解码 NFT
  - 显示音符数据表格
  - 实时播放解码的音乐
  - 下载 JSON 文件

- **音乐编辑器更新** (`src/components/music-editor.tsx`):
  - 添加 "Mint NFT" 按钮
  - 实现真实的合约交互（不再使用模拟数据）
  - 支持网络切换（需要连接到 Hardhat Local）

### 3. 配置文件

- **合约配置** (`src/lib/contracts.config.ts`):
  - 合约地址
  - 合约 ABI

- **Wagmi 配置** (`src/lib/wagmi.ts`):
  - 添加 Hardhat Local 网络（Chain ID: 31337）
  - 配置 RPC URL: `http://127.0.0.1:8545`

## 测试环境设置

### 1. 启动 Hardhat 本地节点

```bash
cd contracts
nohup npx hardhat node > /tmp/hardhat-node.log 2>&1 &
```

检查节点是否运行：
```bash
ss -lptn 'sport = :8545'
```

### 2. 确保合约已部署

如果需要重新部署：
```bash
cd contracts
pnpm run deploy:local
```

合约地址会保存在 `contracts/deployment.json`

### 3. 启动前端应用

```bash
# 前端应该已经在运行（端口 5000）
# 如果没有，运行：
coze dev
```

## 测试流程

### 步骤 1: 连接钱包并切换网络

1. 打开应用首页
2. 点击右上角 "Connect Wallet"
3. 在 MetaMask 中添加 Hardhat Local 网络：
   - 网络名称: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - 链 ID: 31337
   - 货币符号: ETH
4. 在 MetaMask 中导入测试账户（从 Hardhat 节点日志中获取私钥）
5. 切换到 Hardhat Local 网络

### 步骤 2: 创建 Session 并创作音乐

1. 点击 "Start New Session"
2. 填写 Session 信息（名称、描述、风格等）
3. 选择要创作的音轨类型（Drum/Bass/Synth/Vocal）
4. 在音乐编辑器中创作音乐
5. 使用钢琴帘添加音符

### 步骤 3: 铸造 Track NFT

1. 在音乐编辑器中点击 "Mint NFT" 按钮（绿色）
2. 等待交易确认
3. 成功后会显示 Token ID
4. 记下这个 Token ID（例如：1, 2, 3...）

### 步骤 4: 解码 NFT 并播放

1. 点击导航栏的 "NFT Decoder"
2. 输入刚才记录的 Token ID
3. 点击 "Decode" 按钮
4. 查看解码的音符数据
5. 点击 "Play" 按钮播放音乐
6. 点击 "Download JSON" 下载音乐数据

## 后端测试脚本

运行完整的合约测试：

```bash
cd contracts
npx hardhat run scripts/test-contract.js --network localhost
```

测试内容：
1. ✅ 铸造 Track NFT（包含音乐数据）
2. ✅ 从 NFT 读取音乐数据
3. ✅ 创建 Music Session
4. ✅ 加入 Session 并提交 Track
5. ✅ 获取 Session 信息

## 数据格式

### 编码的音乐数据（JSON）

```json
{
  "bpm": 120,
  "totalSixteenthNotes": 64,
  "tracks": {
    "Drum": [
      {
        "note": "C",
        "octave": 3,
        "startTime": 0,
        "duration": 4,
        "velocity": 100,
        "instrumentType": "drum_kick"
      }
    ],
    "Bass": [
      {
        "note": "C",
        "octave": 2,
        "startTime": 0,
        "duration": 16,
        "velocity": 90,
        "instrumentType": "bass_synth"
      }
    ],
    "Synth": [],
    "Vocal": []
  }
}
```

## 常见问题

### Q: 铸造 NFT 时提示 "Please switch to Hardhat Local network"

A: 请确保 MetaMask 已连接到 Hardhat Local 网络（Chain ID: 31337）

### Q: 解码 NFT 时提示 "No NFT found"

A: 请确保：
1. 输入正确的 Token ID
2. 钱包已连接到 Hardhat Local 网络
3. 该 NFT 确实已经铸造

### Q: Hardhat 节点崩溃了怎么办？

A: 重新启动节点：
```bash
pkill -f "hardhat node"
cd contracts
nohup npx hardhat node > /tmp/hardhat-node.log 2>&1 &
```

### Q: 如何查看交易日志？

A: 查看节点日志：
```bash
tail -f /tmp/hardhat-node.log
```

### Q: 交易失败怎么办？

A: 检查 MetaMask 中的交易详情，查看错误信息。常见原因：
- 账户余额不足
- 网络不匹配
- 合约调用参数错误

## 后续部署

当前配置为 Hardhat 本地测试网。如需部署到 Monad Testnet：

1. 修改 `src/lib/contracts.config.ts` 中的合约地址
2. 在 MetaMask 中添加 Monad Testnet 网络（已预配置）
3. 在 MetaMask 中导入测试账户的私钥
4. 在 Hardhat 中部署到 Monad Testnet

## 技术栈

- **智能合约**: Solidity 0.8.20, Hardhat 2.28.3
- **前端**: Next.js 16, React 19, TypeScript 5
- **Web3**: wagmi 3.3.2, viem 2.44.4
- **音频**: Web Audio API
- **UI**: shadcn/ui, Tailwind CSS 4

## 总结

系统已完整实现 NFT 音频编码解码功能，支持：
- ✅ 在浏览器端将音乐编码为 JSON
- ✅ 将编码数据铸造到 NFT
- ✅ 从 NFT 解码回音乐数据
- ✅ 播放解码的音乐
- ✅ 真实的合约交互（非模拟）
- ✅ Hardhat 本地测试网完整测试

所有测试通过，系统可以正常运行！
