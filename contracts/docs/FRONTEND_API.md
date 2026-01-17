# Monad Relay 智能合约前端接口文档

## 📋 概述

Monad Relay 是一个基于 Monad 区块链的接力式音轨合成协议，支持多人协作音乐创作。本文档为前端开发者提供详细的合约接口调用指南。

### 🏗️ 合约架构

项目包含三个核心合约：

1. **TrackNFT** (`TrackNFT.sol`) - 音轨 NFT 合约
2. **MasterComposition** (`MasterComposition.sol`) - 最终合成作品 NFT 合约  
3. **MusicSession** (`MusicSession.sol`) - 核心逻辑合约，管理接力流程

### 🌐 网络配置

```typescript
// Monad Testnet 配置
const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } },
  blockExplorers: { default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' } },
  testnet: true
};
```

### 📦 合约地址配置

```typescript
// 合约地址（部署后需要更新）
const CONTRACTS = {
  TRACK_NFT: '0x...',           // TrackNFT 合约地址
  MASTER_COMPOSITION: '0x...',   // MasterComposition 合约地址
  MUSIC_SESSION: '0x...'         // MusicSession 合约地址
} as const;
```

---

## 🎯 TrackNFT 合约接口（链上音频合成版本）

### 📝 合约信息
- **合约名称**: TrackNFT
- **继承**: ERC721, ERC721URIStorage, Ownable, ReentrancyGuard
- **Token 名称**: Monad Track NFT
- **Token 符号**: MTRACK
- **特色**: 支持链上参数化音频合成，前端可实时解析播放

### 🔄 写入函数（需要 Gas）

#### 1. mintTrackFromPreset() - 基于预设铸造音轨 NFT

```typescript
interface AudioParameters {
  // 基础参数
  bpm: number;              // BPM (60-300)
  duration: number;         // 持续时间（秒）
  key: number;              // 音调 (0-11, C=0, C#=1, ..., B=11)
  octave: number;           // 八度 (0-8)
  scale: number;            // 音阶类型 (0=Major, 1=Minor, 2=Pentatonic, 3=Blues)
  
  // 合成器参数
  waveform: number;         // 波形类型 (0=Sine, 1=Square, 2=Sawtooth, 3=Triangle, 4=Noise)
  attack: number;           // ADSR: Attack (0-1000ms)
  decay: number;            // ADSR: Decay (0-1000ms)
  sustain: number;          // ADSR: Sustain level (0-100%)
  release: number;          // ADSR: Release (0-5000ms)
  
  // 音色参数
  filterCutoff: number;     // 滤波器截止频率 (0-100%)
  filterResonance: number;  // 滤波器共振 (0-100%)
  distortion: number;       // 失真度 (0-100%)
  reverb: number;           // 混响度 (0-100%)
  delay: number;            // 延迟度 (0-100%)
  
  // 音序数据（压缩存储）
  pattern: number;          // 16步音序模式（每步2bit）
  noteSequence: number[];   // 音符序列（MIDI音高）
  velocitySequence: number[]; // 力度序列（0-127）
  
  // 效果参数
  pitchBend: number;        // 弯音 (0-100%)
  vibrato: number;          // 颤音深度 (0-100%)
  tremolo: number;          // 颤音深度 (0-100%)
  
  // 空间参数
  pan: number;              // 声像 (-100=左, 0=中, 100=右)
  volume: number;           // 音量 (0-100%)
}

// 调用示例 - 使用预设
const mintTrackTx = await writeContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'mintTrackFromPreset',
  args: [
    userAddress,        // to
    0,                 // trackType (Drum)
    0,                 // presetId (Kick)
    {}                 // customParams (可选，覆盖预设参数)
  ],
  account: address
});

// 等待交易确认
const receipt = await waitForTransaction(mintTrackTx);
const tokenId = receipt.logs[0].args.tokenId;
```

**参数说明**:
- `to`: `address` - 接收 NFT 的钱包地址
- `trackType`: `uint8` - 音轨类型枚举值
- `presetId`: `uint256` - 预设ID（0-7内置预设）
- `customParams`: `AudioParameters` - 自定义参数（可选，会覆盖预设）

