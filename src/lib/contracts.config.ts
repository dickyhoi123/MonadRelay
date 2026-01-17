/**
 * 合约配置文件
 * 包含合约地址和 ABI
 */

// 硬编码的合约地址（Hardhat 本地测试网）
export const HARDHAT_ADDRESSES = {
  trackNFT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  musicSession: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  masterComposition: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
} as const;

// Monad 测试网合约地址（已部署）
export const MONAD_TESTNET_ADDRESSES = {
  trackNFT: '0x673562A3De748C8E54Ea50C9b0D04139dAA0e7eE',
  musicSession: '0xB44a4aE625dC9F7B4ceD910a4664501Df2707F9D',
  masterComposition: '0x71B32E8E1Ec057E5888300FD34da5E0b23106e2f'
} as const;

// 当前默认使用 Hardhat 本地测试网
export const CONTRACT_ADDRESSES = HARDHAT_ADDRESSES;

// 根据网络获取合约地址
export function getContractAddresses(chainId: number) {
  if (chainId === 31337) {
    return HARDHAT_ADDRESSES;
  } else if (chainId === 10143) {
    return MONAD_TESTNET_ADDRESSES;
  }
  return HARDHAT_ADDRESSES; // 默认
}

// TrackNFT ABI
export const TRACK_NFT_ABI = [
  {
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "trackType", "type": "uint8"},
      {"name": "bpm", "type": "uint8"},
      {"name": "totalSixteenthNotes", "type": "uint16"},
      {"name": "encodedTracks", "type": "string"}
    ],
    "name": "mintTrackWithMusicData",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "getMusicData",
    "outputs": [
      {"name": "bpm", "type": "uint8"},
      {"name": "totalSixteenthNotes", "type": "uint16"},
      {"name": "encodedTracks", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "from", "type": "address"},
      {"indexed": true, "name": "to", "type": "address"},
      {"indexed": true, "name": "tokenId", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
  }
] as const;

// MusicSession ABI
export const MUSIC_SESSION_ABI = [
  {
    "inputs": [
      {"name": "sessionName", "type": "string"},
      {"name": "description", "type": "string"},
      {"name": "genre", "type": "string"},
      {"name": "bpm", "type": "uint256"},
      {"name": "maxTracks", "type": "uint256"}
    ],
    "name": "createSession",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSessions",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllSessionIds",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "sessionId", "type": "uint256"},
      {"name": "trackId", "type": "uint256"},
      {"name": "trackType", "type": "uint8"}
    ],
    "name": "joinAndCommit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "sessionId", "type": "uint256"}],
    "name": "getSessionInfo",
    "outputs": [
      {"name": "id", "type": "uint256"},
      {"name": "sessionName", "type": "string"},
      {"name": "description", "type": "string"},
      {"name": "genre", "type": "string"},
      {"name": "bpm", "type": "uint256"},
      {"name": "maxTracks", "type": "uint256"},
      {"name": "currentTrackIndex", "type": "uint256"},
      {"name": "isFinalized", "type": "bool"},
      {"name": "createdAt", "type": "uint256"},
      {"name": "completedAt", "type": "uint256"},
      {"name": "contributors", "type": "address[]"},
      {"name": "trackIds", "type": "uint256[]"},
      {"name": "trackFilledStatus", "type": "bool[4]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "sessionId", "type": "uint256"}],
    "name": "getCurrentTrackType",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "sessionId", "type": "uint256"},
      {"indexed": true, "name": "trackId", "type": "uint256"},
      {"indexed": true, "name": "contributor", "type": "address"},
      {"name": "trackType", "type": "uint8"},
      {"name": "trackIndex", "type": "uint256"}
    ],
    "name": "TrackCommitted",
    "type": "event"
  }
] as const;

// MasterComposition ABI
export const MASTER_COMPOSITION_ABI = [
  {
    "inputs": [{"name": "masterTokenId", "type": "uint256"}],
    "name": "getCompositionInfo",
    "outputs": [
      {"name": "sessionId", "type": "uint256"},
      {"name": "contributors", "type": "address[]"},
      {"name": "trackIds", "type": "uint256[]"},
      {"name": "createdAt", "type": "uint256"},
      {"name": "totalRevenue", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "masterTokenId", "type": "uint256"}],
    "name": "getCompositionMusicData",
    "outputs": [
      {"name": "bpm", "type": "uint8"},
      {"name": "totalSixteenthNotes", "type": "uint16"},
      {"name": "encodedTracks", "type": "bytes[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
