'use client';

import { useRef, useEffect } from 'react';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private gainNodes: Map<string, GainNode> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private ensureContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // 播放音频片段
  async playAudioClip(audioBuffer: AudioBuffer, startTime: number, volume: number = 1, trackId: string = 'default') {
    this.ensureContext();
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    const id = `${trackId}-${Date.now()}-${Math.random()}`;
    this.activeSources.set(id, source);

    source.start(this.audioContext.currentTime + startTime);
    source.onended = () => {
      this.activeSources.delete(id);
    };

    return id;
  }

  // 播放单个音符（合成器）
  playNote(frequency: number, duration: number, volume: number = 1, type: OscillatorType = 'sine') {
    this.ensureContext();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // 停止所有音频
  stopAll() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    this.activeSources.clear();
  }

  // 加载音频文件
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    this.ensureContext();
    if (!this.audioContext) throw new Error('AudioContext not available');

    const arrayBuffer = await file.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  // 创建合成器音色
  createSynthSound(frequency: number, type: OscillatorType = 'sine', duration: number = 0.5): AudioBuffer {
    this.ensureContext();
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // ADSR envelope
      const attack = 0.01;
      const decay = 0.1;
      const sustain = 0.7;
      const release = 0.2;

      let amplitude = 0;
      if (t < attack) {
        amplitude = t / attack;
      } else if (t < attack + decay) {
        amplitude = 1 - ((t - attack) / decay) * (1 - sustain);
      } else if (t < duration - release) {
        amplitude = sustain;
      } else {
        amplitude = sustain * ((duration - t) / release);
      }

      // Waveform
      let sample = 0;
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
          break;
      }

      data[i] = sample * amplitude * 0.5;
    }

    return buffer;
  }

  dispose() {
    this.stopAll();
    this.gainNodes.clear();
    this.audioContext?.close();
  }
}

// 频率计算
export function noteToFrequency(note: string, octave: number = 4): number {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = notes.indexOf(note);
  const semitones = noteIndex + (octave - 4) * 12;
  return 440 * Math.pow(2, semitones / 12);
}

// Hook to use AudioEngine
export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    engineRef.current = new AudioEngine();
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  return engineRef.current;
}
