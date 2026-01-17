# Monad Relay - 接力式音轨合成协议 v2.0

一个基于 Monad 区块链的多人协作音乐创作平台，核心逻辑是"接力式音轨合成"（Relay Track Synthesis）。

## 🎉 v2.0 重大更新

### 新增功能
- ✅ **拖拽式音乐编辑器** - 专业级时间轴编辑，支持拖拽移动、音量控制
- ✅ **Discord 风格聊天室** - 实时沟通，频道切换，消息反应
- ✅ **Web3 钱包集成** - 完整的钱包连接和授权流程
- ✅ **优化的用户体验** - 修复加载状态问题，改进头像显示

### 问题修复
- ✅ 修复了全局加载状态问题（每个按钮独立状态）
- ✅ 修复了头像显示问题（从 0x 后面开始显示）
- ✅ 改进了用户反馈和交互体验

## 🎯 项目概述

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
  - ERC721 标准，支持 4 种音轨类型
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
- **Web3**：wagmi + viem + RainbowKit
- **状态管理**：React Hooks + Context API

#### 核心组件
- `page.tsx` - 主页面，展示 Session 列表和进度
- `music-editor.tsx` - 拖拽式音乐编辑器
- `chat-room.tsx` - Discord 风格聊天室
- `track-uploader.tsx` - 音轨上传和同步播放器
- `wallet-button.tsx` - 钱包连接按钮
- `wallet-context.tsx` - Web3 钱包上下文

## 🚀 快速开始

### 前置要求
- Node.js 24+
- pnpm 包管理器
- MetaMask 或其他 Web3 钱包

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
coze dev
```
服务将运行在 `http://localhost:5000`

### 环境变量
创建 `.env.local` 文件：
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## 📊 核心功能

### 1. 钱包连接
- 一键连接 Web3 钱包
- 显示地址缩写
- 支持断开连接

### 2. Session 管理
- 创建新的音乐创作会话
- 设置名称、风格、BPM、音轨数
- 查看活跃和已完成的 Session

### 3. 拖拽式编辑器
- 可视化时间轴
- 4 个独立音轨（Drum, Bass, Synth, Vocal）
- 拖拽移动音频片段
- 独立音量控制
- 播放/暂停控制
- 实时进度追踪

### 4. Discord 风格聊天室
- 多频道支持（文本和语音）
- 实时消息同步
- 消息反应和固定
- 在线状态显示
- 成员列表

### 5. 进度追踪
- 实时显示 Session 完成进度
- 高亮当前需要创作的音轨类型
- 动画效果指示进度

## 🔄 交互流程

### 完整的用户工作流

```
1. 连接钱包 → 验证身份
2. 创建 Session → 设置音乐参数 → 发布到链上
3. 加入协作 → 打开编辑器 → 上传音频
4. 拖拽编辑 → 调整音量 → 预览播放
5. 保存作品 → 提交到链上 → 锁定音轨
6. 聊天沟通 → 与其他创作者交流
7. 完成 Session → 铸造 Master NFT → 收益分配
```

### 编辑器操作流程

```
1. 上传音频文件 → 创建音频片段
2. 拖拽片段 → 调整时间位置
3. 调整音量 → 平衡各音轨
4. 预览播放 → 检查效果
5. 保存 → 提交到 Session
```

## 🎨 设计亮点

### 视觉设计
- **渐变色主题**：紫色到粉色的渐变，营造创意氛围
- **玻璃态效果**：半透明卡片，现代感十足
- **动态动画**：进度脉冲、悬停效果、加载动画
- **响应式布局**：完美适配不同屏幕

### 交互设计
- **即时反馈**：所有操作都有明确的视觉反馈
- **拖拽操作**：直观的时间轴编辑
- **键盘快捷键**：播放/暂停、撤销/重做（规划中）
- **状态指示**：清晰的加载、成功、错误状态

## 🔒 安全特性

### 智能合约安全
- ✅ OpenZeppelin ReentrancyGuard（防重入攻击）
- ✅ Ownable 权限控制
- ✅ 状态验证严格检查
- ✅ 事件日志完整记录

### 前端安全
- ✅ 输入验证和类型检查
- ✅ IPFS 内容完整性验证
- ✅ 钱包签名验证
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
- 虚拟滚动（规划中）

## 📦 项目结构

```
.
├── contracts/                    # 智能合约
│   ├── TrackNFT.sol             # 音轨 NFT 合约
│   ├── MasterComposition.sol    # 最终合成 NFT 合约
│   ├── MusicSession.sol         # 核心逻辑合约
│   └── README.md                # 合约文档
├── src/
│   ├── app/
│   │   ├── page.tsx             # 主页面
│   │   ├── layout.tsx           # 布局
│   │   └── globals.css          # 全局样式
│   ├── components/
│   │   ├── ui/                  # shadcn/ui 组件
│   │   ├── music-editor.tsx     # 音乐编辑器
│   │   ├── chat-room.tsx        # 聊天室
│   │   ├── track-uploader.tsx   # 音轨上传
│   │   ├── wallet-button.tsx    # 钱包按钮
│   │   └── track-uploader.tsx   # 音轨上传
│   └── contexts/
│       └── wallet-context.tsx   # 钱包上下文
├── docs/
│   └── design-summaries.md      # 多角度设计总结
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
- wagmi + viem
- RainbowKit

## 📈 对 Monad 评委的叙事点

### 1. Social Composition（社交创作）
这不是一个人的表演，而是链上的集体创作。每个音轨都代表一个创作者的独特贡献，形成真正的"社交音乐"。

### 2. Provenance of Creativity（创作溯源）
每一个音轨的贡献者都永远刻在链上，并且可以得知每个人的创作方块数量。由于 Monad 的低费用，这种精细到音轨的收益分配才变得可行。

### 3. Sequential Collaboration（顺序协作）
创新的"接力棒"机制，确保创作顺序和版权归属的清晰性，同时激发创作者之间的协作灵感。

### 4. Professional Tools（专业工具）
拖拽式编辑器和 Discord 风格聊天室提供了专业的创作和沟通工具，让链上协作成为可能。

## 🚀 未来扩展

- [ ] 实时协作（WebRTC）
- [ ] 音频效果器（EQ、混响、压缩）
- [ ] AI 辅助创作（旋律建议、自动混音）
- [ ] 移动端应用
- [ ] DAO 治理和投票机制
- [ ] 流支付和动态版税分配
- [ ] 跨链桥接
- [ ] 元宇宙演唱会

## 📝 License

MIT

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**Built with ❤️ for Monad Blitz Hackathon**

**多角度设计总结：** 查看 [docs/design-summaries.md](docs/design-summaries.md) 了解详细的设计建议。
