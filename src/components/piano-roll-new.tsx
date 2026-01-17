'use client';

import { useState, useRef, MouseEvent, useEffect, DragEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Play, Plus, Volume2, GripVertical, Edit2, Trash2 } from 'lucide-react';
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
const DEFAULT_DURATION = SIXTEENTH_NOTES_PER_BEAT;

const WHITE_NOTES: NoteType[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NOTES: NoteType[] = ['C#', 'D#', 'F#', 'G#', 'A#'];

const BPM = 120;
const PIANO_KEY_WIDTH = 64; // 4rem = 64px

export function PianoRollNew({ isOpen, onClose, trackId, trackName, trackType, onSave, initialNotes = [] }: PianoRollProps) {
  const [notes, setNotes] = useState<PianoNote[]>(initialNotes);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentPreset | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [smoothPosition, setSmoothPosition] = useState(0); // 平滑播放位置（浮点数）
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draggedNote, setDraggedNote] = useState<{ note: PianoNote; startX: number; startY: number; startNote?: PianoNote } | null>(null);
  const [resizeNote, setResizeNote] = useState<{ note: PianoNote; startX: number } | null>(null);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);
  
  // 拖拽音源到网格的状态
  const [isDraggingInstrument, setIsDraggingInstrument] = useState(false);
  const [draggedInstrument, setDraggedInstrument] = useState<InstrumentPreset | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  
  // 时间条拖拽状态
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  
  // 编辑详情对话框状态
  const [editingNote, setEditingNote] = useState<PianoNote | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const audioEngine = useAudioEngine();
  const gridRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number | null>(null);
  const playStartSixteenthRef = useRef<number>(0);
  const pendingTimeouts = useRef<number[]>([]);
  const playedNotes = useRef<Set<string>>(new Set());
  const lastCheckedPositionRef = useRef<number>(0);

  const currentInstruments = INSTRUMENT_PRESETS[trackType] || INSTRUMENT_PRESETS.Synth;

  // 计算每个16分音符的毫秒数
  const getSixteenthNoteDuration = () => {
    return (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT * 1000;
  };

  // 播放单个音符（根据音色类型）
  const playNoteSound = useCallback((note: PianoNote) => {
    if (!audioEngine) return;

    const instrument = [...Object.values(INSTRUMENT_PRESETS).flat()].find(i => i.id === note.instrumentType);
    if (!instrument) return;

    const frequency = noteToFrequency(note.note, note.octave);
    const duration = note.duration * (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT;

    if (instrument.category === 'drum') {
      playDrumSound(instrument.id, duration);
    } else if (instrument.category === 'vocal') {
      playVocalSound(frequency, duration, instrument.oscillatorType || 'sine', note.velocity);
    } else {
      audioEngine.playNote(frequency, duration, note.velocity, instrument.oscillatorType || 'sine');
    }
  }, [audioEngine]);

  // 播放鼓声
  const playDrumSound = useCallback((drumType: string, duration: number) => {
    if (!audioEngine || !audioEngine['audioContext']) return;
    const ctx = audioEngine['audioContext'];

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
    }
  }, [audioEngine]);

  // 播放人声合唱
  const playVocalSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', velocity: number) => {
    if (!audioEngine || !audioEngine['audioContext']) return;
    const ctx = audioEngine['audioContext'];

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

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.connect(ctx.destination);
  }, [audioEngine]);

  // 播放控制 - 使用requestAnimationFrame实现平滑播放
  const handlePlay = useCallback(() => {
    if (isPlaying) {
      // 停止播放
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      pendingTimeouts.current.forEach(id => clearTimeout(id));
      pendingTimeouts.current = [];
      playedNotes.current.clear();
      lastCheckedPositionRef.current = 0;
      return;
    }

    // 开始播放
    setIsPlaying(true);
    playStartTimeRef.current = performance.now();
    playStartSixteenthRef.current = currentPosition;
    playedNotes.current.clear();
    lastCheckedPositionRef.current = currentPosition;

    // 使用requestAnimationFrame实现平滑播放
    const animate = () => {
      if (!playStartTimeRef.current) return;

      const elapsed = performance.now() - playStartTimeRef.current;
      const sixteenthNoteDuration = getSixteenthNoteDuration();
      const newSmoothPosition = playStartSixteenthRef.current + (elapsed / sixteenthNoteDuration);
      const newPosition = Math.floor(newSmoothPosition);

      // 检查是否播放结束
      if (newSmoothPosition >= TOTAL_SIXTEENTH_NOTES) {
        setIsPlaying(false);
        setCurrentPosition(0);
        setSmoothPosition(0);
        playStartTimeRef.current = null;
        playedNotes.current.clear();
        lastCheckedPositionRef.current = 0;
        pendingTimeouts.current.forEach(id => clearTimeout(id));
        pendingTimeouts.current = [];
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      setCurrentPosition(newPosition);
      setSmoothPosition(newSmoothPosition);

      // 播放当前音符
      notes.forEach((note) => {
        // 检查音符是否应该在当前位置播放
        // 条件：音符开始时间在上次检查位置和当前位置之间，且未播放过
        if (!playedNotes.current.has(note.id) && 
            note.startTime >= playStartSixteenthRef.current &&
            note.startTime >= lastCheckedPositionRef.current && 
            note.startTime < newSmoothPosition) {
          playedNotes.current.add(note.id);
          playNoteSound(note);
        }
      });

      // 更新上次检查的位置
      lastCheckedPositionRef.current = newSmoothPosition;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, currentPosition, notes, playNoteSound]);

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
  const getNoteGridPosition = useCallback((note: PianoNote) => {
    const noteIndex = (octave: number, note: NoteType) => {
      const octaveOffset = (octave - OCTAVES[0]) * 12;
      const noteOffset = PIANO_NOTES.indexOf(note);
      return octaveOffset + noteOffset;
    };
    const totalNotes = OCTAVES.length * 12;
    const noteTotalIndex = noteIndex(note.octave, note.note);
    const reversedIndex = totalNotes - 1 - noteTotalIndex;
    return reversedIndex;
  }, []);

  // 从音源库开始拖拽
  const handleInstrumentDragStart = (e: DragEvent<HTMLButtonElement>, instrument: InstrumentPreset) => {
    setIsDraggingInstrument(true);
    setDraggedInstrument(instrument);
    setSelectedInstrument(instrument);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', instrument.id);
  };

  // 处理拖拽在网格上的移动
  const handleGridDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    if (gridRef.current && isDraggingInstrument) {
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setDragPreview({ x, y, visible: true });
    }
  };

  // 处理拖拽离开网格
  const handleGridDragLeave = (e: DragEvent<HTMLDivElement>) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (rect && !(
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom
    )) {
      setDragPreview(null);
    }
  };

  // 处理拖拽放置
  const handleGridDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingInstrument(false);
    setDragPreview(null);

    if (!draggedInstrument || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellWidth = rect.width / TOTAL_SIXTEENTH_NOTES;
    const cellHeight = rect.height / (PIANO_NOTES.length * OCTAVES.length);

    const sixteenthNoteIndex = Math.floor(x / cellWidth);
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
        instrumentType: draggedInstrument.id
      };

      setNotes([...notes, newNote]);
      playNoteSound(newNote);
    }

    setDraggedInstrument(null);
  };

  // 时间线拖拽处理
  const handleTimelineMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    setIsDraggingTimeline(true);
    updateTimelinePosition(e);
  }, []);

  const updateTimelinePosition = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - PIANO_KEY_WIDTH;
    const width = rect.width - PIANO_KEY_WIDTH;
    
    const newPosition = Math.floor((x / width) * TOTAL_SIXTEENTH_NOTES);
    const clampedPosition = Math.max(0, Math.min(TOTAL_SIXTEENTH_NOTES - 1, newPosition));
    setCurrentPosition(clampedPosition);
    setSmoothPosition(clampedPosition);
  }, []);

  const handleTimelineMouseUp = useCallback(() => {
    setIsDraggingTimeline(false);
  }, []);

  const handleTimelineMouseLeave = useCallback(() => {
    setIsDraggingTimeline(false);
  }, []);

  // 时间线移动处理（用于拖拽）
  const handleTimelineMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (isDraggingTimeline) {
      updateTimelinePosition(e);
    }
  }, [isDraggingTimeline, updateTimelinePosition]);

  // 双击编辑音符
  const handleNoteDoubleClick = useCallback((note: PianoNote) => {
    setEditingNote(note);
    setEditDialogOpen(true);
  }, []);

  // 删除音符
  const handleNoteDelete = useCallback((noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId));
  }, [notes]);

  // 保存编辑的音符
  const handleSaveNoteEdit = useCallback((editedNote: PianoNote) => {
    setNotes(notes.map(n => n.id === editedNote.id ? editedNote : n));
    setEditDialogOpen(false);
    setEditingNote(null);
  }, [notes]);

  // 拖拽音符移动
  const handleNoteMouseDown = useCallback((e: MouseEvent<HTMLDivElement>, note: PianoNote) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDraggedNote({
      note,
      startX: e.clientX,
      startY: e.clientY,
      startNote: { ...note }
    });
  }, []);

  // 拖拽音符调整时值
  const handleNoteResizeMouseDown = useCallback((e: MouseEvent<HTMLDivElement>, note: PianoNote) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeNote({
      note,
      startX: e.clientX
    });
  }, []);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!gridRef.current) return;

    if (isDragging && draggedNote && draggedNote.startNote) {
      const rect = gridRef.current.getBoundingClientRect();
      const deltaX = e.clientX - draggedNote.startX;
      const deltaY = e.clientY - draggedNote.startY;

      const cellWidth = rect.width / TOTAL_SIXTEENTH_NOTES;
      const cellHeight = rect.height / (PIANO_NOTES.length * OCTAVES.length);

      const deltaSixteenthNotes = Math.round(deltaX / cellWidth);
      const newStartTime = Math.max(0, Math.min(
        TOTAL_SIXTEENTH_NOTES - draggedNote.startNote.duration,
        draggedNote.startNote.startTime + deltaSixteenthNotes
      ));

      const deltaNotes = Math.round(deltaY / cellHeight);
      const totalNotes = PIANO_NOTES.length * OCTAVES.length;
      const currentNoteIndex = getNoteGridPosition(draggedNote.startNote);
      const newNoteIndex = Math.max(0, Math.min(totalNotes - 1, currentNoteIndex + deltaNotes));

      const reversedIndex = totalNotes - 1 - newNoteIndex;
      const noteOctaveIndex = Math.floor(reversedIndex / 12);
      const noteIndexInOctave = reversedIndex % 12;

      setNotes(prevNotes => prevNotes.map(n => {
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
    }

    if (isResizing && resizeNote) {
      const rect = gridRef.current.getBoundingClientRect();
      const deltaX = e.clientX - resizeNote.startX;
      const cellWidth = rect.width / TOTAL_SIXTEENTH_NOTES;

      const deltaSixteenthNotes = Math.round(deltaX / cellWidth);
      const newDuration = Math.max(1, Math.min(
        TOTAL_SIXTEENTH_NOTES - resizeNote.note.startTime,
        resizeNote.note.duration + deltaSixteenthNotes
      ));

      setNotes(prevNotes => prevNotes.map(n => {
        if (n.id === resizeNote.note.id) {
          return { ...n, duration: newDuration };
        }
        return n;
      }));
    }
  }, [isDragging, isResizing, draggedNote, resizeNote, getNoteGridPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setDraggedNote(null);
    setResizeNote(null);
  }, []);

  // 鼠标事件监听
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
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // 清理定时器
  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(id => clearTimeout(id));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 格式化时间显示（小节.拍）
  const formatTime = (sixteenthNoteIndex: number) => {
    const beat = Math.floor(sixteenthNoteIndex / SIXTEENTH_NOTES_PER_BEAT);
    const bar = Math.floor(beat / BEATS_PER_BAR);
    const beatInBar = beat % BEATS_PER_BAR + 1;
    return `${bar + 1}:${beatInBar}`;
  };

  // 格式化完整时间（小节.拍.16分音符）
  const formatFullTime = (sixteenthNoteIndex: number) => {
    const beat = Math.floor(sixteenthNoteIndex / SIXTEENTH_NOTES_PER_BEAT);
    const bar = Math.floor(beat / BEATS_PER_BAR);
    const beatInBar = beat % BEATS_PER_BAR + 1;
    const sixteenthInBeat = sixteenthNoteIndex % SIXTEENTH_NOTES_PER_BEAT + 1;
    return `Bar ${bar + 1}, Beat ${beatInBar}, 16th ${sixteenthInBeat}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg overflow-hidden shadow-2xl flex flex-col" style={{ maxWidth: '98vw', height: '95vh' }}>
          {/* Header */}
          <div className="bg-slate-800 border-b border-slate-600 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Piano Roll - {trackName}</h2>
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
                  <Play className="h-4 w-4 mr-2" />
                  {isPlaying ? 'Stop' : 'Play'}
                </Button>
                <div className="text-white font-mono bg-slate-700 px-3 py-1.5 rounded text-sm border border-slate-600">
                  {formatTime(currentPosition)}
                </div>
                <Button
                  onClick={() => onSave?.(notes)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Save to Track
                </Button>
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

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Instrument Selection */}
            <div className="w-72 bg-slate-800 border-r border-slate-600 p-4 flex flex-col flex-shrink-0">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-purple-400" />
                Sound Library
              </h3>
              <p className="text-xs text-slate-300 mb-4">Drag sounds to the grid to add notes</p>

              <div className="space-y-3 flex-1 overflow-auto">
                {currentInstruments.map((instrument) => (
                  <button
                    key={instrument.id}
                    draggable
                    onDragStart={(e) => handleInstrumentDragStart(e, instrument)}
                    onClick={() => setSelectedInstrument(instrument)}
                    className={`w-full text-left text-sm p-3 rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing ${
                      selectedInstrument?.id === instrument.id
                        ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/50'
                        : 'border-slate-600 bg-slate-900 hover:border-purple-400 hover:bg-slate-800'
                    }`}
                    style={{
                      boxShadow: selectedInstrument?.id === instrument.id ? `0 0 15px ${instrument.color}40` : 'none'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-md flex-shrink-0 shadow-lg"
                        style={{ backgroundColor: instrument.color }}
                      />
                      <span className="font-medium text-slate-200">{instrument.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-600 mt-4 space-y-2">
                <Button
                  onClick={() => onSave?.(notes)}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Save Notes
                </Button>
              </div>
            </div>

            {/* Right - Piano Roll Grid */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Timeline Header */}
              <div 
                ref={timelineRef}
                className="h-12 bg-slate-800 border-b border-slate-600 flex items-end relative flex-shrink-0 cursor-pointer select-none"
                onMouseDown={handleTimelineMouseDown}
                onMouseMove={handleTimelineMouseMove}
                onMouseUp={handleTimelineMouseUp}
                onMouseLeave={handleTimelineMouseLeave}
              >
                {/* 时间线网格 - 使用绝对定位 */}
                <div className="absolute inset-0">
                  {/* 钢琴键占位 */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-slate-800" 
                    style={{ width: `${PIANO_KEY_WIDTH}px` }} 
                  />
                  
                  {/* 分隔线 */}
                  <div 
                    className="absolute top-0 bottom-0 border-r border-slate-600"
                    style={{ left: `${PIANO_KEY_WIDTH}px` }}
                  />
                  
                  {/* 网格线区域 */}
                  <div className="absolute" style={{ left: `${PIANO_KEY_WIDTH}px`, right: 0, top: 0, bottom: 0 }}>
                    {Array.from({ length: TOTAL_SIXTEENTH_NOTES }).map((_, i) => {
                      // 小节线：每16个16分音符（即每4拍）
                      const isBarLine = i % (BEATS_PER_BAR * SIXTEENTH_NOTES_PER_BEAT) === 0;
                      // 拍线：每4个16分音符（即每拍）
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
                  
                  {/* 播放头 - 使用平滑位置 */}
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
                <div 
                  className="bg-slate-800 overflow-hidden flex-shrink-0 relative" 
                  style={{ width: `${PIANO_KEY_WIDTH}px` }}
                >
                  {/* 分隔线 */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 border-r border-slate-600"
                  />
                  
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePianoKeyClick(note, octave);
                              }}
                              className="absolute bg-slate-950 hover:bg-slate-800 active:bg-slate-700 border-x border-slate-800 cursor-pointer transition-colors"
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
                            <button
                              key={`${octave}-${note}`}
                              onClick={() => handlePianoKeyClick(note, octave)}
                              className="absolute w-full bg-white hover:bg-slate-100 active:bg-slate-200 border-b border-slate-300 transition-colors"
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
                  className="flex-1 bg-slate-950 relative overflow-hidden"
                  onDragOver={handleGridDragOver}
                  onDragLeave={handleGridDragLeave}
                  onDrop={handleGridDrop}
                >
                  {/* Grid Lines - 使用绝对定位确保精确对齐 */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {/* 垂直线 - 与时间线完全相同的布局 */}
                    {Array.from({ length: TOTAL_SIXTEENTH_NOTES }).map((_, i) => {
                      // 小节线：每16个16分音符（即每4拍）
                      const isBarLine = i % (BEATS_PER_BAR * SIXTEENTH_NOTES_PER_BEAT) === 0;
                      // 拍线：每4个16分音符（即每拍）
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

                  {/* 拖拽预览 */}
                  {dragPreview && draggedInstrument && (
                    <div
                      className="absolute w-4 h-4 rounded-md pointer-events-none z-50 transition-transform duration-75"
                      style={{
                        left: `${dragPreview.x}px`,
                        top: `${dragPreview.y}px`,
                        backgroundColor: draggedInstrument.color,
                        boxShadow: `0 0 20px ${draggedInstrument.color}80`,
                        transform: 'translate(-50%, -50%) scale(1.2)'
                      }}
                    />
                  )}

                  {/* Notes */}
                  {notes.map((note) => {
                    const noteIndex = getNoteGridPosition(note);
                    const instrument = [...Object.values(INSTRUMENT_PRESETS).flat()].find(i => i.id === note.instrumentType);
                    const isDragged = draggedNote?.note.id === note.id;
                    const isResized = resizeNote?.note.id === note.id;
                    const isHovered = hoveredNote === note.id;
                    const totalNotes = PIANO_NOTES.length * OCTAVES.length;
                    const noteHeightPercent = (1 / totalNotes) * 100;
                    const noteTopPercent = (noteIndex / totalNotes) * 100;

                    return (
                      <div
                        key={note.id}
                        className={`absolute rounded-sm cursor-move border transition-all duration-150 z-10 ${
                          isHovered ? 'border-white shadow-lg z-20' : 'border-transparent'
                        } ${isDragged ? 'opacity-70 z-30 shadow-2xl' : ''}`}
                        style={{
                          left: `${(note.startTime / TOTAL_SIXTEENTH_NOTES) * 100}%`,
                          width: `${(note.duration / TOTAL_SIXTEENTH_NOTES) * 100}%`,
                          top: `${noteTopPercent}%`,
                          height: `${noteHeightPercent}%`,
                          backgroundColor: instrument?.color || '#a855f7',
                          minWidth: `${100 / TOTAL_SIXTEENTH_NOTES}%`,
                          boxShadow: isHovered ? `0 0 20px ${instrument?.color}60` : 'none'
                        }}
                        onMouseDown={(e) => handleNoteMouseDown(e, note)}
                        onMouseEnter={() => setHoveredNote(note.id)}
                        onMouseLeave={() => setHoveredNote(null)}
                        onDoubleClick={() => handleNoteDoubleClick(note)}
                      >
                        <div
                          className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-sm transition-all duration-150 hover:bg-white/50 bg-white/20`}
                          onMouseDown={(e) => handleNoteResizeMouseDown(e, note)}
                        />
                        {isHovered && (
                          <div className="absolute -top-8 left-0 bg-slate-800/95 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 border border-slate-600">
                            {formatFullTime(note.startTime)}
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

      {/* 编辑详情对话框 */}
      {editDialogOpen && editingNote && (
        <NoteEditDialog
          note={editingNote}
          instruments={currentInstruments}
          onSave={handleSaveNoteEdit}
          onDelete={handleNoteDelete}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingNote(null);
          }}
        />
      )}
    </>
  );
}

