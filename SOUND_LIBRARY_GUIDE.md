# 音色库使用指南

## 概述

本项目的音色库系统实现了专业的乐器音色管理，确保音色准确、音高正确、时值精确，并且同一乐器使用统一音源。

## 核心特性

### 1. 音色准确性保证
- **统一音源**：同一乐器的所有音符都使用同一音源库，确保音色一致性
- **按音高分类**：每个音符（如C3、C4、C5）都有对应的采样文件
- **专业音色**：基于知名音色库（Shreddage、Cymatics、Bass City等）

### 2. 音高精确性
- **真实采样**：使用真实录制的乐器采样，而非简单的频率合成
- **标准调音**：A4 = 440Hz标准调音
- **全音域覆盖**：电吉他C3-B5（3个八度），贝斯C1-C3等

### 3. 时值精确性
- **AudioBuffer精确播放**：使用Web Audio API的AudioBuffer精确控制播放时长
- **ADSR包络**：支持Attack、Decay、Sustain、Release包络控制
- **循环播放**：对于长音符，支持循环播放机制

## 系统架构

```
音色库系统
├── SoundLibrary（音色库管理）
│   ├── InstrumentPreset（乐器预设）
│   │   ├── guitar（电吉他）
│   │   ├── drum（鼓组）
│   │   ├── bass（贝斯）
│   │   ├── synth（合成器）
│   │   └── vocal（人声）
│   ├── SoundSample（音色样本）
│   └── loadedSamples（已加载的音频缓冲）
└── AudioEngine（音频引擎）
    └── playInstrumentNote（播放音符）
```

## 乐器配置

### 1. 电吉他（Shreddage 3 Stratus Free）
- **音域**：C3-B5（3个八度）
- **音源**：专业虚拟吉他，每音24+采样
- **特色**：支持手掌闷音、颤音等20+演奏技巧
- **采样格式**：WAV 44.1kHz/24bit

### 2. 鼓组（Cymatics）
- **鼓件**：底鼓、军鼓、镲片、通鼓等
- **音源**：Future Bass Starter Pack + 808鼓组
- **特色**：每个鼓件单独采样，多力度分层
- **采样格式**：WAV 44.1kHz/24bit

### 3. 贝斯（Bass City）
- **音域**：C1-C3（3个八度）
- **音源**：Yamaha TX81Z经典合成器
- **特色**：肥厚贝斯线条，适合电子/EDM风格
- **采样格式**：WAV 44.1kHz/24bit

### 4. 合成器（Web Audio API）
- **音域**：C3-C6（4个八度）
- **音源**：Web Audio API实时合成
- **特色**：经典模拟合成器音色，可调参数
- **波形**：正弦波、方波、锯齿波、三角波

### 5. 人声（Web Audio API）
- **音域**：C3-C5（3个八度）
- **音源**：Web Audio API实时合成
- **特色**：人声合唱效果，带ADSR包络
- **波形**：正弦波+合唱效果

## 使用方法

### 基本使用

```typescript
import { useAudioEngine } from '@/lib/audio-engine';

function PianoRoll() {
  const audioEngine = useAudioEngine();

  // 初始化音色库
  useEffect(() => {
    const soundLibrary = audioEngine?.initializeSoundLibrary();
    // 预加载乐器
    soundLibrary?.loadInstrument('guitar');
  }, [audioEngine]);

  // 播放音符
  const handlePlayNote = async (note: string, octave: number) => {
    await audioEngine?.playInstrumentNote(
      'guitar',      // 乐器类型
      'C',           // 音符名
      4,             // 八度
      0.5,           // 时长（秒）
      0.8            // 音量（0-1）
    );
  };
}
```

### 预加载乐器

```typescript
// 在应用启动时预加载所有乐器
useEffect(() => {
  const soundLibrary = audioEngine?.initializeSoundLibrary();
  if (soundLibrary) {
    // 预加载所有乐器
    Promise.all([
      soundLibrary.loadInstrument('guitar'),
      soundLibrary.loadInstrument('drum'),
      soundLibrary.loadInstrument('bass')
    ]).then(() => {
      console.log('所有乐器已加载完成');
    });
  }
}, []);
```

### 获取乐器信息

```typescript
const soundLibrary = audioEngine?.getSoundLibrary();
const guitarPreset = soundLibrary?.getInstrumentPreset('guitar');

console.log(guitarPreset?.name);  // "Shreddage Electric Guitar"
console.log(guitarPreset?.source); // "Shreddage 3 Stratus Free"
console.log(guitarPreset?.samples.size); // 36个音符
```

## 音色文件存储方案

### 方案1：对象存储（推荐）

使用对象存储服务存储音色文件，结构如下：

