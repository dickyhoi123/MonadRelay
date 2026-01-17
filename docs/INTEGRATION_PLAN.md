# MonadRelay 前后端整合方案

## 📊 当前状态分析

### 前端状态（分离状态）
- ✅ UI 界面完整
- ✅ 使用 mock 数据（`mockSessions` 数组）
- ✅ 音乐编辑器功能完善
- ✅ 钢琴帘和音色库已实现
- ❌ 没有连接智能合约
- ❌ Session 数据存储在内存中（刷新丢失）
- ❌ 音乐数据没有上链
- ❌ 没有 NFT 铸造功能

### 智能合约状态（已完成）
- ✅ TrackNFT.sol - 单一音轨 NFT
- ✅ MasterComposition.sol - 完整作品 NFT
- ✅ MusicSession.sol - 接力流程管理
- ✅ 部署脚本已完成（`contracts/script/Deploy.s.sol`）
- ❌ 未部署到链上
- ❌ 没有前端集成

---

## 🎯 整合方案设计

### 架构层次

```
┌─────────────────────────────────────────────────────────┐
│                    前端层 (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  UI Components│  │  State Store │  │ Audio Engine │  │
│  │  (Page, Editor)│  │ (React Hooks)│  │ (Web Audio) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                    │                    │    │
└───────────┼────────────────────┼────────────────────┼────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              合约交互层 (Contract Hooks)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │useSessions   │  │useTrackNFT   │  │useMaster     │  │
│  │(读取Session) │  │(音轨NFT操作) │  │(Master操作)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                    │                    │    │
└───────────┼────────────────────┼────────────────────┼────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Web3 层 (wagmi + viem)                  │
│            Public Client + Wallet Client                │
└─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│                区块链层 (Monad Network)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │MusicSession  │  │  TrackNFT    │  │MasterComposition│
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 用户操作流程

### 场景 1: 创建新的音乐创作 Session

#### 用户视角流程
```
1. 连接钱包
   ├─ 用户点击 "Connect Wallet" 按钮
   ├─ 选择钱包（MetaMask/RainbowKit等）
   └─ 确认连接

2. 创建 Session
   ├─ 点击 "Create Session" 按钮
   ├─ 填写表单：
   │   ├─ Session 名称（如 "Neon Dreams"）
   │   ├─ 描述（如 "A collaborative synthwave masterpiece"）
   │   ├─ 音乐风格（如 "Synthwave"）
   │   ├─ BPM（如 120）
   │   └─ 最大音轨数（如 4）
   ├─ 点击 "Create"
   └─ 等待链上确认

3. 查看创建的 Session
   ├─ Session 列表中显示新创建的 Session
   ├─ 显示进度（0/4 音轨已完成）
   ├─ 显示当前需要的音轨类型（Drum）
   └─ 显示创作者地址
```

#### 数据操作流程
```
前端操作：
1. 用户点击 "Create Session"
2. 前端验证表单数据
3. 调用合约：
   - contract: MusicSession
   - function: createSession(sessionName, description, genre, bpm, maxTracks)
   - 返回: sessionId

合约操作：
1. 验证参数有效性
2. 创建新的 Session 数据结构
3. 记录创建者地址
4. 发出 SessionCreated 事件

链上数据存储：
- sessions[sessionId] = {
    id: sessionId,
    name: "Neon Dreams",
    description: "...",
    genre: "Synthwave",
    bpm: 120,
    maxTracks: 4,
    contributors: [userAddress],
    currentTrackIndex: 0,
    isFinalized: false,
    ...
  }

前端同步：
1. 监听 SessionCreated 事件
2. 更新本地 Session 列表
3. 显示成功 Toast
```

---

### 场景 2: 加入 Session 并创作音轨

#### 用户视角流程
```
1. 加入 Session
   ├─ 点击 Session 卡片的 "Join" 按钮
   ├─ 检查钱包是否已连接
   └─ 打开音乐编辑器

