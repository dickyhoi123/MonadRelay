/**
 * Web3 合约交互 Hooks
 * 用于与 MonadRelay 合约交互
 */

import { usePublicClient, useWalletClient, useAccount, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useCallback } from 'react';
import {
  getContractAddresses,
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
  const chainId = useChainId();

  const mintTrack = useCallback(async (
    trackType: number,
    bpm: number,
    totalSixteenthNotes: number,
    encodedTracks: string
  ) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    // 根据当前网络获取合约地址
    const addresses = getContractAddresses(chainId);

    try {
      const hash = await walletClient.writeContract({
        address: addresses.trackNFT as `0x${string}`,
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
  const chainId = useChainId();

  const getMusicData = useCallback(async (tokenId: number) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const addresses = getContractAddresses(chainId);

    try {
      const data = await publicClient.readContract({
        address: addresses.trackNFT as `0x${string}`,
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
  }, [publicClient, chainId]);

  return { getMusicData };
}

/**
 * 创建 Music Session
 */
export function useCreateSession() {
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

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
        address: getContractAddresses(chainId).musicSession as `0x${string}`,
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
  const chainId = useChainId();

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
        address: getContractAddresses(chainId).musicSession as `0x${string}`,
        abi: MUSIC_SESSION_ABI,
        functionName: 'joinAndCommit',
        args: [BigInt(sessionId), BigInt(trackId), trackType]
      });

      return hash;
    } catch (error) {
      console.error('Failed to join and commit:', error);
      throw error;
    }
  }, [walletClient, chainId]);

  return { joinAndCommit };
}

/**
 * 获取 Session 信息
 */
export function useGetSessionInfo() {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const getSessionInfo = useCallback(async (sessionId: number) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      const info = await publicClient.readContract({
        address: getContractAddresses(chainId).musicSession as `0x${string}`,
        abi: MUSIC_SESSION_ABI,
        functionName: 'getSessionInfo',
        args: [BigInt(sessionId)]
      });

      return info;
    } catch (error) {
      console.error('Failed to get session info:', error);
      throw error;
    }
  }, [publicClient, chainId]);

  return { getSessionInfo };
}

/**
 * 获取 Master NFT 信息
 */
export function useGetMasterInfo() {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const getMasterInfo = useCallback(async (masterTokenId: number) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      const info = await publicClient.readContract({
        address: getContractAddresses(chainId).masterComposition as `0x${string}`,
        abi: MASTER_COMPOSITION_ABI,
        functionName: 'getCompositionInfo',
        args: [BigInt(masterTokenId)]
      });

      return info;
    } catch (error) {
      console.error('Failed to get master info:', error);
      throw error;
    }
  }, [publicClient, chainId]);

  return { getMasterInfo };
}

/**
 * 获取 Master NFT 的完整音乐数据（包含所有音轨）
 */
export function useGetMasterMusicData() {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const getMasterMusicData = useCallback(async (masterTokenId: number) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      const data = await publicClient.readContract({
        address: getContractAddresses(chainId).masterComposition as `0x${string}`,
        abi: MASTER_COMPOSITION_ABI,
        functionName: 'getCompositionMusicData',
        args: [BigInt(masterTokenId)]
      }) as unknown as readonly [bigint, bigint, readonly bigint[]];

      return {
        bpm: Number(data[0]),
        totalSixteenthNotes: Number(data[1]),
        encodedTracks: data[2].map(track => track.toString())
      };
    } catch (error) {
      console.error('Failed to get master music data:', error);
      throw error;
    }
  }, [publicClient, chainId]);

  return { getMasterMusicData };
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

/**
 * 获取多个 Session 信息
 */
export async function getMultipleSessions(
  publicClient: ReturnType<typeof usePublicClient>,
  sessionIds: number[],
  chainId: number
) {
  if (!publicClient) {
    throw new Error('Public client not available');
  }

  const sessions = await Promise.allSettled(
    sessionIds.map(async (sessionId) => {
      const info = await publicClient.readContract({
        address: getContractAddresses(chainId).musicSession as `0x${string}`,
        abi: MUSIC_SESSION_ABI,
        functionName: 'getSessionInfo',
        args: [BigInt(sessionId)]
      });

      return { sessionId, info };
    })
  );

  // 过滤成功的请求
  return sessions
    .filter((result): result is PromiseFulfilledResult<{ sessionId: number; info: any }> => result.status === 'fulfilled')
    .map(result => ({
      id: result.value.info.id,
      name: result.value.info.sessionName,
      description: result.value.info.description,
      genre: result.value.info.genre,
      bpm: Number(result.value.info.bpm),
      maxTracks: Number(result.value.info.maxTracks),
      progress: Number(result.value.info.currentTrackIndex),
      isFinalized: result.value.info.isFinalized,
      contributors: result.value.info.contributors,
      trackIds: result.value.info.trackIds,
      trackFilledStatus: result.value.info.trackFilledStatus,
      createdAt: Number(result.value.info.createdAt),
      completedAt: Number(result.value.info.completedAt)
    }));
}
