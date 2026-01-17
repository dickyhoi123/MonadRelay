/**
 * 合约配置文件
 * 包含合约地址和 ABI
 */

// 硬编码的合约地址（Hardhat 本地测试网）
export const CONTRACT_ADDRESSES = {
  trackNFT: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d',
  musicSession: '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1',
  masterComposition: '0x59b670e9fA9D0A427751Af201D676719a970857b'
} as const;

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