2. 在编辑器中创作
   ├─ 选择音轨类型（如 Drum）
   ├─ 上传音频文件 或
   ├─ 使用钢琴帘创作音符
   ├─ 拖拽调整位置和时长
   ├─ 调整音量
   ├─ 预览播放检查效果

3. 保存并提交
   ├─ 点击 "Save & Submit" 按钮
   ├─ 前端编码音乐数据为 JSON
   ├─ 铸造 Track NFT
   ├─ 提交到 Session
   └─ 等待链上确认

4. 查看结果
   ├─ Session 进度更新（1/4）
   ├─ 显示下一个需要的音轨类型（Bass）
   ├─ 显示贡献者列表（包含自己）
```

#### 数据操作流程
```
前端操作：
1. 用户完成音乐创作
2. 编码音乐数据：
   {
     bpm: 120,
     totalSixteenthNotes: 64,
     tracks: [
       {
         type: "Drum",
         clips: [
           {
             startTime: 0,
             duration: 8,
             pianoNotes: [
               { note: "C", octave: 3, startTime: 0, duration: 1, velocity: 0.8 },
               ...
             ]
           },
           ...
         ]
       },
       ...
     ]
   }

3. 序列化为 JSON 字符串
4. 调用合约：
   - contract: TrackNFT
   - function: mintTrackWithMusicData(
       to: userAddress,
       trackType: Drum,
       bpm: 120,
       totalSixteenthNotes: 64,
       encodedTracks: JSON字符串
     )
   - 返回: trackId

5. 提交到 Session：
   - contract: MusicSession
   - function: joinAndCommit(
       sessionId: sessionId,
       trackId: trackId,
       trackType: Drum
     )

合约操作：
1. 验证 Track NFT 所有权
2. 铸造 Track NFT（存储音乐数据）
3. 将 Track 提交到 Session
4. 更新 Session 状态：
   - contributors.push(userAddress)
   - trackIds.push(trackId)
   - trackFilled[Drum] = true
   - currentTrackIndex++

5. 检查是否所有音轨已填满
   - 如果是：调用 _finalizeSession()
     - 铸造 Master NFT
     - 分配所有权给所有贡献者
   - 如果否：继续等待

链上数据存储：
- trackMetadata[trackId] = {
    trackType: Drum,
    sessionId: sessionId,
    creator: userAddress,
    hasMusicData: true,
    isCommitted: true,
    ...
  }

- trackMusicData[trackId] = {
    bpm: 120,
    totalSixteenthNotes: 64,
    encodedTracks: JSON字符串
  }

- sessions[sessionId] = {
    contributors: [userAddress, ...],
    trackIds: [trackId, ...],
    trackFilled: { Drum: true, Bass: false, ... },
    currentTrackIndex: 1,
    isFinalized: false,
    ...
  }

前端同步：
1. 监听 TrackCommitted 事件
2. 更新 Session 进度显示
3. 显示成功 Toast
4. 更新 Session 列表
```

---

### 场景 3: Session 完成，铸造 Master NFT

#### 用户视角流程
```
1. 最后一位创作者提交音轨
   ├─ 完成音轨创作
   ├─ 提交到 Session
   ├─ 等待链上确认

2. 自动完成 Session
   ├─ 前端监听 SessionFinalized 事件
   ├─ 显示 "Session Completed" 通知
   ├─ 显示 Master NFT 详情：
   │   ├─ Master Token ID
   │   ├─ 所有贡献者地址
   │   ├─ 所有 Track NFT ID
   │   └─ 作品元数据

3. 查看 Master NFT
   ├─ 点击 "View Master NFT" 按钮
   ├─ 查看完整作品信息
   ├─ 可播放完整作品
   └─ 查看收益分配详情
```

#### 数据操作流程
```
合约操作（自动执行）：
1. 检测到所有音轨已填满
2. 调用 _finalizeSession(sessionId)：
   - 创建 Master NFT
   - 设置贡献者为共同拥有者
   - 关联所有 Track NFT
   - 标记 Session 为已完成

3. 发出 SessionFinalized 事件

