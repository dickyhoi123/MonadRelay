# 上传到GitHub指南

## 项目信息
- 仓库地址: https://github.com/dickyhoi123/MonadRelay.git
- 项目路径: /workspace/projects
- 备份文件: /tmp/monad-relay-backup.tar.gz (321KB)

## 方式一：使用GitHub CLI (推荐)

如果你已安装GitHub CLI (`gh`):

```bash
cd /workspace/projects
gh auth login
git push -u origin main
```

## 方式二：使用Personal Access Token

1. 创建GitHub Personal Access Token:
   - 访问 https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 选择 "repo" 权限
   - 复制生成的token

2. 使用token推送代码:

```bash
cd /workspace/projects
git remote set-url origin https://<your-token>@github.com/dickyhoi123/MonadRelay.git
git push -u origin main
```

## 方式三：使用SSH密钥

1. 生成SSH密钥:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
```

2. 添加SSH公钥到GitHub:
   - 访问 https://github.com/settings/ssh/new
   - 粘贴公钥内容
   - 保存

3. 使用SSH URL推送:
```bash
cd /workspace/projects
git remote set-url origin git@github.com:dickyhoi123/MonadRelay.git
git push -u origin main
```

## 方式四：从备份文件恢复

如果需要从备份文件恢复到其他环境:

```bash
# 下载备份文件
scp user@server:/tmp/monad-relay-backup.tar.gz ./

# 解压
tar -xzf monad-relay-backup.tar.gz

# 初始化Git并上传
git init
git add .
git commit -m "Initial commit: MonadRelay Music Platform"
git remote add origin https://github.com/dickyhoi123/MonadRelay.git
git push -u origin main
```

## 项目文件结构

```
workspace/projects/
├── .coze                    # Coze CLI配置
├── .cozeproj/              # Coze项目脚本
├── .gitignore              # Git忽略文件
├── next.config.ts          # Next.js配置
├── package.json            # 项目依赖
├── tsconfig.json           # TypeScript配置
├── src/
│   ├── app/
│   │   ├── layout.tsx      # 应用布局
│   │   ├── page.tsx        # 主页面
│   │   └── globals.css     # 全局样式
│   ├── components/
│   │   ├── ui/             # shadcn/ui组件
│   │   ├── chat-room.tsx   # 聊天室
│   │   ├── music-editor.tsx # 音乐编辑器
│   │   ├── piano-roll.tsx  # 钢琴帘
│   │   └── wallet-button.tsx # 钱包按钮
│   ├── contexts/
│   │   └── wallet-context.tsx # 钱包上下文
│   └── lib/
│       ├── audio-engine.ts # 音频引擎
│       ├── utils.ts        # 工具函数
│       └── wagmi.ts        # Web3配置
└── README.md               # 项目说明
```

## 提交历史

最新的提交记录:

1. fix: 彻底修复Hydration错误，优化客户端挂载处理
2. fix: 修复Hydration错误，优化音轨页面布局和钢琴帘显示
3. fix: 优化钢琴帘显示效果，修复z-index和样式问题
4. feat: 实现FL Studio风格的音乐编辑器
5. feat: 重新设计音乐编辑器，添加钢琴键盘和预设音频
6. fix: 实现正确的创建和加入会话逻辑
7. fix: 添加WalletProvider到应用根组件
8. fix: 修正Monad Testnet链配置为正确的Chain ID 10143
9. fix: 修复网络错误并实现网络切换功能
10. fix: 安装缺失的 @metamask/sdk 依赖

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript 5
- **UI库**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS 4
- **Web3**: wagmi, viem
- **音频**: Web Audio API
- **状态管理**: React Context
- **数据获取**: @tanstack/react-query

## 上传前检查清单

- [x] Git仓库已初始化
- [x] Remote已配置
- [x] .gitignore已配置
- [x] 所有更改已提交
- [x] TypeScript编译通过
- [ ] GitHub认证已配置
- [ ] 代码已推送到GitHub

## 注意事项

1. **不要上传敏感信息**:
   - 环境变量文件 (.env*)
   - API密钥
   - 私钥文件

2. **上传大文件**:
   - node_modules/ 已在.gitignore中
   - .next/ 已在.gitignore中

3. **首次推送可能需要强制推送** (如果远程仓库已有内容):
```bash
git push -u origin main --force
```

## 快速开始 (在其他环境)

克隆并运行项目:

```bash
# 克隆仓库
git clone https://github.com/dickyhoi123/MonadRelay.git
cd MonadRelay

# 安装依赖
pnpm install

# 启动开发环境
coze dev

# 或者
pnpm dev
```

## 故障排除

### 1. 认证失败
```
fatal: could not read Username for 'https://github.com'
```
**解决**: 使用Personal Access Token或SSH密钥

### 2. 推送被拒绝
```
! [rejected] main -> main (fetch first)
```
**解决**: 使用 `git push --force` 或先 `git pull`

### 3. 远程仓库已存在
**解决**: 使用 `git push --force` 覆盖远程内容

---

生成时间: 2026-01-17
项目名称: MonadRelay Music Platform