**返回值**: `uint256` - 铸造的 Token ID

**事件**:
```typescript
event TrackMinted(
  uint256 indexed tokenId,
  address indexed creator,
  TrackType trackType,
  uint256 presetId
);
```

#### 2. mintTrackWithParams() - 使用完全自定义参数铸造

```typescript
// 调用示例 - 完全自定义
const customAudioParams = {
  bpm: 120,
  duration: 2,
  key: 0,              // C
  octave: 4,
  scale: 0,            // Major
  waveform: 2,         // Sawtooth
  attack: 100,
  decay: 200,
  sustain: 70,
  release: 500,
  filterCutoff: 70,
  filterResonance: 30,
  distortion: 20,
  reverb: 30,
  delay: 10,
  pattern: 0b1010101010101010, // 16步节奏模式
  noteSequence: [60, 62, 64, 65], // C D E F
  velocitySequence: [100, 90, 110, 95],
  pitchBend: 0,
  vibrato: 10,
  tremolo: 0,
  pan: 0,
  volume: 80
};

const mintTrackTx = await writeContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'mintTrackWithParams',
  args: [
    userAddress,        // to
    2,                 // trackType (Synth)
    customAudioParams  // audioParams
  ],
  account: address
});
```

#### 3. updateAudioParameters() - 更新音频参数（仅所有者）

```typescript
const updateTx = await writeContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'updateAudioParameters',
  args: [
    tokenId,           // Track NFT ID
    newAudioParams    // 新的音频参数
  ],
  account: address
});
```

**限制条件**:
- 必须是 Track NFT 的所有者
- Track 必须未提交到 Session

---

### 📖 读取函数（免费）

#### 1. getTrackInfo() - 获取音轨详细信息（包含音频参数）

```typescript
interface TrackInfo {
  trackType: number;           // 音轨类型
  sessionId: number;           // 所属 Session ID
  createdAt: number;           // 创建时间戳
  creator: string;             // 创建者地址
  audioParams: AudioParameters; // 🎵 音频合成参数
  isCommitted: boolean;        // 是否已提交到 Session
  version: number;             // 参数版本号
}

// 调用示例
const trackInfo = await readContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'getTrackInfo',
  args: [tokenId]
});

console.log('Track Info:', {
  trackType: trackInfo[0],
  sessionId: trackInfo[1],
  createdAt: trackInfo[2],
  creator: trackInfo[3],
  audioParams: trackInfo[4],  // 🎵 完整的音频合成参数
  isCommitted: trackInfo[5],
  version: trackInfo[6]
});

// 解析音频参数用于前端合成器
const audioParams = trackInfo[4];
console.log('Audio Parameters:', {
  waveform: ['Sine', 'Square', 'Sawtooth', 'Triangle', 'Noise'][audioParams.waveform],
  note: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][audioParams.key] + audioParams.octave,
  bpm: audioParams.bpm,
  duration: audioParams.duration,
  adsr: `${audioParams.attack}ms/${audioParams.decay}ms/${audioParams.sustain}%/${audioParams.release}ms`,
  effects: `Filter:${audioParams.filterCutoff}% Distortion:${audioParams.distortion}% Reverb:${audioParams.reverb}%`
});
```

#### 2. getPreset() - 获取预设音频参数

```typescript
// 获取指定预设的完整音频参数
const preset = await readContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'getPreset',
  args: [presetId] // 0=Kick, 1=Snare, 2=HiHat, 3=Sub Bass, etc.
});

console.log('Preset Audio Parameters:', preset);
```

#### 3. getAllPresetIds() - 获取所有预设ID

```typescript
const presetIds = await readContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'getAllPresetIds'
});

console.log('Available Presets:', presetIds); // [0, 1, 2, 3, 4, 5, 6, 7]
```

#### 4. getPresetIdsByType() - 根据类型获取预设