链上数据存储：
- masterTokenId = MasterComposition.mintMaster(
    to: daoAddress 或第一个贡献者,
    sessionId: sessionId,
    contributors: [address1, address2, address3, address4],
    trackIds: [trackId1, trackId2, trackId3, trackId4],
    _tokenURI: ""
  )

- compositionMetadata[masterTokenId] = {
    sessionId: sessionId,
    contributors: [address1, address2, address3, address4],
    trackIds: [trackId1, trackId2, trackId3, trackId4],
    createdAt: timestamp,
    isMinted: true,
    totalRevenue: 0
  }

- sessionToMasterToken[sessionId] = masterTokenId

前端同步：
1. 监听 SessionFinalized 事件
2. 更新 Session 状态（isFinalized = true）
3. 显示 Master NFT 详情
4. 播放完整作品（合并所有音轨）
```

---

### 场景 4: 查看和播放已有的 Session

#### 用户视角流程
```
1. 浏览 Session 列表
   ├─ 查看所有活跃 Session
   ├─ 查看所有已完成 Session
   ├─ 按 BPM、风格过滤

2. 选择一个 Session
   ├─ 点击 Session 卡片
   ├─ 查看 Session 详情：
   │   ├─ Session 名称和描述
   │   ├─ 音乐风格和 BPM
   │   ├─ 当前进度
   │   ├─ 已完成的音轨列表
   │   └─ 贡献者列表

3. 播放音轨
   ├─ 点击 "Play" 按钮
   ├─ 播放已提交的音轨
   ├─ 查看音轨详情
   └─ 查看创作者信息
```

#### 数据操作流程
```
前端操作：
1. 页面加载时读取所有 Session
2. 调用合约：
   - contract: MusicSession
   - function: getSession(sessionId) 或 getTotalSessions()
   - 读取 sessions 映射

3. 遍历每个 Session，读取关联的 Track NFT：
   - for each trackId in session.trackIds:
     - contract: TrackNFT
     - function: getMusicData(trackId)
     - 解析 JSON，获取音频数据

4. 如果 Session 已完成，读取 Master NFT：
   - contract: MasterComposition
   - function: getMasterInfo(masterTokenId)

合约操作：
1. 读取存储的数据
2. 返回 Session 和 Track 信息

前端渲染：
1. 显示 Session 列表
2. 显示每个 Session 的进度
3. 允许用户点击播放音轨
4. 使用 AudioEngine 播放解码后的音频
```

---

## 🔧 技术实现方案

### 1. 环境配置

#### 1.1 部署合约到测试网
```bash
# 进入合约目录
cd contracts

# 安装 Foundry（如果未安装）
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置：
# PRIVATE_KEY=your_wallet_private_key
# RPC_URL=https://testnet-rpc.monad.xyz

# 编译合约
forge build

# 部署到测试网
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast

# 记录部署的合约地址
# TrackNFT: 0x...
# MasterComposition: 0x...
# MusicSession: 0x...
```

#### 1.2 导出合约 ABI
```bash
# 导出 TrackNFT ABI
forge build --extra-output abi --extra-output bin

# 复制 ABI 文件到前端
mkdir -p src/contracts/abis
cp out/TrackNFT.sol/TrackNFT.json src/contracts/abis/
cp out/MasterComposition.sol/MasterComposition.json src/contracts/abis/
cp out/MusicSession.sol/MusicSession.json src/contracts/abis/
```

#### 1.3 配置前端环境变量
```env
# .env.local
NEXT_PUBLIC_TRACK_NFT_ADDRESS=0x...
NEXT_PUBLIC_MASTER_COMPOSITION_ADDRESS=0x...
NEXT_PUBLIC_MUSIC_SESSION_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=41454  # Monad 测试网 Chain ID
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_EXPLORER_URL=https://testnet-explorer.monad.xyz
```

---

### 2. 创建合约 Hooks

#### 2.1 创建合约配置文件
```typescript
// src/lib/contracts.ts
import { addresses } from '@/contracts/deployments';

