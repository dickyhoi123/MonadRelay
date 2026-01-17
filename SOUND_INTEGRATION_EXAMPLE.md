# 音色系统集成示例

## 概述

本文档展示如何在钢琴帘和音乐编辑器中集成和使用音色库系统。

## 步骤1：初始化音色库

在应用启动时初始化音色库，并预加载常用乐器。

### 在 HomePage 中初始化

```typescript
// src/app/page.tsx

import { useAudioEngine } from '@/lib/audio-engine';

function HomePage() {
  const audioEngine = useAudioEngine();

  useEffect(() => {
    // 初始化音色库
    const soundLibrary = audioEngine?.initializeSoundLibrary();

    if (soundLibrary) {
      // 预加载常用乐器
      Promise.all([
        soundLibrary.loadInstrument('guitar'),
        soundLibrary.loadInstrument('drum'),
        soundLibrary.loadInstrument('bass')
      ]).then(() => {
        console.log('✅ 音色库加载完成');
      }).catch((error) => {
        console.error('❌ 音色库加载失败:', error);
      });
    }
  }, [audioEngine]);

  // ... 其他代码
}
```

## 步骤2：在钢琴帘中使用音色

更新`piano-roll-new.tsx`中的播放逻辑，使用新的音色系统。

### 替换现有的 playNoteSound 函数

```typescript
// src/components/piano-roll-new.tsx

import { InstrumentType, NoteName } from '@/lib/sound-library';

const playNoteSound = useCallback(async (note: PianoNote) => {
  if (!audioEngine) return;

  // 使用新的音色库系统
  const instrumentType = mapTrackTypeToInstrument(note.instrumentType);

  await audioEngine.playInstrumentNote(
    instrumentType,
    note.note as NoteName,
    note.octave,
    note.duration * (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT, // 转换为秒
    note.velocity
  );
}, [audioEngine]);

// 将轨道类型映射到乐器类型
function mapTrackTypeToInstrument(instrumentType: string): InstrumentType {
  const mapping: Record<string, InstrumentType> = {
    'sine': 'synth',
    'square': 'synth',
    'sawtooth': 'synth',
    'triangle': 'synth',
    'kick': 'drum',
    'snare': 'drum',
    'hihat': 'drum',
    'tom': 'drum',
    'crash': 'drum',
    'male-chorus': 'vocal',
    'female-chorus': 'vocal',
    'children-chorus': 'vocal',
    'ensemble': 'vocal',
    'sub-bass': 'bass',
    'sine-bass': 'bass',
    'saw-bass': 'bass',
    'square-bass': 'bass'
  };

  return mapping[instrumentType] || 'synth';
}
```

### 在音轨类型中映射乐器

```typescript
// 根据轨道类型确定乐器
function getInstrumentForTrack(trackType: string): InstrumentType {
  switch (trackType) {
    case 'Drum':
      return 'drum';
    case 'Bass':
      return 'bass';
    case 'Synth':
      return 'synth';
    case 'Vocal':
      return 'vocal';
    default:
      return 'synth';
  }
}
```

## 步骤3：在音乐编辑器中使用音色

更新`music-editor.tsx`中的播放逻辑。

### 替换播放钢琴音符的逻辑

```typescript
// src/components/music-editor.tsx

// 播放钢琴音符
pianoNotesToPlay.forEach(({ note, track }) => {
  const instrumentType = getInstrumentForTrack(track.type);
  const absoluteStartTimeInBeats = clip.startTime + note.startTime / 4;
  const delay = (absoluteStartTimeInBeats - position) * 0.5; // 0.5秒/拍

  if (delay >= 0) {
    setTimeout(async () => {
      await audioEngine?.playInstrumentNote(
        instrumentType,
        note.note as NoteName,
        note.octave,
        note.duration * 0.125, // 每个16分音符0.125秒
        note.velocity * (track.volume / 100) // 考虑轨道音量
      );
    }, delay * 1000);
  }
});
```

## 步骤4：添加音色选择UI

在钢琴帘中添加音色选择器，让用户可以切换不同的音色。

```typescript
// 在 PianoRollNew 组件中添加

const [selectedInstrumentType, setSelectedInstrumentType] = useState<InstrumentType>('synth');

const instrumentOptions = [
  { value: 'guitar' as InstrumentType, label: '🎸 电吉他', source: 'Shreddage' },
  { value: 'drum' as InstrumentType, label: '🥁 鼓组', source: 'Cymatics' },
  { value: 'bass' as InstrumentType, label: '🎸 贝斯', source: 'Bass City' },
  { value: 'synth' as InstrumentType, label: '🎹 合成器', source: 'Web Audio' },
  { value: 'vocal' as InstrumentType, label: '🎤 人声', source: 'Web Audio' }
];

// 在UI中渲染音色选择器
<div className="flex items-center gap-2">
  <label className="text-sm text-slate-300">音色:</label>
  <Select value={selectedInstrumentType} onValueChange={setSelectedInstrumentType}>
    <SelectTrigger className="w-48">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {instrumentOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
          <span className="text-xs text-slate-400 ml-2">({option.source})</span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

## 步骤5：处理音色加载状态

添加加载指示器，显示音色加载进度。

```typescript
const [loadingInstruments, setLoadingInstruments] = useState<Set<InstrumentType>>(new Set());