```typescript
// 获取鼓组预设
const drumPresets = await readContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'getPresetIdsByType',
  args: [0] // TrackType.Drum
});

console.log('Drum Presets:', drumPresets); // [0, 1, 2] -> Kick, Snare, HiHat

// 获取贝斯预设
const bassPresets = await readContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'getPresetIdsByType',
  args: [1] // TrackType.Bass
});

console.log('Bass Presets:', bassPresets); // [3, 4] -> Sub Bass, Synth Bass
```

#### 2. getCreatorTracks() - 获取创作者的所有音轨

```typescript
// 获取指定创作者的所有 Track Token IDs
const creatorTracks = await readContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'getCreatorTracks',
  args: [creatorAddress]
});

console.log('Creator Tracks:', creatorTracks); // uint256[]
```

#### 3. ownerOf() - 获取音轨所有者

```typescript
// ERC721 标准函数
const owner = await readContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'ownerOf',
  args: [tokenId]
});
```

#### 4. tokenURI() - 获取音轨元数据 URI

```typescript
const tokenURI = await readContract({
  address: CONTRACTS.TRACK_NFT,
  abi: TrackNFTABI,
  functionName: 'tokenURI',
  args: [tokenId]
});
```

---

## 🎼 MasterComposition 合约接口

### 📝 合约信息
- **合约名称**: MasterComposition
- **继承**: ERC721, ERC721URIStorage, Ownable, ReentrancyGuard
- **Token 名称**: Monad Master Composition
- **Token 符号**: MMASTER

### 🔄 写入函数（需要 Gas）

#### 1. addRevenue() - 添加收益到 Master NFT

```typescript
// 向 Master NFT 添加收益（payable 函数）
const addRevenueTx = await writeContract({
  address: CONTRACTS.MASTER_COMPOSITION,
  abi: MasterCompositionABI,
  functionName: 'addRevenue',
  args: [masterTokenId],
  value: parseEther('0.1'), // 添加 0.1 ETH 收益
  account: address
});

const receipt = await waitForTransaction(addRevenueTx);
```

**参数说明**:
- `masterTokenId`: `uint256` - Master NFT Token ID
- `value`: `uint256` - 收益金额（通过 msg.value 传递）

#### 2. withdrawRevenue() - 提取收益

```typescript
// 提取可用的收益
const withdrawTx = await writeContract({
  address: CONTRACTS.MASTER_COMPOSITION,
  abi: MasterCompositionABI,
  functionName: 'withdrawRevenue',
  args: [masterTokenId],
  account: address
});

const receipt = await waitForTransaction(withdrawTx);
```

---

### 📖 读取函数（免费）

#### 1. getCompositionInfo() - 获取作品详细信息

```typescript
interface CompositionInfo {
  sessionId: number;           // Session ID
  contributors: string[];      // 贡献者地址数组
  trackIds: number[];          // 关联的 Track NFT ID 数组
  createdAt: number;           // 创建时间戳
  totalRevenue: number;        // 总收益
}

const compositionInfo = await readContract({
  address: CONTRACTS.MASTER_COMPOSITION,
  abi: MasterCompositionABI,
  functionName: 'getCompositionInfo',
  args: [masterTokenId]
});

console.log('Composition Info:', {
  sessionId: compositionInfo[0],
  contributors: compositionInfo[1],
  trackIds: compositionInfo[2],
  createdAt: compositionInfo[3],
  totalRevenue: compositionInfo[4]
});
```

#### 2. getContributorCompositions() - 获取贡献者的所有作品

```typescript
const compositions = await readContract({
  address: CONTRACTS.MASTER_COMPOSITION,
  abi: MasterCompositionABI,
  functionName: 'getContributorCompositions',
  args: [contributorAddress]
});

console.log('Contributor Compositions:', compositions); // uint256[]
```

#### 3. isSessionMinted() - 检查 Session 是否已铸造 Master NFT

```typescript
const isMinted = await readContract({
  address: CONTRACTS.MASTER_COMPOSITION,
  abi: MasterCompositionABI,
  functionName: 'isSessionMinted',
  args: [sessionId]
});

console.log('Session is minted:', isMinted); // boolean
```

#### 4. pendingRevenue() - 获取待提取收益

