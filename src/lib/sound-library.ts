// 音色库管理系统
// 支持从对象存储加载高质量音色，确保音色准确、音高正确、时值精确

export type InstrumentType = 'guitar' | 'drum' | 'bass' | 'synth' | 'vocal';
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface SoundSample {
  id: string;
  instrument: InstrumentType;
  note: NoteName;
  octave: number;
  url: string; // 对象存储URL
  duration: number; // 秒
  format: 'wav' | 'mp3';
  category?: string; // 如 'electric', 'acoustic', 'synth'
  source: string; // 音色来源（如 'shreddage', 'cymatics'）
}

export interface InstrumentPreset {
  id: string;
  name: string;
  instrument: InstrumentType;
  category: string;
  source: string;
  description: string;
  samples: Map<string, SoundSample>; // key: "note-octave", value: SoundSample
  isLoaded: boolean;
}

// 音色库配置
export const SOUND_LIBRARY_CONFIG = {
  // 电吉他配置（基于Shreddage 3 Stratus Free）
  guitar: {
    id: 'shreddage-electric',
    name: 'Shreddage Electric Guitar',
    instrument: 'guitar' as InstrumentType,
    category: 'electric',
    source: 'Shreddage 3 Stratus Free',
    description: '专业级电吉他，覆盖C3-B5全音域',
    notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as NoteName[],
    octaves: [3, 4, 5],
    baseNote: 'C3',
    // 示例URL格式，实际使用时替换为对象存储的真实URL
    urlTemplate: 'https://your-storage-bucket.s3.amazonaws.com/instruments/guitar/shreddage/{note}{octave}.wav'
  },

  // 鼓组配置（基于Cymatics）
  drum: {
    id: 'cymatics-drums',
    name: 'Cymatics Drum Kit',
    instrument: 'drum' as InstrumentType,
    category: 'electronic',
    source: 'Cymatics.fm',
    description: '专业电子鼓组，包含底鼓、军鼓、镲片等',
    samples: {
      kick: { baseNote: 'C2', url: 'drums/kick.wav' },
      snare: { baseNote: 'D2', url: 'drums/snare.wav' },
      hihat: { baseNote: 'F#2', url: 'drums/hihat.wav' },
      tom1: { baseNote: 'G2', url: 'drums/tom1.wav' },
      tom2: { baseNote: 'A2', url: 'drums/tom2.wav' },
      crash: { baseNote: 'C3', url: 'drums/crash.wav' },
      ride: { baseNote: 'D3', url: 'drums/ride.wav' }
    }
  },

  // 贝斯配置（基于Bass City）
  bass: {
    id: 'bass-city-synth',
    name: 'Bass City Synth Bass',
    instrument: 'bass' as InstrumentType,
    category: 'synth',
    source: '99Sounds Bass City',
    description: '合成贝斯，使用Yamaha TX81Z制作',
    notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as NoteName[],
    octaves: [1, 2, 3],
    baseNote: 'C1',
    urlTemplate: 'https://your-storage-bucket.s3.amazonaws.com/instruments/bass/bass-city/{note}{octave}.wav'
  },

  // 合成器配置
  synth: {
    id: 'default-synth',
    name: 'Classic Synth',
    instrument: 'synth' as InstrumentType,
    category: 'analog',
    source: 'Web Audio API',
    description: '经典模拟合成器音色',
    notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as NoteName[],
    octaves: [3, 4, 5, 6],
    baseNote: 'C3',
    // 合成器使用Web Audio API生成，不需要外部文件
    useSynthesis: true
  },

  // 人声配置
  vocal: {
    id: 'vocal-chorus',
    name: 'Vocal Chorus',
    instrument: 'vocal' as InstrumentType,
    category: 'choir',
    source: 'Web Audio API',
    description: '人声合唱效果',
    notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as NoteName[],
    octaves: [3, 4, 5],
    baseNote: 'C3',
    // 人声使用Web Audio API生成
    useSynthesis: true
  }
};

