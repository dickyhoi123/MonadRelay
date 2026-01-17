/**
 * 音乐数据编码/解码工具
 * 用于将 tracks 数据编码为 NFT 存储的 JSON 格式，以及从 JSON 解码回 tracks
 */

import type { Track, AudioClip } from '@/components/music-editor';

// 音符数据结构（用于编码）
export interface EncodedNote {
  note: number;      // MIDI 音符编号 (C4 = 60)
  startTime: number; // 16分音符单位
  duration: number;  // 16分音符单位
  velocity: number;  // 力度 (0-100)
  instrumentId: string; // 乐器ID
}

// 编码的音轨数据结构
export interface EncodedTrackData {
  [trackType: string]: EncodedNote[];
}

// 完整的编码数据
export interface FullEncodedData {
  tracks: EncodedTrackData;
  bpm: number;
  totalSixteenthNotes: number;
}

/**
 * 将音符名称和八度转换为 MIDI 编号
 */
export function noteToMidiNumber(note: string, octave: number): number {
  const noteIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(note);
  if (noteIndex === -1) return 60; // 默认 C4
  return 12 * (octave + 1) + noteIndex;
}

/**
 * 将 MIDI 编号转换为音符名称和八度
 */
export function midiNumberToNote(midiNumber: number): { note: string; octave: number } {
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;
  const note = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][noteIndex];
  return { note, octave };
}

/**
 * 将 tracks 数据编码为 JSON 格式
 * @param tracks 音轨数组
 * @param bpm BPM
 * @param totalSixteenthNotes 总16分音符数
 * @returns 编码的 JSON 字符串
 */
export function encodeTracksToJSON(
  tracks: Track[],
  bpm: number,
  totalSixteenthNotes: number
): string {
  const encodedData: EncodedTrackData = {};

  tracks.forEach(track => {
    const notes: EncodedNote[] = [];

    track.clips.forEach(clip => {
      if (clip.pianoNotes && clip.pianoNotes.length > 0) {
        clip.pianoNotes.forEach(pianoNote => {
          notes.push({
            note: noteToMidiNumber(pianoNote.note, pianoNote.octave),
            startTime: pianoNote.startTime,
            duration: pianoNote.duration,
            velocity: pianoNote.velocity,
            instrumentId: pianoNote.instrumentType || `${track.type}-default`
          });
        });
      }
    });

    if (notes.length > 0) {
      encodedData[track.type] = notes;
    }
  });

  return JSON.stringify(encodedData);
}

/**
 * 从 JSON 解码回 tracks 数据
 * @param jsonString 编码的 JSON 字符串
 * @returns 解码后的数据
 */
export function decodeJSONToTracks(jsonString: string): {
  tracks: EncodedTrackData;
  bpm: number;
  totalSixteenthNotes: number;
} | null {
  try {
    const data = JSON.parse(jsonString);

    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid JSON format');
    }

    // 检查是否包含音轨数据
    const hasTrackData = ['Drum', 'Bass', 'Synth', 'Vocal'].some(trackType =>
      Array.isArray(data[trackType])
    );

    if (!hasTrackData) {
      throw new Error('No track data found');
    }

    return {
      tracks: data as EncodedTrackData,
      bpm: 120, // 默认 BPM，实际应该从 metadata 读取
      totalSixteenthNotes: 64 // 默认值
    };
  } catch (error) {
    console.error('Failed to decode JSON:', error);
    return null;
  }
}

/**
 * 将编码的音符转换为前端 PianoNote 格式
 */
export function encodedNoteToPianoNote(
  encodedNote: EncodedNote
): {
  note: string;
  octave: number;
  startTime: number;
  duration: number;
  velocity: number;
  instrumentType: string;
} {
  const { note, octave } = midiNumberToNote(encodedNote.note);

  return {
    note,
    octave,
    startTime: encodedNote.startTime,
    duration: encodedNote.duration,
    velocity: encodedNote.velocity,
    instrumentType: encodedNote.instrumentId
  };
}

/**
 * 验证编码数据的有效性
 * 期望格式: { "Drum": [{note, startTime, duration, velocity, instrumentId}], "Bass": [...] }
 */
export function validateEncodedData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);

    if (typeof data !== 'object' || data === null) {
      return false;
    }

    // 验证每个音轨的数据格式
    const validTrackTypes = ['Drum', 'Bass', 'Synth', 'Vocal'];
    let hasValidTrack = false;

    for (const trackType of Object.keys(data)) {
      if (!validTrackTypes.includes(trackType)) {
        continue; // 忽略未知的 track type
      }

      const notes = data[trackType];
      if (!Array.isArray(notes)) {
        return false;
      }

      if (notes.length > 0) {
        hasValidTrack = true;
      }

      // 验证每个音符的格式 (对象格式)
      for (const note of notes) {
        if (
          typeof note !== 'object' ||
          note === null ||
          typeof note.note !== 'number' || // MIDI 音符编号
          typeof note.startTime !== 'number' || // 16分音符单位
          typeof note.duration !== 'number' || // 16分音符单位
          typeof note.velocity !== 'number' || // 力度 (0-100)
          typeof note.instrumentId !== 'string' // 乐器ID
        ) {
          return false;
        }

        // 验证数值范围
        if (note.note < 0 || note.note > 127) return false; // MIDI 音符范围
        if (note.startTime < 0) return false; // startTime 不能为负
        if (note.duration <= 0) return false; // duration 必须大于 0
        if (note.velocity < 0 || note.velocity > 127) return false; // velocity 范围
      }
    }

    // 至少有一个有效的音轨
    return hasValidTrack;
  } catch (error) {
    return false;
  }
}

/**
 * 计算总16分音符数
 */
export function calculateTotalSixteenthNotes(tracks: Track[]): number {
  let maxEndTime = 0;

  tracks.forEach(track => {
    track.clips.forEach(clip => {
      if (clip.pianoNotes) {
        clip.pianoNotes.forEach(note => {
          const endTime = note.startTime + note.duration;
          if (endTime > maxEndTime) {
            maxEndTime = endTime;
          }
        });
      }
    });
  });

  return Math.ceil(maxEndTime);
}

/**
 * 获取音轨的音符统计
 */
export function getTrackStats(tracks: Track[]): {
  totalNotes: number;
  notesByType: { [trackType: string]: number };
  averageVelocity: number;
} {
  let totalNotes = 0;
  const notesByType: { [trackType: string]: number } = {};
  let totalVelocity = 0;

  tracks.forEach(track => {
    let trackNotes = 0;

    track.clips.forEach(clip => {
      if (clip.pianoNotes) {
        clip.pianoNotes.forEach(note => {
          trackNotes++;
          totalVelocity += note.velocity;
        });
      }
    });

    notesByType[track.type] = trackNotes;
    totalNotes += trackNotes;
  });

  return {
    totalNotes,
    notesByType,
    averageVelocity: totalNotes > 0 ? Math.round(totalVelocity / totalNotes) : 0
  };
}
