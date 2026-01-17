# Monad Relay - 接力式音轨合成协议

## 📋 项目概述

Monad Relay 是一个基于 Monad 区块链的多人协作音乐创作协议。核心逻辑是"接力式音轨合成"（Relay Track Synthesis），参与者按顺序为同一首作品创作不同音轨，最终合成 Master NFT。

## 🏗️ 智能合约架构

### 1. TrackNFT.sol - 音轨 NFT
代表个人创作的单一音轨，每个 TrackNFT 质押到 MusicSession 中。

**核心功能：**
- 铸造 Track NFT（支持 4 种类型：Drum, Bass, Synth, Vocal）
- 提交 Track 到 Session（锁定，不可修改）
- 查询创作者的所有 Tracks

**关键数据结构：**
```solidity
enum TrackType { Drum, Bass, Synth, Vocal }

struct TrackMetadata {
    TrackType trackType;
    uint256 sessionId;
    uint256 createdAt;
    address creator;
    string ipfsHash;
    bool isCommitted;
}
```

### 2. MasterComposition.sol - 最终合成 NFT
当 Session 的所有音轨填满时自动铸造，支持多方所有权和收益分配。

**核心功能：**
- 铸造 Master NFT（包含所有贡献者信息）
- 收益分配（按权重或平均分配）
- 贡献者提取收益

**关键数据结构：**
```solidity
struct CompositionMetadata {
    uint256 sessionId;
    address[] contributors;
    uint256[] trackIds;
    uint256 createdAt;
    bool isMinted;
    uint256 totalRevenue;
}
```

### 3. MusicSession.sol - 核心逻辑合约
管理整个接力流程的核心合约。

**核心功能：**
- 创建 Session（设置名称、风格、BPM 等）
- 接力提交音轨（joinAndCommit）
- 自动检测完成并铸造 Master NFT
- Session 状态查询

**关键数据结构：**
```solidity
struct Session {
    uint256 id;
    address[] contributors;
    uint256[] trackIds;
    mapping(TrackType => bool) trackFilled;
    uint256 currentTrackIndex;
    bool isFinalized;
    string sessionName;
    string genre;
    uint256 bpm;
    uint256 maxTracks;
}
```

## 🔄 交互流程

### 完整的用户流程

#### 1️⃣ 初始化（部署时）
```solidity
// 部署合约
TrackNFT trackNFT = new TrackNFT();
MasterComposition master = new MasterComposition();
MusicSession session = new MusicSession();

// 设置合约引用
session.setTrackNFT(address(trackNFT));
session.setMasterComposition(address(master));
```

#### 2️⃣ 创建 Session
```solidity
uint256 sessionId = session.createSession(
    "Neon Dreams",    // 名称
    "Synthwave collaboration",  // 描述
    "Synthwave",      // 风格
    120,              // BPM
    4                 // 最大音轨数
);
```

#### 3️⃣ 第一位贡献者：创建并提交鼓点
```solidity
// 步骤 1: 铸造 Track NFT
uint256 drumTrackId = trackNFT.mintTrack(
    address(this),
    TrackType.Drum,
    "ipfs://QmDrumTrackHash"
);

// 步骤 2: 提交到 Session
session.joinAndCommit(
    sessionId,
    drumTrackId,
    TrackType.Drum
);
```

#### 4️⃣ 第二位贡献者：创建并提交贝斯
```solidity
uint256 bassTrackId = trackNFT.mintTrack(
    address(this),
    TrackType.Bass,
    "ipfs://QmBassTrackHash"
);

session.joinAndCommit(
    sessionId,
    bassTrackId,
    TrackType.Bass
);
```

#### 5️⃣ 第三位贡献者：创建并提交合成器
```solidity
uint256 synthTrackId = trackNFT.mintTrack(
    address(this),
    TrackType.Synth,
    "ipfs://QmSynthTrackHash"
);

session.joinAndCommit(
    sessionId,
    synthTrackId,
    TrackType.Synth
);
```

#### 6️⃣ 第四位贡献者：创建并提交人声（自动触发完成）
```solidity
uint256 vocalTrackId = trackNFT.mintTrack(
    address(this),
    TrackType.Vocal,
    "ipfs://QmVocalTrackHash"
);

session.joinAndCommit(
    sessionId,
    vocalTrackId,
    TrackType.Vocal
);

// ✅ 自动触发：Master NFT 铸造
```

#### 7️⃣ Master NFT 收益分配
```solidity
// 购买/捐赠收益
master.addRevenue{value: 1 ether}(masterTokenId);

// 贡献者提取收益
master.withdrawRevenue(masterTokenId);
```

## 🎯 Monad 优化特性

### 1. 并行 EVM 友好设计
- 使用 Mapping 结构而非数组循环
- 避免全局状态依赖
- 状态更新原子化

### 2. 低 Gas 优化
- 紧凑的数据结构（packing 优化）
- 最小化存储读写
- 事件日志高效化

### 3. 安全性保障
- OpenZeppelin ReentrancyGuard
- Ownable 权限控制
- 状态验证严格检查

## 📊 事件监听

前端可以监听以下事件实现实时更新：

```solidity
// Session 创建
event SessionCreated(uint256 indexed sessionId, address indexed creator, ...)

// 音轨提交
event TrackCommitted(uint256 indexed sessionId, uint256 indexed trackId, ...)

// 完成并铸造 Master NFT
event SessionFinalized(uint256 indexed sessionId, uint256 masterTokenId, ...)
```

## 🎵 前端集成示例

```typescript
// 创建 Session
const tx = await musicSession.createSession(
  "Neon Dreams",
  "A synthwave masterpiece",
  "Synthwave",
  120,
  4
);
const receipt = await tx.wait();
const sessionId = receipt.events[0].args.sessionId;

// 提交音轨
await trackNFT.mintTrack(userAddress, TrackType.Drum, ipfsHash);
await musicSession.joinAndCommit(sessionId, trackId, TrackType.Drum);
```

## 🚀 未来扩展

1. **灵活音轨配置**：支持自定义音轨数量和类型
2. **层级权限**：DAO 治理、投票机制
3. **流支付**：基于使用次数的版税分配
4. **社交功能**：关注、合作历史
5. **AI 辅助**：智能音轨建议、自动混音

## 📝 License

MIT