export class SoundLibrary {
  private audioContext: AudioContext | null = null;
  private loadedSamples: Map<string, AudioBuffer> = new Map();
  private instrumentPresets: Map<string, InstrumentPreset> = new Map();
  private isLoading: Set<string> = new Set();

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.initializePresets();
  }

  // 初始化音色预设
  private initializePresets() {
    Object.entries(SOUND_LIBRARY_CONFIG).forEach(([key, config]) => {
      const preset: InstrumentPreset = {
        id: config.id,
        name: config.name,
        instrument: config.instrument,
        category: config.category,
        source: config.source,
        description: config.description,
        samples: new Map(),
        isLoaded: false
      };

      // 如果有notes配置，为每个音符创建样本映射
      if ('notes' in config && config.notes) {
        config.notes.forEach((note: NoteName) => {
          config.octaves.forEach((octave: number) => {
            const sampleKey = `${note}${octave}`;
            if ('urlTemplate' in config) {
              const url = config.urlTemplate.replace('{note}', note).replace('{octave}', octave.toString());
              preset.samples.set(sampleKey, {
                id: `${config.id}-${sampleKey}`,
                instrument: config.instrument,
                note,
                octave,
                url,
                duration: 2.0, // 默认2秒
                format: 'wav',
                category: config.category,
                source: config.source
              });
            }
          });
        });
      }

      // 如果有samples配置（鼓组等）
      if ('samples' in config && config.samples) {
        Object.entries(config.samples).forEach(([sampleName, sampleInfo]: [string, any]) => {
          const url = `https://your-storage-bucket.s3.amazonaws.com/instruments/${sampleInfo.url}`;
          preset.samples.set(sampleName, {
            id: `${config.id}-${sampleName}`,
            instrument: config.instrument,
            note: sampleInfo.baseNote.replace(/[0-9]/g, '') as NoteName,
            octave: parseInt(sampleInfo.baseNote.replace(/\D/g, '')),
            url,
            duration: 1.0,
            format: 'wav',
            category: config.category,
            source: config.source
          });
        });
      }

      this.instrumentPresets.set(key, preset);
    });
  }

  // 获取乐器预设
  getInstrumentPreset(instrument: InstrumentType): InstrumentPreset | undefined {
    return this.instrumentPresets.get(instrument);
  }

  // 加载乐器所有样本
  async loadInstrument(instrument: InstrumentType): Promise<void> {
    const preset = this.getInstrumentPreset(instrument);
    if (!preset || preset.isLoaded) return;

    const loadingPromises: Promise<void>[] = [];

    preset.samples.forEach((sample, key) => {
      if (!this.loadedSamples.has(sample.id) && !this.isLoading.has(sample.id)) {
        this.isLoading.add(sample.id);
        loadingPromises.push(this.loadSample(sample));
      }
    });

    await Promise.all(loadingPromises);
    preset.isLoaded = true;
  }

  // 加载单个样本
  async loadSample(sample: SoundSample): Promise<void> {
    if (this.loadedSamples.has(sample.id)) return;

    try {
      const response = await fetch(sample.url);
      if (!response.ok) {
        console.warn(`Failed to load sample: ${sample.url}`);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      this.loadedSamples.set(sample.id, audioBuffer);
    } catch (error) {
      console.error(`Error loading sample ${sample.id}:`, error);
    } finally {
      this.isLoading.delete(sample.id);
    }
  }

  // 播放音符
  async playNote(
    instrument: InstrumentType,
    note: NoteName,
    octave: number,
    duration: number,
    volume: number = 1.0
  ): Promise<void> {
    const preset = this.getInstrumentPreset(instrument);
    if (!preset) return;

    const sampleKey = `${note}${octave}`;
    const sample = preset.samples.get(sampleKey);

    if (sample) {
      // 播放录制的样本
      await this.playSample(sample, duration, volume);
    } else {
      // 使用合成器生成
      console.warn(`Sample not found: ${sampleKey}, using synthesis`);
      await this.playSynthesizedNote(instrument, note, octave, duration, volume);
    }
  }

  // 播放录制的样本
  private async playSample(sample: SoundSample, duration: number, volume: number): Promise<void> {
    const audioBuffer = this.loadedSamples.get(sample.id);
    if (!audioBuffer) {
      // 如果样本未加载，尝试加载
      await this.loadSample(sample);
      const loadedBuffer = this.loadedSamples.get(sample.id);
      if (!loadedBuffer) return;
    }

    const source = this.audioContext!.createBufferSource();
    source.buffer = this.loadedSamples.get(sample.id)!;
    source.loop = duration > sample.duration;

    const gainNode = this.audioContext!.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    source.start(this.audioContext!.currentTime);
    source.stop(this.audioContext!.currentTime + duration);
  }

  // 播放合成音符
  private async playSynthesizedNote(
    instrument: InstrumentType,
    note: NoteName,
    octave: number,
    duration: number,
    volume: number
  ): Promise<void> {
    const frequency = this.noteToFrequency(note, octave);
    let oscillatorType: OscillatorType = 'sine';
    let attack = 0.01;
    let decay = 0.1;
    let sustain = 0.7;
    let release = 0.2;

    // 根据乐器类型调整参数
    switch (instrument) {
      case 'guitar':
        oscillatorType = 'sawtooth';
        attack = 0.02;
        decay = 0.3;
        sustain = 0.5;
        release = 0.5;
        break;
      case 'bass':
        oscillatorType = 'square';
        attack = 0.01;
        decay = 0.1;
        sustain = 0.8;
        release = 0.2;
        break;
      case 'synth':
        oscillatorType = 'sawtooth';
        attack = 0.01;
        decay = 0.2;
        sustain = 0.6;
        release = 0.3;
        break;
      case 'vocal':
        // 人声使用特殊的合唱效果
        return this.playVocalChorus(frequency, duration, volume);
        break;
      case 'drum':
        // 鼓组使用特殊处理
        return this.playDrumSound(note, octave, duration, volume);
    }

    const oscillator = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();

    oscillator.type = oscillatorType;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);

    // ADSR包络
    gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext!.currentTime + attack);
    gainNode.gain.linearRampToValueAtTime(volume * sustain, this.audioContext!.currentTime + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    oscillator.start(this.audioContext!.currentTime);
    oscillator.stop(this.audioContext!.currentTime + duration);
  }

  // 播放鼓声音（合成）
  private async playDrumSound(note: NoteName, octave: number, duration: number, volume: number): Promise<void> {
    const frequency = this.noteToFrequency(note, octave);

    const oscillator = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();
    const noiseNode = this.audioContext!.createOscillator();

    // 根据音符选择鼓的类型
    if (note.includes('C') && octave <= 2) {
      // 底鼓
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(150, this.audioContext!.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext!.currentTime + 0.1);
      gainNode.gain.setValueAtTime(volume, this.audioContext!.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.start(this.audioContext!.currentTime);
      oscillator.stop(this.audioContext!.currentTime + 0.3);
    } else if (note.includes('D') || note.includes('E')) {
      // 军鼓
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(180, this.audioContext!.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext!.currentTime + 0.05);
      gainNode.gain.setValueAtTime(volume * 0.5, this.audioContext!.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.start(this.audioContext!.currentTime);
      oscillator.stop(this.audioContext!.currentTime + 0.2);
    } else {
      // 镲片
      noiseNode.type = 'square';
      noiseNode.frequency.setValueAtTime(8000, this.audioContext!.currentTime);
      gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext!.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + duration);

      noiseNode.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      noiseNode.start(this.audioContext!.currentTime);
      noiseNode.stop(this.audioContext!.currentTime + duration);
    }
  }

  // 播放人声合唱效果
  private async playVocalChorus(frequency: number, duration: number, volume: number): Promise<void> {
    const numVoices = 3; // 3个声部
    const voices: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];
    const masterGain = this.audioContext!.createGain();

    // 每个声部有略微不同的音高，模拟多人合唱
    const detuneValues = [0, -5, +8]; // 音高偏移（音分）
    const volumeRatios = [1.0, 0.8, 0.7]; // 每个声部的音量比例

    // 为每个声部创建振荡器
    for (let i = 0; i < numVoices; i++) {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      // 使用混合波形：sine + triangle 模拟人声的丰富谐波
      // 由于 Web Audio API 的 Oscillator 只能有一种波形，我们使用 triangle
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);

      // 添加音高偏移（失谐效果）
      const detunedFreq = frequency * Math.pow(2, detuneValues[i] / 1200);
      oscillator.frequency.setValueAtTime(detunedFreq, this.audioContext!.currentTime);

      // 添加 vibrato（颤音效果）
      const lfo = this.audioContext!.createOscillator();
      const lfoGain = this.audioContext!.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 5 + i * 0.5; // 5-6 Hz 的颤音频率
      lfoGain.gain.value = 3; // 颤音深度（音分）
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      lfo.start();
      lfo.stop(this.audioContext!.currentTime + duration);

      // ADSR 包络 - 人声通常有较慢的起音和较长的衰减
      const attack = 0.1; // 较慢的起音
      const decay = 0.2;
      const sustain = 0.6;
      const release = 0.5;

      gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * volumeRatios[i] * 0.5, this.audioContext!.currentTime + attack);
      gainNode.gain.linearRampToValueAtTime(volume * volumeRatios[i] * 0.5 * sustain, this.audioContext!.currentTime + attack + decay);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + duration);

      // 使用低通滤波器模拟人声的柔和特性
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000; // 2kHz 截止频率，模拟人声的频率范围
      filter.Q.value = 1;

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(masterGain);

      oscillator.start(this.audioContext!.currentTime);
      oscillator.stop(this.audioContext!.currentTime + duration);

      voices.push(oscillator);
      gainNodes.push(gainNode);
    }

    // 主音量控制
    masterGain.gain.value = 0.8; // 稍微降低总音量，避免失真
    masterGain.connect(this.audioContext!.destination);

    // 简单的合唱效果：添加一个延迟的复制声部
    if (this.audioContext) {
      const delayNode = this.audioContext.createDelay(1.0);
      const delayGain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      delayNode.delayTime.value = 0.05; // 50ms 延迟
      delayGain.gain.value = 0.3; // 30% 混合比例
      filter.type = 'lowpass';
      filter.frequency.value = 1000;

      // 只连接第一个声部到延迟效果，节省资源
      if (gainNodes[0]) {
        gainNodes[0].connect(delayNode);
        delayNode.connect(filter);
        filter.connect(delayGain);
        delayGain.connect(this.audioContext!.destination);
      }
    }
  }

  // 音符转频率
  private noteToFrequency(note: NoteName, octave: number): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteIndex = notes.indexOf(note);
    const semitones = noteIndex + (octave - 4) * 12;
    return 440 * Math.pow(2, semitones / 12);
  }

  // 清理资源
  dispose() {
    this.loadedSamples.clear();
    this.instrumentPresets.clear();
    this.isLoading.clear();
  }
}
