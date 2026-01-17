/**
 * Web3 合约交互 Hooks
 * 用于与 MonadRelay 合约交互
 */

import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useCallback } from 'react';
import {
  CONTRACT_ADDRESSES,
  TRACK_NFT_ABI,
  MUSIC_SESSION_ABI,
  MASTER_COMPOSITION_ABI
} from './contracts.config';

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
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.trackNFT as `0x${string}`,
        abi: TRACK_NFT_ABI,
        functionName: 'getMusicData',
        args: [BigInt(tokenId)]
      }) as unknown as readonly [bigint, bigint, string];

      return {
        bpm: Number(data[0]),
        totalSixteenthNotes: Number(data[1]),
        encodedTracks: data[2]
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
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      const info = await publicClient.readContract({
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
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      const info = await publicClient.readContract({
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
  publicClient: ReturnType<typeof usePublicClient>,
  hash: `0x${string}`
) {
  try {
    const receipt = await publicClient!.waitForTransactionReceipt({
      hash
    });
    return receipt;
  } catch (error) {
    console.error('Failed to wait for transaction:', error);
    throw error;
  }
}