```typescript
// 获取指定用户在指定 Master NFT 中的待提取收益
const pendingRevenue = await readContract({
  address: CONTRACTS.MASTER_COMPOSITION,
  abi: MasterCompositionABI,
  functionName: 'pendingRevenue',
  args: [masterTokenId, userAddress]
});

console.log('Pending Revenue:', formatEther(pendingRevenue), 'ETH');
```

---

## 🎵 MusicSession 合约接口（核心）

### 📝 合约信息
- **合约名称**: MusicSession
- **继承**: Ownable, ReentrancyGuard
- **职责**: 管理音乐创作的接力流程

### 🔄 写入函数（需要 Gas）

#### 1. createSession() - 创建创作会话

```typescript
interface CreateSessionParams {
  sessionName: string;    // 会话名称
  description: string;    // 描述
  genre: string;         // 音乐风格
  bpm: number;          // BPM
  maxTracks: number;    // 最大音轨数
}

// 调用示例
const createSessionTx = await writeContract({
  address: CONTRACTS.MUSIC_SESSION,
  abi: MusicSessionABI,
  functionName: 'createSession',
  args: [
    'Neon Dreams',           // sessionName
    'A collaborative synthwave masterpiece', // description
    'Synthwave',             // genre
    120,                     // bpm
    4                        // maxTracks
  ],
  account: address
});

const receipt = await waitForTransaction(createSessionTx);
const sessionId = receipt.logs[0].args.sessionId;
console.log('Session created with ID:', sessionId);
```

**参数说明**:
- `sessionName`: `string` - 会话名称（不能为空）
- `description`: `string` - 描述（最大 500 字符）
- `genre`: `string` - 音乐风格
- `bpm`: `uint256` - BPM（节拍每分钟）
- `maxTracks`: `uint256` - 最大音轨数（1-10）

**返回值**: `uint256` - 新创建的 Session ID

**事件**:
```typescript
event SessionCreated(
  uint256 indexed sessionId,
  address indexed creator,
  string sessionName,
  string genre,
  uint256 bpm
);
```

#### 2. joinAndCommit() - 加入会话并提交音轨（核心交互）

```typescript
interface JoinAndCommitParams {
  sessionId: number;    // Session ID
  trackId: number;     // Track NFT ID
  trackType: number;   // Track 类型
}

// 调用示例
const joinAndCommitTx = await writeContract({
  address: CONTRACTS.MUSIC_SESSION,
  abi: MusicSessionABI,
  functionName: 'joinAndCommit',
  args: [
    sessionId,    // Session ID
    trackId,      // Track NFT ID
    0            // Track Type (Drum)
  ],
  account: address
});

const receipt = await waitForTransaction(joinAndCommitTx);
```

**前置条件**:
- 用户必须是 Track NFT 的所有者
- 指定的 Track 类型不能已被填充
- Session 必须未完成

**事件**:
```typescript
event TrackCommitted(
  uint256 indexed sessionId,
  uint256 indexed trackId,
  address indexed contributor,
  TrackType trackType,
  uint256 trackIndex
);
```

#### 3. cancelSession() - 取消会话

```typescript
// 仅会话创建者可以取消未完成的会话
const cancelTx = await writeContract({
  address: CONTRACTS.MUSIC_SESSION,
  abi: MusicSessionABI,
  functionName: 'cancelSession',
  args: [sessionId],
  account: address
});

const receipt = await waitForTransaction(cancelTx);
```

---

### 📖 读取函数（免费）

#### 1. getAllSessionIds() - 获取所有会话 ID 列表

```typescript
const sessionIds = await readContract({
  address: CONTRACTS.MUSIC_SESSION,
  abi: MusicSessionABI,
  functionName: 'getAllSessionIds'
});

console.log('All Session IDs:', sessionIds); // uint256[]
```

#### 2. getSessionInfo() - 获取会话详细信息（最常用）