const handleInstrumentLoad = async (instrument: InstrumentType) => {
  const soundLibrary = audioEngine?.getSoundLibrary();
  if (!soundLibrary) return;

  setLoadingInstruments(prev => new Set([...prev, instrument]));

  try {
    await soundLibrary.loadInstrument(instrument);
    console.log(`✅ ${instrument} 加载完成`);
  } catch (error) {
    console.error(`❌ ${instrument} 加载失败:`, error);
  } finally {
    setLoadingInstruments(prev => {
      const next = new Set(prev);
      next.delete(instrument);
      return next;
    });
  }
};

// 在UI中显示加载状态
{loadingInstruments.has(selectedInstrumentType) && (
  <div className="flex items-center gap-2 text-sm text-purple-400">
    <div className="w-4 h-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
    加载音色中...
  </div>
)}
```

## 完整示例：播放按钮

```typescript
const handlePlay = async () => {
  if (isPlaying) {
    // 停止播放
    setIsPlaying(false);
    audioEngine?.stopAll();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    return;
  }

  // 开始播放
  setIsPlaying(true);
  playStartTimeRef.current = Date.now();
  playStartSixteenthRef.current = currentPosition;
  playedNotes.current.clear();
  lastCheckedPositionRef.current = currentPosition;

  // 确保音色库已初始化
  const soundLibrary = audioEngine?.initializeSoundLibrary();
  if (!soundLibrary) {
    console.error('音色库未初始化');
    return;
  }

  // 预加载当前乐器
  const instrumentType = getInstrumentForTrack(trackType);
  await soundLibrary.loadInstrument(instrumentType);

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
          // 使用新的音色库播放
          audioEngine?.playInstrumentNote(
            instrumentType,
            note.note as NoteName,
            note.octave,
            note.duration * (60 / BPM) / SIXTEENTH_NOTES_PER_BEAT,
            note.velocity
          );
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
```

## 测试清单

使用以下清单验证音色系统是否正常工作：

- [ ] 应用启动时，音色库成功初始化
- [ ] 电吉他音色（C3-B5）播放正常，音色统一
- [ ] 鼓组音色（底鼓、军鼓、镲片）播放正常
- [ ] 贝斯音色（C1-C3）播放正常，音色统一
- [ ] 合成器音色播放正常
- [ ] 人声音色播放正常
- [ ] 音高准确（C3播放的是C3的音高）
- [ ] 时值精确（1秒的音符播放1秒）
- [ ] 音量控制正常
- [ ] 多音符同时播放正常
- [ ] 加载状态显示正常

## 性能监控

添加性能监控，确保音色系统不会影响应用性能。

```typescript
// 在开发环境中监控加载时间
const loadStartTime = Date.now();
await soundLibrary.loadInstrument('guitar');
const loadTime = Date.now() - loadStartTime;

console.log(`🎸 电吉他加载耗时: ${loadTime}ms`);

// 监控内存使用
const audioBuffers = soundLibrary['loadedSamples'];
console.log(`📊 已加载音频缓冲: ${audioBuffers.size}个`);
```

## 故障排除

### 问题：音色加载失败

**症状**：音色播放使用的是合成器而非真实采样

**解决方案**：
1. 检查对象存储URL是否可访问
2. 检查文件是否存在
3. 检查CORS配置
4. 查看浏览器控制台错误

### 问题：音高不准确

**症状**：播放C3时听起来不是C3

**解决方案**：
1. 检查音色文件命名是否正确（C3.wav）
2. 使用音频软件验证文件内容
3. 检查noteToFrequency函数计算

### 问题：音色割裂感

**症状**：不同音符听起来音色不一致

**解决方案**：
1. 确认使用同一音色库
2. 检查音色文件来源是否一致
3. 确保所有音符使用相同的采样参数

## 下一步

1. **上传真实音色文件**：将高质量的音色文件上传到对象存储
2. **配置URL**：更新`sound-library.ts`中的URL配置
3. **测试**：全面测试所有乐器的音色
4. **优化**：根据使用情况优化加载策略
5. **扩展**：添加更多乐器和音色

## 参考资源

- 音色库文档：`SOUND_LIBRARY_GUIDE.md`
- 音频引擎代码：`src/lib/audio-engine.ts`
- 音色库代码：`src/lib/sound-library.ts`
- Web Audio API：https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
