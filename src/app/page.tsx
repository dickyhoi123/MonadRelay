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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Music, Users, Plus, Clock, CheckCircle, Loader2 } from 'lucide-react';

// 类型定义
type TrackType = 'Drum' | 'Bass' | 'Synth' | 'Vocal';

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
    contributors: ['0x1234...abcd', '0x5678...efgh'],
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
    contributors: ['0x9876...ijkl'],
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
    contributors: ['0x1111...2222', '0x3333...4444', '0x5555...6666', '0x7777...8888'],
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

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSession, setNewSession] = useState({
    name: '',
    description: '',
    genre: '',
    bpm: 120,
    maxTracks: 4
  });

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleCreateSession = () => {
    setIsLoading(true);
    // 模拟创建 Session
    setTimeout(() => {
      const session: Session = {
        id: sessions.length + 1,
        name: newSession.name,
        description: newSession.description,
        genre: newSession.genre,
        bpm: newSession.bpm,
        progress: 0,
        totalTracks: newSession.maxTracks,
        currentTrackType: 'Drum',
        isFinalized: false,
        contributors: [],
        createdAt: Date.now()
      };
      setSessions([session, ...sessions]);
      setShowCreateDialog(false);
      setIsLoading(false);
      setNewSession({ name: '', description: '', genre: '', bpm: 120, maxTracks: 4 });
    }, 1500);
  };

  const handleJoinSession = (sessionId: number) => {
    setIsLoading(true);
    setTimeout(() => {
      setSessions(sessions.map(s => {
        if (s.id === sessionId && s.progress < s.totalTracks) {
          return {
            ...s,
            progress: s.progress + 1,
            currentTrackType: trackTypes[s.progress + 1] || s.currentTrackType,
            contributors: [...s.contributors, `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`],
            isFinalized: s.progress + 1 >= s.totalTracks
          };
        }
        return s;
      }));
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="h-10 w-10 text-purple-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Monad Relay
            </h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            接力式音轨合成协议 - 链上多人协作音乐创作平台
          </p>
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
              <TabsTrigger value="completed" className="data-[state=active]:bg-purple-600">
                Completed
              </TabsTrigger>
              <TabsTrigger value="my-sessions" className="data-[state=active]:bg-purple-600">
                My Sessions
              </TabsTrigger>
            </TabsList>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Input
                      value={newSession.description}
                      onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                      placeholder="A collaborative synthwave masterpiece"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Genre</Label>
                      <Select value={newSession.genre} onValueChange={(value) => setNewSession({ ...newSession, genre: value })}>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
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
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateSession} disabled={isLoading || !newSession.name || !newSession.genre} className="w-full bg-purple-600 hover:bg-purple-700">
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Create Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="active" className="space-y-6">
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
                        return (
                          <div
                            key={track}
                            className={`flex-1 text-center py-2 rounded text-xs font-medium transition-all ${
                              isCompleted ? `${trackColors[track]} text-white` :
                              isCurrent ? 'bg-purple-600 text-white animate-pulse' :
                              'bg-slate-800 text-slate-500'
                            }`}
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
                            {contributor.slice(0, 2)}
                          </div>
                        ))}
                        {session.contributors.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900">
                            +{session.contributors.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Track Indicator */}
                    {session.progress < session.totalTracks && (
                      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg p-3">
                        <p className="text-sm text-purple-300 font-medium">
                          🎵 Waiting for: <span className="text-white font-bold">{session.currentTrackType}</span> track
                        </p>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => handleJoinSession(session.id)}
                      disabled={isLoading || session.isFinalized}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Music className="h-4 w-4 mr-2" />
                      )}
                      Join & Upload Track
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.filter(s => s.isFinalized).map((session) => (
                <Card key={session.id} className="bg-gradient-to-br from-green-900/30 to-slate-900/50 border-green-800 hover:border-green-500 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-white text-xl">{session.name}</CardTitle>
                      <Badge className="bg-green-600">✓ Completed</Badge>
                    </div>
                    <CardDescription className="text-slate-400">
                      {session.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 text-center">
                      <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                      <p className="text-green-300 font-medium">Master NFT Minted</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {session.contributors.length} contributors
                      </p>
                    </div>
                    <Button variant="outline" className="w-full border-green-600 text-green-400 hover:bg-green-600 hover:text-white">
                      <Music className="h-4 w-4 mr-2" />
                      Listen to Master Track
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-sessions">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-8 text-center">
                <Music className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Connect your wallet to view your sessions</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