// 音符编辑对话框组件
interface NoteEditDialogProps {
  note: PianoNote;
  instruments: InstrumentPreset[];
  onSave: (note: PianoNote) => void;
  onDelete: (noteId: string) => void;
  onClose: () => void;
}

function NoteEditDialog({ note, instruments, onSave, onDelete, onClose }: NoteEditDialogProps) {
  const [editedNote, setEditedNote] = useState<PianoNote>(note);

  const formatTimePosition = (sixteenthNoteIndex: number) => {
    const beat = Math.floor(sixteenthNoteIndex / SIXTEENTH_NOTES_PER_BEAT);
    const bar = Math.floor(beat / BEATS_PER_BAR);
    const beatInBar = beat % BEATS_PER_BAR + 1;
    const sixteenthInBeat = sixteenthNoteIndex % SIXTEENTH_NOTES_PER_BEAT + 1;
    return `Bar ${bar + 1}, Beat ${beatInBar}, 16th ${sixteenthInBeat}`;
  };

  const handleSave = () => {
    onSave(editedNote);
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)' }}>
      <div className="bg-slate-900 border-2 border-slate-600 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-600 flex-shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-purple-400" />
            Edit Note
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Position */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Position
            </label>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <div className="text-white font-mono text-sm mb-2">{formatTimePosition(editedNote.startTime)}</div>
              <input
                type="range"
                min="0"
                max={TOTAL_SIXTEENTH_NOTES - 1}
                value={editedNote.startTime}
                onChange={(e) => setEditedNote({ ...editedNote, startTime: parseInt(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Duration (16th notes)
            </label>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max={TOTAL_SIXTEENTH_NOTES}
                  value={editedNote.duration}
                  onChange={(e) => setEditedNote({ ...editedNote, duration: parseInt(e.target.value) || 1 })}
                  className="w-24 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <span className="text-slate-300 text-sm">16th notes</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                ≈ {editedNote.duration / 4} beats ({editedNote.duration / 4 * 60 / BPM} seconds at {BPM} BPM)
              </div>
            </div>
          </div>

          {/* Note Pitch */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Pitch
            </label>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <select
                value={`${editedNote.note}-${editedNote.octave}`}
                onChange={(e) => {
                  const [note, octave] = e.target.value.split('-');
                  setEditedNote({ ...editedNote, note: note as NoteType, octave: parseInt(octave) });
                }}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {OCTAVES.map((oct) => (
                  PIANO_NOTES.map((n) => (
                    <option key={`${n}-${oct}`} value={`${n}-${oct}`}>
                      {n}{oct}
                    </option>
                  ))
                ))}
              </select>
            </div>
          </div>

          {/* Instrument - 只显示当前轨道的音色 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Instrument
            </label>
            <div className="space-y-2 bg-slate-800 rounded-lg p-3 border border-slate-600 max-h-48 overflow-y-auto">
              {instruments.map((instrument) => (
                <button
                  key={instrument.id}
                  onClick={() => setEditedNote({ ...editedNote, instrumentType: instrument.id })}
                  className={`w-full text-left text-sm p-2 rounded-md border transition-all ${
                    editedNote.instrumentType === instrument.id
                      ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500'
                      : 'border-slate-700 bg-slate-900 hover:border-purple-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: instrument.color }}
                    />
                    <span className="text-slate-200">{instrument.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Velocity */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Velocity (Volume): {Math.round(editedNote.velocity * 100)}%
            </label>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={editedNote.velocity}
                onChange={(e) => setEditedNote({ ...editedNote, velocity: parseFloat(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-slate-600 flex-shrink-0">
          <Button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm"
          >
            Save Changes
          </Button>
          <Button
            onClick={() => onDelete(note.id)}
            variant="outline"
            className="bg-red-600/20 border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-red-300 text-sm"
          >
            <Trash2 className="h-4 w-4 mr-1" />
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white text-sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
