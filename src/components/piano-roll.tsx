'use client';

import { useState, useRef, MouseEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Play, Plus, Grid3x3, Volume2 } from 'lucide-react';
import { useAudioEngine, noteToFrequency } from '@/lib/audio-engine';

export type NoteType = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface PianoNote {
  note: NoteType;
  octave: number;
  startTime: number; // 拍子
  duration: number; // 拍子
  velocity: number; // 0-1
}

interface PianoRollProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackName: string;
  onSave?: (notes: PianoNote[]) => void;
  initialNotes?: PianoNote[];
}

const SYNTH_PRESETS = [
  { name: 'Sine', type: 'sine' as OscillatorType, color: '#3b82f6' },
  { name: 'Square', type: 'square' as OscillatorType, color: '#22c55e' },
  { name: 'Sawtooth', type: 'sawtooth' as OscillatorType, color: '#a855f7' },
  { name: 'Triangle', type: 'triangle' as OscillatorType, color: '#ec4899' },
];

const PIANO_NOTES: NoteType[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [3, 4, 5];
const TOTAL_BARS = 8;
const BEATS_PER_BAR = 4;

export function PianoRoll({ isOpen, onClose, trackId, trackName, onSave, initialNotes = [] }: PianoRollProps) {
  const [notes, setNotes] = useState<PianoNote[]>(initialNotes);
  const [selectedSynth, setSelectedSynth] = useState(SYNTH_PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNote, setDraggedNote] = useState<{ note: PianoNote; startX: number; startY: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState<PianoNote | null>(null);

  const audioEngine = useAudioEngine();
  const gridRef = useRef<HTMLDivElement>(null);
  const playInterval = useRef<NodeJS.Timeout | null>(null);

  // 播放所有音符
  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playInterval.current) {
        clearInterval(playInterval.current);
        playInterval.current = null;
      }
      return;
    }

    setIsPlaying(true);
    let position = currentPosition;
    const startTime = position;

    // 播放所有音符
    notes.forEach((note) => {
      if (note.startTime >= position && note.startTime < position + TOTAL_BARS * BEATS_PER_BAR) {
        const delay = (note.startTime - position) * 0.5; // 0.5秒/拍
        const frequency = noteToFrequency(note.note, note.octave);
        setTimeout(() => {
          audioEngine?.playNote(frequency, note.duration * 0.5, note.velocity, selectedSynth.type);
        }, delay * 1000);
      }
    });

    // 播放指针移动
    playInterval.current = setInterval(() => {
      position += 0.25; // 每次移动1/4拍
      if (position >= TOTAL_BARS * BEATS_PER_BAR) {
        setIsPlaying(false);
        setCurrentPosition(0);
        if (playInterval.current) {
          clearInterval(playInterval.current);
          playInterval.current = null;
        }
      } else {
        setCurrentPosition(position);
      }
    }, 125); // 0.5秒/拍 * 1/4拍 = 0.125秒
  };

  // 点击钢琴键播放音符
  const handlePianoKeyClick = (note: NoteType, octave: number) => {
    const frequency = noteToFrequency(note, octave);
    audioEngine?.playNote(frequency, 0.3, 0.5, selectedSynth.type);
  };

  // 添加音符
  const handleGridClick = (e: MouseEvent<HTMLDivElement>, note: NoteType, octave: number, beat: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cellWidth = rect.width / (TOTAL_BARS * BEATS_PER_BAR);

    // 计算持续时间（1-4拍）
    const duration = Math.max(1, Math.round(x / cellWidth / 1) + 1);

    const newNoteItem: PianoNote = {
      note,
      octave,
      startTime: beat,
      duration,
      velocity: 0.8
    };

    setNotes([...notes, newNoteItem]);

    // 播放音符
    const frequency = noteToFrequency(note, octave);
    audioEngine?.playNote(frequency, duration * 0.5, 0.8, selectedSynth.type);
  };

  // 删除音符
  const handleNoteDelete = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  // 拖拽音符
  const handleNoteMouseDown = (e: MouseEvent<HTMLDivElement>, note: PianoNote, index: number) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedNote({
      note,
      startX: e.clientX,
      startY: e.clientY
    });
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!isDragging || !draggedNote || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const deltaX = e.clientX - draggedNote.startX;
    const deltaY = e.clientY - draggedNote.startY;

    // 计算新的拍子位置
    const cellWidth = rect.width / (TOTAL_BARS * BEATS_PER_BAR);
    const cellHeight = rect.height / (PIANO_NOTES.length * OCTAVES.length);

    const newStartTime = Math.max(0, Math.min(
      TOTAL_BARS * BEATS_PER_BAR - draggedNote.note.duration,
      draggedNote.note.startTime + deltaX / cellWidth / 2
    ));

    // 计算新的音符位置
    const noteDelta = Math.round(-deltaY / cellHeight);
    const allNotes = [];
    for (const oct of OCTAVES) {
      for (const n of PIANO_NOTES) {
        allNotes.push({ note: n, octave: oct });
      }
    }

    const currentIndex = allNotes.findIndex(n => n.note === draggedNote.note.note && n.octave === draggedNote.note.octave);
    const newIndex = Math.max(0, Math.min(allNotes.length - 1, currentIndex + noteDelta));
    const newNoteData = allNotes[newIndex];

    setNotes(notes.map((n, i) => {
      if (i === notes.indexOf(draggedNote.note)) {
        return {
          ...n,
          startTime: newStartTime,
          note: newNoteData.note,
          octave: newNoteData.octave
        };
      }
      return n;
    }));

    setDraggedNote({
      note: { ...draggedNote.note, startTime: newStartTime, note: newNoteData.note, octave: newNoteData.octave },
      startX: e.clientX,
      startY: e.clientY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNote(null);
  };

  useEffect(() => {
    if (isDragging) {
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
  }, [isDragging, draggedNote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <CardHeader className="border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-white text-xl">Piano Roll - {trackName}</CardTitle>
              <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm font-medium">
                {notes.length} notes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePlay}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-slate-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="flex h-[600px]">
          {/* Sidebar - Synth Settings */}
          <div className="w-64 border-r border-slate-800 p-4 bg-slate-900/50">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Synth Settings
            </h3>

            <div className="space-y-2 mb-6">
              <p className="text-xs text-slate-400 mb-2">Synth Type</p>
              {SYNTH_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant={selectedSynth.name === preset.name ? 'default' : 'outline'}
                  onClick={() => setSelectedSynth(preset)}
                  className={`w-full justify-start ${
                    selectedSynth.name === preset.name
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'border-slate-700 hover:border-purple-500'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: preset.color }}
                  />
                  {preset.name}
                </Button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <Button
                onClick={() => onSave?.(notes)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Save Notes
              </Button>
            </div>

            <div className="mt-6 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-2">Instructions:</p>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• Click grid to add notes</li>
                <li>• Drag to adjust position</li>
                <li>• Click piano keys to preview</li>
                <li>• Select synth type</li>
              </ul>
            </div>
          </div>

          {/* Piano Roll Grid */}
          <div className="flex-1 flex overflow-hidden">
            {/* Piano Keys */}
            <div className="w-16 bg-slate-900/80 border-r border-slate-800 overflow-hidden">
              <div className="relative">
                {OCTAVES.reverse().map((octave) => (
                  <div key={octave} className="relative">
                    {PIANO_NOTES.map((note) => {
                      const isBlackKey = note.includes('#');
                      return (
                        <div
                          key={`${octave}-${note}`}
                          className={`relative ${
                            isBlackKey ? 'h-6 w-10 -ml-2 z-10' : 'h-10 w-full'
                          }`}
                        >
                          <button
                            onClick={() => handlePianoKeyClick(note, octave)}
                            className={`${
                              isBlackKey
                                ? 'absolute inset-0 bg-slate-950 hover:bg-slate-800 active:bg-slate-700 rounded-b-md'
                                : 'w-full h-full bg-white hover:bg-slate-100 active:bg-slate-200 border-b border-slate-300'
                            } transition-colors`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Note Grid */}
            <div
              ref={gridRef}
              className="flex-1 relative overflow-auto bg-slate-950"
              onClick={(e) => {
                if (!isDragging && gridRef.current) {
                  const rect = gridRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left - 64; // 减去钢琴键宽度
                  const y = e.clientY - rect.top;

                  const cellWidth = rect.width / (TOTAL_BARS * BEATS_PER_BAR);
                  const cellHeight = rect.height / (PIANO_NOTES.length * OCTAVES.length);

                  const beat = Math.floor(x / cellWidth);
                  const noteIndex = Math.floor(y / cellHeight);
                  const totalNotes = PIANO_NOTES.length * OCTAVES.length;
                  const actualIndex = totalNotes - 1 - noteIndex;

                  if (actualIndex >= 0 && actualIndex < totalNotes) {
                    const noteOctaveIndex = Math.floor(actualIndex / PIANO_NOTES.length);
                    const noteIndexInOctave = actualIndex % PIANO_NOTES.length;
                    const note = PIANO_NOTES[noteIndexInOctave];
                    const octave = OCTAVES[noteOctaveIndex];

                    handleGridClick(e, note, octave, beat);
                  }
                }
              }}
            >
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Beat lines */}
                {Array.from({ length: TOTAL_BARS * BEATS_PER_BAR + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 w-px ${
                      i % BEATS_PER_BAR === 0 ? 'bg-purple-500/50' : 'bg-slate-800/50'
                    }`}
                    style={{ left: `${(i / (TOTAL_BARS * BEATS_PER_BAR)) * 100}%` }}
                  />
                ))}
                {/* Note rows */}
                {Array.from({ length: PIANO_NOTES.length * OCTAVES.length }).map((_, i) => (
                  <div
                    key={i}
                    className={`absolute left-0 right-0 h-px ${
                      PIANO_NOTES[i % 12].includes('#') ? 'bg-slate-800/30' : 'bg-slate-800/80'
                    }`}
                    style={{ top: `${(i / (PIANO_NOTES.length * OCTAVES.length)) * 100}%` }}
                  />
                ))}
              </div>

              {/* Notes */}
              {notes.map((note, index) => {
                const allNotes = [];
                for (const oct of OCTAVES) {
                  for (const n of PIANO_NOTES) {
                    allNotes.push({ note: n, octave: oct });
                  }
                }
                const noteIndex = allNotes.findIndex(n => n.note === note.note && n.octave === note.octave);
                const reversedIndex = allNotes.length - 1 - noteIndex;

                return (
                  <div
                    key={`${note.note}-${note.octave}-${note.startTime}`}
                    className={`absolute h-4 rounded cursor-move transition-all hover:shadow-lg ${
                      isDragging && draggedNote?.note === note ? 'scale-105 opacity-80' : ''
                    }`}
                    style={{
                      left: `${(note.startTime / (TOTAL_BARS * BEATS_PER_BAR)) * 100}%`,
                      width: `${(note.duration / (TOTAL_BARS * BEATS_PER_BAR)) * 100}%`,
                      top: `${(reversedIndex / (PIANO_NOTES.length * OCTAVES.length)) * 100}%`,
                      backgroundColor: selectedSynth.color,
                      minHeight: '16px'
                    }}
                    onMouseDown={(e) => handleNoteMouseDown(e, note, index)}
                  >
                    {/* Velocity bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 rounded-l"
                      style={{ height: `${note.velocity * 100}%` }}
                    />
                  </div>
                );
              })}

              {/* Playhead */}
              {isPlaying && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${(currentPosition / (TOTAL_BARS * BEATS_PER_BAR)) * 100}%` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
