'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Save, Upload, Volume2, Download, Trash2, Mic, Copy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type TrackType = 'Drum' | 'Bass' | 'Synth' | 'Vocal';
type TrackId = string;

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

interface TimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

function Timeline({ duration, currentTime, onSeek }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  return (
    <div className="relative w-full h-12 bg-slate-800 rounded-lg overflow-hidden cursor-pointer" ref={timelineRef} onClick={handleSeek}>
      {/* 时间刻度 */}
      <div className="absolute inset-0 flex items-center px-4">
        {[0, 15, 30, 45, 60, 75, 90].map((t) => (
          <div key={t} className="absolute text-xs text-slate-500" style={{ left: `${(t / 90) * 100}%` }}>
            {t}s
          </div>
        ))}
      </div>
      
      {/* 播放进度条 */}
      <div 
        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600/30 to-transparent pointer-events-none"
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />
      
      {/* 播放头 */}
      <div 
        className="absolute top-0 h-full w-0.5 bg-red-500 pointer-events-none"
        style={{ left: `${(currentTime / duration) * 100}%` }}
      >
        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
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

  const handleMouseDown = (e: React.MouseEvent, clipId: string) => {
    if (!trackRef.current) return;
    const clip = track.clips.find(c => c.id === clipId);
    if (!clip) return;

    e.stopPropagation();
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
    const timePerPixel = 90 / rect.width; // 90秒总时长
    const deltaTime = deltaX * timePerPixel;
    
    const newStartTime = Math.max(0, Math.min(90, draggingClip.originalStartTime + deltaTime));
    onClipMove(track.id, draggingClip.clipId, newStartTime);
  };

  const handleMouseUp = () => {
    setDraggingClip(null);
  };

  useEffect(() => {
    if (draggingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingClip]);

  return (
    <div
      ref={trackRef}
      className={`relative h-24 bg-slate-900/50 rounded-lg border-2 transition-all ${
        isSelected ? 'border-purple-500' : 'border-slate-800'
      }`}
      onMouseUp={handleMouseUp}
    >
      {/* 播放进度背景 */}
      <div 
        className="absolute inset-y-0 left-0 bg-purple-600/10 pointer-events-none"
        style={{ width: `${(currentTime / 90) * 100}%` }}
      />

      {/* 轨道头部 */}
      <div className="absolute left-0 top-0 bottom-0 w-48 bg-slate-800 border-r border-slate-700 p-3 flex flex-col justify-between z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${track.color}`} />
            <span className="text-white font-medium text-sm">{track.name}</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant={track.isMuted ? "destructive" : "outline"}
              size="sm"
              onClick={() => onMuteToggle(track.id)}
              className="h-6 text-xs px-2"
            >
              M
            </Button>
            <Button
              variant={track.isSolo ? "default" : "outline"}
              size="sm"
              onClick={() => {}} // Solo functionality
              className="h-6 text-xs px-2"
            >
              S
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className="h-3 w-3 text-slate-400" />
          <Slider
            value={[track.volume]}
            onValueChange={(value) => onVolumeChange(track.id, value[0])}
            max={100}
            className="flex-1"
          />
          <span className="text-xs text-slate-400 w-8">{track.volume}%</span>
        </div>
      </div>

      {/* 音频片段区域 */}
      <div className="absolute left-48 right-0 top-0 bottom-0">
        {track.clips.map((clip) => (
          <div
            key={clip.id}
            className={`absolute h-16 top-4 rounded-lg cursor-move border-2 transition-all ${
              isSelected ? 'border-white shadow-lg shadow-purple-500/50' : 'border-transparent hover:border-slate-500'
            }`}
            style={{
              left: `${(clip.startTime / 90) * 100}%`,
              width: `${(clip.duration / 90) * 100}%`,
              backgroundColor: `${clip.color}40`,
              backdropFilter: 'blur(4px)'
            }}
            onMouseDown={(e) => handleMouseDown(e, clip.id)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-full h-8 ${clip.color} rounded opacity-30`} />
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <span className="text-xs font-medium text-white truncate">{clip.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClipDelete(track.id, clip.id);
                }}
                className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
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
  const [tracks, setTracks] = useState<Track[]>([
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
  ]);
  const [selectedClip, setSelectedClip] = useState<{ trackId: TrackId; clipId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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
      duration: 30, // 默认30秒，实际应该从文件读取
      color: targetTrack.color,
      file,
      url
    };

    setUploadedFile(file);
    setTracks(prev => prev.map(t => 
      t.id === targetTrack.id 
        ? { ...t, clips: [...t.clips, newClip] }
        : t
    ));
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
          <Timeline duration={duration} currentTime={currentTime} onSeek={setCurrentTime} />
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

        {/* 工具提示 */}
        {totalClips === 0 && (
          <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-800">
            <CardContent className="p-6 text-center">
              <Upload className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Start Creating</h3>
              <p className="text-slate-400 mb-4">
                Upload your audio file to begin editing. Drag clips on the timeline to arrange your track.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500/30 border-2 border-dashed border-purple-500" />
                  <span>Drag to move</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span>Click X to delete</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span>Adjust volume per track</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