```typescript
interface SessionInfo {
  id: number;                    // Session ID
  sessionName: string;           // 会话名称
  description: string;            // 描述
  genre: string;                 // 音乐风格
  bpm: number;                   // BPM
  maxTracks: number;             // 最大音轨数
  currentTrackIndex: number;     // 当前音轨索引
  isFinalized: boolean;          // 是否已完成
  createdAt: number;             // 创建时间戳
  completedAt: number;           // 完成时间戳
  contributors: string[];        // 贡献者地址数组
  trackIds: number[];            // 音轨 ID 数组
  trackFilledStatus: boolean[];  // 各类型填充状态 [Drum, Bass, Synth, Vocal]
}

const sessionInfo = await readContract({
  address: CONTRACTS.MUSIC_SESSION,
  abi: MusicSessionABI,
  functionName: 'getSessionInfo',
  args: [sessionId]
});

console.log('Session Info:', {
  id: sessionInfo[0],
  sessionName: sessionInfo[1],
  description: sessionInfo[2],
  genre: sessionInfo[3],
  bpm: sessionInfo[4],
  maxTracks: sessionInfo[5],
  currentTrackIndex: sessionInfo[6],
  isFinalized: sessionInfo[7],
  createdAt: sessionInfo[8],
  completedAt: sessionInfo[9],
  contributors: sessionInfo[10],
  trackIds: sessionInfo[11],
  trackFilledStatus: sessionInfo[12]
});
```

#### 3. getCurrentTrackType() - 获取当前需要的音轨类型

```typescript
const currentTrackType = await readContract({
  address: CONTRACTS.MUSIC_SESSION,
  abi: MusicSessionABI,
  functionName: 'getCurrentTrackType',
  args: [sessionId]
});

console.log('Current Track Type:', currentTrackType); // 0=Drum, 1=Bass, 2=Synth, 3=Vocal
```

#### 4. getSessionProgress() - 获取进度

```typescript
const progress = await readContract({
  address: CONTRACTS.MUSIC_SESSION,
  abi: MusicSessionABI,
  functionName: 'getSessionProgress',
  args: [sessionId]
});

console.log('Progress:', `${progress[0]}/${progress[1]}`); // 已填充/总数
```

---

## 🎨 数据类型定义

### TrackType 枚举

```typescript
enum TrackType {
  Drum = 0,    // 鼓
  Bass = 1,    // 贝斯
  Synth = 2,   // 合成器/旋律
  Vocal = 3    // 人声
}

// 前端映射
const TRACK_TYPE_MAP = {
  0: 'Drum',
  1: 'Bass', 
  2: 'Synth',
  3: 'Vocal'
} as const;

const TRACK_COLORS = {
  Drum: 'bg-blue-500',
  Bass: 'bg-green-500',
  Synth: 'bg-purple-500',
  Vocal: 'bg-pink-500'
} as const;
```

### Session 结构体

```typescript
interface Session {
  id: number;                           // Session ID
  contributors: string[];               // 贡献者地址数组
  trackIds: number[];                   // 音轨 NFT 数组（按顺序）
  trackFilled: { [key: number]: boolean }; // 各类型是否已填满
  currentTrackIndex: number;            // 当前应该提交的音轨索引
  isFinalized: boolean;                 // 是否完成
  createdAt: number;                   // 创建时间
  completedAt: number;                 // 完成时间
  sessionName: string;                 // Session 名称
  description: string;                  // 描述
  genre: string;                       // 音乐风格
  bpm: number;                         // BPM
  maxTracks: number;                   // 最大音轨数
}
```

### TrackMetadata 结构体

```typescript
interface TrackMetadata {
  trackType: number;    // 音轨类型
  sessionId: number;    // 所属 Session ID
  createdAt: number;    // 创建时间
  creator: string;       // 创建者地址
  ipfsHash: string;     // 音频文件 IPFS 哈希
  isCommitted: boolean; // 是否已提交到 Session
}
```

### CompositionMetadata 结构体

```typescript
interface CompositionMetadata {
  sessionId: number;        // 所属 Session ID
  contributors: string[];   // 贡献者地址列表
  trackIds: number[];       // 关联的 Track NFT ID 列表
  createdAt: number;        // 创建时间
  isMinted: boolean;        // 是否已铸造
  totalRevenue: number;     // 总收益
}
```

---

## 🚀 完整前端调用流程示例

### 1. 用户连接钱包