```
bucket/
└── instruments/
    ├── guitar/
    │   └── shreddage/
    │       ├── C3.wav
    │       ├── C#3.wav
    │       ├── D3.wav
    │       ├── ...
    │       └── B5.wav
    ├── drums/
    │   ├── kick.wav
    │   ├── snare.wav
    │   ├── hihat.wav
    │   └── ...
    └── bass/
        └── bass-city/
            ├── C1.wav
            ├── C#1.wav
            ├── ...
            └── C3.wav
```

### 方案2：本地资源（开发环境）

将音色文件放在`public/sounds/`目录：

```
public/
└── sounds/
    └── instruments/
        ├── guitar/
        ├── drums/
        └── bass/
```

然后修改`sound-library.ts`中的URL配置。

## 音色文件获取指南

### 推荐音色库

#### 电吉他
1. **Shreddage 3 Stratus Free**（推荐）
   - 链接：https://itbblog.com/shreddage-3-stratus-free
   - 优势：专业级虚拟吉他，3个八度，每音24+采样
   - 格式：Kontakt（可导出为WAV）

2. **Splice Sounds**
   - 链接：https://splice.com/sounds/tags/electric%20guitar/samples
   - 优势：45,000+电吉他采样，按音高分类
   - 格式：WAV 44.1kHz/24bit

#### 鼓组
1. **Cymatics**（推荐）
   - 链接：https://cymatics.fm/products/future-bass-starter-pack
   - 优势：200+高质量鼓采样
   - 格式：WAV 44.1kHz/24bit

2. **99Sounds**
   - 链接：https://99sounds.org/free-drum-samples/
   - 优势：免费高质量鼓采样
   - 格式：WAV 44.1kHz/24bit

#### 贝斯
1. **Bass City**（推荐）
   - 链接：https://99sounds.org/bass-city/
   - 优势：399个合成贝斯采样，使用Yamaha TX81Z
   - 格式：WAV/ kontakt

2. **SampleRadar**
   - 链接：https://www.musicradar.com/news/tech/sampleradar-392-free-bass-guitar-samples
   - 优势：392个贝斯采样，全音域覆盖
   - 格式：WAV 44.1kHz/24bit

### 文件下载与准备

1. **下载音色包**：从推荐网站下载免费的音色包
2. **提取采样**：解压并找到按音高命名的采样文件
3. **统一命名**：确保文件名格式为`{note}{octave}.wav`（如C3.wav、C#4.wav）
4. **上传到对象存储**：将文件上传到对应的目录结构
5. **更新URL配置**：修改`sound-library.ts`中的URL模板

### 音色文件命名规范

```
标准命名格式：{note}{octave}.{format}

示例：
- C3.wav（C音，第3八度）
- C#3.wav（C#音，第3八度）
- D3.wav（D音，第3八度）
- ...
- B5.wav（B音，第5八度）

鼓组命名：
- kick.wav（底鼓）
- snare.wav（军鼓）
- hihat.wav（踩镲）
- tom1.wav（通鼓1）
- tom2.wav（通鼓2）
- crash.wav（崩镲）
- ride.wav（叮叮镲）
```

## 性能优化

### 1. 懒加载
- 按需加载乐器，只在第一次使用时加载
- 使用`isLoading`标记避免重复加载

### 2. 预加载
- 在应用启动时预加载常用乐器
- 使用`Promise.all`并行加载多个乐器

### 3. 缓存管理
- 已加载的样本缓存在`loadedSamples` Map中
- 避免重复解码相同的音频文件

### 4. 内存管理
- 在不需要时调用`dispose()`释放资源
- 清理不再使用的AudioBuffer

## 故障排除

### 问题1：音色听起来不对
- **检查**：确认音色文件URL是否正确
- **检查**：确认音色文件格式为WAV 44.1kHz/24bit
- **解决**：使用音频编辑软件验证音色文件内容

### 问题2：音高不准确
- **检查**：确认文件命名符合标准格式
- **检查**：确认音色文件确实是对应音符的采样
- **解决**：使用调音软件验证音高

### 问题3：音色加载失败
- **检查**：确认对象存储URL可访问
- **检查**：确认CORS配置正确
- **解决**：回退到合成器模式（自动）

## 最佳实践

1. **统一音源**：同一乐器始终使用同一音色库
2. **高质量采样**：使用WAV 44.1kHz/24bit格式
3. **预加载**：在应用启动时预加载常用乐器
4. **音量平衡**：根据乐器类型调整默认音量
5. **资源管理**：及时清理不再使用的资源

## 未来扩展

- [ ] 支持更多乐器（钢琴、小提琴、萨克斯等）
- [ ] 支持自定义音色上传
- [ ] 支持音色效果器（混响、延迟、失真等）
- [ ] 支持MIDI输入
- [ ] 支持音频导出
- [ ] 支持音色包市场

## 技术支持

如有问题，请查看：
- 代码注释：`src/lib/sound-library.ts`
- 使用示例：`src/components/piano-roll-new.tsx`
- 音频API文档：https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
