/**
 * Web3 合约交互 Hooks
 * 用于与 MonadRelay 合约交互
 */

import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useCallback } from 'react';

// 合约 ABI（精简版，只包含需要的函数）
const TRACK_NFT_ABI = [
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
  }
] as const;

const MUSIC_SESSION_ABI = [
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
  }
] as const;

const MASTER_COMPOSITION_ABI = [
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
  }
] as const;

// 合约地址（Hardhat 本地测试网）
const CONTRACT_ADDRESSES = {
  trackNFT: process.env.NEXT_PUBLIC_TRACK_NFT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  musicSession: process.env.NEXT_PUBLIC_MUSIC_SESSION_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  masterComposition: process.env.NEXT_PUBLIC_MASTER_COMPOSITION_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};

/**
 * 铸造 Track NFT
 */
export function useMintTrackNFT() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const mintTrack = useCallback(async (
    trackType: number,
    bpm: number,
    totalSixteenthNotes: number,
    encodedTracks: string
  ) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.trackNFT as `0x${string}`,
        abi: TRACK_NFT_ABI,
        functionName: 'mintTrackWithMusicData',
        args: [
          address as `0x${string}`,
          trackType,
          bpm,
          totalSixteenthNotes,
          encodedTracks
        ]
      });

      return hash;
    } catch (error) {
      console.error('Failed to mint track NFT:', error);
      throw error;
    }
  }, [walletClient, address]);

  return { mintTrack };
}

/**
 * 获取 Track NFT 的音乐数据
 */
export function useGetTrackMusicData() {
  const publicClient = usePublicClient();

  const getMusicData = useCallback(async (tokenId: number) => {
    try {
      const data = await publicClient!.readContract({
        address: CONTRACT_ADDRESSES.trackNFT as `0x${string}`,
        abi: TRACK_NFT_ABI,
        functionName: 'getMusicData',
        args: [BigInt(tokenId)]
      });

      // data 的类型是 unknown，需要正确处理
      if (!Array.isArray(data) || data.length !== 3) {
        throw new Error('Invalid response format');
      }

      const bpm = Number(data[0]);
      const totalSixteenthNotes = Number(data[1]);
      const encodedTracks = String(data[2]);

      return {
        bpm,
        totalSixteenthNotes,
        encodedTracks
      };
    } catch (error) {
      console.error('Failed to get track music data:', error);
      throw error;
    }
  }, [publicClient]);

  return { getMusicData };
}

/**
 * 创建 Music Session
 */
export function useCreateSession() {
  const { data: walletClient } = useWalletClient();

  const createSession = useCallback(async (
    sessionName: string,
    description: string,
    genre: string,
    bpm: number,
    maxTracks: number
  ) => {
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.musicSession as `0x${string}`,
        abi: MUSIC_SESSION_ABI,
        functionName: 'createSession',
        args: [sessionName, description, genre, BigInt(bpm), BigInt(maxTracks)]
      });

      return hash;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, [walletClient]);

  return { createSession };
}

/**
 * 加入 Session 并提交 Track
 */
export function useJoinAndCommit() {
  const { data: walletClient } = useWalletClient();

  const joinAndCommit = useCallback(async (
    sessionId: number,
    trackId: number,
    trackType: number
  ) => {
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.musicSession as `0x${string}`,
        abi: MUSIC_SESSION_ABI,
        functionName: 'joinAndCommit',
        args: [BigInt(sessionId), BigInt(trackId), trackType]
      });

      return hash;
    } catch (error) {
      console.error('Failed to join and commit:', error);
      throw error;
    }
  }, [walletClient]);

  return { joinAndCommit };
}

/**
 * 获取 Session 信息
 */
export function useGetSessionInfo() {
  const publicClient = usePublicClient();

  const getSessionInfo = useCallback(async (sessionId: number) => {
    try {
      const info = await publicClient!.readContract({
        address: CONTRACT_ADDRESSES.musicSession as `0x${string}`,
        abi: MUSIC_SESSION_ABI,
        functionName: 'getSessionInfo',
        args: [BigInt(sessionId)]
      });

      return info;
    } catch (error) {
      console.error('Failed to get session info:', error);
      throw error;
    }
  }, [publicClient]);

  return { getSessionInfo };
}

/**
 * 获取 Master NFT 信息
 */
export function useGetMasterInfo() {
  const publicClient = usePublicClient();

  const getMasterInfo = useCallback(async (masterTokenId: number) => {
    try {
      const info = await publicClient!.readContract({
        address: CONTRACT_ADDRESSES.masterComposition as `0x${string}`,
        abi: MASTER_COMPOSITION_ABI,
        functionName: 'getCompositionInfo',
        args: [BigInt(masterTokenId)]
      });

      return info;
    } catch (error) {
      console.error('Failed to get master info:', error);
      throw error;
    }
  }, [publicClient]);

  return { getMasterInfo };
}

/**
 * 等待交易确认
 */
export async function waitForTransaction(
  publicClient: any,
  hash: `0x${string}`
) {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash
    });
    return receipt;
  } catch (error) {
    console.error('Failed to wait for transaction:', error);
    throw error;
  }
}