```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  
  const handleConnect = () => {
    connect({ connector: injected() });
  };
  
  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### 2. 创建 Session

```typescript
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

function CreateSessionForm() {
  const [formData, setFormData] = useState({
    sessionName: '',
    description: '',
    genre: '',
    bpm: 120,
    maxTracks: 4
  });
  
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });
  
  const handleCreate = async () => {
    try {
      writeContract({
        address: CONTRACTS.MUSIC_SESSION,
        abi: MusicSessionABI,
        functionName: 'createSession',
        args: [
          formData.sessionName,
          formData.description,
          formData.genre,
          formData.bpm,
          formData.maxTracks
        ]
      });
    } catch (error) {
      console.error('Create session failed:', error);
    }
  };
  
  return (
    <form onSubmit={handleCreate}>
      <input
        value={formData.sessionName}
        onChange={(e) => setFormData({...formData, sessionName: e.target.value})}
        placeholder="Session Name"
        required
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        placeholder="Description"
        maxLength={500}
      />
      <select
        value={formData.genre}
        onChange={(e) => setFormData({...formData, genre: e.target.value})}
      >
        <option value="">Select Genre</option>
        <option value="Synthwave">Synthwave</option>
        <option value="Techno">Techno</option>
        <option value="House">House</option>
      </select>
      <input
        type="number"
        value={formData.bpm}
        onChange={(e) => setFormData({...formData, bpm: parseInt(e.target.value)})}
        placeholder="BPM"
        min={60}
        max={200}
      />
      <button type="submit" disabled={isPending || isConfirming}>
        {isPending ? 'Creating...' : isConfirming ? 'Confirming...' : 'Create Session'}
      </button>
      {isConfirmed && <p>Session created successfully!</p>}
    </form>
  );
}
```

### 3. 铸造 Track NFT

```typescript
function MintTrackForm({ sessionId }: { sessionId: number }) {
  const [trackType, setTrackType] = useState(0);
  const [ipfsHash, setIpfsHash] = useState('');
  
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });
  
  const handleMint = async () => {
    try {
      writeContract({
        address: CONTRACTS.TRACK_NFT,
        abi: TrackNFTABI,
        functionName: 'mintTrack',
        args: [address, trackType, ipfsHash]
      });
    } catch (error) {
      console.error('Mint track failed:', error);
    }
  };
  
  return (
    <div>
      <select value={trackType} onChange={(e) => setTrackType(parseInt(e.target.value))}>
        <option value={0}>🥁 Drum</option>
        <option value={1}>🎸 Bass</option>
        <option value={2}>🎹 Synth</option>
        <option value={3}>🎤 Vocal</option>
      </select>
      <input
        value={ipfsHash}
        onChange={(e) => setIpfsHash(e.target.value)}
        placeholder="IPFS Hash (ipfs://...)"
        required
      />
      <button onClick={handleMint} disabled={isPending || isConfirming}>
        {isPending ? 'Minting...' : isConfirming ? 'Confirming...' : 'Mint Track'}
      </button>
      {isConfirmed && <p>Track minted successfully!</p>}
    </div>
  );
}
```

### 4. 加入 Session 并提交 Track

```typescript
function JoinSession({ sessionId, trackId }: { sessionId: number; trackId: number }) {
  const [trackType, setTrackType] = useState(0);
  
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });
  
  const handleJoinAndCommit = async () => {
    try {
      writeContract({
        address: CONTRACTS.MUSIC_SESSION,
        abi: MusicSessionABI,
        functionName: 'joinAndCommit',
        args: [sessionId, trackId, trackType]
      });
    } catch (error) {
      console.error('Join session failed:', error);
    }
  };
  
  return (
    <div>
      <select value={trackType} onChange={(e) => setTrackType(parseInt(e.target.value))}>
        <option value={0}>🥁 Drum</option>
        <option value={1}>🎸 Bass</option>
        <option value={2}>🎹 Synth</option>
        <option value={3}>🎤 Vocal</option>
      </select>
      <button onClick={handleJoinAndCommit} disabled={isPending || isConfirming}>
        {isPending ? 'Joining...' : isConfirming ? 'Confirming...' : 'Join & Commit'}
      </button>
      {isConfirmed && <p>Track committed to session!</p>}
    </div>
  );
}
```

### 5. 获取 Session 列表

```typescript
import { useReadContract } from 'wagmi';

