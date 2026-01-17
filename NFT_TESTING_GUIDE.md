# NFT 音频编码解码系统 - 测试指南

## 概述

本系统实现了将音乐作品编码为 NFT，并从 NFT 解码回音频的完整流程。所有处理都在浏览器端完成，无需后端服务器。

## 功能特性

### 1. 音乐编码
- 将 Tracks 数据编码为 JSON 格式
- 支持音符、时值、力度、乐器类型等完整信息
- 自动计算 BPM 和总 16 分音符数

### 2. NFT 铸造（模拟）
- 将编码后的数据铸造为 Track NFT
- 使用 localStorage 模拟链上存储
- 生成唯一的 Token ID

### 3. NFT 解码
- 从 NFT 读取编码的音乐数据
- 解码为可播放的音符数据
- 支持实时播放

## 测试流程

### 前置条件
1. 确保服务运行在 http://localhost:5000
2. 连接 Web3 钱包（MetaMask 等）
3. 准备一个音乐作品

### 测试步骤

#### 1. 创建或编辑音乐作品
1. 访问首页 http://localhost:5000
2. 点击 "Create Session" 或选择一个 Session
3. 打开 Music Editor
4. 使用 Piano Roll 添加音符
5. 确保至少有一个音轨包含音符

#### 2. 编码并铸造 NFT
1. 在 Music Editor 中，点击 "Mint NFT" 按钮（绿色按钮）
2. 等待编码和铸造完成（约 2 秒）
3. 系统会显示成功消息，包含 Token ID
4. NFT 数据会保存到 localStorage

#### 3. 解码 NFT
1. 点击首页的 "NFT Decoder" 按钮
2. 进入 NFT Decoder 页面
3. 输入刚才铸造的 Token ID
4. 点击 "Decode" 按钮
5. 查看解码后的音乐数据

#### 4. 播放解码的音乐
1. 在 NFT Decoder 页面，点击 "Play" 按钮
2. 系统会使用解码的数据播放音乐
3. 验证播放的音乐与原作品一致

#### 5. 下载 JSON
1. 点击 "Download JSON" 按钮
2. 保存解码的 JSON 文件
3. 可以在其他工具中分析该 JSON

## 数据格式说明

### 编码格式（JSON）
```json
{
  "Drum": [
    [36, 0, 1, 90, "kick"],
    [38, 4, 1, 80, "snare"],
    [42, 8, 1, 70, "hihat"]
  ],
  "Bass": [
    [28, 0, 4, 85, "sine-bass"],
    [33, 8, 4, 80, "saw-bass"]
  ]
}
```

### 音符数组格式
`[MIDI音符编号, 开始时间(16分音符), 时值(16分音符), 力度(0-100), 乐器ID]`

## 合约集成说明

### 已实现的合约接口
- **TrackNFT**: `mintTrackWithMusicData`, `getMusicData`
- **MusicSession**: `createSession`, `joinAndCommit`, `getSessionInfo`
- **MasterComposition**: `getCompositionInfo`

### 集成方式
- 使用 wagmi + viem 进行合约交互
- 支持 Hardhat 本地测试网（需要解决版本兼容问题）
- 当前使用 localStorage 模拟合约存储

## 实际部署到区块链

### 准备工作
1. 解决 Hardhat 版本兼容问题
2. 编译合约：`npx hardhat compile`
3. 部署合约：`npx hardhat run scripts/deploy.ts --network localhost`

### 前端配置
1. 创建 `.env.local` 文件：
```
NEXT_PUBLIC_TRACK_NFT_ADDRESS=<TrackNFT合约地址>
NEXT_PUBLIC_MASTER_COMPOSITION_ADDRESS=<MasterComposition合约地址>
NEXT_PUBLIC_MUSIC_SESSION_ADDRESS=<MusicSession合约地址>
```

2. 修改 `src/lib/contract-hooks.ts` 中的 CONTRACT_ADDRESSES

3. 重启开发服务器

## 故障排除

### 问题：无法解码 NFT
- 检查 Token ID 是否正确
- 确保已经铸造了该 NFT
- 检查浏览器控制台是否有错误

### 问题：播放无声音
- 确保浏览器已授予音频权限
- 检查音频引擎是否正确初始化
- 确认音符数据有效

### 问题：编码数据格式错误
- 检查音符的 MIDI 编号是否在有效范围内（0-127）
- 验证时值是否大于 0
- 确认力度在 0-100 范围内

## 性能优化

### 已实现的优化
1. 使用 requestAnimationFrame 实现平滑播放
2. 清理音频上下文防止内存泄漏
3. 使用 localStorage 缓存 NFT 数据

### 可进一步优化
1. 实现音频预加载
2. 使用 Web Worker 处理编码/解码
3. 添加播放进度条

## 安全性考虑

### 数据验证
- 编码前验证音符数据有效性
- 解码前验证 JSON 格式
- 限制编码数据大小（最大 5KB）

### 合约安全
- 使用 ReentrancyGuard 防止重入攻击
- 使用 Ownable 限制关键函数
- 验证 NFT 所有权

## 未来计划

1. **完整合约集成**
   - 解决 Hardhat 版本兼容问题
   - 部署到 Monad Testnet
   - 实现完整的链上存储

2. **增强功能**
   - 支持多种音频格式
   - 添加音轨混音功能
   - 实现音频导出为 WAV/MP3

3. **用户体验**
   - 添加可视化播放器
   - 实现音频波形显示
   - 支持拖拽上传音频文件

## 测试检查清单

- [ ] 能够创建音乐作品
- [ ] 能够将作品编码为 JSON
- [ ] 能够模拟铸造 NFT
- [ ] 能够从 localStorage 读取 NFT 数据
- [ ] 能够解码 NFT 并显示音符数据
- [ ] 能够播放解码的音乐
- [ ] 音符播放的时值准确
- [ ] 音符播放的音高准确
- [ ] 能够下载 JSON 文件
- [ ] 所有功能没有 TypeScript 错误
- [ ] 所有功能没有运行时错误

## 技术栈

- **前端**: Next.js 16, React 19, TypeScript 5
- **UI**: Tailwind CSS 4, shadcn/ui
- **Web3**: wagmi, viem
- **音频**: Web Audio API
- **合约**: Solidity 0.8.20, Foundry

## 联系方式

如有问题，请查看项目文档或提交 Issue。