export const CONTRACTS = {
  TRACK_NFT: {
    address: addresses.TRACK_NFT as `0x${string}`,
    abi: trackNFTABI,
  },
  MASTER_COMPOSITION: {
    address: addresses.MASTER_COMPOSITION as `0x${string}`,
    abi: masterCompositionABI,
  },
  MUSIC_SESSION: {
    address: addresses.MUSIC_SESSION as `0x${string}`,
    abi: musicSessionABI,
  },
} as const;
```

#### 2.2 创建 useSessions Hook
```typescript
// src/hooks/useSessions.ts
import { useReadContract, useWatchContractEvent } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';

export interface Session {
  id: bigint;
  name: string;
  description: string;
  genre: string;
  bpm: bigint;
  maxTracks: bigint;
  contributors: string[];
  trackIds: bigint[];
  currentTrackIndex: bigint;
  isFinalized: boolean;
  createdAt: bigint;
}

export function useSessions() {
  // 读取 Session 总数
  const { data: totalSessions } = useReadContract({
    ...CONTRACTS.MUSIC_SESSION,
    functionName: 'totalSessions',
  });

  // 批量读取所有 Session
  const sessions: Session[] = [];
  if (totalSessions) {
    for (let i = 0; i < Number(totalSessions); i++) {
      const { data: session } = useReadContract({
        ...CONTRACTS.MUSIC_SESSION,
        functionName: 'getSession',
        args: [BigInt(i)],
      });
      if (session) {
        sessions.push(session as Session);
      }
    }
  }

  // 监听 Session 创建事件
  useWatchContractEvent({
    ...CONTRACTS.MUSIC_SESSION,
    eventName: 'SessionCreated',
    onLogs: (logs) => {
      console.log('New session created:', logs);
    },
  });

  return { sessions, totalSessions };
}
```

#### 2.3 创建 useCreateSession Hook
```typescript
// src/hooks/useCreateSession.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';

interface CreateSessionParams {
  sessionName: string;
  description: string;
  genre: string;
  bpm: number;
  maxTracks: number;
}

export function useCreateSession() {
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createSession = async (params: CreateSessionParams) => {
    writeContract({
      ...CONTRACTS.MUSIC_SESSION,
      functionName: 'createSession',
      args: [
        params.sessionName,
        params.description,
        params.genre,
        BigInt(params.bpm),
        BigInt(params.maxTracks),
      ],
    });
  };

  return {
    createSession,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
  };
}
```

#### 2.4 创建 useCommitTrack Hook
```typescript
// src/hooks/useCommitTrack.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';

interface CommitTrackParams {
  sessionId: number;
  trackType: number; // 0=Drum, 1=Bass, 2=Synth, 3=Vocal
  bpm: number;
  totalSixteenthNotes: number;
  encodedTracks: string;
}

export function useCommitTrack() {
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const commitTrack = async (params: CommitTrackParams) => {
    // Step 1: 铸造 Track NFT
    writeContract({
      ...CONTRACTS.TRACK_NFT,
      functionName: 'mintTrackWithMusicData',
      args: [
        address, // 用户地址
        params.trackType,
        params.bpm,
        params.totalSixteenthNotes,
        params.encodedTracks,
      ],
    });
  };

  return {
    commitTrack,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
  };
}
```

---

### 3. 数据编码/解码方案

#### 3.1 音乐数据编码
```typescript
// src/lib/music-encoder.ts
import { PianoNote, AudioClip, Track } from '@/components/music-editor';

export interface EncodedMusicData {
  bpm: number;
  totalSixteenthNotes: number;
  tracks: EncodedTrack[];
}

export interface EncodedTrack {
  type: 'Drum' | 'Bass' | 'Synth' | 'Vocal';
  clips: EncodedClip[];
}

export interface EncodedClip {
  startTime: number; // 拍子
  duration: number; // 拍子
  pianoNotes?: EncodedPianoNote[];
}

export interface EncodedPianoNote {
  note: string; // 'C', 'C#', 'D', ...
  octave: number;
  startTime: number; // 16分音符为单位
  duration: number; // 16分音符为单位
  velocity: number; // 0-1
  instrumentType: string;
}

/**
 * 将前端音乐数据编码为 JSON 字符串
 */
