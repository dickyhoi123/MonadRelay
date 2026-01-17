'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Play, Music, Users, Plus, Clock, CheckCircle, Loader2, MessageSquare, Edit, Wallet, X, ArrowLeft, Eye, Code, Gem } from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { WalletButton } from '@/components/wallet-button';
import { MusicEditor } from '@/components/music-editor';
import { ChatRoom } from '@/components/chat-room';
import type { Track, TrackType } from '@/components/music-editor';
import { usePublicClient, useAccount, useChainId } from 'wagmi';
import { useCreateSession, useJoinAndCommit, useMintTrackNFT, waitForTransaction, getMultipleSessions, useMintMasterNFT, useGetSessionMasterToken } from '@/lib/contract-hooks';
import { getContractAddresses, MUSIC_SESSION_ABI } from '@/lib/contracts.config';

// 类型定义
interface PianoNote {
  id: string;
  note: string;
  octave: number;
  startTime: number; // 16分音符
  duration: number; // 16分音符
  velocity: number;
}

interface Session {
  id: number;
  name: string;
  description: string;
  genre: string;
  bpm: number;
  progress: number;
  totalTracks: number;
  currentTrackType: TrackType;
  isFinalized: boolean;
  contributors: string[];
  createdAt: number;
  editingTrackType?: TrackType; // 当前正在编辑的轨道类型（未保存）
  tracks?: Track[]; // 所有音轨数据
  trackIds?: bigint[]; // 从合约获取的trackIds
  maxTracks?: number; // 最大轨道数
  masterTokenId?: number; // Master NFT Token ID
}

const trackTypes: TrackType[] = ['Drum', 'Bass', 'Synth', 'Vocal'];
const trackColors: Record<TrackType, string> = {
  Drum: 'bg-blue-500',
  Bass: 'bg-green-500',
  Synth: 'bg-purple-500',
  Vocal: 'bg-pink-500'
};

