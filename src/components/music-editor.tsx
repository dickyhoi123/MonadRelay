'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Save, Upload, Volume2, Music, X, Piano, Edit3, Trash2, Eye } from 'lucide-react';
import { PianoRollNew, PianoNote, INSTRUMENT_PRESETS } from '@/components/piano-roll-new';
import { PianoRollReadonly } from '@/components/piano-roll-readonly';
import { useAudioEngine, noteToFrequency } from '@/lib/audio-engine';
import { InstrumentType, NoteName } from '@/lib/sound-library';

// 音色预设类型
interface InstrumentPreset {
  id: string;
  name: string;
  category: 'oscillator' | 'drum' | 'vocal';
  oscillatorType?: 'sine' | 'square' | 'sawtooth' | 'triangle';
  color: string;
}

export type TrackType = 'Drum' | 'Bass' | 'Synth' | 'Vocal';
type TrackId = string;

export interface AudioClip {
  id: string;
  name: string;
  startTime: number; // 拍子
  duration: number; // 拍子
  color: string;
  file?: File;
  audioBuffer?: AudioBuffer;
  pianoNotes?: PianoNote[];
}

export interface Track {
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
  initialTracks?: Track[]; // 初始音轨数据（从Session传入）
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

export function MusicEditor({ sessionId, sessionName, trackType, initialTracks, onSave, onCancel }: MusicEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(() => {
    // 如果传入了初始音轨，使用它们
    if (initialTracks && initialTracks.length > 0) {
      return initialTracks;
    }

    // 否则使用默认的空音轨
    const defaultTracks: Track[] = [
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

    // 为当前轨道添加一些默认音频片段（仅用于新Session）
    const targetTrackIndex = defaultTracks.findIndex(t => t.type === trackType);
    if (targetTrackIndex >= 0) {
      defaultTracks[targetTrackIndex].clips = [
        {
          id: `clip-${Date.now()}-1`,
          name: 'Default Beat',
          startTime: 0,
          duration: 8,
          color: defaultTracks[targetTrackIndex].color
        },
        {
          id: `clip-${Date.now()}-2`,
          name: 'Fill',
          startTime: 12,
          duration: 4,
          color: defaultTracks[targetTrackIndex].color
        }
      ];
    }

    return defaultTracks;
  });

  const [selectedClip, setSelectedClip] = useState<{ trackId: TrackId; clipId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pianoRollOpen, setPianoRollOpen] = useState(false);
  const [selectedTrackForPiano, setSelectedTrackForPiano] = useState<Track | null>(null);
  const [selectedClipForPiano, setSelectedClipForPiano] = useState<AudioClip | null>(null);
  const [draggingClip, setDraggingClip] = useState<{ trackId: TrackId; clipId: string; startX: number; originalStart: number } | null>(null);

  // 只读钢琴帘状态
  const [readonlyPianoRollOpen, setReadonlyPianoRollOpen] = useState(false);
  const [selectedTrackForReadonly, setSelectedTrackForReadonly] = useState<Track | null>(null);
  const [selectedClipForReadonly, setSelectedClipForReadonly] = useState<AudioClip | null>(null);

  // Toast 消息状态
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const audioEngine = useAudioEngine();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playInterval = useRef<NodeJS.Timeout | null>(null);
  const pendingTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  // 初始化音色库
  useEffect(() => {
    if (audioEngine) {
      audioEngine.initializeSoundLibrary();
    }
  }, [audioEngine]);

  // 显示Toast消息
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 播放鼓声
  const playDrumSound = useCallback((drumType: string, duration: number) => {
    if (!audioEngine) return;
    const ctx = audioEngine.getAudioContext?.();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    switch (drumType) {
      case 'kick':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
        break;

      case 'snare':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(180, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.2);

        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start();
        break;

      case 'hihat':
        const hiHatBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const hiHatData = hiHatBuffer.getChannelData(0);
        for (let i = 0; i < hiHatData.length; i++) {
          hiHatData[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const hiHat = ctx.createBufferSource();
        hiHat.buffer = hiHatBuffer;
        const hiHatGain = ctx.createGain();
        hiHatGain.gain.setValueAtTime(0.2, ctx.currentTime);
        hiHatGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        hiHat.connect(hiHatGain);
        hiHatGain.connect(ctx.destination);
        hiHat.start();
        break;

      case 'tom':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(100, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.4);
        break;

      case 'crash':
        const crashBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const crashData = crashBuffer.getChannelData(0);
        for (let i = 0; i < crashData.length; i++) {
          crashData[i] = (Math.random() * 2 - 1) * 0.8;
        }
        const crash = ctx.createBufferSource();
        crash.buffer = crashBuffer;
        const crashGain = ctx.createGain();
        crashGain.gain.setValueAtTime(0.5, ctx.currentTime);
        crashGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        crash.connect(crashGain);
        crashGain.connect(ctx.destination);
        crash.start();
        break;

      case 'ride':
        const rideBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const rideData = rideBuffer.getChannelData(0);
        for (let i = 0; i < rideData.length; i++) {
          rideData[i] = (Math.random() * 2 - 1) * 0.6;
        }
        const ride = ctx.createBufferSource();
        ride.buffer = rideBuffer;
        const rideGain = ctx.createGain();
        rideGain.gain.setValueAtTime(0.4, ctx.currentTime);
        rideGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        ride.connect(rideGain);
        rideGain.connect(ctx.destination);
        ride.start();
        break;
    }
  }, [audioEngine]);

  // 播放人声合唱
  const playVocalSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', velocity: number) => {
    if (!audioEngine) return;
    const ctx = audioEngine.getAudioContext?.();
    if (!ctx) return;

    const numVoices = 3;
    const gainNode = ctx.createGain();

    for (let i = 0; i < numVoices; i++) {
      const oscillator = ctx.createOscillator();
      oscillator.type = type;
      const detune = (Math.random() - 0.5) * 10;
      oscillator.frequency.value = frequency * (1 + detune / 1200);

      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(velocity * 0.15, ctx.currentTime);
      voiceGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.connect(voiceGain);
      voiceGain.connect(gainNode);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    }

    gainNode.connect(ctx.destination);
  }, [audioEngine]);

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
      // 清理所有pending timeouts
      pendingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      pendingTimeouts.current.clear();
      return;
    }

    // 开始播放
    setIsPlaying(true);
    let position = currentBeat;

    // 找到需要播放的音频片段和钢琴音符
    const clipsToPlay: { clip: AudioClip; track: Track }[] = [];
    const pianoNotesToPlay: { note: PianoNote; track: Track; clip: AudioClip }[] = [];

    tracks.forEach((track, trackIndex) => {
      if (track.isMuted) return;
      track.clips.forEach(clip => {
        // 验证clip边界
        if (clip.startTime < 0 || clip.startTime >= TOTAL_BEATS) return;

        if (clip.startTime >= position && clip.startTime < TOTAL_BEATS) {
          clipsToPlay.push({ clip, track });

          // 收集钢琴音符
          if (clip.pianoNotes && clip.pianoNotes.length > 0) {
            clip.pianoNotes.forEach(note => {
              // 验证note边界
              if (note.duration <= 0) return;

              // 将16分音符转换为拍子
              const noteStartTimeInBeats = note.startTime / 4; // 4个16分音符 = 1拍
              const clipStartTimeInBeats = clip.startTime;
              const absoluteStartTime = clipStartTimeInBeats + noteStartTimeInBeats;

              if (absoluteStartTime >= position && absoluteStartTime < TOTAL_BEATS) {
                pianoNotesToPlay.push({ note, track, clip });
              }
            });
          }
        }
      });
    });

    // 播放音频片段
    for (const { clip, track } of clipsToPlay) {
      if (clip.audioBuffer) {
        const delay = (clip.startTime - position) * 0.5; // 0.5秒/拍
        if (delay >= 0) {
          const timeoutId = setTimeout(() => {
            audioEngine?.playAudioClip(clip.audioBuffer!, delay, track.volume / 100, track.id);
            pendingTimeouts.current.delete(timeoutId);
          }, delay * 1000);
          pendingTimeouts.current.add(timeoutId);
        }
      }
    }

    // 播放钢琴音符
    pianoNotesToPlay.forEach(({ note, track, clip }) => {
      // 计算音符的延迟时间
      // clip.startTime是拍子，note.startTime是16分音符
      // 每拍4个16分音符，每拍0.5秒
      const absoluteStartTimeInBeats = clip.startTime + note.startTime / 4;
      const delay = (absoluteStartTimeInBeats - position) * 0.5; // 0.5秒/拍

      if (delay >= 0) {
        const timeoutId = setTimeout(() => {
          // 根据音符的instrumentType找到对应的音色预设
          const instrument = [...Object.values(INSTRUMENT_PRESETS).flat()].find(i => i.id === note.instrumentType);

          if (!instrument) {
            // 如果找不到预设，使用默认合成器
            const frequency = noteToFrequency(note.note, note.octave);
            audioEngine?.playNote(frequency, note.duration * 0.125, note.velocity, 'sine');
            pendingTimeouts.current.delete(timeoutId);
            return;
          }

          // 根据音色预设的category决定如何播放
          if (instrument.category === 'drum') {
            // 播放鼓声
            playDrumSound(instrument.id, note.duration * 0.125);
          } else if (instrument.category === 'vocal') {
            // 播放人声合唱
            const frequency = noteToFrequency(note.note, note.octave);
            playVocalSound(frequency, note.duration * 0.125, instrument.oscillatorType || 'sine', note.velocity);
          } else {
            // 播放合成器音符
            const frequency = noteToFrequency(note.note, note.octave);
            audioEngine?.playNote(frequency, note.duration * 0.125, note.velocity, instrument.oscillatorType || 'sine');
          }

          pendingTimeouts.current.delete(timeoutId);
        }, delay * 1000);
        pendingTimeouts.current.add(timeoutId);
      }
    });

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
        // 清理所有pending timeouts
        pendingTimeouts.current.forEach(timeout => clearTimeout(timeout));
        pendingTimeouts.current.clear();
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
      if (!audioBuffer) {
        showToast('error', 'Failed to load audio file');
        return;
      }
      const duration = Math.ceil(audioBuffer.duration / 0.5); // 转换为拍子

      // 添加到当前轨道
      const targetTrack = tracks.find(t => t.type === trackType);
      if (!targetTrack) {
        showToast('error', 'Target track not found');
        return;
      }

      // 验证clip边界
      if (currentBeat + duration > TOTAL_BEATS) {
        showToast('error', 'Clip duration exceeds track length');
        return;
      }

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
      showToast('success', `Audio "${file.name}" uploaded successfully`);
    } catch (error) {
      console.error('Failed to load audio:', error);
      showToast('error', 'Failed to load audio file');
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

  // 清理所有pending timeouts，防止组件卸载时内存泄漏
  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      pendingTimeouts.current.clear();
    };
  }, []);

  // 打开钢琴帘（可编辑）
  const handleOpenPianoRoll = (trackId: TrackId, clipId?: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    setSelectedTrackForPiano(track);
    if (clipId) {
      const clip = track.clips.find(c => c.id === clipId);
      setSelectedClipForPiano(clip || null);
    } else {
      // 如果没有指定clip，使用该轨道的第一个clip
      if (track.clips.length > 0) {
        setSelectedClipForPiano(track.clips[0]);
      } else {
        // 如果没有clip，创建一个新的clip
        const newClip: AudioClip = {
          id: `clip-${Date.now()}`,
          name: 'Piano Notes',
          startTime: 0,
          duration: 8,
          color: track.color
        };
        setTracks(prev => prev.map(t =>
          t.id === trackId
            ? { ...t, clips: [newClip, ...t.clips] }
            : t
        ));
        setSelectedClipForPiano(newClip);
      }
    }
    setPianoRollOpen(true);
  };

  // 打开只读钢琴帘（查看他人音轨）
  const handleOpenReadonlyPianoRoll = (trackId: TrackId, clipId: string) => {
    const track = tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (!track || !clip) return;

    setSelectedTrackForReadonly(track);
    setSelectedClipForReadonly(clip);
    setReadonlyPianoRollOpen(true);
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

  // 保存草稿
  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast('success', 'Draft saved! You can continue editing.');
    }, 500);
  };

  // 上传音轨（完成并提交）
  const handleUploadTrack = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSave?.({ tracks, currentBeat });
      showToast('success', `${trackType} track uploaded successfully!`);
    }, 1500);
  };

  const formatTime = (beat: number) => {
    const bars = Math.floor(beat / BEATS_PER_BAR);
    const beatsInBar = Math.floor(beat % BEATS_PER_BAR);
    return `${bars + 1}:${beatsInBar + 1}`;
  };

  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 pt-16 px-6 pb-6">
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
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-slate-600 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="bg-slate-600 hover:bg-slate-700"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
              <Button
                onClick={handleUploadTrack}
                disabled={totalClips === 0 || isSaving}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Track
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

        {/* 音轨预览卡片 */}
        <Card className="mt-6 bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Music className="h-5 w-5" />
              Track Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => {
                    // 如果有clip，打开第一个clip的只读视图
                    if (track.clips.length > 0) {
                      handleOpenReadonlyPianoRoll(track.id, track.clips[0].id);
                    }
                  }}
                  className={`relative bg-slate-800/50 rounded-xl border-2 transition-all cursor-pointer hover:scale-105 hover:shadow-xl ${
                    track.id === tracks.find(t => t.type === trackType)?.id
                      ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {/* 音轨头部 */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                        style={{ backgroundColor: track.color }}
                      >
                        {track.type === 'Drum' && '🥁'}
                        {track.type === 'Bass' && '🎸'}
                        {track.type === 'Synth' && '🎹'}
                        {track.type === 'Vocal' && '🎤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{track.name}</h4>
                        <p className="text-xs text-slate-400">{track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* 缩略图 */}
                    <div className="relative h-20 bg-slate-900 rounded-lg overflow-hidden">
                      {/* 网格线 */}
                      <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-slate-700/30"
                            style={{ left: `${(i / 4) * 100}%` }}
                          />
                        ))}
                      </div>

                      {/* Clip缩略图 */}
                      {track.clips.length > 0 ? (
                        track.clips.map((clip) => (
                          <div
                            key={clip.id}
                            className="absolute h-full top-0 rounded transition-all"
                            style={{
                              left: `${(clip.startTime / TOTAL_BEATS) * 100}%`,
                              width: `${(clip.duration / TOTAL_BEATS) * 100}%`,
                              backgroundColor: `${clip.color}40`,
                              borderLeft: `3px solid ${clip.color}`,
                              borderRight: `3px solid ${clip.color}`,
                              minWidth: '8px'
                            }}
                          >
                            {/* 音符分布预览 */}
                            {clip.pianoNotes && clip.pianoNotes.length > 0 && (
                              <div className="absolute inset-0 flex">
                                {clip.pianoNotes.slice(0, 10).map((note, idx) => {
                                  const noteIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(note.note);
                                  const octaveOffset = (note.octave - 3) * 12;
                                  const noteTotalIndex = octaveOffset + noteIndex;
                                  const totalNotes = 3 * 12;
                                  const reversedIndex = totalNotes - 1 - noteTotalIndex;
                                  const topPercent = (reversedIndex / totalNotes) * 100;
                                  const heightPercent = (1 / totalNotes) * 100;

                                  return (
                                    <div
                                      key={note.id}
                                      className="absolute border border-white/20 rounded-sm"
                                      style={{
                                        left: `${(note.startTime / 32) * 100}%`,
                                        width: `${(note.duration / 32) * 100}%`,
                                        top: `${topPercent}%`,
                                        height: `${heightPercent}%`,
                                        backgroundColor: clip.color,
                                        minWidth: '2px'
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">
                          No clips
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 播放/静音指示器 */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {track.isMuted && (
                      <div className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-[10px] text-red-400 font-medium">
                        M
                      </div>
                    )}
                    {track.isSolo && (
                      <div className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-[10px] text-yellow-400 font-medium">
                        S
                      </div>
                    )}
                  </div>

                  {/* 查看提示 */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 快捷提示 */}
        <Card className="mt-6 bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Music className="h-5 w-5" />
              Quick Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">1</div>
                <div>
                  <p className="font-medium text-white">Drag & Drop</p>
                  <p className="text-slate-400">Move clips by dragging</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">2</div>
                <div>
                  <p className="font-medium text-white">Piano Roll</p>
                  <p className="text-slate-400">Create MIDI notes</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">3</div>
                <div>
                  <p className="font-medium text-white">Audio Upload</p>
                  <p className="text-slate-400">Add your own sounds</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">4</div>
                <div>
                  <p className="font-medium text-white">Play & Preview</p>
                  <p className="text-slate-400">Listen to your music</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 钢琴帘模态框（可编辑） */}
      <PianoRollNew
        isOpen={pianoRollOpen}
        onClose={() => setPianoRollOpen(false)}
        trackId={selectedTrackForPiano?.id || ''}
        trackName={selectedTrackForPiano?.name || ''}
        trackType={trackType}
        onSave={handleSavePianoNotes}
        initialNotes={selectedClipForPiano?.pianoNotes}
      />

      {/* 只读钢琴帘模态框（查看他人） */}
      <PianoRollReadonly
        isOpen={readonlyPianoRollOpen}
        onClose={() => setReadonlyPianoRollOpen(false)}
        trackName={selectedTrackForReadonly?.name || ''}
        trackType={selectedTrackForReadonly?.type || 'Synth'}
        notes={selectedClipForReadonly?.pianoNotes || []}
        color={selectedClipForReadonly?.color || '#a855f7'}
      />
    </div>
  );
}
