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
import { Play, Music, Users, Plus, Clock, CheckCircle, Loader2, MessageSquare, Edit, Wallet, X, ArrowLeft, Eye } from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { WalletButton } from '@/components/wallet-button';
import { MusicEditor } from '@/components/music-editor';
import { ChatRoom } from '@/components/chat-room';
import type { Track, TrackType } from '@/components/music-editor';

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
}

// 模拟数据
const mockSessions: Session[] = [
  {
    id: 1,
    name: 'Neon Dreams',
    description: 'A collaborative synthwave masterpiece',
    genre: 'Synthwave',
    bpm: 120,
    progress: 2,
    totalTracks: 4,
    currentTrackType: 'Synth',
    isFinalized: false,
    contributors: ['1234abcd5678efgh'],
    createdAt: Date.now() - 3600000
  },
  {
    id: 2,
    name: 'Cyber Beats',
    description: 'Dark techno vibes',
    genre: 'Techno',
    bpm: 140,
    progress: 1,
    totalTracks: 4,
    currentTrackType: 'Bass',
    isFinalized: false,
    contributors: ['9876ijkl5432mnop'],
    createdAt: Date.now() - 7200000
  },
  {
    id: 3,
    name: 'Future House',
    description: 'Melodic progressive house',
    genre: 'Progressive House',
    bpm: 126,
    progress: 4,
    totalTracks: 4,
    currentTrackType: 'Vocal',
    isFinalized: true,
    contributors: ['1111222233334444', '5555666677778888', 'aaaabbbbccccdddd', 'eeeeffffgggghhhh'],
    createdAt: Date.now() - 86400000
  }
];

const trackTypes: TrackType[] = ['Drum', 'Bass', 'Synth', 'Vocal'];
const trackColors: Record<TrackType, string> = {
  Drum: 'bg-blue-500',
  Bass: 'bg-green-500',
  Synth: 'bg-purple-500',
  Vocal: 'bg-pink-500'
};

function HomePage() {
  const { isConnected, address } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(mockSessions);

  useEffect(() => {
    setMounted(true);
  }, []);
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
  const [loadingStates, setLoadingStates] = useState<{ [key: number]: boolean }>({});
  const [selectedSessionForChat, setSelectedSessionForChat] = useState<Session | null>(null);
  const [readonlySession, setReadonlySession] = useState<Session | null>(null);

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

  const handleCreateSession = () => {
    if (!newSession.name || !newSession.genre) return;

    const initialTrackType: TrackType = 'Drum';
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
      id: sessions.length + 1,
      name: newSession.name,
      description: newSession.description,
      genre: newSession.genre,
      bpm: newSession.bpm,
      progress: 0,
      totalTracks: newSession.maxTracks,
      currentTrackType: initialTrackType,
      isFinalized: false,
      contributors: address ? [address] : [],
      createdAt: Date.now(),
      editingTrackType: initialTrackType, // 立即开始编辑
      tracks: initialTracks
    };
    setSessions([session, ...sessions]);
    setShowCreateDialog(false);
    setNewSession({ name: '', description: '', genre: '', bpm: 120, maxTracks: 4 });
    // 立即打开编辑器
    setEditingSession(session);
  };

  const handleJoinSession = (sessionId: number) => {
    if (!isConnected || !address) {
      setShowWalletDialog(true);
      return;
    }

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // 检查是否已加入过
    const hasJoined = session.contributors.includes(address);
    if (hasJoined) {
      // 如果已经加入过，打开编辑器编辑当前需要完成的轨道
      // 如果有未保存的 editingTrackType，继续编辑它
      // 否则编辑 currentTrackType
      const trackTypeToEdit = session.editingTrackType || session.currentTrackType;
      const sessionWithEditing = { ...session, editingTrackType: trackTypeToEdit };
      setEditingSession(sessionWithEditing);
      return;
    }

    // 检查会话是否已完成
    if (session.isFinalized) {
      return;
    }

    // 检查是否已满
    if (session.progress >= session.totalTracks) {
      return;
    }

    setLoadingStates(prev => ({ ...prev, [sessionId]: true }));

    setTimeout(() => {
      // 创建新的会话状态 - 首次加入时只添加贡献者，不更新 progress
      // progress 只在保存时更新
      const updatedSession = {
        ...session,
        contributors: [...session.contributors, address],
        editingTrackType: session.currentTrackType // 开始编辑当前轨道
      };

      // 更新会话列表
      setSessions(prevSessions => prevSessions.map(s => s.id === sessionId ? updatedSession : s));

      // 打开编辑器
      setEditingSession(updatedSession);

      setLoadingStates(prev => ({ ...prev, [sessionId]: false }));
    }, 1000);
  };

  const handleEditorSave = (data: any) => {
    if (!editingSession) return;

    // 保存时更新 progress、currentTrackType 和 tracks
    const newProgress = editingSession.progress + 1;
    const updatedSession = {
      ...editingSession,
      progress: newProgress,
      currentTrackType: trackTypes[newProgress] || editingSession.currentTrackType,
      editingTrackType: undefined, // 清除未保存的编辑状态
      isFinalized: newProgress >= editingSession.totalTracks,
      tracks: data.tracks // 保存所有音轨数据
    };

    // 更新会话列表
    setSessions(prevSessions => prevSessions.map(s => s.id === editingSession.id ? updatedSession : s));

    // 关闭编辑器
    setEditingSession(null);
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

  const hasJoinedSession = (session: Session) => {
    return !!(address && session.contributors.includes(address));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
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
          <WalletButton />
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Active Sessions', value: '12', icon: Play, color: 'text-blue-400' },
            { label: 'Total Tracks', value: '48', icon: Music, color: 'text-purple-400' },
            { label: 'Contributors', value: '156', icon: Users, color: 'text-pink-400' },
            { label: 'Master NFTs', value: '23', icon: CheckCircle, color: 'text-green-400' }
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
        <Tabs defaultValue="active" className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-slate-900/50 border-slate-800">
              <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
                Active Sessions
              </TabsTrigger>
              <TabsTrigger value="participating" className="data-[state=active]:bg-purple-600">
                Participating
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-purple-600">
                Completed
              </TabsTrigger>
            </TabsList>
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
                        onChange={(e) => setNewSession({ ...newSession, bpm: parseInt(e.target.value) })}
                        placeholder="120"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateSession} disabled={!newSession.name || !newSession.genre} className="w-full bg-purple-600 hover:bg-purple-700">
                    Create Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
                        disabled={!isConnected || loadingStates[session.id] || session.isFinalized || session.progress >= session.totalTracks}
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
                          disabled={!isConnected}
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Listen
                        </Button>
                      ) : session.progress >= session.totalTracks ? (
                        // 已满但未完成：显示View按钮（只读模式）
                        <Button
                          onClick={() => setReadonlySession(session)}
                          disabled={!isConnected}
                          variant="outline"
                          className="flex-1 border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      ) : (
                        // 未完成且未满：显示Edit按钮
                        <Button
                          onClick={() => handleJoinSession(session.id)}
                          disabled={!isConnected || loadingStates[session.id]}
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
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
                      <Button
                        variant="outline"
                        onClick={() => setReadonlySession(session)}
                        disabled={!isConnected}
                        className="flex-1 border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                      >
                        <Music className="h-4 w-4 mr-2" />
                        Listen
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
