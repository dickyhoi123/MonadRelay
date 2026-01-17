# Monad Relay - 接力式音轨合成协议

一个基于 Monad 区块链的多人协作音乐创作平台，核心逻辑是"接力式音轨合成"（Relay Track Synthesis）。

## 🎵 项目概述

Monad Relay 实现了一个链上音乐工坊，其中：
- 每首作品由固定数量的"层/音轨"（如 4 条：鼓、贝斯、旋律、人声）组成
- 每个人认领一条音轨，创作后锁定（不可修改），然后传给下一个人
- 当所有预设音轨填满时，合成最终的 Master NFT
- 支持多方所有权和按权重的收益分配

## 🏗️ 项目架构

### 智能合约层（Solidity）

位于 `contracts/` 目录，包含三个核心合约：

#### 1. TrackNFT.sol
- **功能**：代表个人创作的单一音轨
- **特性**：
  - ERC721 标准，支持 4 种音轨类型（Drum, Bass, Synth, Vocal）
  - 铸造后可提交到 Session 并锁定
  - 记录 IPFS 哈希和创作时间

#### 2. MasterComposition.sol
- **功能**：最终合成的完整作品 NFT
- **特性**：
  - 多方所有权支持（记录所有贡献者）
  - 智能收益分配（按权重或平均）
  - 支持二级市场版税

#### 3. MusicSession.sol
- **功能**：核心逻辑合约，管理接力流程
- **特性**：
  - 创建 Session（设置名称、风格、BPM 等）
  - 接力提交音轨（joinAndCommit）
  - 自动检测完成并铸造 Master NFT
  - 实时进度追踪

### 前端层（Next.js + TypeScript）

位于 `src/` 目录，使用：
- **框架**：Next.js 16 (App Router) + React 19
- **UI 组件**：shadcn/ui + Tailwind CSS 4
- **状态管理**：React Hooks
- **核心组件**：
  - `page.tsx` - 主页面，展示 Session 列表和进度
  - `track-uploader.tsx` - 音轨上传和同步播放器组件

## 🚀 快速开始

### 前置要求
- Node.js 24+
- pnpm 包管理器

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
coze dev
```
服务将运行在 `http://localhost:5000`

## 📊 核心交互流程

### 完整的用户工作流

#### 1. 创建 Session
```
用户填写表单 → 创建音乐创作会话 → 设置风格、BPM、音轨数 → 发布到链上
```

#### 2. 接力创作
```
第一位：创作鼓点 → 上传到 IPFS → 铸造 Track NFT → 提交到 Session（锁定）
↓
第二位：创作贝斯 → 监听鼓点 → 上传并提交
↓
第三位：创作旋律 → 监听前两轨 → 上传并提交
↓
第四位：创作人声 → 完成所有音轨 → 自动触发 Master NFT 铸造
```

#### 3. 完成 & 收益
```
Master NFT 自动铸造 → 记录所有贡献者 → 收益按权重分配 → 贡献者提取收益
```

## 🎨 前端功能

### 主页面功能
- 📊 **统计面板**：活跃 Session 数、总音轨数、贡献者数、Master NFT 数
- 🎵 **Session 列表**：展示所有活跃的音乐创作会话
- 📈 **进度追踪**：实时显示每个 Session 的完成进度（如 2/4）
- 🎯 **接力棒指示**：高亮显示当前需要创作的音轨类型
- 👥 **贡献者展示**：显示已参与的用户地址

### 音轨上传组件
- 📤 **文件上传**：支持音频文件上传到 IPFS
- 🎧 **同步播放器**：所有音轨完美同步播放
- 🔊 **独立音量控制**：每个音轨可单独调整音量
- ⏱️ **时间轴控制**：统一的播放进度控制
- 🎚️ **主音量控制**：全局音量调节

## 🔒 安全特性

### 智能合约安全
- ✅ OpenZeppelin ReentrancyGuard（防重入攻击）
- ✅ Ownable 权限控制
- ✅ 状态验证严格检查
- ✅ 事件日志完整记录

### 前端安全
- ✅ 输入验证和类型检查
- ✅ IPFS 内容完整性验证
- ✅ 错误处理和用户反馈

## 🎯 Monad 优化特性

### 1. 并行 EVM 友好设计
- 使用 Mapping 结构而非数组循环
- 避免全局状态依赖
- 状态更新原子化

### 2. 低 Gas 优化
- 紧凑的数据结构（packing 优化）
- 最小化存储读写
- 事件日志高效化

### 3. 高性能前端
- 代码分割和懒加载
- 组件级缓存优化
- HMR 热更新支持

## 📦 项目结构

```
.
├── contracts/                 # 智能合约
│   ├── TrackNFT.sol          # 音轨 NFT 合约
│   ├── MasterComposition.sol # 最终合成 NFT 合约
│   ├── MusicSession.sol      # 核心逻辑合约
│   └── README.md             # 合约文档
├── src/
│   ├── app/
│   │   ├── page.tsx          # 主页面
│   │   ├── layout.tsx        # 布局
│   │   └── globals.css       # 全局样式
│   └── components/
│       ├── ui/               # shadcn/ui 组件
│       └── track-uploader.tsx # 音轨上传组件
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 技术栈

### 智能合约
- Solidity ^0.8.20
- OpenZeppelin Contracts
- Hardhat / Foundry（推荐）

### 前端
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Lucide Icons

## 📈 对 Monad 评委的叙事点

### 1. Social Composition（社交创作）
这不是一个人的表演，而是链上的集体创作。每个音轨都代表一个创作者的独特贡献，形成真正的"社交音乐"。

### 2. Provenance of Creativity（创作溯源）
每一个音轨的贡献者都永远刻在链上，并且可以得知每个人的创作方块数量。由于 Monad 的低费用，这种精细到音轨的收益分配才变得可行。

### 3. Sequential Collaboration（顺序协作）
创新的"接力棒"机制，确保创作顺序和版权归属的清晰性，同时激发创作者之间的协作灵感。

## 🚀 未来扩展

- [ ] 灵活音轨配置（自定义音轨数量和类型）
- [ ] DAO 治理和投票机制
- [ ] 流支付和动态版税分配
- [ ] 社交功能（关注、合作历史）
- [ ] AI 辅助（智能音轨建议、自动混音）
- [ ] 跨链桥接（支持其他 EVM 链）
- [ ] 移动端应用

## 📝 License

MIT

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**Built with ❤️ for Monad Blitz Hackathon**