function SessionList() {
  const { data: sessionIds, isLoading } = useReadContract({
    address: CONTRACTS.MUSIC_SESSION,
    abi: MusicSessionABI,
    functionName: 'getAllSessionIds'
  });
  
  if (isLoading) return <div>Loading sessions...</div>;
  
  return (
    <div>
      <h2>Active Sessions</h2>
      {sessionIds?.map((sessionId) => (
        <SessionCard key={sessionId} sessionId={sessionId} />
      ))}
    </div>
  );
}

function SessionCard({ sessionId }: { sessionId: number }) {
  const { data: sessionInfo } = useReadContract({
    address: CONTRACTS.MUSIC_SESSION,
    abi: MusicSessionABI,
    functionName: 'getSessionInfo',
    args: [sessionId]
  });
  
  const { data: progress } = useReadContract({
    address: CONTRACTS.MUSIC_SESSION,
    abi: MusicSessionABI,
    functionName: 'getSessionProgress',
    args: [sessionId]
  });
  
  if (!sessionInfo) return null;
  
  const progressPercent = (progress[0] / progress[1]) * 100;
  
  return (
    <div className="session-card">
      <h3>{sessionInfo[1]}</h3>
      <p>{sessionInfo[2]}</p>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p>Progress: {progress[0]}/{progress[1]}</p>
      <p>Genre: {sessionInfo[3]}</p>
      <p>BPM: {sessionInfo[4]}</p>
      <p>Status: {sessionInfo[7] ? 'Completed' : 'Active'}</p>
    </div>
  );
}
```

### 6. 事件监听

```typescript
import { useWatchContractEvent } from 'wagmi';

function EventListeners() {
  // 监听 Session 创建事件
  useWatchContractEvent({
    address: CONTRACTS.MUSIC_SESSION,
    abi: MusicSessionABI,
    eventName: 'SessionCreated',
    onLogs: (logs) => {
      console.log('New session created:', logs);
      // 更新 UI，刷新 Session 列表
    }
  });
  
  // 监听 Track 提交事件
  useWatchContractEvent({
    address: CONTRACTS.MUSIC_SESSION,
    abi: MusicSessionABI,
    eventName: 'TrackCommitted',
    onLogs: (logs) => {
      console.log('Track committed:', logs);
      // 更新 Session 进度
    }
  });
  
  // 监听 Session 完成事件
  useWatchContractEvent({
    address: CONTRACTS.MUSIC_SESSION,
    abi: MusicSessionABI,
    eventName: 'SessionFinalized',
    onLogs: (logs) => {
      console.log('Session finalized:', logs);
      // 显示完成通知，更新 UI
    }
  });
  
  // 监听 Track 铸造事件
  useWatchContractEvent({
    address: CONTRACTS.TRACK_NFT,
    abi: TrackNFTABI,
    eventName: 'TrackMinted',
    onLogs: (logs) => {
      console.log('Track minted:', logs);
      // 更新用户的 Track 列表
    }
  });
  
  return null;
}
```

---

## ⚠️ 注意事项

### 🔒 权限控制

1. **TrackNFT 合约**:
   - `mintTrack()`: 任何人可调用
   - `commitToSession()`: 仅 MusicSession 合约可调用
   - `setMusicSession()`: 仅 Owner 可调用

2. **MasterComposition 合约**:
   - `mintMaster()`: 仅 MusicSession 合约可调用
   - `addRevenue()`: 任何人可调用（payable）
   - `withdrawRevenue()`: 任何人可调用（只能提取自己的收益）
   - `setTrackWeight()`: 仅 Owner 可调用

3. **MusicSession 合约**:
   - `createSession()`: 任何人可调用
   - `joinAndCommit()`: 任何人可调用（需满足条件）
   - `cancelSession()`: 仅 Session 创建者可调用
   - `setTrackNFT()`, `setMasterComposition()`: 仅 Owner 可调用

### ⛽ Gas 费用预估

```typescript
// 大致的 Gas 消耗（实际值可能变化）
const GAS_ESTIMATES = {
  mintTrack: 150000,           // 铸造 Track NFT
  createSession: 200000,       // 创建 Session
  joinAndCommit: 180000,       // 加入并提交 Track
  addRevenue: 80000,            // 添加收益
  withdrawRevenue: 100000      // 提取收益
} as const;
```

### 🚨 错误处理

```typescript
// 常见错误信息
const ERROR_MESSAGES = {
  'Invalid session': '无效的 Session ID',
  'Session already finalized': 'Session 已完成',
  'Track already filled': '该音轨类型已被填充',
  'Invalid track type': '无效的音轨类型',
  'Not track owner': '您不是该 Track 的所有者',
  'No pending revenue': '没有待提取的收益',
  'Transfer failed': '转账失败',
  'Session name required': 'Session 名称不能为空',
  'Description too long': '描述过长（最大500字符）',
  'Invalid max tracks': '无效的最大音轨数（1-10）'
} as const;

