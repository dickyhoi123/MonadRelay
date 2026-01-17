'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PianoNote, NoteType, INSTRUMENT_PRESETS } from '@/components/piano-roll-new';
import { useAudioEngine, noteToFrequency } from '@/lib/audio-engine';

// 音色预设类型
interface InstrumentPreset {
  id: string;
  name: string;
  category: 'oscillator' | 'drum' | 'vocal';
  oscillatorType?: 'sine' | 'square' | 'sawtooth' | 'triangle';
  color: string;
}

const PIANO_NOTES: NoteType[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [3, 4, 5];
const TOTAL_BARS = 8;
const BEATS_PER_BAR = 4;
const SIXTEENTH_NOTES_PER_BEAT = 4;
const TOTAL_SIXTEENTH_NOTES = TOTAL_BARS * BEATS_PER_BAR * SIXTEENTH_NOTES_PER_BEAT;
const WHITE_NOTES: NoteType[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NOTES: NoteType[] = ['C#', 'D#', 'F#', 'G#', 'A#'];
const BPM = 120;
const PIANO_KEY_WIDTH = 64;

interface PianoRollReadonlyProps {
  isOpen: boolean;
  onClose: () => void;
  trackName: string;
  trackType: string;
  notes: PianoNote[];
  color: string;
}

export function PianoRollReadonly({ isOpen, onClose, trackName, trackType, notes, color }: PianoRollReadonlyProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [smoothPosition, setSmoothPosition] = useState(0);

  const audioEngine = useAudioEngine();
  const gridRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number | null>(null);
  const playStartSixteenthRef = useRef<number>(0);
  const playedNotes = useRef<Set<string>>(new Set());
  const lastCheckedPositionRef = useRef<number>(0);

  // 播放控制
  const handlePlay = () => {
    if (isPlaying) {
      // 停止播放
      setIsPlaying(false);
      audioEngine?.stopAll();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      playedNotes.current.clear();
      return;
    }

    // 开始播放
    setIsPlaying(true);
    playStartTimeRef.current = Date.now();
    playStartSixteenthRef.current = currentPosition;
    playedNotes.current.clear();
    lastCheckedPositionRef.current = currentPosition;

    const animate = () => {
      if (!isPlaying) return;

      const elapsed = Date.now() - playStartTimeRef.current!;
      const beatDuration = 60 / BPM;
      const sixteenthNoteDuration = beatDuration / SIXTEENTH_NOTES_PER_BEAT;
      const sixteenthNotesElapsed = elapsed / (sixteenthNoteDuration * 1000);

      const newPosition = Math.floor((playStartSixteenthRef.current + sixteenthNotesElapsed) % TOTAL_SIXTEENTH_NOTES);
      const exactPosition = (playStartSixteenthRef.current + sixteenthNotesElapsed) % TOTAL_SIXTEENTH_NOTES;

      setSmoothPosition(exactPosition);

      // 检查并播放音符
      if (newPosition !== lastCheckedPositionRef.current) {
        notes.forEach(note => {
          if (note.startTime === newPosition && !playedNotes.current.has(note.id)) {
            playNoteSound(note);
            playedNotes.current.add(note.id);
          }
        });
        lastCheckedPositionRef.current = newPosition;
      }

      // 停止条件
      if (exactPosition >= TOTAL_SIXTEENTH_NOTES - 1) {
        setIsPlaying(false);
        audioEngine?.stopAll();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        playedNotes.current.clear();
        setCurrentPosition(0);
        setSmoothPosition(0);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // 播放鼓声
  const playDrumSound = (drumType: string, duration: number) => {
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
  };

  // 播放人声合唱
  const playVocalSound = (frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', velocity: number) => {
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
  };

  const playNoteSound = (note: PianoNote) => {
    if (!audioEngine) return;

    const frequency = noteToFrequency(note.note, note.octave);
    const duration = note.duration * (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT;

    // 根据音符的instrumentType找到对应的音色预设
    const instrument = [...Object.values(INSTRUMENT_PRESETS).flat()].find(i => i.id === note.instrumentType);

    if (!instrument) {
      // 如果找不到预设，使用默认合成器
      audioEngine.playNote(frequency, duration, note.velocity, 'sine');
      return;
    }

    // 根据音色预设的category决定如何播放
    if (instrument.category === 'drum') {
      // 播放鼓声
      playDrumSound(instrument.id, duration);
    } else if (instrument.category === 'vocal') {
      // 播放人声合唱
      playVocalSound(frequency, duration, instrument.oscillatorType || 'sine', note.velocity);
    } else {
      // 播放合成器音符
      audioEngine.playNote(frequency, duration, note.velocity, instrument.oscillatorType || 'sine');
    }
  };

  // 计算音符网格位置
  const getNoteGridPosition = useCallback((note: PianoNote) => {
    const noteIndex = PIANO_NOTES.indexOf(note.note);
    const octaveOffset = (note.octave - OCTAVES[0]) * 12;
    const noteTotalIndex = octaveOffset + noteIndex;
    const totalNotes = OCTAVES.length * 12;
    const reversedIndex = totalNotes - 1 - noteTotalIndex;
    return reversedIndex;
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioEngine?.stopAll();
    };
  }, []);

  // 格式化时间显示
  const formatTime = (sixteenthNoteIndex: number) => {
    const beat = Math.floor(sixteenthNoteIndex / SIXTEENTH_NOTES_PER_BEAT);
    const bar = Math.floor(beat / BEATS_PER_BAR);
    const beatInBar = beat % BEATS_PER_BAR + 1;
    return `${bar + 1}:${beatInBar}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg overflow-hidden shadow-2xl flex flex-col" style={{ maxWidth: '98vw', height: '95vh' }}>
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">📖 View Only - {trackName}</h2>
                <p className="text-sm text-slate-300">Track Type: {trackType}</p>
              </div>
              <span className="px-3 py-1.5 bg-purple-600/30 text-purple-300 rounded-full text-sm font-medium border border-purple-500/50">
                {notes.length} notes
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handlePlay}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
              <div className="text-white font-mono bg-slate-700 px-3 py-1.5 rounded text-sm border border-slate-600">
                {formatTime(currentPosition)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Track Info */}
          <div className="w-64 bg-slate-800 border-r border-slate-600 p-4 flex flex-col flex-shrink-0">
            <h3 className="text-sm font-semibold text-white mb-3">Track Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Track Name</p>
                <p className="text-sm text-white font-medium">{trackName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Track Type</p>
                <p className="text-sm text-white font-medium">{trackType}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Note Count</p>
                <p className="text-sm text-white font-medium">{notes.length} notes</p>
              </div>
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                  <p className="text-xs text-slate-300">Track Color</p>
                </div>
                <p className="text-xs text-slate-400 italic">Read-only mode: Cannot edit notes</p>
              </div>
            </div>
          </div>

          {/* Right - Piano Roll Grid */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Timeline Header */}
            <div className="h-12 bg-slate-800 border-b border-slate-600 flex items-end relative flex-shrink-0">
              {/* 时间线网格 */}
              <div className="absolute inset-0">
                {/* 钢琴键占位 */}
                <div className="absolute left-0 top-0 bottom-0 bg-slate-800" style={{ width: `${PIANO_KEY_WIDTH}px` }} />
                
                {/* 网格线区域 */}
                <div className="absolute" style={{ left: `${PIANO_KEY_WIDTH}px`, right: 0, top: 0, bottom: 0 }}>
                  {Array.from({ length: TOTAL_SIXTEENTH_NOTES }).map((_, i) => {
                    const isBarLine = i % (BEATS_PER_BAR * SIXTEENTH_NOTES_PER_BEAT) === 0;
                    const isBeatLine = i % SIXTEENTH_NOTES_PER_BEAT === 0;
                    
                    return (
                      <div
                        key={`timeline-v-${i}`}
                        className={`absolute top-0 bottom-0 border-r ${
                          isBarLine 
                            ? 'border-purple-500/60' 
                            : isBeatLine 
                              ? 'border-purple-500/30' 
                              : 'border-slate-700/30'
                        }`}
                        style={{ 
                          left: `${(i / TOTAL_SIXTEENTH_NOTES) * 100}%`,
                          width: `${100 / TOTAL_SIXTEENTH_NOTES}%`
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* 拍子标记 */}
                <div className="absolute inset-x-0 top-0 h-7 bg-slate-900/70 flex items-center px-2">
                  {Array.from({ length: TOTAL_BARS * BEATS_PER_BAR }).map((_, i) => (
                    <span
                      key={i}
                      className="absolute text-xs text-slate-200 font-medium whitespace-nowrap"
                      style={{ 
                        left: `calc(${PIANO_KEY_WIDTH}px + ${(i * SIXTEENTH_NOTES_PER_BEAT) / TOTAL_SIXTEENTH_NOTES * 100}%)`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
                
                {/* 播放头 */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none transition-none"
                  style={{ left: `calc(${PIANO_KEY_WIDTH}px + ${(smoothPosition / TOTAL_SIXTEENTH_NOTES) * 100}%)` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
                </div>
              </div>
            </div>

            {/* Piano Keys + Note Grid */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Piano Keys */}
              <div className="bg-slate-800 overflow-hidden flex-shrink-0" style={{ width: `${PIANO_KEY_WIDTH}px` }}>
                <div className="relative h-full">
                  {OCTAVES.map((octave) => (
                    PIANO_NOTES.map((note, noteIndex) => {
                      const isBlackKey = BLACK_NOTES.includes(note);
                      const totalNotes = OCTAVES.length * 12;
                      const notePosition = (octave - OCTAVES[0]) * 12 + noteIndex;
                      const reversedPosition = totalNotes - 1 - notePosition;
                      const topPercent = (reversedPosition / totalNotes) * 100;
                      const heightPercent = (1 / totalNotes) * 100;

                      if (isBlackKey) {
                        return (
                          <div
                            key={`${octave}-${note}`}
                            className="absolute bg-slate-950 border-x border-slate-800"
                            style={{
                              left: '40%',
                              width: '40%',
                              top: `${topPercent}%`,
                              height: `${heightPercent}%`
                            }}
                          />
                        );
                      } else {
                        return (
                          <div
                            key={`${octave}-${note}`}
                            className="absolute w-full bg-slate-700/50 border-b border-slate-600"
                            style={{
                              top: `${topPercent}%`,
                              height: `${heightPercent}%`
                            }}
                          />
                        );
                      }
                    })
                  ))}
                </div>
              </div>

              {/* Note Grid */}
              <div className="flex-1 bg-slate-950 relative overflow-hidden">
                {/* Grid Lines */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  {/* 垂直线 */}
                  {Array.from({ length: TOTAL_SIXTEENTH_NOTES }).map((_, i) => {
                    const isBarLine = i % (BEATS_PER_BAR * SIXTEENTH_NOTES_PER_BEAT) === 0;
                    const isBeatLine = i % SIXTEENTH_NOTES_PER_BEAT === 0;
                    
                    return (
                      <div
                        key={`grid-v-${i}`}
                        className={`absolute top-0 bottom-0 border-r ${
                          isBarLine 
                            ? 'border-purple-500/30' 
                            : isBeatLine 
                              ? 'border-purple-500/15' 
                              : 'border-slate-800/10'
                        }`}
                        style={{ 
                          left: `${(i / TOTAL_SIXTEENTH_NOTES) * 100}%`,
                          width: `${100 / TOTAL_SIXTEENTH_NOTES}%`
                        }}
                      />
                    );
                  })}

                  {/* 水平线 */}
                  {Array.from({ length: PIANO_NOTES.length * OCTAVES.length }).map((_, i) => {
                    const reversedIndex = (PIANO_NOTES.length * OCTAVES.length - 1) - i;
                    const noteIndexInOctave = reversedIndex % 12;
                    const note = PIANO_NOTES[noteIndexInOctave];
                    const isBlackKey = BLACK_NOTES.includes(note);
                    return (
                      <div
                        key={`h-${i}`}
                        className={`absolute left-0 right-0 border-b ${
                          isBlackKey ? 'border-slate-800/20' : 'border-slate-700/40'
                        }`}
                        style={{ top: `${(i / (PIANO_NOTES.length * OCTAVES.length)) * 100}%` }}
                      />
                    );
                  })}
                </div>

                {/* Notes - 只读显示 */}
                {notes.map((note) => {
                  const noteIndex = getNoteGridPosition(note);
                  const totalNotes = PIANO_NOTES.length * OCTAVES.length;
                  const noteHeightPercent = (1 / totalNotes) * 100;
                  const noteTopPercent = (noteIndex / totalNotes) * 100;

                  return (
                    <div
                      key={note.id}
                      className="absolute rounded-sm border border-white/20 cursor-not-allowed opacity-70"
                      style={{
                        left: `${(note.startTime / TOTAL_SIXTEENTH_NOTES) * 100}%`,
                        width: `${(note.duration / TOTAL_SIXTEENTH_NOTES) * 100}%`,
                        top: `${noteTopPercent}%`,
                        height: `${noteHeightPercent}%`,
                        backgroundColor: color,
                        minWidth: `${100 / TOTAL_SIXTEENTH_NOTES}%`
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
