'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Save, Upload, Volume2, Music, X, Piano, Edit3, Trash2 } from 'lucide-react';
import { PianoRollNew, PianoNote } from '@/components/piano-roll-new';
import { useAudioEngine, noteToFrequency } from '@/lib/audio-engine';

type TrackType = 'Drum' | 'Bass' | 'Synth' | 'Vocal';
type TrackId = string;

interface AudioClip {
  id: string;
  name: string;
  startTime: number; // 拍子
  duration: number; // 拍子
  color: string;
  file?: File;
  audioBuffer?: AudioBuffer;
  pianoNotes?: PianoNote[];
}

interface Track {
  id: TrackId;
  type: TrackType;
  name: string;
  color: string;
  clips: AudioClip[];
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
}

interface MusicEditorProps {
  sessionId: number;
  sessionName: string;
  trackType: TrackType;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

const TRACK_COLORS: Record<TrackType, string> = {
  Drum: '#3b82f6',
  Bass: '#22c55e',
  Synth: '#a855f7',
  Vocal: '#ec4899',
};

const TOTAL_BARS = 16;
const BEATS_PER_BAR = 4;
const TOTAL_BEATS = TOTAL_BARS * BEATS_PER_BAR;

export function MusicEditor({ sessionId, sessionName, trackType, onSave, onCancel }: MusicEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(() => {
    const initialTracks: Track[] = [
      {
        id: '1',
        type: 'Drum',
        name: '🥁 Drum',
        color: TRACK_COLORS.Drum,
        clips: [],
        volume: 80,
        isMuted: false,
        isSolo: false
      },
      {
        id: '2',
        type: 'Bass',
        name: '🎸 Bass',
        color: TRACK_COLORS.Bass,
        clips: [],
        volume: 80,
        isMuted: false,
        isSolo: false
      },
      {
        id: '3',
        type: 'Synth',
        name: '🎹 Synth',
        color: TRACK_COLORS.Synth,
        clips: [],
        volume: 80,
        isMuted: false,
        isSolo: false
      },
      {
        id: '4',
        type: 'Vocal',
        name: '🎤 Vocal',
        color: TRACK_COLORS.Vocal,
        clips: [],
        volume: 80,
        isMuted: false,
        isSolo: false
      }
    ];

    // 为当前轨道添加一些默认音频片段
    const targetTrackIndex = initialTracks.findIndex(t => t.type === trackType);
    if (targetTrackIndex >= 0) {
      initialTracks[targetTrackIndex].clips = [
        {
          id: `clip-${Date.now()}-1`,
          name: 'Default Beat',
          startTime: 0,
          duration: 8,
          color: initialTracks[targetTrackIndex].color
        },
        {
          id: `clip-${Date.now()}-2`,
          name: 'Fill',
          startTime: 12,
          duration: 4,
          color: initialTracks[targetTrackIndex].color
        }
      ];
    }

    return initialTracks;
  });

  const [selectedClip, setSelectedClip] = useState<{ trackId: TrackId; clipId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pianoRollOpen, setPianoRollOpen] = useState(false);
  const [selectedTrackForPiano, setSelectedTrackForPiano] = useState<Track | null>(null);
  const [selectedClipForPiano, setSelectedClipForPiano] = useState<AudioClip | null>(null);
  const [draggingClip, setDraggingClip] = useState<{ trackId: TrackId; clipId: string; startX: number; originalStart: number } | null>(null);

  const audioEngine = useAudioEngine();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playInterval = useRef<NodeJS.Timeout | null>(null);

  // 播放控制
  const handlePlay = async () => {
    if (isPlaying) {
      // 停止播放
      setIsPlaying(false);
      audioEngine?.stopAll();
      if (playInterval.current) {
        clearInterval(playInterval.current);
        playInterval.current = null;
      }
      return;
    }

    // 开始播放
    setIsPlaying(true);
    let position = currentBeat;

    // 找到需要播放的音频片段
    const clipsToPlay: { clip: AudioClip; track: Track }[] = [];
    tracks.forEach(track => {
      if (track.isMuted) return;
      track.clips.forEach(clip => {
        if (clip.startTime >= position && clip.startTime < TOTAL_BEATS) {
          clipsToPlay.push({ clip, track });
        }
      });
    });

    // 播放每个片段
    for (const { clip, track } of clipsToPlay) {
      if (clip.audioBuffer) {
        const delay = (clip.startTime - position) * 0.5; // 0.5秒/拍
        setTimeout(() => {
          audioEngine?.playAudioClip(clip.audioBuffer!, delay, track.volume / 100, track.id);
        }, delay * 1000);
      }
    }

    // 播放指针移动
    playInterval.current = setInterval(() => {
      position += 0.25; // 每次移动1/4拍
      if (position >= TOTAL_BEATS) {
        setIsPlaying(false);
        setCurrentBeat(0);
        if (playInterval.current) {
          clearInterval(playInterval.current);
          playInterval.current = null;
        }
      } else {
        setCurrentBeat(position);
      }
    }, 125); // 0.5秒/拍 * 1/4拍 = 0.125秒
  };

  const handleSeek = (beat: number) => {
    setCurrentBeat(beat);
  };

  // 文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    try {
      const audioBuffer = await audioEngine?.loadAudioFile(file);
      const duration = audioBuffer ? Math.ceil(audioBuffer.duration / 0.5) : 4; // 转换为拍子

      // 添加到当前轨道
      const targetTrack = tracks.find(t => t.type === trackType);
      if (!targetTrack) return;

      const newClip: AudioClip = {
        id: `clip-${Date.now()}`,
        name: file.name,
        startTime: currentBeat,
        duration,
        color: targetTrack.color,
        file,
        audioBuffer
      };

      setTracks(prev => prev.map(t =>
        t.id === targetTrack.id
          ? { ...t, clips: [...t.clips, newClip] }
          : t
      ));

      // 播放预览
      audioEngine?.playAudioClip(audioBuffer!, 0, 0.5);
    } catch (error) {
      console.error('Failed to load audio:', error);
    }
  };

  // 删除片段
  const handleClipDelete = (trackId: TrackId, clipId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, clips: track.clips.filter(c => c.id !== clipId) }
        : track
    ));
  };

  // 音量控制
  const handleVolumeChange = (trackId: TrackId, volume: number) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, volume } : track
    ));
  };

  // 静音切换
  const handleMuteToggle = (trackId: TrackId) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, isMuted: !track.isMuted } : track
    ));
  };

  // 独奏切换
  const handleSoloToggle = (trackId: TrackId) => {
    const currentTrack = tracks.find(t => t.id === trackId);
    if (!currentTrack) return;

    if (currentTrack.isSolo) {
      // 取消独奏
      setTracks(prev => prev.map(track => ({ ...track, isSolo: false })));
    } else {
      // 开启独奏，关闭其他轨道的独奏
      setTracks(prev => prev.map(track =>
        track.id === trackId
          ? { ...track, isSolo: true, isMuted: false }
          : { ...track, isSolo: false, isMuted: true }
      ));
    }
  };

  // 拖拽音频片段
  const handleClipMouseDown = (e: React.MouseEvent, trackId: TrackId, clipId: string) => {
    e.stopPropagation();
    const track = tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (!track || !clip) return;

    setDraggingClip({
      trackId,
      clipId,
      startX: e.clientX,
      originalStart: clip.startTime
    });
    setSelectedClip({ trackId, clipId });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingClip || !draggingClip.trackId) return;

    const track = tracks.find(t => t.id === draggingClip.trackId);
    if (!track) return;

    const clip = track.clips.find(c => c.id === draggingClip.clipId);
    if (!clip) return;

    const deltaX = e.clientX - draggingClip.startX;
    // 假设每拍宽度为40px
    const beatDelta = deltaX / 40;
    const newStart = Math.max(0, Math.min(TOTAL_BEATS - clip.duration, draggingClip.originalStart + beatDelta));

    setTracks(prev => prev.map(t => {
      if (t.id === draggingClip.trackId) {
        return {
          ...t,
          clips: t.clips.map(c =>
            c.id === draggingClip.clipId ? { ...c, startTime: newStart } : c
          )
        };
      }
      return t;
    }));

    setDraggingClip({
      ...draggingClip,
      startX: e.clientX,
      originalStart: newStart
    });
  };

  const handleMouseUp = () => {
    setDraggingClip(null);
  };

  useEffect(() => {
    if (draggingClip) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'move';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingClip]);

  // 打开钢琴帘
  const handleOpenPianoRoll = (trackId: TrackId, clipId?: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    setSelectedTrackForPiano(track);
    if (clipId) {
      const clip = track.clips.find(c => c.id === clipId);
      setSelectedClipForPiano(clip || null);
    } else {
      setSelectedClipForPiano(null);
    }
    setPianoRollOpen(true);
  };

  // 保存钢琴音符
  const handleSavePianoNotes = (notes: PianoNote[]) => {
    if (!selectedTrackForPiano || !selectedClipForPiano) return;

    setTracks(prev => prev.map(track => {
      if (track.id === selectedTrackForPiano!.id) {
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id === selectedClipForPiano!.id
              ? { ...clip, pianoNotes: notes }
              : clip
          )
        };
      }
      return track;
    }));

    setPianoRollOpen(false);
  };

  // 保存音轨
  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSave?.({ tracks, currentBeat });
    }, 1500);
  };

  const formatTime = (beat: number) => {
    const bars = Math.floor(beat / BEATS_PER_BAR);
    const beatsInBar = Math.floor(beat % BEATS_PER_BAR);
    return `${bars + 1}:${beatsInBar + 1}`;
  };

  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 顶部工具栏 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white">{sessionName}</h1>
                <p className="text-sm text-slate-400">Session #{sessionId} • Creating {trackType} Track</p>
              </div>

              {/* 播放控制 */}
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentBeat(0)}
                  className="text-slate-400 hover:text-white"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={handlePlay}
                  className="w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentBeat(TOTAL_BEATS)}
                  className="text-slate-400 hover:text-white"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
                <div className="text-white font-mono text-xl ml-2">
                  {formatTime(currentBeat)} / {formatTime(TOTAL_BEATS)}
                </div>
              </div>

              {/* 钢琴帘切换按钮 - 显眼位置 */}
              <Button
                onClick={() => handleOpenPianoRoll(tracks.find(t => t.type === trackType)?.id || '')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
              >
                <Piano className="h-5 w-5 mr-2" />
                Open Piano Roll
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="audio-upload"
              />
              <label htmlFor="audio-upload">
                <Button
                  variant="outline"
                  className="cursor-pointer border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Audio
                </Button>
              </label>
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-slate-600 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={totalClips === 0 || isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Track
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 时间轴 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 mb-6">
          <div className="relative w-full h-16 bg-slate-800 rounded-xl overflow-hidden">
            {/* 网格线 */}
            <div className="absolute inset-0">
              {Array.from({ length: TOTAL_BEATS + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 w-px ${
                    i % BEATS_PER_BAR === 0 ? 'bg-purple-500/50' : 'bg-slate-700/30'
                  }`}
                  style={{ left: `${(i / TOTAL_BEATS) * 100}%` }}
                />
              ))}
            </div>

            {/* 时间刻度 */}
            <div className="absolute inset-x-0 top-0 h-6 flex items-center px-2 bg-slate-900/50">
              {Array.from({ length: TOTAL_BARS + 1 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute text-xs text-slate-400 font-medium"
                  style={{ left: `${((i * BEATS_PER_BAR) / TOTAL_BEATS) * 100}%` }}
                >
                  {i + 1}
                </span>
              ))}
            </div>

            {/* 播放进度 */}
            <div
              className="absolute top-6 bottom-0 bg-purple-600/20 pointer-events-none"
              style={{ width: `${(currentBeat / TOTAL_BEATS) * 100}%` }}
            />

            {/* 播放头 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${(currentBeat / TOTAL_BEATS) * 100}%` }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
            </div>

            {/* 点击跳转 */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                handleSeek(percentage * TOTAL_BEATS);
              }}
            />
          </div>
        </div>

        {/* 音轨区域 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Tracks</h2>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Total Clips: {totalClips}</span>
              <span className="mx-2">•</span>
              <span>Duration: {TOTAL_BARS} bars</span>
            </div>
          </div>

          <div className="space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="relative bg-slate-900/80 rounded-xl border-2 border-slate-800 overflow-hidden">
                <div className="absolute inset-0 flex">
                  {/* 轨道头部 */}
                  <div className="w-64 flex-shrink-0 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700 p-4 flex flex-col justify-between min-w-64">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-4 h-4 rounded-full shadow-lg`} style={{ backgroundColor: track.color }} />
                        <span className="text-white font-bold text-base">{track.name}</span>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <Button
                          variant={track.isMuted ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => handleMuteToggle(track.id)}
                          className={`h-7 text-xs px-3 ${track.isMuted ? '' : 'border-slate-600 hover:border-slate-500'}`}
                        >
                          M
                        </Button>
                        <Button
                          variant={track.isSolo ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSoloToggle(track.id)}
                          className={`h-7 text-xs px-3 ${!track.isSolo ? 'border-slate-600 hover:border-slate-500' : ''}`}
                        >
                          S
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPianoRoll(track.id)}
                        className="w-full border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white mb-2 font-semibold"
                      >
                        <Piano className="h-4 w-4 mr-2" />
                        Piano Roll
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className={`h-4 w-4 ${track.isMuted ? 'text-slate-600' : 'text-slate-400'}`} />
                      <Slider
                        value={[track.volume]}
                        onValueChange={(value) => handleVolumeChange(track.id, value[0])}
                        max={100}
                        className="flex-1"
                      />
                      <span className="text-xs font-medium text-slate-400 w-10">{track.volume}%</span>
                    </div>
                  </div>

                  {/* 音频片段区域 */}
                  <div className="flex-1 relative h-40 bg-slate-950 min-h-40">
                    {/* 网格线 */}
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: TOTAL_BEATS + 1 }).map((_, i) => (
                        <div
                          key={i}
                          className={`absolute top-0 bottom-0 w-px ${
                            i % BEATS_PER_BAR === 0 ? 'bg-purple-500/30' : 'bg-slate-800/20'
                          }`}
                          style={{ left: `${(i / TOTAL_BEATS) * 100}%` }}
                        />
                      ))}
                    </div>

                    {/* 音频片段 */}
                    {track.clips.map((clip) => {
                      const isDragging = draggingClip?.clipId === clip.id;
                      const isSelected = selectedClip?.clipId === clip.id;

                      return (
                        <div
                          key={clip.id}
                          className={`absolute h-28 top-6 rounded-lg cursor-move border-2 transition-all shadow-lg ${
                            isSelected ? 'border-white shadow-xl shadow-purple-500/30' : `border-transparent`
                          } ${isDragging ? 'opacity-80 scale-105 shadow-2xl' : 'hover:border-slate-500'}`}
                          style={{
                            left: `${(clip.startTime / TOTAL_BEATS) * 100}%`,
                            width: `${(clip.duration / TOTAL_BEATS) * 100}%`,
                            backgroundColor: `${clip.color}60`,
                            backdropFilter: 'blur(8px)',
                            minWidth: '60px'
                          }}
                          onMouseDown={(e) => handleClipMouseDown(e, track.id, clip.id)}
                        >
                          {/* 波形可视化 */}
                          <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-40 px-2">
                            {Array.from({ length: 20 }).map((_, i) => (
                              <div
                                key={i}
                                className="rounded-full"
                                style={{
                                  width: '4px',
                                  height: `${40 + Math.random() * 50}%`,
                                  backgroundColor: clip.color
                                }}
                              />
                            ))}
                          </div>

                          {/* 文件名和操作 */}
                          <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-white drop-shadow-lg truncate block">
                                {clip.name}
                              </span>
                              {clip.pianoNotes && clip.pianoNotes.length > 0 && (
                                <span className="text-[10px] text-white/70 block">
                                  {clip.pianoNotes.length} notes
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 pointer-events-auto">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPianoRoll(track.id, clip.id);
                                }}
                                className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                                title="Edit in Piano Roll"
                              >
                                <Piano className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClipDelete(track.id, clip.id);
                                }}
                                className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* 时间显示 */}
                          <div className="absolute bottom-1 left-2 text-[10px] text-white/70 font-mono">
                            Bar {Math.floor(clip.startTime / BEATS_PER_BAR) + 1}
                          </div>
                        </div>
                      );
                    })}

                    {/* 空轨道提示 */}
                    {track.clips.length === 0 && (
                      <div className="absolute inset-6 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-600 text-sm">
                        Drop audio files here or click Piano Roll to create notes
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 快捷提示 */}
        <Card className="mt-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Music className="h-5 w-5" />
              Quick Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">1</div>
                <div>
                  <p className="font-medium text-white">Drag & Drop</p>
                  <p className="text-slate-400">Move clips by dragging</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">2</div>
                <div>
                  <p className="font-medium text-white">Piano Roll</p>
                  <p className="text-slate-400">Create MIDI notes</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">3</div>
                <div>
                  <p className="font-medium text-white">Audio Upload</p>
                  <p className="text-slate-400">Add your own sounds</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">4</div>
                <div>
                  <p className="font-medium text-white">Play & Preview</p>
                  <p className="text-slate-400">Listen to your music</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 钢琴帘模态框 */}
      <PianoRollNew
        isOpen={pianoRollOpen}
        onClose={() => setPianoRollOpen(false)}
        trackId={selectedTrackForPiano?.id || ''}
        trackName={selectedTrackForPiano?.name || ''}
        trackType={trackType}
        onSave={handleSavePianoNotes}
        initialNotes={selectedClipForPiano?.pianoNotes}
      />
    </div>
  );
}