// 错误处理示例
try {
  await writeContract({...});
} catch (error) {
  console.error('Transaction failed:', error);
  
  // 解析错误信息
  if (error.message.includes('revert')) {
    const reason = error.message.match(/revert: (.+)/)?.[1];
    const userMessage = ERROR_MESSAGES[reason] || '交易失败，请重试';
    toast.error(userMessage);
  } else {
    toast.error('网络错误，请检查连接');
  }
}
```

### 🔄 并发注意事项

1. **避免重复提交**: 在交易 pending 时禁用相关按钮
2. **状态同步**: 使用事件监听器实时更新状态
3. **缓存策略**: 合理使用 React Query 的缓存机制

### 📱 前端最佳实践

1. **Loading 状态**: 所有异步操作都要有 loading 状态
2. **错误边界**: 使用 React Error Boundary 处理组件错误
3. **重试机制**: 网络错误时提供重试选项
4. **离线提示**: 网络断开时显示友好提示
5. **交易确认**: 重要操作后显示交易确认状态

---

## 🛠️ 开发工具推荐

### 📚 库和工具

```typescript
// 推荐的 wagmi 配置
import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { monadTestnet } from './chains';

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID })
  ],
  transports: {
    [monadTestnet.id]: http()
  }
});
```

### 🔍 调试工具

```typescript
// 开发环境下的调试工具
if (process.env.NODE_ENV === 'development') {
  // 启用详细日志
  console.log('Contract Addresses:', CONTRACTS);
  
  // 监听所有事件
  useWatchContractEvent({
    address: CONTRACTS.MUSIC_SESSION,
    abi: MusicSessionABI,
    eventName: '*',
    onLogs: (logs) => console.log('All events:', logs)
  });
}
```

### 📊 性能监控

```typescript
// 性能监控
import { useEffect } from 'react';

function PerformanceMonitor() {
  useEffect(() => {
    // 监控合约调用性能
    const originalWriteContract = writeContract;
    
    const wrappedWriteContract = async (...args) => {
      const start = performance.now();
      const result = await originalWriteContract(...args);
      const end = performance.now();
      
      console.log(`Contract call took ${end - start} milliseconds`);
      return result;
    };
    
    // 替换原函数（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      writeContract = wrappedWriteContract;
    }
  }, []);
  
  return null;
}
```

---

## 📞 技术支持

如有问题，请通过以下方式获取帮助：

1. **查看测试用例**: `contracts/test/MonadRelay.t.sol`
2. **检查合约源码**: `contracts/src/`
3. **运行本地测试**: `make test`
4. **查看部署脚本**: `contracts/script/Deploy.s.sol`

---

## 📝 更新日志

- **v1.0.0**: 初始版本，包含所有核心功能
- **v1.1.0**: 添加收益分配权重功能
- **v1.2.0**: 优化 Gas 消耗，改进错误处理

---

**🎉 祝您开发愉快！如有任何问题，欢迎随时联系。**

*本文档基于 Monad Relay v2.0 编写，最后更新时间：2025-01-17*