export function encodeMusicData(
  tracks: Track[],
  bpm: number
): string {
  const encoded: EncodedMusicData = {
    bpm,
    totalSixteenthNotes: 64, // 16 bars * 4 beats * 16 notes
    tracks: tracks.map((track) => ({
      type: track.type,
      clips: track.clips.map((clip) => ({
        startTime: clip.startTime,
        duration: clip.duration,
        pianoNotes: clip.pianoNotes?.map((note) => ({
          note: note.note,
          octave: note.octave,
          startTime: note.startTime,
          duration: note.duration,
          velocity: note.velocity,
          instrumentType: note.instrumentType,
        })),
      })),
    })),
  };

  return JSON.stringify(encoded);
}

/**
 * 从 JSON 字符串解码音乐数据
 */
export function decodeMusicData(jsonString: string): EncodedMusicData {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to decode music data:', error);
    throw new Error('Invalid music data format');
  }
}

/**
 * 计算总16分音符数
 */
export function calculateTotalSixteenthNotes(bars: number): number {
  return bars * 4 * 16; // bars * beats_per_bar * sixteenth_notes_per_beat
}
```

#### 3.2 在编辑器中集成编码
```typescript
// src/components/music-editor.tsx (修改 handleEditorSave)

import { encodeMusicData } from '@/lib/music-encoder';

