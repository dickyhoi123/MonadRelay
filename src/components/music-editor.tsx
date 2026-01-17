'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Save, Upload, Volume2, Download, Trash2, Music, Grid3x3, Copy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type TrackType = 'Drum' | 'Bass' | 'Synth' | 'Vocal';
type TrackId = string;
type NoteType = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

interface AudioClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  color: string;
  file?: File;
  url?: string;
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

// 预设免费音频素材
const PRESET_AUDIO_CLIPS: Record<TrackType, Array<{ name: string; duration: number; url?: string }>> = {
  Drum: [
    { name: 'Kick Basic', duration: 0.5 },
    { name: 'Snare Classic', duration: 0.4 },
    { name: 'Hi-Hat Closed', duration: 0.1 },
    { name: 'Hi-Hat Open', duration: 0.3 },
    { name: 'Crash Cymbal', duration: 1.0 },
  ],
  Bass: [
    { name: 'Bass House 1', duration: 2.0 },
    { name: 'Bass Deep', duration: 1.5 },
    { name: 'Sub Bass', duration: 3.0 },
    { name: 'Bass Funk', duration: 2.5 },
  ],
  Synth: [
    { name: 'Lead Pluck', duration: 1.0 },
    { name: 'Pad Ambient', duration: 4.0 },
    { name: 'Arpeggio C Major', duration: 2.0 },
    { name: 'Synth Bass', duration: 1.5 },
  ],
  Vocal: [
    { name: 'Vocal Chop A', duration: 0.5 },
    { name: 'Vocal Chop E', duration: 0.5 },
    { name: 'Ad-lib Yeah', duration: 0.3 },
    { name: 'Spoken Phrase', duration: 3.0 },
  ],
};

// 钢琴键盘音符
const PIANO_NOTES: NoteType[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_COLORS: Record<NoteType, string> = {
  'C': '#ef4444',
  'C#': '#f97316',
  'D': '#eab308',
  'D#': '#22c55e',
  'E': '#14b8a6',
  'F': '#06b6d4',
  'F#': '#3b82f6',
  'G': '#8b5cf6',
  'G#': '#a855f7',
  'A': '#d946ef',
  'A#': '#ec4899',
  'B': '#f43f5e',
};

interface TimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  isDragging: boolean;
}

function Timeline({ duration, currentTime, onSeek, isDragging }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  const handleSeek = (e: MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percentage * duration);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsSeeking(true);
    handleSeek(e.nativeEvent);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isSeeking) {
      handleSeek(e);
    }
  };

  const handleMouseUp = () => {
    setIsSeeking(false);
  };

  useEffect(() => {
    if (isSeeking) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isSeeking]);

  return (
    <div
      ref={timelineRef}
      className={`relative w-full h-16 bg-slate-800 rounded-xl overflow-hidden cursor-pointer select-none transition-all ${
        isSeeking ? 'shadow-lg shadow-purple-500/20' : ''
      }`}
      onMouseDown={handleMouseDown}
    >
      {/* 网格线 */}
      <div className="absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-slate-700/50"
            style={{ left: `${(i / 18) * 100}%` }}
          />
        ))}
      </div>

      {/* 时间刻度 */}
      <div className="absolute inset-x-0 top-0 h-6 flex items-center px-4 bg-slate-900/50">
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90].map((t) => (
          <div key={t} className="absolute text-xs text-slate-400 font-medium" style={{ left: `${(t / 90) * 100}%` }}>
            {t}s
          </div>
        ))}
      </div>

      {/* 播放进度背景 */}
      <div
        className={`absolute top-6 bottom-0 bg-gradient-to-r from-purple-600/20 via-purple-600/10 to-transparent pointer-events-none transition-all ${
          isSeeking ? 'bg-purple-600/30' : ''
        }`}
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />

      {/* 播放头 */}
      <div
        className={`absolute top-0 bottom-0 w-1 bg-red-500 pointer-events-none transition-all z-10 ${
          isSeeking ? 'w-2 bg-red-400' : ''
        }`}
        style={{ left: `${(currentTime / duration) * 100}%` }}
      >
        <div className="absolute -top-0.5 -left-1 w-3 h-3 bg-red-500 rounded-full shadow-lg" />
      </div>
    </div>
  );
}

// 钢琴键盘组件
interface PianoKeyboardProps {
  onNoteClick: (note: NoteType) => void;
  disabled?: boolean;
}

