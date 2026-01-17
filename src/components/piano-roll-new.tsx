'use client';

import { useState, useRef, MouseEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Play, Plus, Volume2 } from 'lucide-react';
import { useAudioEngine, noteToFrequency } from '@/lib/audio-engine';

export type NoteType = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface PianoNote {
  id: string;
  note: NoteType;
  octave: number;
  startTime: number; // 16分音符为单位
  duration: number; // 16分音符为单位
  velocity: number; // 0-1
  instrumentType: string;
}

interface InstrumentPreset {
  id: string;
  name: string;
  category: 'oscillator' | 'drum' | 'vocal';
  oscillatorType?: 'sine' | 'square' | 'sawtooth' | 'triangle';
  color: string;
}

interface PianoRollProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackName: string;
  trackType: string;
  onSave?: (notes: PianoNote[]) => void;
  initialNotes?: PianoNote[];
}

// 专业音色库 - 按轨道类型分类
const INSTRUMENT_PRESETS: Record<string, InstrumentPreset[]> = {
  Drum: [
    { id: 'kick', name: 'Kick Drum', category: 'drum', oscillatorType: 'sine', color: '#3b82f6' },
    { id: 'snare', name: 'Snare Drum', category: 'drum', oscillatorType: 'square', color: '#60a5fa' },
    { id: 'hihat', name: 'Hi-Hat', category: 'drum', oscillatorType: 'triangle', color: '#93c5fd' },
    { id: 'tom', name: 'Tom', category: 'drum', oscillatorType: 'sawtooth', color: '#bfdbfe' },
    { id: 'crash', name: 'Crash Cymbal', category: 'drum', oscillatorType: 'triangle', color: '#dbeafe' },
  ],
  Bass: [
    { id: 'sub-bass', name: 'Sub Bass', category: 'oscillator', oscillatorType: 'sine', color: '#22c55e' },
    { id: 'sine-bass', name: 'Sine Bass', category: 'oscillator', oscillatorType: 'sine', color: '#4ade80' },
    { id: 'saw-bass', name: 'Saw Bass', category: 'oscillator', oscillatorType: 'sawtooth', color: '#86efac' },
    { id: 'square-bass', name: 'Square Bass', category: 'oscillator', oscillatorType: 'square', color: '#bbf7d0' },
  ],
  Synth: [
    { id: 'sine', name: 'Sine Lead', category: 'oscillator', oscillatorType: 'sine', color: '#a855f7' },
    { id: 'square', name: 'Square Lead', category: 'oscillator', oscillatorType: 'square', color: '#c084fc' },
    { id: 'sawtooth', name: 'Sawtooth Lead', category: 'oscillator', oscillatorType: 'sawtooth', color: '#d8b4fe' },
    { id: 'triangle', name: 'Triangle Lead', category: 'oscillator', oscillatorType: 'triangle', color: '#e9d5ff' },
  ],
  Vocal: [
    { id: 'male-chorus', name: 'Male Chorus', category: 'vocal', oscillatorType: 'sine', color: '#ec4899' },
    { id: 'female-chorus', name: 'Female Chorus', category: 'vocal', oscillatorType: 'sine', color: '#f472b6' },
    { id: 'children-chorus', name: 'Children Chorus', category: 'vocal', oscillatorType: 'triangle', color: '#f9a8d4' },
    { id: 'ensemble', name: 'Full Ensemble', category: 'vocal', oscillatorType: 'sawtooth', color: '#fbcfe8' },
  ],
};

