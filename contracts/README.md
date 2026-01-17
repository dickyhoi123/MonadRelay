# Monad Relay Contracts - Foundry

这是 Monad Relay 项目的智能合约部分，使用 Foundry 进行开发和测试。

## 📋 目录结构

```
contracts/
├── src/
│   ├── TrackNFT.sol           # 音轨 NFT 合约
│   ├── MasterComposition.sol    # 最终合成 NFT 合约
│   └── MusicSession.sol        # 核心逻辑合约
├── test/
│   └── MonadRelay.t.sol       # 测试文件
├── script/
│   └── Deploy.s.sol           # 部署脚本
├── foundry.toml               # Foundry 配置
└── README.md                  # 本文档
```

## 🚀 快速开始

### 前置要求

- [Foundry](https://book.getfoundry.sh/getting-started/installation) - 安装 `forge`, `cast`, `anvil`, `chisel`
- Node.js 24+ (如果需要前端集成)

### 安装依赖

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### 编译合约

```bash
forge build
```

### 运行测试

```bash
# 运行所有测试
forge test

# 运行测试并显示详细输出
forge test -vv

# 运行特定测试
forge test --match-test testFullSessionFlow -vv

# 生成 gas 报告
forge test --gas-report
```

### 测试覆盖率

```bash
forge coverage
```

## 📝 部署

### 本地部署 (使用 Anvil)

1. 启动本地节点：

```bash
anvil
```

2. 在另一个终端中部署合约：

```bash
# 设置私钥（使用 anvil 默认私钥）
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 部署合约
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --verify
```

### 部署到 Monad Testnet

1. 获取 Monad Testnet 配置：
   - RPC URL: `https://testnet-rpc.monad.xyz`
   - Chain ID: `10143`
   - Explorer: `https://testnet.monadexplorer.com`

2. 设置环境变量：

```bash
export PRIVATE_KEY=your_private_key_here
export RPC_URL=https://testnet-rpc.monad.xyz
```

3. 部署合约：

```bash
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

## 🔧 Foundry 配置

`foundry.toml` 文件包含以下配置：

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.30"
optimizer = true
optimizer_runs = 200
via_ir = true
```

## 📚 合约概览

### TrackNFT.sol

- **功能**: 代表个人创作的单一音轨
- **特点**: ERC721 标准，支持 4 种音轨类型（Drum, Bass, Synth, Vocal）
- **关键函数**:
  - `mintTrack(to, trackType, ipfsHash)`: 铸造新的 Track NFT
  - `commitToSession(tokenId, sessionId)`: 提交 Track 到 Session（由 MusicSession 调用）
  - `getTrackInfo(tokenId)`: 获取 Track 详细信息

### MasterComposition.sol

- **功能**: 最终合成的完整作品 NFT
- **特点**: 支持多方所有权和按权重收益分配
- **关键函数**:
  - `mintMaster(to, sessionId, contributors, trackIds, _tokenURI)`: 铸造 Master NFT
  - `addRevenue(masterTokenId)`: 添加收益
  - `withdrawRevenue(masterTokenId)`: 提取收益
  - `setTrackWeight(trackId, weight)`: 设置 Track 权重

### MusicSession.sol

- **功能**: 管理音乐创作的接力流程
- **特点**: 创建 Session、接力提交音轨、自动检测完成并铸造 Master NFT
- **关键函数**:
  - `createSession(sessionName, description, genre, bpm, maxTracks)`: 创建新的音乐创作 Session
  - `joinAndCommit(sessionId, trackId, trackType)`: 加入 Session 并提交音轨
  - `getCurrentTrackType(sessionId)`: 获取当前需要的音轨类型
  - `getSessionProgress(sessionId)`: 获取进度（已填/总数）

## 🧪 测试套件

测试文件包含以下测试用例：

1. `testDeployment()` - 验证合约部署
2. `testContractReferences()` - 验证合约间引用设置正确
3. `testMintTrack()` - 测试 Track NFT 铸造
4. `testCreateSession()` - 测试 Session 创建
5. `testJoinAndCommit()` - 测试音轨提交
6. `testFullSessionFlow()` - 测试完整的 Session 流程
7. `testRevenueDistribution()` - 测试收益分配
8. `testTrackWeights()` - 测试权重分配
9. `testRevert_InvalidTrackType()` - 测试无效音轨类型回滚
10. `testRevert_NotTrackOwner()` - 测试非所有者回滚
11. `testRevert_TrackAlreadyFilled()` - 测试重复填充回滚

所有测试均已通过 ✅

## 🔄 交互流程

完整的用户流程：

1. **部署合约**
   - 部署 TrackNFT
   - 部署 MasterComposition
   - 部署 MusicSession
   - 设置合约间引用

2. **创建 Session**
   ```bash
   cast send <MUSIC_SESSION_ADDRESS> "createSession(string,string,string,uint256,uint256)" \
     "Test Session" "Description" "Techno" 120 4 \
     --private-key $PRIVATE_KEY --rpc-url $RPC_URL
   ```

3. **铸造 Track NFT**
   ```bash
   cast send <TRACK_NFT_ADDRESS> "mintTrack(address,uint8,string)" \
     $USER_ADDRESS 0 "ipfs://your_hash" \
     --private-key $PRIVATE_KEY --rpc-url $RPC_URL
   ```

4. **提交音轨到 Session**
   ```bash
   cast send <MUSIC_SESSION_ADDRESS> "joinAndCommit(uint256,uint256,uint8)" \
     0 0 0 \
     --private-key $PRIVATE_KEY --rpc-url $RPC_URL
   ```

5. **提取收益**
   ```bash
   cast send <MASTER_COMPOSITION_ADDRESS> "withdrawRevenue(uint256)" \
     0 \
     --private-key $PRIVATE_KEY --rpc-url $RPC_URL
   ```

## 🐛 调试

### 使用 Forge 进行调试

```bash
# 详细模式
forge test -vvvv

# 调试特定测试
forge test --match-test testFullSessionFlow --debug

# 打印调试信息
forge test --debug "testFullSessionFlow()"
```

### 使用 Chisel 进行交互式调试

```bash
chisel
```

在 Chisel 中可以：
- 部署合约
- 调用函数
- 检查状态

## 📊 Gas 优化

合约已启用以下优化：
- Solidity 优化器（runs: 200）
- IR 优化
- 紧凑的数据结构

## 🔐 安全特性

- ✅ OpenZeppelin ReentrancyGuard（防重入攻击）
- ✅ Ownable 权限控制
- ✅ 严格的参数验证
- ✅ 非重入锁

## 📝 代码规范

遵循以下规范：
- Solidity ^0.8.20
- NatSpec 文档注释
- OpenZeppelin 合约库
- Foundry 最佳实践

## 🤝 贡献

1. 创建分支
2. 进行修改
3. 运行测试：`forge test`
4. 提交 Pull Request

## 📄 License

MIT

## 📞 支持

如有问题，请：
- 查看项目文档
- 提交 Issue
- 查看测试用例

---

**Built for Monad Blitz Hackathon**
