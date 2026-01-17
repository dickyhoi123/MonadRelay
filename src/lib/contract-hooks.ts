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
 * @param publicClient - Wagmi public client
 * @param _sessionIds - 已废弃，函数内部会根据totalSessions自动查询
 * @param chainId - 链ID
 */
export async function getMultipleSessions(
  publicClient: ReturnType<typeof usePublicClient>,
  _sessionIds: number[],
  chainId: number
) {
  if (!publicClient) {
    throw new Error('Public client not available');
  }

  console.log('[getMultipleSessions] Chain ID:', chainId);
  const contractAddress = getContractAddresses(chainId).musicSession;
  console.log('[getMultipleSessions] MusicSession contract:', contractAddress);

  // 先尝试获取 totalSessions
  let totalSessions: bigint;
  try {
    console.log('[getMultipleSessions] Attempting to read totalSessions...');
    totalSessions = await publicClient.readContract({
      address: getContractAddresses(chainId).musicSession as `0x${string}`,
      abi: MUSIC_SESSION_ABI,
      functionName: 'totalSessions',
      args: []
    }) as bigint;

    console.log('[getMultipleSessions] Total sessions on chain:', totalSessions.toString());
  } catch (error: any) {
    console.error('[getMultipleSessions] Error reading totalSessions:', error);
    console.error('[getMultipleSessions] Error details:', {
      message: error?.message,
      code: error?.code,
      data: error?.data,
      name: error?.name
    });

    // 如果totalSessions读取失败，尝试调用getAllSessionIds作为备选方案
    console.log('[getMultipleSessions] Trying getAllSessionIds as fallback...');
    try {
      const allSessionIds = await publicClient.readContract({
        address: getContractAddresses(chainId).musicSession as `0x${string}`,
        abi: MUSIC_SESSION_ABI,
        functionName: 'getAllSessionIds',
        args: []
      }) as bigint[];

      console.log('[getMultipleSessions] getAllSessionIds returned:', allSessionIds);
      totalSessions = BigInt(allSessionIds.length);
    } catch (fallbackError) {
      console.error('[getMultipleSessions] Fallback getAllSessionIds also failed:', fallbackError);
      throw new Error(`Failed to read contract: ${error?.message || 'Unknown error'}`);
    }
  }

  if (totalSessions === BigInt(0)) {
    console.log('[getMultipleSessions] No sessions found on chain');
    return [];
  }

  // 只查询实际存在的 session ID (ID从1开始)
  const actualSessionIds = Array.from({ length: Number(totalSessions) }, (_, i) => i + 1);
  console.log('[getMultipleSessions] Querying session IDs:', actualSessionIds);

  const sessions = await Promise.allSettled(
    actualSessionIds.map(async (sessionId) => {
      try {
        console.log(`[getMultipleSessions] Querying session ${sessionId}...`);
        const info = await publicClient.readContract({
          address: getContractAddresses(chainId).musicSession as `0x${string}`,
          abi: MUSIC_SESSION_ABI,
          functionName: 'getSessionInfo',
          args: [BigInt(sessionId)]
        });
        console.log(`[getMultipleSessions] Session ${sessionId} loaded:`, info);
        return { sessionId, info };
      } catch (error) {
        console.log(`[getMultipleSessions] Failed to get session ${sessionId}:`, error);
        throw error;
      }
    })
  );

  console.log('[getMultipleSessions] Total requests:', sessions.length);
  console.log('[getMultipleSessions] Successful requests:', sessions.filter(s => s.status === 'fulfilled').length);
  console.log('[getMultipleSessions] Failed requests:', sessions.filter(s => s.status === 'rejected').length);

  // 打印每个成功的请求详情
  sessions.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`[getMultipleSessions] Session ${index + 1} success:`, result.value);
    } else {
      console.log(`[getMultipleSessions] Session ${index + 1} failed:`, result.reason);
    }
  });

  // 过滤成功的请求
  return sessions
    .filter((result): result is PromiseFulfilledResult<{ sessionId: number; info: any }> => result.status === 'fulfilled')
    .map(result => {
      // info返回的是数组，需要按索引访问
      // 0: id, 1: sessionName, 2: description, 3: genre, 4: bpm, 5: maxTracks
      // 6: currentTrackIndex, 7: isFinalized, 8: createdAt, 9: completedAt
      // 10: contributors, 11: trackIds, 12: trackFilledStatus
      console.log(`[getMultipleSessions] Mapping session data:`, {
        rawInfo: result.value.info,
        sessionId: result.value.sessionId,
        infoArray: Array.isArray(result.value.info) ? result.value.info : 'Not an array'
      });

      return {
        id: result.value.info[0],  // uint256 id
        name: result.value.info[1],  // string sessionName
        description: result.value.info[2],  // string description
        genre: result.value.info[3],  // string genre
        bpm: Number(result.value.info[4]),  // uint256 bpm
        maxTracks: Number(result.value.info[5]),  // uint256 maxTracks
        progress: Number(result.value.info[6]),  // uint256 currentTrackIndex
        isFinalized: result.value.info[7],  // bool isFinalized
        contributors: result.value.info[10],  // address[] contributors
        trackIds: result.value.info[11],  // uint256[] trackIds
        trackFilledStatus: result.value.info[12],  // bool[4] trackFilledStatus
        createdAt: Number(result.value.info[8]),  // uint256 createdAt
        completedAt: Number(result.value.info[9])  // uint256 completedAt
      };
    });
}