function HomePage() {
  const { isConnected, address } = useWallet();
  const publicClient = usePublicClient();
  const { createSession } = useCreateSession();
  const { joinAndCommit } = useJoinAndCommit();
  const { mintTrack } = useMintTrackNFT();
  const { mintMaster } = useMintMasterNFT();
  const { getSessionMasterToken } = useGetSessionMasterToken();
  const chainId = useChainId();

  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [totalSessionsOnChain, setTotalSessionsOnChain] = useState<number>(0);
  const [loadSessionsDebug, setLoadSessionsDebug] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    loadSessions();
  }, [chainId]); // 当网络切换时重新加载sessions

  // 获取链上totalSessions数量
  useEffect(() => {
    const fetchTotalSessions = async () => {
      if (!publicClient || !mounted) return;

      try {
        const addresses = getContractAddresses(chainId);
        console.log('[fetchTotalSessions] Chain ID:', chainId);
        console.log('[fetchTotalSessions] MusicSession address:', addresses.musicSession);
        console.log('[fetchTotalSessions] Public client:', !!publicClient);
        console.log('[fetchTotalSessions] ABI functions:', MUSIC_SESSION_ABI.map(a => a.name));

        const total = await publicClient.readContract({
          address: addresses.musicSession as `0x${string}`,
          abi: MUSIC_SESSION_ABI,
          functionName: 'totalSessions',
          args: []
        }) as bigint;

        console.log('[fetchTotalSessions] Total sessions:', total.toString());
        setTotalSessionsOnChain(Number(total));

        // 更新页面显示
        const totalElement = document.getElementById('totalSessions');
        if (totalElement) {
          totalElement.textContent = Number(total).toString();
        }
      } catch (error: any) {
        console.error('[fetchTotalSessions] Error:', error);
        console.error('[fetchTotalSessions] Error message:', error?.message);
        console.error('[fetchTotalSessions] Error code:', error?.code);
        console.error('[fetchTotalSessions] Error data:', error?.data);

        const addresses = getContractAddresses(chainId);
        console.error('[fetchTotalSessions] Contract address being used:', addresses.musicSession);
        console.error('[fetchTotalSessions] Chain ID:', chainId);

        const totalElement = document.getElementById('totalSessions');
        if (totalElement) {
          totalElement.textContent = `Error: ${error?.message || 'Unknown'}`;
        }
      }
    };

    fetchTotalSessions();
  }, [publicClient, chainId, mounted]);

  // 测试单个Session的读取
  const testSingleSession = async (sessionId: number) => {
    if (!publicClient) return;

    try {
      console.log(`[testSingleSession] Testing session ${sessionId}...`);
      const info = await publicClient.readContract({
        address: getContractAddresses(chainId).musicSession as `0x${string}`,
        abi: MUSIC_SESSION_ABI,
        functionName: 'getSessionInfo',
        args: [BigInt(sessionId)]
      });

      console.log(`[testSingleSession] Session ${sessionId} raw data:`, info);
      console.log(`[testSingleSession] Session ${sessionId} fields:`, {
        id: info[0],
        sessionName: info[1],
        description: info[2],
        genre: info[3],
        bpm: info[4],
        maxTracks: info[5],
        currentTrackIndex: info[6],
        isFinalized: info[7],
        createdAt: info[8],
        completedAt: info[9],
        contributors: info[10],
        trackIds: info[11],
        trackFilledStatus: info[12]
      });

      return info;
    } catch (error) {
      console.error(`[testSingleSession] Failed to test session ${sessionId}:`, error);
      throw error;
    }
  };

  // 从合约加载 Sessions（返回加载的sessions）
  const loadSessions = async () => {
    if (!publicClient) return [];

    setIsLoadingSessions(true);
    let debugInfo = '';

    try {
      debugInfo += 'Starting to load sessions...\n';
      console.log('[loadSessions] Starting to load sessions...');
      console.log('[loadSessions] Chain ID:', chainId);
      console.log('[loadSessions] Public client ready:', !!publicClient);

      debugInfo += `Chain ID: ${chainId}\n`;
      debugInfo += `Public client ready: ${!!publicClient}\n`;

      // 先测试单个Session（如果链上有Session）
      try {
        await testSingleSession(1);
      } catch (error) {
        debugInfo += `Warning: Could not test session 1\n`;
      }

      // 传入空数组，让getMultipleSessions自己根据totalSessions查询
      const contractSessions = await getMultipleSessions(publicClient, [], chainId);
      debugInfo += `Contract sessions returned: ${contractSessions.length}\n`;
      console.log('[loadSessions] Contract sessions returned:', contractSessions.length);

      // 转换为前端格式
      const frontendSessions: Session[] = contractSessions.map(cs => {
        console.log(`[loadSessions] Mapping contract session:`, cs);
        return {
          id: Number(cs.id),
          name: cs.name,
          description: cs.description,
          genre: cs.genre,
          bpm: cs.bpm,
          progress: cs.progress,
          totalTracks: cs.maxTracks,
          currentTrackType: trackTypes[cs.progress] || 'Vocal',
          isFinalized: cs.isFinalized,
          contributors: cs.contributors,
          createdAt: cs.createdAt,
          tracks: [] // 可以从NFT解码获取，这里暂时为空
        };
      });

      debugInfo += `Frontend sessions mapped: ${frontendSessions.length}\n`;

      // 详细日志：每个session的信息
      frontendSessions.forEach(s => {
        console.log(`[loadSessions] Session ${s.id}: name="${s.name}", hasName=${!!s.name}, finalized=${s.isFinalized}`);
        debugInfo += `Session ${s.id}: name="${s.name}", hasName=${!!s.name}, id=${s.id}\n`;
      });

      // 只显示有名称的Session（防止显示空session）
      const validSessions = frontendSessions.filter(s => s.name && s.id > 0);
      debugInfo += `Valid sessions with name: ${validSessions.length}\n`;
      console.log('[loadSessions] Valid sessions with name:', validSessions.length);
      console.log('[loadSessions] Final sessions list:', validSessions);

      setSessions(validSessions);
      setLoadSessionsDebug(debugInfo);
      return validSessions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      debugInfo += `ERROR: ${errorMsg}\n`;
      console.error('[loadSessions] Failed to load sessions:', error);
      setSessions([]);
      setLoadSessionsDebug(debugInfo);
      return [];
    } finally {
      setIsLoadingSessions(false);
    }
  };
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [newSession, setNewSession] = useState({
    name: '',
    description: '',
    genre: '',
    bpm: 120,
    maxTracks: 4
  });
  const [loadingStates, setLoadingStates] = useState<{ [key: string | number]: boolean }>({});
  const [selectedSessionForChat, setSelectedSessionForChat] = useState<Session | null>(null);
  const [readonlySession, setReadonlySession] = useState<Session | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatAddress = (addr: string) => {
    // 从 0x 后面开始显示，只显示2位
    const withoutPrefix = addr.startsWith('0x') ? addr.slice(2) : addr;
    return `${withoutPrefix.slice(0, 2)}`;
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleCreateSession = async () => {
    if (!isConnected || !address) {
      setShowWalletDialog(true);
      return;
    }

    if (!newSession.name || !newSession.genre) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, create: true }));

      // 调用合约创建 Session
      const hash = await createSession(
        newSession.name,
        newSession.description,
        newSession.genre,
        newSession.bpm,
        newSession.maxTracks
      );

      showToast('success', `Creating session... Transaction submitted. Hash: ${hash.substring(0, 10)}...`);

      // 等待交易确认
      if (publicClient) {
        const receipt = await waitForTransaction(publicClient, hash);
        console.log('Session created:', receipt);

        // 重新加载 Sessions并获取返回值
        const loadedSessions = await loadSessions();

        // 查找刚创建的 Session（使用返回的loadedSessions而不是state）
        const newSessionData = loadedSessions.find(s => s.name === newSession.name);
        if (newSessionData) {
          const TRACK_COLORS: Record<TrackType, string> = {
            Drum: '#3b82f6',
            Bass: '#22c55e',
            Synth: '#a855f7',
            Vocal: '#ec4899',
          };

          // 初始化4个空轨道
          const initialTracks: Track[] = trackTypes.map((type, index) => ({
            id: `${Date.now()}-${index}`,
            type,
            name: `${type} Track`,
            color: TRACK_COLORS[type],
            clips: [],
            volume: 80,
            isMuted: false,
            isSolo: false
          }));

          const session: Session = {
            id: newSessionData.id,
            name: newSessionData.name,
            description: newSessionData.description,
            genre: newSessionData.genre,
            bpm: newSessionData.bpm,
            progress: 0,
            totalTracks: newSessionData.maxTracks || 4,
            maxTracks: newSessionData.maxTracks || 4,
            currentTrackType: 'Drum',
            isFinalized: false,
            contributors: [address],
            createdAt: Date.now(),
            editingTrackType: 'Drum',
            tracks: initialTracks
          };

          setSessions([session, ...sessions]);
          setEditingSession(session);
        }

        setShowCreateDialog(false);
        setNewSession({ name: '', description: '', genre: '', bpm: 120, maxTracks: 4 });
        showToast('success', 'Session created successfully!');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      showToast('error', `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, create: false }));
    }
  };

  const handleJoinSession = (sessionId: number) => {
    if (!isConnected || !address) {
      setShowWalletDialog(true);
      return;
    }

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // 检查是否已完成
    if (session.isFinalized) {
      alert('This session is already finalized');
      return;
    }

    // 检查是否已满
    if (session.progress >= session.totalTracks) {
      alert('This session is already full');
      return;
    }

    // 检查是否已加入过
    const hasJoined = session.contributors.includes(address);
    if (hasJoined) {
      // 如果已经加入过，打开编辑器编辑当前需要完成的轨道
      const trackTypeToEdit = session.editingTrackType || session.currentTrackType;
      const sessionWithEditing = { ...session, editingTrackType: trackTypeToEdit };
      setEditingSession(sessionWithEditing);
      return;
    }

    // 首次加入，添加到贡献者列表（本地状态）
    const updatedSession = {
      ...session,
      contributors: [...session.contributors, address],
      editingTrackType: session.currentTrackType
    };

    setSessions(prevSessions => prevSessions.map(s => s.id === sessionId ? updatedSession : s));
    setEditingSession(updatedSession);
  };

  const handleEditorSave = async (data: any) => {
    if (!editingSession || !address) return;

    try {
      setLoadingStates(prev => ({ ...prev, upload: true }));

      // 1. Mint Track NFT
      const trackTypeMap: Record<TrackType, number> = {
        Drum: 0,
        Bass: 1,
        Synth: 2,
        Vocal: 3
      };

      // 动态导入编码模块
      const { encodeTracksToJSON, calculateTotalSixteenthNotes } = await import('@/lib/music-encoder');

      // 编码 tracks 数据为 JSON
      const bpm = editingSession.bpm || 120;
      const totalSixteenthNotes = calculateTotalSixteenthNotes(data.tracks);
      const encodedTracks = encodeTracksToJSON(data.tracks, bpm, totalSixteenthNotes);

      // 调用合约铸造 Track NFT
      const trackNFTHash = await mintTrack(
        trackTypeMap[editingSession.currentTrackType],
        bpm,
        totalSixteenthNotes,
        encodedTracks
      );

      console.log('Track NFT minting submitted:', trackNFTHash);

      // 等待交易确认并获取tokenId
      let trackId = 0;
      if (publicClient) {
        const receipt = await waitForTransaction(publicClient, trackNFTHash);
        console.log('Track NFT minted:', receipt);

        // 从 Transfer 事件中获取 Token ID
        if (receipt.logs && receipt.logs.length > 0) {
          const transferLog = receipt.logs.find((log: any) =>
            log.topics && log.topics.length === 4
          );

          if (transferLog && transferLog.topics[3]) {
            trackId = Number(BigInt(transferLog.topics[3]));
            console.log('Track NFT Token ID:', trackId);
          }
        }
      }

      // 2. 调用 joinAndCommit 将 trackId 提交到 Session
      const joinHash = await joinAndCommit(
        editingSession.id,
        trackId,
        trackTypeMap[editingSession.currentTrackType]
      );

      console.log('Join and commit submitted:', joinHash);

      // 等待交易确认
      if (publicClient) {
        await waitForTransaction(publicClient, joinHash);
        console.log('Join and commit confirmed');
      }

      // 3. 重新加载 Sessions（从合约获取最新数据）
      const loadedSessions = await loadSessions();
      const updatedSession = loadedSessions.find(s => s.id === editingSession.id);

      if (updatedSession) {
        // 合并tracks：更新当前track，保留其他track
        const existingTracks = editingSession.tracks || [];
        const currentTrackType = editingSession.currentTrackType;

        // 找到当前track类型的索引
        const currentTrackIndex = existingTracks.findIndex(t => t.type === currentTrackType);

        let mergedTracks: Track[];
        if (currentTrackIndex >= 0) {
          // 更新现有track
          mergedTracks = existingTracks.map((t: Track, idx: number) =>
            idx === currentTrackIndex ? (data.tracks.find((dt: Track) => dt.type === currentTrackType) || t) : t
          );
        } else {
          // 添加新track
          mergedTracks = [...existingTracks, ...data.tracks];
        }

        // 确保所有4个track都存在
        const trackTypes: TrackType[] = ['Drum', 'Bass', 'Synth', 'Vocal'];
        const ensuredTracks = trackTypes.map(trackType => {
          const existing = mergedTracks.find(t => t.type === trackType);
          if (existing) return existing;

          // 如果不存在，创建空track
          return {
            id: `${Date.now()}-${trackType}`,
            type: trackType,
            name: `${trackType} Track`,
            color: trackType === 'Drum' ? '#3b82f6' : trackType === 'Bass' ? '#22c55e' : trackType === 'Synth' ? '#a855f7' : '#ec4899',
            clips: [],
            volume: 80,
            isMuted: false,
            isSolo: false
          };
        });

        // 更新前端状态
        setSessions(prevSessions => prevSessions.map(s => s.id === editingSession.id ? {
          ...updatedSession,
          tracks: ensuredTracks,
          editingTrackType: undefined
        } : s));
      }

      showToast('success', `${editingSession.currentTrackType} track uploaded successfully!`);
    } catch (error) {
      console.error('Failed to save track:', error);
      showToast('error', `Failed to save track: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, upload: false }));
      // 关闭编辑器
      setEditingSession(null);
    }
  };

  const handleEditorCancel = () => {
    if (!editingSession) return;

    // 取消时不清除 editingTrackType，只关闭编辑器
    // 这样下次点击编辑时可以继续编辑未保存的内容
    const sessionToCancel = sessions.find(s => s.id === editingSession.id);
    if (sessionToCancel) {
      // 清除 editingTrackType，恢复到已保存的状态
      const updatedSession = {
        ...sessionToCancel,
        editingTrackType: undefined
      };
      setSessions(prevSessions => prevSessions.map(s => s.id === sessionToCancel.id ? updatedSession : s));
    }

    // 关闭编辑器
    setEditingSession(null);
  };

  const handleMintTrackNFT = (session: Session) => {
    if (!isConnected || !address) {
      setShowWalletDialog(true);
      return;
    }

    // 检查用户是否已贡献音轨
    const userContributorIndex = session.contributors.indexOf(address);
    if (userContributorIndex === -1 || userContributorIndex >= session.progress) {
      alert('You need to complete and save a track first!');
      return;
    }

    // 打开编辑器，让用户 mint 他们贡献的音轨
    // 设置 editingTrackType 为用户贡献的轨道类型
    const userTrackType = trackTypes[userContributorIndex];
    const sessionWithEditing = { ...session, editingTrackType: userTrackType };
    setEditingSession(sessionWithEditing);

    // 设置一个标志，让 MusicEditor 知道这是一个 mint 操作
    // 这里我们可以在 MusicEditor 组件中添加一个 prop 来处理
  };

  const handleMintMasterNFT = async (session: Session) => {
    if (!isConnected || !address) {
      setShowWalletDialog(true);
      return;
    }

    // 检查是否所有音轨都已完成
    if (session.progress < session.totalTracks) {
      alert(`Please complete all tracks first! Progress: ${session.progress}/${session.totalTracks}`);
      return;
    }

    // 检查是否已经铸造过Master NFT
    if (session.masterTokenId) {
      alert(`Master NFT already minted! Token ID: ${session.masterTokenId}`);
      return;
    }

    // 检查用户是否是贡献者
    if (!session.contributors.includes(address)) {
      alert('You are not a contributor to this session');
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, [`mint-master-${session.id}`]: true }));

      // 检查Session是否有tracks数据
      if (!session.tracks || session.tracks.length === 0) {
        throw new Error('No track data available. Please complete all tracks first.');
      }

      console.log('[Mint Master NFT] Session tracks:', session.tracks);
      console.log('[Mint Master NFT] Session trackIds:', session.trackIds);
      console.log('[Mint Master NFT] Session progress:', session.progress, '/', session.totalTracks);

      // 检查Session是否有tracks数据
      if (!session.tracks || session.tracks.length === 0) {
        throw new Error('No track data available. Please complete all tracks first.');
      }

      // 动态导入编码函数
      const { noteToMidiNumber } = await import('@/lib/music-encoder');

      const bpm = session.bpm || 120;
      const totalSixteenthNotes = session.tracks.reduce((max, track) =>
        Math.max(max, ...track.clips.map(c => c.startTime + c.duration)), 0
      );

      // 为每个track单独编码（合约期望bytes[]数组）
      const trackTypeOrder: TrackType[] = ['Drum', 'Bass', 'Synth', 'Vocal'];
      const encodedTrackArray: string[] = [];

      trackTypeOrder.forEach(trackType => {
        const track = session.tracks?.find(t => t.type === trackType);
        if (!track) return;

        const notes: any[] = [];

        // 收集该track的所有音符
        track.clips.forEach(clip => {
          if (clip.pianoNotes && clip.pianoNotes.length > 0) {
            clip.pianoNotes.forEach(pianoNote => {
              notes.push({
                note: noteToMidiNumber(pianoNote.note, pianoNote.octave),
                startTime: pianoNote.startTime,
                duration: pianoNote.duration,
                velocity: pianoNote.velocity,
                instrumentId: pianoNote.instrumentType || `${track.type}-default`
              });
            });
          }
        });

        // 编码单个track为JSON字符串
        if (notes.length > 0) {
          const singleTrackData: any = {};
          singleTrackData[trackType] = notes;
          encodedTrackArray.push(JSON.stringify(singleTrackData));
        } else {
          // 如果没有音符，创建空track
          const emptyTrack: any = {};
          emptyTrack[trackType] = [];
          encodedTrackArray.push(JSON.stringify(emptyTrack));
        }
      });

      console.log('[Mint Master NFT] Encoded track array length:', encodedTrackArray.length);
      console.log('[Mint Master NFT] Encoded tracks preview:', encodedTrackArray);

      // 检查是否有有效的音符数据
      const hasNotes = encodedTrackArray.some(encodedTrack => {
        const trackData = JSON.parse(encodedTrack);
        const notes = Object.values(trackData)[0] as any[];
        return notes && notes.length > 0;
      });

      if (!hasNotes) {
        throw new Error('No notes found in any track. Please add notes using Piano Roll before minting.');
      }

      // 调用铸造Master NFT
      const hash = await mintMaster(
        session.id,
        session.contributors,
        // 使用session.trackIds（从合约获取的真实trackIds）
        (session.trackIds || []).map((id: bigint) => Number(id)),
        bpm,
        totalSixteenthNotes,
        encodedTrackArray // 传入每个track的编码数据数组
      );

      console.log('[Mint Master NFT] Transaction hash:', hash);
      showToast('success', 'Master NFT minted successfully! Waiting for confirmation...');

      // 等待交易确认并获取Token ID
      if (publicClient) {
        const receipt = await waitForTransaction(publicClient, hash);
        console.log('[Mint Master NFT] Transaction confirmed:', receipt);

        // 从Transfer事件获取Token ID
        let tokenId = 0;
        if (receipt.logs && receipt.logs.length > 0) {
          const transferLog = receipt.logs.find((log: any) =>
            log.topics && log.topics.length === 4 && log.topics[0]?.toLowerCase().includes('transfer')
          );

          if (transferLog && transferLog.topics[3]) {
            tokenId = Number(BigInt(transferLog.topics[3]));
            console.log('[Mint Master NFT] Master Token ID:', tokenId);
          }
        }

        // 更新Session的masterTokenId
        setSessions(prevSessions =>
          prevSessions.map(s =>
            s.id === session.id ? { ...s, masterTokenId: tokenId || session.contributors.indexOf(address) + 1 } : s
          )
        );

        if (tokenId > 0) {
          showToast('success', `Master NFT minted successfully! Token ID: ${tokenId}. You can decode it in the NFT Decoder page.`);
        } else {
          showToast('success', 'Master NFT minted successfully!');
        }
      }
    } catch (error) {
      console.error('[Mint Master NFT] Failed to mint:', error);
      showToast('error', `Failed to mint master NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [`mint-master-${session.id}`]: false }));
    }
  };

  const handlePlayMasterNFT = async (session: Session) => {
    if (!session.masterTokenId) {
      alert('Master NFT not yet minted');
      return;
    }

    // 打开只读会话并播放
    setReadonlySession(session);
  };

  const handleGetMasterNFTId = async (session: Session) => {
    if (!isConnected || !address) {
      setShowWalletDialog(true);
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, [`get-nft-id-${session.id}`]: true }));

      // 调用合约获取Master NFT Token ID
      const tokenId = await getSessionMasterToken(session.id);

      console.log('[Get Master NFT ID] Token ID:', tokenId);

      if (tokenId && tokenId > 0) {
        // 更新Session的masterTokenId
        setSessions(prevSessions =>
          prevSessions.map(s =>
            s.id === session.id ? { ...s, masterTokenId: Number(tokenId) } : s
          )
        );

        showToast('success', `Master NFT ID: ${tokenId}`);
      } else {
        showToast('info', 'No Master NFT found for this session. Please mint one first.');
      }
    } catch (error) {
      console.error('[Get Master NFT ID] Failed:', error);
      showToast('error', `Failed to get Master NFT ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [`get-nft-id-${session.id}`]: false }));
    }
  };

  const hasJoinedSession = (session: Session) => {
    return !!(address && session.contributors.includes(address));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Toast 通知 */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-right transition-all ${
          toastMessage.type === 'success' ? 'bg-green-600 text-white' :
          toastMessage.type === 'error' ? 'bg-red-600 text-white' :
          'bg-blue-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-medium">{toastMessage.message}</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="h-10 w-10 text-purple-400" />
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Monad Relay
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                接力式音轨合成协议 - 链上多人协作音乐创作平台
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/nft-decoder'}
              className="border-purple-500/50 text-purple-300 hover:bg-purple-600/10"
            >
              <Code className="h-4 w-4 mr-2" />
              NFT Decoder
            </Button>
            <WalletButton />
          </div>
        </header>

        {/* Debug Info - 临时显示，用于调试 */}
        {mounted && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
              <div>
                <span className="text-slate-400">Network:</span>
                <span className="text-purple-400 font-mono ml-2">Monad Testnet</span>
                <span className="text-slate-500 ml-2">
                  (Chain ID: 10143)
                </span>
              </div>
              <div>
                <span className="text-slate-400">Wallet Connected:</span>
                <span className={isConnected ? "text-green-400" : "text-red-400"}>{isConnected ? " Yes" : " No"}</span>
              </div>
              <div>
                <span className="text-slate-400">Total on Chain:</span>
                <span className="text-yellow-400 font-mono ml-2" id="totalSessions">Loading...</span>
              </div>
              <div>
                <span className="text-slate-400">Loaded Sessions:</span>
                <span className="text-purple-400 font-mono ml-2">{sessions.length}</span>
              </div>
              <div>
                <span className="text-slate-400">Public Client:</span>
                <span className={publicClient ? "text-green-400" : "text-red-400"}>{publicClient ? " Ready" : " Not Ready"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-700">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSessions}
                disabled={isLoadingSessions}
                className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
              >
                {isLoadingSessions ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4 mr-2" />
                    Test Contract
                  </>
                )}
              </Button>
              <span className="text-xs text-slate-500">
                Click to test contract connection and view console for details
              </span>
            </div>
            {sessions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700 text-sm">
                <span className="text-slate-400">Session IDs:</span>
                <span className="text-purple-400 font-mono ml-2">
                  [{sessions.map(s => s.id).join(', ')}]
                </span>
              </div>
            )}
            {loadSessionsDebug && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Load Sessions Debug:</div>
                <pre className="text-xs font-mono text-slate-300 bg-black/50 p-2 rounded max-h-40 overflow-auto">
                  {loadSessionsDebug}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Active Sessions', value: String(sessions.filter(s => !s.isFinalized).length), icon: Play, color: 'text-blue-400' },
            { label: 'Total Sessions', value: String(sessions.length), icon: Music, color: 'text-purple-400' },
            { label: 'Contributors', value: String(sessions.reduce((acc, s) => acc + s.contributors.length, 0)), icon: Users, color: 'text-pink-400' },
            { label: 'Completed', value: String(sessions.filter(s => s.isFinalized).length), icon: CheckCircle, color: 'text-green-400' }
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="all" className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-slate-900/50 border-slate-800">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
                All Sessions
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
                Active
              </TabsTrigger>
              <TabsTrigger value="participating" className="data-[state=active]:bg-purple-600">
                Participating
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-purple-600">
                Completed
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Dialog open={showCreateDialog} onOpenChange={(open) => {
                if (!isConnected && open) {
                  setShowWalletDialog(true);
                  return;
                }
                setShowCreateDialog(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Session</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Start a new collaborative music project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label className="text-slate-300">Session Name</Label>
                      <Input
                        value={newSession.name}
                        onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                        placeholder="Neon Dreams"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Description</Label>
                      <Input
                        value={newSession.description}
                        onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                        placeholder="A collaborative synthwave masterpiece"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300">Genre</Label>
                        <Select value={newSession.genre} onValueChange={(value) => setNewSession({ ...newSession, genre: value })}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="Select genre" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="Synthwave">Synthwave</SelectItem>
                            <SelectItem value="Techno">Techno</SelectItem>
                            <SelectItem value="House">House</SelectItem>
                            <SelectItem value="Drum&Bass">Drum & Bass</SelectItem>
                            <SelectItem value="Lo-Fi">Lo-Fi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">BPM</Label>
                        <Input
                          type="number"
                          value={newSession.bpm}
                          onChange={(e) => setNewSession({ ...newSession, bpm: parseInt(e.target.value) || 120 })}
                          min="60"
                          max="200"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        className="border-slate-600 text-slate-400"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateSession}
                        disabled={loadingStates.create || !newSession.name || !newSession.genre}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {loadingStates.create ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Session'
                        )}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={loadSessions}
                disabled={isLoadingSessions}
                className="border-slate-600 text-slate-400"
              >
                {isLoadingSessions ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>

          <TabsContent value="all" className="space-y-6">
            {!mounted ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => (
                <Card key={session.id} className={`bg-slate-900/50 border-slate-800 hover:border-purple-500 transition-all duration-300 ${session.isFinalized ? 'opacity-75' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white text-xl">{session.name}</CardTitle>
                        {session.isFinalized && (
                          <Badge className="bg-purple-600">✓ Completed</Badge>
                        )}
                      </div>
                      {!session.isFinalized && (
                        <Badge variant="outline" className="border-purple-500 text-purple-400">
                          {session.genre}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-slate-400">
                      {session.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white font-medium">{session.progress}/{session.totalTracks}</span>
                      </div>
                      <Progress value={(session.progress / session.totalTracks) * 100} className="h-2" />
                    </div>

                    {/* Track Types */}
                    <div className="flex gap-2">
                      {trackTypes.map((track, idx) => {
                        const isCompleted = idx < session.progress;
                        const isCurrent = idx === session.progress;
                        const isPending = idx > session.progress;
                        const isEditing = session.editingTrackType === track;

                        return (
                          <div
                            key={track}
                            style={isEditing ? {
                              background: 'linear-gradient(90deg, #9333ea, #ec4899, #9333ea)',
                              backgroundSize: '200% 100%',
                              animation: 'glow-pulse 3s ease-in-out infinite'
                            } : {}}
                            className={`flex-1 text-center py-2 rounded text-xs font-medium transition-all ${
                              isCompleted ? `${trackColors[track]} text-white` :
                              isCurrent ? 'bg-purple-600 text-white' :
                              'bg-slate-800 text-slate-500'
                            } ${isEditing ? 'text-white' : ''}`}
                          >
                            {track}
                          </div>
                        );
                      })}
                    </div>

                    {/* Session Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-400">{formatTime(session.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-400">{session.bpm} BPM</span>
                      </div>
                    </div>

                    {/* Contributors */}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <div className="flex -space-x-2">
                        {session.contributors.slice(0, 3).map((contributor, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900"
                            title={contributor}
                          >
                            {formatAddress(contributor)}
                          </div>
                        ))}
                        {session.contributors.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900">
                            +{session.contributors.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {/* Master NFT Badge */}
                      {session.masterTokenId && (
                        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                          <Gem className="h-4 w-4 text-white" />
                          <span className="text-white text-sm font-medium">Master NFT # {session.masterTokenId}</span>
                        </div>
                      )}

                      {/* Main Action Buttons */}
                      <div className="flex gap-2">
                        {session.isFinalized ? (
                          <>
                            <Button
                              onClick={() => handlePlayMasterNFT(session)}
                              disabled={!mounted || !isConnected}
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {session.masterTokenId ? 'Play NFT' : 'Listen'}
                            </Button>
                            {!session.masterTokenId && (
                              <Button
                                onClick={() => handleGetMasterNFTId(session)}
                                disabled={!mounted || !isConnected || loadingStates[`get-nft-id-${session.id}`]}
                                variant="outline"
                                className="border-pink-500 text-pink-400 hover:bg-pink-600 hover:text-white"
                              >
                                {loadingStates[`get-nft-id-${session.id}`] ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Getting...
                                  </>
                                ) : (
                                  <>
                                    <Gem className="h-4 w-4 mr-2" />
                                    Get NFT ID
                                  </>
                                )}
                              </Button>
                            )}
                          </>
                        ) : session.progress >= session.totalTracks ? (
                          <>
                            {/* Mint Master NFT Button */}
                            {!session.masterTokenId && (
                              <Button
                                onClick={() => handleMintMasterNFT(session)}
                                disabled={!mounted || !isConnected || loadingStates[`mint-master-${session.id}`]}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                              >
                                {loadingStates[`mint-master-${session.id}`] ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Minting...
                                  </>
                                ) : (
                                  <>
                                    <Gem className="h-4 w-4 mr-2" />
                                    Mint Master NFT
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              onClick={() => setReadonlySession(session)}
                              disabled={!mounted || !isConnected}
                              variant="outline"
                              className={`${session.masterTokenId ? 'flex-1' : ''} border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleJoinSession(session.id)}
                              disabled={!mounted || !isConnected || loadingStates[session.id] || session.isFinalized || session.progress >= session.totalTracks}
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                              {loadingStates[session.id] ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Joining...
                                </>
                              ) : hasJoinedSession(session) ? (
                                <>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit {session.editingTrackType || session.currentTrackType}
                                </>
                              ) : (
                                <>
                                  <Music className="h-4 w-4 mr-2" />
                                  Join & Upload
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedSessionForChat(session)}
                              className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Session Status Hint */}
                      <div className="text-xs text-center text-slate-500 mt-2">
                        {session.isFinalized ? (
                          <span className="text-purple-400">✓ Session finalized</span>
                        ) : session.progress >= session.totalTracks ? (
                          !session.masterTokenId ? (
                            <span className="text-pink-400">🎵 All tracks ready! Mint Master NFT now</span>
                          ) : (
                            <span className="text-green-400">✓ Master NFT minted! Token ID: {session.masterTokenId}</span>
                          )
                        ) : (
                          <span>Need {session.totalTracks - session.progress} more track{session.totalTracks - session.progress > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            {!mounted ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.filter(s => !s.isFinalized).map((session) => (
                <Card key={session.id} className="bg-slate-900/50 border-slate-800 hover:border-purple-500 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-white text-xl">{session.name}</CardTitle>
                      <Badge variant="outline" className="border-purple-500 text-purple-400">
                        {session.genre}
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-400">
                      {session.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white font-medium">{session.progress}/{session.totalTracks}</span>
                      </div>
                      <Progress value={(session.progress / session.totalTracks) * 100} className="h-2" />
                    </div>

                    {/* Track Types */}
                    <div className="flex gap-2">
                      {trackTypes.map((track, idx) => {
                        const isCompleted = idx < session.progress;
                        const isCurrent = idx === session.progress;
                        const isPending = idx > session.progress;
                        // 如果有未保存的编辑状态，高亮显示正在编辑的轨道
                        const isEditing = session.editingTrackType === track;

                        return (
                          <div
                            key={track}
                            style={isEditing ? {
                              background: 'linear-gradient(90deg, #9333ea, #ec4899, #9333ea)',
                              backgroundSize: '200% 100%',
                              animation: 'glow-pulse 3s ease-in-out infinite'
                            } : {}}
                            className={`flex-1 text-center py-2 rounded text-xs font-medium transition-all ${
                              isCompleted ? `${trackColors[track]} text-white` :
                              isCurrent ? 'bg-purple-600 text-white' :
                              'bg-slate-800 text-slate-500'
                            } ${isEditing ? 'text-white' : ''}`}
                          >
                            {track}
                          </div>
                        );
                      })}
                    </div>

                    {/* Session Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-400">{formatTime(session.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-400">{session.bpm} BPM</span>
                      </div>
                    </div>

                    {/* Contributors */}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <div className="flex -space-x-2">
                        {session.contributors.slice(0, 3).map((contributor, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900"
                            title={contributor}
                          >
                            {formatAddress(contributor)}
                          </div>
                        ))}
                        {session.contributors.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900">
                            +{session.contributors.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleJoinSession(session.id)}
                        disabled={!mounted || !isConnected || loadingStates[session.id] || session.isFinalized || session.progress >= session.totalTracks}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {loadingStates[session.id] ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : hasJoinedSession(session) ? (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit {session.editingTrackType || session.currentTrackType}
                          </>
                        ) : session.progress < session.totalTracks ? (
                          <>
                            <Music className="h-4 w-4 mr-2" />
                            Join & Upload
                          </>
                        ) : (
                          'Full'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSessionForChat(session)}
                        className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="participating" className="space-y-6">
            {!mounted || !address ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-slate-400 text-lg">Connect your wallet to see your participated sessions</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.filter(s => s.contributors.includes(address)).map((session) => (
                <Card key={session.id} className={`bg-slate-900/50 border-slate-800 hover:border-purple-500 transition-all duration-300 ${session.isFinalized ? 'opacity-75' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white text-xl">{session.name}</CardTitle>
                        {session.isFinalized && (
                          <Badge className="bg-purple-600">✓ Completed</Badge>
                        )}
                      </div>
                      {!session.isFinalized && (
                        <Badge variant="outline" className="border-purple-500 text-purple-400">
                          {session.genre}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-slate-400">
                      {session.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white font-medium">{session.progress}/{session.totalTracks}</span>
                      </div>
                      <Progress value={(session.progress / session.totalTracks) * 100} className="h-2" />
                    </div>

                    {/* Track Types */}
                    <div className="flex gap-2">
                      {trackTypes.map((track, idx) => {
                        const isCompleted = idx < session.progress;
                        const isCurrent = idx === session.progress;
                        const isPending = idx > session.progress;
                        const isEditing = session.editingTrackType === track;
                        const userContributed = isCompleted; // 简化：已完成的表示用户已贡献

                        return (
                          <div
                            key={track}
                            style={isEditing ? {
                              background: 'linear-gradient(90deg, #9333ea, #ec4899, #9333ea)',
                              backgroundSize: '200% 100%',
                              animation: 'glow-pulse 3s ease-in-out infinite'
                            } : {}}
                            className={`flex-1 text-center py-2 rounded text-xs font-medium transition-all ${
                              userContributed ? `${trackColors[track]} text-white` :
                              isCurrent ? 'bg-purple-600 text-white' :
                              'bg-slate-800 text-slate-500'
                            } ${isEditing ? 'text-white' : ''}`}
                          >
                            {track}
                          </div>
                        );
                      })}
                    </div>

                    {/* Session Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-400">{formatTime(session.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-400">{session.bpm} BPM</span>
                      </div>
                    </div>

                    {/* Contributors */}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <div className="flex -space-x-2">
                        {session.contributors.slice(0, 3).map((contributor, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900"
                            title={contributor}
                          >
                            {formatAddress(contributor)}
                          </div>
                        ))}
                        {session.contributors.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900">
                            +{session.contributors.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {session.isFinalized ? (
                        // 已完成的session：显示Listen按钮（只读模式）
                        <Button
                          onClick={() => setReadonlySession(session)}
                          disabled={!mounted || !isConnected}
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Listen
                        </Button>
                      ) : session.progress >= session.totalTracks ? (
                        // 已满但未完成：显示View按钮（只读模式）
                        <Button
                          onClick={() => setReadonlySession(session)}
                          disabled={!mounted || !isConnected}
                          variant="outline"
                          className="flex-1 border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      ) : (
                        // 未完成且未满：显示Edit按钮和Mint Track NFT按钮
                        <>
                          <Button
                            onClick={() => handleJoinSession(session.id)}
                            disabled={!isConnected || loadingStates[session.id]}
                            className="flex-[2] bg-purple-600 hover:bg-purple-700"
                          >
                            {loadingStates[session.id] ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Joining...
                              </>
                            ) : (
                              <>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit {session.editingTrackType || session.currentTrackType}
                              </>
                            )}
                          </Button>
                          {session.progress > 0 && (
                            <Button
                              variant="outline"
                              disabled={!mounted || !isConnected}
                              onClick={() => handleMintTrackNFT(session)}
                              className="flex-1 border-green-500 text-green-400 hover:bg-green-600 hover:text-white"
                              title="Mint your track as NFT"
                            >
                              <Gem className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSessionForChat(session)}
                        className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {!mounted ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.filter(s => s.isFinalized).map((session) => (
                <Card key={session.id} className="bg-slate-900/50 border-slate-800 hover:border-purple-500 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-white text-xl">{session.name}</CardTitle>
                      <Badge className="bg-purple-600">✓ Completed</Badge>
                    </div>
                    <CardDescription className="text-slate-400">
                      {session.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-4 text-center">
                      <CheckCircle className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-purple-300 font-medium">Master NFT Minted</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {session.contributors.length} contributors
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* Master NFT Badge */}
                      {session.masterTokenId && (
                        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                          <Gem className="h-4 w-4 text-white" />
                          <span className="text-white text-sm font-medium">Master NFT # {session.masterTokenId}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setReadonlySession(session)}
                        disabled={!mounted || !isConnected}
                        className="flex-1 border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                      >
                        <Music className="h-4 w-4 mr-2" />
                        Listen
                      </Button>
                      {!session.masterTokenId && (
                        <Button
                          onClick={() => handleGetMasterNFTId(session)}
                          disabled={!mounted || !isConnected || loadingStates[`get-nft-id-${session.id}`]}
                          variant="outline"
                          className="border-pink-500 text-pink-400 hover:bg-pink-600 hover:text-white"
                        >
                          {loadingStates[`get-nft-id-${session.id}`] ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Getting...
                            </>
                          ) : (
                            <>
                              <Gem className="h-4 w-4 mr-2" />
                              Get NFT ID
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSessionForChat(session)}
                        className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Chat Dialog - Fixed window without Dialog wrapper */}
        {selectedSessionForChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden max-w-4xl w-full h-[600px] shadow-2xl">
              <button
                onClick={() => setSelectedSessionForChat(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <ChatRoom
                sessionId={selectedSessionForChat.id}
                sessionName={selectedSessionForChat.name}
              />
            </div>
          </div>
        )}

        {/* Music Editor Dialog - Full screen modal */}
        {editingSession && (
          <div className="fixed inset-0 z-50 bg-slate-950 overflow-auto">
            {/* 顶部导航栏 */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
              <button
                onClick={handleEditorCancel}
                className="flex items-center gap-2 px-6 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Sessions</span>
              </button>
            </div>
            <MusicEditor
              sessionId={editingSession.id}
              sessionName={editingSession.name}
              trackType={editingSession.currentTrackType}
              initialTracks={editingSession.tracks}
              onSave={handleEditorSave}
              onCancel={handleEditorCancel}
            />
          </div>
        )}

        {/* Music Editor - Readonly Mode */}
        {readonlySession && (
          <div className="fixed inset-0 z-50 bg-slate-950 overflow-auto">
            {/* 顶部导航栏 */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
              <button
                onClick={() => setReadonlySession(null)}
                className="flex items-center gap-2 px-6 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Sessions</span>
              </button>
            </div>
            <MusicEditor
              sessionId={readonlySession.id}
              sessionName={readonlySession.name}
              trackType={readonlySession.currentTrackType}
              initialTracks={readonlySession.tracks}
              readonly={true}
            />
          </div>
        )}

        {/* Wallet Required Dialog */}
        <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-purple-400" />
                Wallet Required
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Please connect your wallet to participate in music creation
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="p-4 bg-purple-900/30 rounded-full">
                <Wallet className="h-12 w-12 text-purple-400" />
              </div>
              <p className="text-center text-slate-300">
                Connect your wallet to create sessions, upload tracks, and collaborate with other musicians
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowWalletDialog(false)}
                className="border-slate-700 text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <div className="flex-1">
                <WalletButton />
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function Home() {
  return <HomePage />;
}