const PIANO_NOTES: NoteType[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [3, 4, 5];
const TOTAL_BARS = 8;
const BEATS_PER_BAR = 4;
const SIXTEENTH_NOTES_PER_BEAT = 4;
const TOTAL_SIXTEENTH_NOTES = TOTAL_BARS * BEATS_PER_BAR * SIXTEENTH_NOTES_PER_BEAT;
const DEFAULT_DURATION = SIXTEENTH_NOTES_PER_BEAT; // 默认4分音符 = 4个16分音符

const WHITE_NOTES: NoteType[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NOTES: NoteType[] = ['C#', 'D#', 'F#', 'G#', 'A#'];

const BPM = 120;

export function PianoRollNew({ isOpen, onClose, trackId, trackName, trackType, onSave, initialNotes = [] }: PianoRollProps) {
  const [notes, setNotes] = useState<PianoNote[]>(initialNotes);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentPreset | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draggedNote, setDraggedNote] = useState<{ note: PianoNote; startX: number; startY: number; startNote?: PianoNote } | null>(null);
  const [resizeNote, setResizeNote] = useState<{ note: PianoNote; startX: number } | null>(null);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  const audioEngine = useAudioEngine();
  const gridRef = useRef<HTMLDivElement>(null);
  const playInterval = useRef<NodeJS.Timeout | null>(null);
  const pendingTimeouts = useRef<number[]>([]);

  const currentInstruments = INSTRUMENT_PRESETS[trackType] || INSTRUMENT_PRESETS.Synth;

  // 播放单个音符（根据音色类型）
  const playNoteSound = (note: PianoNote) => {
    if (!audioEngine) return;

    const instrument = [...Object.values(INSTRUMENT_PRESETS).flat()].find(i => i.id === note.instrumentType);
    if (!instrument) return;

    const frequency = noteToFrequency(note.note, note.octave);
    const duration = note.duration * (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT;

    // 根据音色类型播放
    if (instrument.category === 'drum') {
      playDrumSound(instrument.id, duration);
    } else if (instrument.category === 'vocal') {
      playVocalSound(frequency, duration, instrument.oscillatorType || 'sine', note.velocity);
    } else {
      audioEngine.playNote(frequency, duration, note.velocity, instrument.oscillatorType || 'sine');
    }
  };

  // 播放鼓声
  const playDrumSound = (drumType: string, duration: number) => {
    if (!audioEngine || !audioEngine['audioContext']) return;
    const ctx = audioEngine['audioContext'];

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const noiseNode = ctx.createOscillator();

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

        // 添加噪声
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
    }
  };

  // 播放人声合唱
  const playVocalSound = (frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', velocity: number) => {
    if (!audioEngine || !audioEngine['audioContext']) return;
    const ctx = audioEngine['audioContext'];

    // 创建多个振荡器模拟合唱
    const numVoices = 3;
    const gainNode = ctx.createGain();

    for (let i = 0; i < numVoices; i++) {
      const oscillator = ctx.createOscillator();
      oscillator.type = type;

      // 每个声部稍微失谐，产生合唱效果
      const detune = (Math.random() - 0.5) * 10;
      oscillator.frequency.value = frequency * (1 + detune / 1200);

      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(velocity * 0.15, ctx.currentTime);
      voiceGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.connect(voiceGain);
      voiceGain.connect(gainNode);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.connect(ctx.destination);
  };

  // 播放控制
  const handlePlay = () => {
    if (isPlaying) {
      // 立即停止
      setIsPlaying(false);
      if (playInterval.current) {
        clearInterval(playInterval.current);
        playInterval.current = null;
      }
      // 清除所有待播放的定时器
      pendingTimeouts.current.forEach(id => clearTimeout(id));
      pendingTimeouts.current = [];
      return;
    }

    setIsPlaying(true);
    let position = currentPosition;

    // 调度所有音符播放
    notes.forEach((note) => {
      if (note.startTime >= position && note.startTime < position + TOTAL_SIXTEENTH_NOTES) {
        const delay = (note.startTime - position) * (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT;
        const timeoutId = window.setTimeout(() => {
          if (isPlaying) {
            playNoteSound(note);
          }
        }, delay * 1000);
        pendingTimeouts.current.push(timeoutId);
      }
    });

    // 播放指针移动
    playInterval.current = setInterval(() => {
      position += 1;
      if (position >= TOTAL_SIXTEENTH_NOTES) {
        setIsPlaying(false);
        setCurrentPosition(0);
        if (playInterval.current) {
          clearInterval(playInterval.current);
          playInterval.current = null;
        }
      } else {
        setCurrentPosition(position);
      }
    }, (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT * 1000);
  };

  // 点击钢琴键播放音符
  const handlePianoKeyClick = (note: NoteType, octave: number) => {
    if (!selectedInstrument) return;

    const frequency = noteToFrequency(note, octave);
    const duration = DEFAULT_DURATION * (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT;

    if (selectedInstrument.category === 'drum') {
      playDrumSound(selectedInstrument.id, duration);
    } else if (selectedInstrument.category === 'vocal') {
      playVocalSound(frequency, duration, selectedInstrument.oscillatorType || 'sine', 0.8);
    } else {
      audioEngine?.playNote(frequency, duration, 0.8, selectedInstrument.oscillatorType || 'sine');
    }
  };

  // 获取音符在网格中的位置
  const getNoteGridPosition = (note: PianoNote) => {
    const noteIndex = (octave: number, note: NoteType) => {
      const octaveOffset = (octave - OCTAVES[0]) * 12;
      const noteOffset = PIANO_NOTES.indexOf(note);
      return octaveOffset + noteOffset;
    };
    const totalNotes = OCTAVES.length * 12;
    const noteTotalIndex = noteIndex(note.octave, note.note);
    const reversedIndex = totalNotes - 1 - noteTotalIndex;
    return reversedIndex;
  };

  // 添加音符
  const handleGridClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!selectedInstrument || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 64; // 减去钢琴键宽度
    const y = e.clientY - rect.top;

    const cellWidth = rect.width / TOTAL_SIXTEENTH_NOTES;
    const cellHeight = rect.height / (PIANO_NOTES.length * OCTAVES.length);

    // 计算拍子位置（自动对齐到网格）
    const sixteenthNoteIndex = Math.floor(x / cellWidth);

    // 计算音符位置
    const noteIndex = Math.floor(y / cellHeight);
    const totalNotes = PIANO_NOTES.length * OCTAVES.length;
    const actualIndex = totalNotes - 1 - noteIndex;

    if (actualIndex >= 0 && actualIndex < totalNotes && sixteenthNoteIndex >= 0) {
      const noteOctaveIndex = Math.floor(actualIndex / 12);
      const noteIndexInOctave = actualIndex % 12;
      const note = PIANO_NOTES[noteIndexInOctave];
      const octave = OCTAVES[noteOctaveIndex];

      const newNote: PianoNote = {
        id: `note-${Date.now()}-${Math.random()}`,
        note,
        octave,
        startTime: sixteenthNoteIndex,
        duration: DEFAULT_DURATION,
        velocity: 0.8,
        instrumentType: selectedInstrument.id
      };

      setNotes([...notes, newNote]);
      playNoteSound(newNote);
    }
  };

  // 删除音符
  const handleNoteDelete = (noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId));
  };

  // 拖拽音符移动
  const handleNoteMouseDown = (e: MouseEvent<HTMLDivElement>, note: PianoNote) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedNote({
      note,
      startX: e.clientX,
      startY: e.clientY,
      startNote: { ...note }
    });
  };

  // 拖拽音符调整时值
  const handleNoteResizeMouseDown = (e: MouseEvent<HTMLDivElement>, note: PianoNote) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeNote({
      note,
      startX: e.clientX
    });
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!gridRef.current) return;

    if (isDragging && draggedNote && draggedNote.startNote) {
      const rect = gridRef.current.getBoundingClientRect();
      const deltaX = e.clientX - draggedNote.startX;
      const deltaY = e.clientY - draggedNote.startY;

      const cellWidth = rect.width / TOTAL_SIXTEENTH_NOTES;
      const cellHeight = rect.height / (PIANO_NOTES.length * OCTAVES.length);

      // 计算新的拍子位置（自动对齐到网格）
      const deltaSixteenthNotes = Math.round(deltaX / cellWidth);
      const newStartTime = Math.max(0, Math.min(
        TOTAL_SIXTEENTH_NOTES - draggedNote.startNote.duration,
        draggedNote.startNote.startTime + deltaSixteenthNotes
      ));

      // 计算新的音符位置
      const deltaNotes = Math.round(deltaY / cellHeight);
      const totalNotes = PIANO_NOTES.length * OCTAVES.length;
      const currentNoteIndex = getNoteGridPosition(draggedNote.startNote);
      const newNoteIndex = Math.max(0, Math.min(totalNotes - 1, currentNoteIndex + deltaNotes));

      const reversedIndex = totalNotes - 1 - newNoteIndex;
      const noteOctaveIndex = Math.floor(reversedIndex / 12);
      const noteIndexInOctave = reversedIndex % 12;

      setNotes(notes.map(n => {
        if (n.id === draggedNote.note.id) {
          return {
            ...n,
            startTime: newStartTime,
            note: PIANO_NOTES[noteIndexInOctave],
            octave: OCTAVES[noteOctaveIndex]
          };
        }
        return n;
      }));

      setDraggedNote({
        ...draggedNote,
        startX: e.clientX,
        startY: e.clientY
      });
    }

    if (isResizing && resizeNote) {
      const rect = gridRef.current.getBoundingClientRect();
      const deltaX = e.clientX - resizeNote.startX;
      const cellWidth = rect.width / TOTAL_SIXTEENTH_NOTES;

      // 计算新的时值（自动对齐到网格，最小1个16分音符）
      const deltaSixteenthNotes = Math.round(deltaX / cellWidth);
      const newDuration = Math.max(1, Math.min(
        TOTAL_SIXTEENTH_NOTES - resizeNote.note.startTime,
        resizeNote.note.duration + deltaSixteenthNotes
      ));

      setNotes(notes.map(n => {
        if (n.id === resizeNote.note.id) {
          return { ...n, duration: newDuration };
        }
        return n;
      }));

      setResizeNote({
        note: { ...resizeNote.note, duration: newDuration },
        startX: e.clientX
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDraggedNote(null);
    setResizeNote(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'move' : 'ew-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, draggedNote, resizeNote]);

  // 清理定时器
  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(id => clearTimeout(id));
    };
  }, []);

  // 格式化时间显示
  const formatTime = (sixteenthNoteIndex: number) => {
    const beat = Math.floor(sixteenthNoteIndex / SIXTEENTH_NOTES_PER_BEAT);
    const bar = Math.floor(beat / BEATS_PER_BAR);
    const beatInBar = beat % BEATS_PER_BAR + 1;
    const sixteenthInBeat = sixteenthNoteIndex % SIXTEENTH_NOTES_PER_BEAT + 1;
    return `${bar + 1}.${beatInBar}.${sixteenthInBeat}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-7xl bg-slate-900 border-2 border-slate-700 rounded-lg overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Piano Roll - {trackName}</h2>
                <p className="text-xs text-slate-400">Track Type: {trackType}</p>
              </div>
              <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium">
                {notes.length} notes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePlay}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-3 w-3 mr-2" />
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
              <div className="text-white font-mono bg-slate-700 px-2 py-1 rounded text-xs">
                {formatTime(currentPosition)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-slate-600 text-slate-400 hover:bg-slate-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Instrument Selection */}
          <div className="w-60 bg-slate-800 border-r border-slate-700 p-3 flex flex-col flex-shrink-0">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <Volume2 className="h-3 w-3" />
              Instruments
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">Select an instrument, then click on the grid to add notes</p>

            <div className="space-y-2 flex-1 overflow-auto">
              {currentInstruments.map((instrument) => (
                <Button
                  key={instrument.id}
                  variant={selectedInstrument?.id === instrument.id ? 'default' : 'outline'}
                  onClick={() => setSelectedInstrument(instrument)}
                  className={`w-full justify-start text-xs h-8 ${
                    selectedInstrument?.id === instrument.id
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'border-slate-600 hover:border-purple-500 hover:bg-slate-700'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: instrument.color }}
                  />
                  {instrument.name}
                </Button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-700 mt-3 space-y-2">
              <Button
                onClick={() => onSave?.(notes)}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Save Notes
              </Button>
            </div>
          </div>

          {/* Right - Piano Roll Grid */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Timeline Header */}
            <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-end relative flex-shrink-0">
              <div className="w-16 flex-shrink-0" />
              <div className="flex-1 h-full relative">
                {/* 时间线网格 */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: TOTAL_BARS * BEATS_PER_BAR * SIXTEENTH_NOTES_PER_BEAT }).map((_, i) => {
                    const isStrong = i % SIXTEENTH_NOTES_PER_BEAT === 0;
                    const isWeak = i % (SIXTEENTH_NOTES_PER_BEAT / 2) === 0;
                    return (
                      <div
                        key={i}
                        className={`h-full border-r ${isStrong ? 'border-purple-500/50' : isWeak ? 'border-purple-500/20' : 'border-slate-700/30'}`}
                        style={{ width: `${100 / TOTAL_SIXTEENTH_NOTES}%` }}
                      />
                    );
                  })}
                </div>
                {/* 拍子标记 */}
                <div className="absolute inset-x-0 top-0 h-5 bg-slate-900/50 flex items-center px-1">
                  {Array.from({ length: TOTAL_BARS * BEATS_PER_BAR }).map((_, i) => (
                    <span
                      key={i}
                      className="absolute text-[10px] text-slate-400 font-medium whitespace-nowrap"
                      style={{ left: `${(i * SIXTEENTH_NOTES_PER_BEAT) / TOTAL_SIXTEENTH_NOTES * 100}%` }}
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
                {/* 播放头 */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ left: `${(currentPosition / TOTAL_SIXTEENTH_NOTES) * 100}%` }}
                >
                  <div className="absolute -top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                </div>
              </div>
            </div>

            {/* Piano Keys + Note Grid */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Piano Keys */}
              <div className="w-16 bg-slate-800 border-r border-slate-700 overflow-hidden flex-shrink-0">
                <div className="relative h-full">
                  {/* 从最低音(C3)到最高音(B5)依次排列 */}
                  {OCTAVES.map((octave) => (
                    PIANO_NOTES.map((note, noteIndex) => {
                      const isBlackKey = BLACK_NOTES.includes(note);
                      const totalNotes = OCTAVES.length * 12;
                      const notePosition = (octave - OCTAVES[0]) * 12 + noteIndex;
                      const reversedPosition = totalNotes - 1 - notePosition;
                      const topPercent = (reversedPosition / totalNotes) * 100;
                      const heightPercent = (1 / totalNotes) * 100;

                      if (isBlackKey) {
                        // 黑键
                        return (
                          <div
                            key={`${octave}-${note}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePianoKeyClick(note, octave);
                            }}
                            className="absolute bg-slate-950 hover:bg-slate-800 active:bg-slate-700 border-x border-slate-800 cursor-pointer"
                            style={{
                              left: '40%',
                              width: '40%',
                              top: `${topPercent}%`,
                              height: `${heightPercent}%`
                            }}
                          />
                        );
                      } else {
                        // 白键
                        return (
                          <button
                            key={`${octave}-${note}`}
                            onClick={() => handlePianoKeyClick(note, octave)}
                            className="absolute w-full bg-white hover:bg-slate-100 active:bg-slate-200 border-b border-slate-300"
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
              <div
                ref={gridRef}
                className="flex-1 bg-slate-950 relative overflow-auto cursor-crosshair"
                onClick={handleGridClick}
              >
                {/* Grid Lines */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  {/* 垂直线 */}
                  {Array.from({ length: TOTAL_BARS * BEATS_PER_BAR * SIXTEENTH_NOTES_PER_BEAT }).map((_, i) => {
                    const isStrong = i % SIXTEENTH_NOTES_PER_BEAT === 0;
                    const isWeak = i % (SIXTEENTH_NOTES_PER_BEAT / 2) === 0;
                    return (
                      <div
                        key={`v-${i}`}
                        className={`absolute top-0 bottom-0 border-r ${
                          isStrong ? 'border-purple-500/30' : isWeak ? 'border-purple-500/15' : 'border-slate-800/10'
                        }`}
                        style={{ left: `${(i / TOTAL_SIXTEENTH_NOTES) * 100}%` }}
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
                          isBlackKey ? 'border-slate-800/20' : 'border-slate-800/40'
                        }`}
                        style={{ top: `${(i / (PIANO_NOTES.length * OCTAVES.length)) * 100}%` }}
                      />
                    );
                  })}
                </div>

                {/* Notes */}
                {notes.map((note) => {
                  const noteIndex = getNoteGridPosition(note);
                  const instrument = [...Object.values(INSTRUMENT_PRESETS).flat()].find(i => i.id === note.instrumentType);
                  const isDragged = draggedNote?.note.id === note.id;
                  const isResized = resizeNote?.note.id === note.id;
                  const isHovered = hoveredNote === note.id;

                  return (
                    <div
                      key={note.id}
                      className={`absolute h-4 rounded-sm cursor-move border transition-all z-10 ${
                        isHovered ? 'border-white shadow-lg z-20' : 'border-transparent'
                      } ${isDragged ? 'opacity-60 scale-105 z-30' : ''}`}
                      style={{
                        left: `${(note.startTime / TOTAL_SIXTEENTH_NOTES) * 100}%`,
                        width: `${(note.duration / TOTAL_SIXTEENTH_NOTES) * 100}%`,
                        top: `${(noteIndex / (PIANO_NOTES.length * OCTAVES.length)) * 100}%`,
                        backgroundColor: instrument?.color || '#a855f7',
                        minWidth: `${100 / TOTAL_SIXTEENTH_NOTES}%`,
                      }}
                      onMouseDown={(e) => handleNoteMouseDown(e, note)}
                      onMouseEnter={() => setHoveredNote(note.id)}
                      onMouseLeave={() => setHoveredNote(null)}
                      onDoubleClick={() => handleNoteDelete(note.id)}
                    >
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize ${
                          isHovered ? 'bg-white/50' : 'bg-white/30'
                        }`}
                        onMouseDown={(e) => handleNoteResizeMouseDown(e, note)}
                      />
                      {isHovered && (
                        <div className="absolute -top-5 left-0 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-50">
                          {formatTime(note.startTime)}
                        </div>
                      )}
                    </div>
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