function PianoKeyboard({ onNoteClick, disabled = false }: PianoKeyboardProps) {
  return (
    <div className="flex items-center justify-center gap-1 p-4 bg-slate-900 rounded-xl border border-slate-800">
      {PIANO_NOTES.map((note) => {
        const isBlackKey = note.includes('#');
        return (
          <button
            key={note}
            disabled={disabled}
            onClick={() => onNoteClick(note)}
            className={`relative transition-all duration-150 ${
              isBlackKey
                ? 'w-6 h-20 bg-slate-950 hover:bg-slate-800 active:bg-slate-700 -mx-3 z-10 rounded-b-md'
                : 'w-8 h-32 bg-white hover:bg-slate-100 active:bg-slate-200 rounded-b-md'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            style={
              !isBlackKey
                ? { backgroundColor: '#f8fafc' }
                : {}
            }
          >
            {!isBlackKey && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600">
                {note}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// 预设音频片段选择器
interface PresetClipsProps {
  trackType: TrackType;
  onAddPresetClip: (preset: { name: string; duration: number; url?: string }) => void;
}

function PresetClips({ trackType, onAddPresetClip }: PresetClipsProps) {
  const presets = PRESET_AUDIO_CLIPS[trackType] || [];

  if (presets.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <Music className="h-4 w-4" />
        Preset Audio Clips
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset, idx) => (
          <Button
            key={idx}
            variant="outline"
            onClick={() => onAddPresetClip(preset)}
            className="h-auto py-3 border-slate-700 hover:border-purple-500 hover:bg-purple-600/10 transition-all text-left"
          >
            <div>
              <div className="text-sm font-medium text-slate-200">{preset.name}</div>
              <div className="text-xs text-slate-500">{preset.duration}s</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}

interface TrackLaneProps {
  track: Track;
  currentTime: number;
  onClipMove: (trackId: TrackId, clipId: string, newStartTime: number) => void;
  onClipDelete: (trackId: TrackId, clipId: string) => void;
  onVolumeChange: (trackId: TrackId, volume: number) => void;
  onMuteToggle: (trackId: TrackId) => void;
  onClipSelect: (trackId: TrackId, clipId: string) => void;
  isSelected?: boolean;
}

function TrackLane({ track, currentTime, onClipMove, onClipDelete, onVolumeChange, onMuteToggle, onClipSelect, isSelected }: TrackLaneProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingClip, setDraggingClip] = useState<{ clipId: string; startX: number; originalStartTime: number } | null>(null);
  const [hoveredClip, setHoveredClip] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent, clipId: string) => {
    if (!trackRef.current) return;
    const clip = track.clips.find(c => c.id === clipId);
    if (!clip) return;

    e.stopPropagation();
    e.preventDefault();
    setDraggingClip({
      clipId,
      startX: e.clientX,
      originalStartTime: clip.startTime
    });
    onClipSelect(track.id, clipId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingClip || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const deltaX = e.clientX - draggingClip.startX;
    const timePerPixel = 90 / rect.width;
    const deltaTime = deltaX * timePerPixel;

    const newStartTime = Math.max(0, Math.min(90 - track.clips.find(c => c.id === draggingClip.clipId)!.duration, draggingClip.originalStartTime + deltaTime));
    onClipMove(track.id, draggingClip.clipId, newStartTime);
  };

  const handleMouseUp = () => {
    setDraggingClip(null);
  };

  useEffect(() => {
    if (draggingClip) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingClip]);

  return (
    <div
      ref={trackRef}
      className={`relative h-28 bg-slate-900/80 rounded-xl border-2 transition-all hover:border-slate-700 ${
        isSelected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-slate-800'
      }`}
      onMouseUp={handleMouseUp}
    >
      {/* 网格线 */}
      <div className="absolute inset-0 left-48 overflow-hidden opacity-20">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-slate-400"
            style={{ left: `${(i / 18) * 100}%` }}
          />
        ))}
      </div>

      {/* 播放进度背景 */}
      <div
        className="absolute inset-y-0 left-48 bg-purple-600/10 pointer-events-none transition-all"
        style={{ width: `${(currentTime / 90) * 100}%` }}
      />

      {/* 轨道头部 */}
      <div className="absolute left-0 top-0 bottom-0 w-56 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700 p-4 flex flex-col justify-between z-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-4 h-4 rounded-full ${track.color} shadow-lg`} />
            <span className="text-white font-bold text-base">{track.name}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={track.isMuted ? "destructive" : "outline"}
              size="sm"
              onClick={() => onMuteToggle(track.id)}
              className={`h-7 text-xs px-3 ${track.isMuted ? '' : 'border-slate-600 hover:border-slate-500'}`}
            >
              M
            </Button>
            <Button
              variant={track.isSolo ? "default" : "outline"}
              size="sm"
              onClick={() => {}} // Solo functionality
              className={`h-7 text-xs px-3 ${!track.isSolo ? 'border-slate-600 hover:border-slate-500' : ''}`}
            >
              S
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className={`h-4 w-4 ${track.isMuted ? 'text-slate-600' : 'text-slate-400'}`} />
          <Slider
            value={[track.volume]}
            onValueChange={(value) => onVolumeChange(track.id, value[0])}
            max={100}
            className="flex-1"
          />
          <span className="text-xs font-medium text-slate-400 w-10">{track.volume}%</span>
        </div>
      </div>

      {/* 音频片段区域 */}
      <div className="absolute left-56 right-0 top-0 bottom-0">
        {track.clips.length === 0 ? (
          <div className="absolute inset-4 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-600 text-sm">
            Drag clips here or use presets
          </div>
        ) : (
          track.clips.map((clip) => {
            const isDragging = draggingClip?.clipId === clip.id;
            const isHovered = hoveredClip === clip.id;
            return (
              <div
                key={clip.id}
                className={`absolute h-20 top-4 rounded-lg cursor-grab active:cursor-grabbing border-2 transition-all shadow-lg ${
                  isSelected ? 'border-white shadow-xl shadow-purple-500/30' : `border-${clip.color.replace('#', '')}-500/50`
                } ${isDragging ? 'opacity-80 scale-105 shadow-2xl' : ''} ${isHovered ? 'scale-102' : ''}`}
                style={{
                  left: `${(clip.startTime / 90) * 100}%`,
                  width: `${(clip.duration / 90) * 100}%`,
                  backgroundColor: `${clip.color}60`,
                  backdropFilter: 'blur(8px)',
                  minWidth: '60px'
                }}
                onMouseDown={(e) => handleMouseDown(e, clip.id)}
                onMouseEnter={() => setHoveredClip(clip.id)}
                onMouseLeave={() => setHoveredClip(null)}
              >
                {/* 波形可视化 */}
                <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-40">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full ${clip.color.replace('#', '')}-400`}
                      style={{
                        width: '3px',
                        height: `${30 + Math.random() * 40}%`,
                        backgroundColor: clip.color
                      }}
                    />
                  ))}
                </div>

                {/* 文件名和删除按钮 */}
                <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                  <span className="text-xs font-bold text-white drop-shadow-lg truncate max-w-[60%]">
                    {clip.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClipDelete(track.id, clip.id);
                    }}
                    className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20 pointer-events-auto rounded-full"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* 时间显示 */}
                <div className="absolute bottom-1 left-2 text-[10px] text-white/70 font-mono">
                  {clip.startTime.toFixed(1)}s
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface MusicEditorProps {
  sessionId: number;
  sessionName: string;
  trackType: TrackType;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

export function MusicEditor({ sessionId, sessionName, trackType, onSave, onCancel }: MusicEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(90);
  const [selectedNote, setSelectedNote] = useState<NoteType | null>(null);
  const [tracks, setTracks] = useState<Track[]>(() => {
    // 根据当前音轨类型添加默认音乐方块
    const initialTracks: Track[] = [
      {
        id: '1',
        type: 'Drum',
        name: '🥁 Drum',
        color: '#3b82f6',
        clips: [],
        volume: 80,
        isMuted: false,
        isSolo: false
      },
      {
        id: '2',
        type: 'Bass',
        name: '🎸 Bass',
        color: '#22c55e',
        clips: [],
        volume: 80,
        isMuted: false,
        isSolo: false
      },
      {
        id: '3',
        type: 'Synth',
        name: '🎹 Synth',
        color: '#a855f7',
        clips: [],
        volume: 80,
        isMuted: false,
        isSolo: false
      },
      {
        id: '4',
        type: 'Vocal',
        name: '🎤 Vocal',
        color: '#ec4899',
        clips: [],
        volume: 80,
        isMuted: false,
        isSolo: false
      }
    ];

    // 为当前轨道添加默认音频片段
    const targetTrackIndex = initialTracks.findIndex(t => t.type === trackType);
    if (targetTrackIndex >= 0) {
      const presets = PRESET_AUDIO_CLIPS[trackType] || [];
      const targetTrack = initialTracks[targetTrackIndex];

      // 添加2个默认音频片段
      const defaultClips: AudioClip[] = [
        {
          id: `clip-${Date.now()}-1`,
          name: presets[0]?.name || 'Default Clip 1',
          startTime: 0,
          duration: presets[0]?.duration || 2,
          color: targetTrack.color
        },
        {
          id: `clip-${Date.now()}-2`,
          name: presets[1]?.name || 'Default Clip 2',
          startTime: 4,
          duration: presets[1]?.duration || 2,
          color: targetTrack.color
        }
      ];

      initialTracks[targetTrackIndex] = {
        ...targetTrack,
        clips: defaultClips
      };
    }

    return initialTracks;
  });

  const [selectedClip, setSelectedClip] = useState<{ trackId: TrackId; clipId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const url = URL.createObjectURL(file);

    // 根据当前选中的音轨类型添加
    const targetTrack = tracks.find(t => t.type === trackType);
    if (!targetTrack) return;

    const newClip: AudioClip = {
      id: `clip-${Date.now()}`,
      name: file.name,
      startTime: 0,
      duration: 15, // 默认15秒
      color: targetTrack.color,
      file,
      url
    };

    setTracks(prev => prev.map(t =>
      t.id === targetTrack.id
        ? { ...t, clips: [...t.clips, newClip] }
        : t
    ));
  };

  const handleAddPresetClip = (preset: { name: string; duration: number; url?: string }) => {
    const targetTrack = tracks.find(t => t.type === trackType);
    if (!targetTrack) return;

    // 找到最后一个片段的结束时间，作为新片段的起始时间
    const lastClip = targetTrack.clips[targetTrack.clips.length - 1];
    const startTime = lastClip ? lastClip.startTime + lastClip.duration + 1 : 0;

    const newClip: AudioClip = {
      id: `clip-${Date.now()}`,
      name: preset.name,
      startTime,
      duration: preset.duration,
      color: targetTrack.color,
      url: preset.url
    };

    setTracks(prev => prev.map(t =>
      t.id === targetTrack.id
        ? { ...t, clips: [...t.clips, newClip] }
        : t
    ));
  };

  const handleNoteClick = (note: NoteType) => {
    setSelectedNote(note);
    // 播放音符（这里可以添加Web Audio API逻辑）
    setTimeout(() => setSelectedNote(null), 200);
  };

  const handleClipMove = (trackId: TrackId, clipId: string, newStartTime: number) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? {
            ...track,
            clips: track.clips.map(clip => 
              clip.id === clipId ? { ...clip, startTime: newStartTime } : clip
            )
          }
        : track
    ));
  };

  const handleClipDelete = (trackId: TrackId, clipId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, clips: track.clips.filter(c => c.id !== clipId) }
        : track
    ));
  };

  const handleVolumeChange = (trackId: TrackId, volume: number) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, volume } : track
    ));
  };

  const handleMuteToggle = (trackId: TrackId) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, isMuted: !track.isMuted } : track
    ));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSave?.({
        sessionId,
        trackType,
        clips: tracks.find(t => t.type === trackType)?.clips || []
      });
    }, 1500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                  onClick={() => setCurrentTime(0)}
                  className="text-slate-400 hover:text-white"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentTime(duration)}
                  className="text-slate-400 hover:text-white"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
                <div className="text-white font-mono text-xl ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
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
          <Timeline duration={duration} currentTime={currentTime} onSeek={setCurrentTime} isDragging={false} />
        </div>

        {/* 轨道区域 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Tracks</h2>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Total Clips: {totalClips}</span>
              <span className="mx-2">•</span>
              <span>Duration: 90s</span>
            </div>
          </div>

          <div className="space-y-3">
            {tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                currentTime={currentTime}
                onClipMove={handleClipMove}
                onClipDelete={handleClipDelete}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={handleMuteToggle}
                onClipSelect={(trackId, clipId) => setSelectedClip({ trackId, clipId })}
                isSelected={selectedClip?.trackId === track.id}
              />
            ))}
          </div>
        </div>

        {/* 双栏布局：预设音频 + 钢琴键盘 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 预设音频选择器 */}
          <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Audio Library</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-slate-400 hover:text-white"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-slate-400">
                Add preset clips to your {trackType} track
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showPresets && <PresetClips trackType={trackType} onAddPresetClip={handleAddPresetClip} />}
            </CardContent>
          </Card>

          {/* 钢琴键盘 */}
          <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Virtual Piano</CardTitle>
              <CardDescription className="text-slate-400">
                Click keys to preview notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PianoKeyboard onNoteClick={handleNoteClick} disabled={isSaving} />
              {selectedNote && (
                <div className="mt-3 text-center">
                  <div
                    className="inline-block px-4 py-2 rounded-lg text-white font-bold"
                    style={{ backgroundColor: NOTE_COLORS[selectedNote] }}
                  >
                    Playing: {selectedNote}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 快捷提示 */}
        <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-800">
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
                  <p className="font-medium text-white">Presets</p>
                  <p className="text-slate-400">Use preset audio clips</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">3</div>
                <div>
                  <p className="font-medium text-white">Piano</p>
                  <p className="text-slate-400">Preview notes on keyboard</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">4</div>
                <div>
                  <p className="font-medium text-white">Timeline</p>
                  <p className="text-slate-400">Click to seek position</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