const handleEditorSave = async (data: any) => {
  setIsSaving(true);
  showToast('info', 'Saving your track...');

  try {
    // 获取当前音轨数据
    const currentTrack = tracks.find(t => t.type === trackType);
    if (!currentTrack) {
      throw new Error('No track data found');
    }

    // 编码音乐数据为 JSON
    const encodedTracks = encodeMusicData(
      [currentTrack], // 只提交当前编辑的音轨
      sessionBPM
    );

    // 调用合约提交
    await commitTrack({
      sessionId,
      trackType: getTrackTypeIndex(trackType),
      bpm: sessionBPM,
      totalSixteenthNotes: calculateTotalSixteenthNotes(16),
      encodedTracks,
    });

    showToast('success', 'Track submitted successfully!');
    onSave?.(data);
  } catch (error) {
    console.error('Failed to save track:', error);
    showToast('error', 'Failed to save track. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

function getTrackTypeIndex(type: TrackType): number {
  const mapping: Record<TrackType, number> = {
    Drum: 0,
    Bass: 1,
    Synth: 2,
    Vocal: 3,
  };
  return mapping[type];
}
```

---

### 4. 前端页面改造

#### 4.1 修改 page.tsx - 集成合约数据
```typescript
// src/app/page.tsx (修改部分)

import { useSessions } from '@/hooks/useSessions';
import { useCreateSession } from '@/hooks/useCreateSession';

function HomePage() {
  const { isConnected, address } = useWallet();

  // 使用合约数据替代 mock 数据
  const { sessions: contractSessions, totalSessions } = useSessions();
  const { createSession, isPending: isCreating } = useCreateSession();

  // 格式化合约数据为前端格式
  const sessions = useMemo(() => {
    return contractSessions.map((session) => ({
      id: Number(session.id),
      name: session.name,
      description: session.description,
      genre: session.genre,
      bpm: Number(session.bpm),
      progress: session.trackIds.length, // 已提交的音轨数
      totalTracks: Number(session.maxTracks),
      currentTrackType: getTrackTypeByIndex(Number(session.currentTrackIndex)),
      isFinalized: session.isFinalized,
      contributors: session.contributors,
      createdAt: Number(session.createdAt) * 1000, // 转换为毫秒
    }));
  }, [contractSessions]);

  const handleCreateSession = async () => {
    if (!newSession.name || !newSession.genre) return;

    try {
      await createSession({
        sessionName: newSession.name,
        description: newSession.description,
        genre: newSession.genre,
        bpm: newSession.bpm,
        maxTracks: newSession.maxTracks,
      });

      showToast('success', 'Session created successfully!');
      setShowCreateDialog(false);
      setNewSession({ name: '', description: '', genre: '', bpm: 120, maxTracks: 4 });
    } catch (error) {
      console.error('Failed to create session:', error);
      showToast('error', 'Failed to create session. Please try again.');
    }
  };

  // ... 其他代码保持不变
}

function getTrackTypeByIndex(index: number): TrackType {
  const types: TrackType[] = ['Drum', 'Bass', 'Synth', 'Vocal'];
  return types[index % types.length];
}
```

#### 4.2 修改 music-editor.tsx - 集成保存逻辑
```typescript
// src/components/music-editor.tsx (修改部分)

import { useCommitTrack } from '@/hooks/useCommitTrack';
import { encodeMusicData, calculateTotalSixteenthNotes } from '@/lib/music-encoder';

export function MusicEditor({ sessionId, sessionName, trackType, onSave, onCancel }: MusicEditorProps) {
  const { commitTrack, isPending: isSubmitting, isSuccess } = useCommitTrack();

  const handleEditorSave = async () => {
    if (isSubmitting) return;

    setIsSaving(true);
    showToast('info', 'Submitting your track to the blockchain...');

    try {
      // 获取当前音轨数据
      const currentTrack = tracks.find(t => t.type === trackType);
      if (!currentTrack) {
        throw new Error('No track data found');
      }

      // 编码音乐数据
      const encodedTracks = encodeMusicData(
        [currentTrack],
        120 // TODO: 从 Session 读取 BPM
      );

      // 调用合约提交
      await commitTrack({
        sessionId,
        trackType: getTrackTypeIndex(trackType),
        bpm: 120,
        totalSixteenthNotes: calculateTotalSixteenthNotes(16),
        encodedTracks,
      });

      showToast('success', 'Track submitted to blockchain successfully!');
      onSave?.({ track: currentTrack, sessionId });
    } catch (error) {
      console.error('Failed to submit track:', error);
      showToast('error', 'Failed to submit track. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // 在 JSX 中修改保存按钮
  <Button
    onClick={handleEditorSave}
    disabled={isSaving || isSubmitting}
    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
  >
    {isSaving || isSubmitting ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Submitting...
      </>
    ) : (
      <>
        <Save className="mr-2 h-4 w-4" />
        Save & Submit
      </>
    )}
  </Button>
}

function getTrackTypeIndex(type: TrackType): number {
  const mapping: Record<TrackType, number> = {
    Drum: 0,
    Bass: 1,
    Synth: 2,
    Vocal: 3,
  };
  return mapping[type];
}
```

---

## 🔄 完整数据流图

### 创建 Session 数据流
```
用户操作
   ↓
表单验证 (前端)
   ↓
调用 MusicSession.createSession() (wagmi)
   ↓
钱包签名 (MetaMask)
   ↓
交易提交到链上 (RPC)
   ↓
合约执行 (MusicSession)
   ├─ 创建 Session
   ├─ 记录元数据
   └─ 发出 SessionCreated 事件
   ↓
区块确认 (1-2 block)
   ↓
前端监听事件
   ↓
更新本地状态
   ↓
显示成功 Toast
```

### 提交音轨数据流
```
用户创作 (音乐编辑器)
   ↓
编码音乐数据 (encodeMusicData)
   ├─ 拍子信息
   ├─ 钢琴帘音符
   └─ 音轨元数据
   ↓
JSON 序列化
   ↓
调用 TrackNFT.mintTrackWithMusicData() (wagmi)
   ↓
钱包签名 (MetaMask)
   ↓
交易提交到链上 (RPC)
   ↓
合约执行 (TrackNFT)
   ├─ 铸造 Track NFT
   ├─ 存储编码的 JSON 数据
   └─ 发出 TrackMinted 事件
   ↓
调用 MusicSession.joinAndCommit() (wagmi)
   ↓
合约执行 (MusicSession)
   ├─ 验证 Track 所有权
   ├─ 更新 Session 状态
   ├─ 记录贡献者
   └─ 检查是否完成
   ↓
区块确认 (1-2 block)
   ↓
前端监听事件
   ├─ TrackCommitted
   ├─ SessionFinalized (如果完成)
   ↓
更新本地状态
   ↓
显示成功 Toast / 播放完成动画
```

---

## ⚠️ 可行性分析

### ✅ 可行性评估

#### 技术可行性
| 项目 | 状态 | 说明 |
|------|------|------|
| 智能合约 | ✅ 完全实现 | 三个合约逻辑完整，已部署脚本 |
| 前端框架 | ✅ 支持 | Next.js + wagmi + viem 成熟技术栈 |
| 数据编码 | ✅ 可行 | JSON 序列化满足需求，合约已支持 |
| 钱包集成 | ✅ 已实现 | RainbowKit + wagmi 已配置 |
| 事件监听 | ✅ 支持 | wagmi 的 useWatchContractEvent |
| 状态同步 | ✅ 可行 | React Hooks + 事件驱动 |

#### 限制与约束
| 项目 | 限制 | 解决方案 |
|------|------|----------|
| Gas 费用 | JSON 数据可能较大 | 限制 `encodedTracks` 长度 ≤ 5000 字节 |
| 数据大小 | 音频文件不能上链 | 使用 IPFS/对象存储存储音频，链上只存音符 |
| 确认时间 | 区块确认需要时间 | 显示加载状态，提供交易 Hash |
| 并发提交 | 可能冲突 | 合约验证状态，防止重复提交 |

#### 成本估算
| 操作 | 预估 Gas (Monad) | 费用 (估算) |
|------|------------------|--------------|
| 创建 Session | ~50,000 gas | ~0.001 MON |
| 铸造 Track NFT | ~200,000 gas (含数据存储) | ~0.004 MON |
| 提交到 Session | ~100,000 gas | ~0.002 MON |
| 铸造 Master NFT | ~150,000 gas | ~0.003 MON |

**总计：每个完整的 Session 约 0.01 MON** (Monad 测试网免费)

---

### 🎯 实施优先级

#### Phase 1: 基础集成（1-2天）
1. 部署合约到测试网
2. 导出合约 ABI
3. 创建合约配置文件
4. 创建基础 Hooks（useSessions, useCreateSession）
5. 修改 page.tsx 使用合约数据

#### Phase 2: 核心功能（2-3天）
1. 创建数据编码/解码工具
2. 创建 useCommitTrack Hook
3. 修改 music-editor.tsx 集成保存逻辑
4. 实现事件监听和状态同步
5. 添加加载状态和错误处理

#### Phase 3: 完善体验（1-2天）
1. 实现交易进度显示
2. 添加 Master NFT 查看页面
3. 实现音轨播放功能
4. 添加收益分配展示
5. 优化错误提示和用户反馈

#### Phase 4: 优化与测试（1-2天）
1. Gas 优化
2. 性能测试
3. 安全审计
4. 文档完善

---

## 📋 总结

### 方案优势
1. **技术成熟**：使用成熟的 Web3 技术栈（wagmi + viem）
2. **架构清晰**：分层设计，职责明确
3. **数据完整**：音乐数据编码存储，可追溯
4. **用户体验**：实时反馈，加载状态清晰
5. **成本可控**：Monad 高性能，Gas 费用低

### 潜在风险
1. **数据大小限制**：需要严格限制 JSON 大小
2. **网络延迟**：区块确认需要时间
3. **并发冲突**：需要合理的状态验证
4. **用户错误**：需要良好的错误提示和恢复机制

### 建议
1. **分阶段实施**：从 Phase 1 开始，逐步完善
2. **充分测试**：在测试网充分测试后再部署到主网
3. **用户教育**：提供清晰的操作指南和帮助文档
4. **监控告警**：添加交易状态监控和错误告警

---

## 🚀 下一步行动

1. ✅ 确认方案设计
2. ⏭️ 部署合约到 Monad 测试网
3. ⏭️ 导出 ABI 并配置前端
4. ⏭️ 创建合约 Hooks
5. ⏭️ 修改前端页面集成
6. ⏭️ 测试完整流程
7. ⏭️ 部署到主网

---

**方案制定完成** ✨
