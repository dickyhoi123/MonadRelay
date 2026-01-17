'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, Music, Code, Download, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { useAccount, usePublicClient } from 'wagmi';
import { useGetTrackMusicData, useGetMasterInfo } from '@/lib/contract-hooks';
import { decodeJSONToTracks, encodedNoteToPianoNote, validateEncodedData } from '@/lib/music-encoder';
import { useAudioEngine } from '@/lib/audio-engine';
import { INSTRUMENT_PRESETS } from '@/components/piano-roll-new';

interface DecodedTrack {
  type: string;
  notes: {
    note: string;
    octave: number;
    startTime: number;
    duration: number;
    velocity: number;
    instrumentType: string;
  }[];
}

export default function NFTDecoder() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { getMusicData } = useGetTrackMusicData();
  const { getMasterInfo } = useGetMasterInfo();
  const audioEngine = useAudioEngine();

  const [tokenId, setTokenId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedData, setDecodedData] = useState<{
    bpm: number;
    totalSixteenthNotes: number;
    tracks: DecodedTrack[];
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDecode = async () => {
    if (!tokenId) {
      setError('Please enter a valid Token ID');
      return;
    }

    setLoading(true);
    setError(null);
    setDecodedData(null);

    try {
      const tokenIdNum = parseInt(tokenId);

      // 优先尝试从合约读取真实数据
      if (isConnected) {
        try {
          const musicData = await getMusicData(tokenIdNum);

          if (!musicData || !musicData.encodedTracks) {
            throw new Error('No music data found in this NFT');
          }

          // 验证数据有效性
          if (!validateEncodedData(musicData.encodedTracks)) {
            throw new Error('Invalid encoded music data');
          }

          // 解码 JSON 数据
          const decoded = decodeJSONToTracks(musicData.encodedTracks);

          if (!decoded) {
            throw new Error('Failed to decode music data');
          }

          // 转换为前端格式
          const tracks: DecodedTrack[] = Object.entries(decoded.tracks).map(([trackType, notes]) => ({
            type: trackType,
            notes: notes.map(encodedNoteToPianoNote)
          }));

          setDecodedData({
            bpm: musicData.bpm,
            totalSixteenthNotes: musicData.totalSixteenthNotes,
            tracks
          });

          showToast('success', `Successfully decoded NFT from contract (Token ID: ${tokenIdNum})`);
          setLoading(false);
          return;
        } catch (contractError: any) {
          console.warn('Contract read failed, trying local storage:', contractError);
          // 如果合约调用失败，继续尝试本地存储
        }
      }

      // 如果合约读取失败或未连接钱包，尝试从 localStorage 读取
      const mintedNFTs = JSON.parse(localStorage.getItem('mintedNFTs') || '[]');
      const nftData = mintedNFTs.find((nft: any) => nft.tokenId === tokenIdNum);

      if (nftData) {
        // 使用本地存储的模拟数据
        console.log('Using mock NFT data from local storage:', nftData);

        if (!validateEncodedData(nftData.encodedTracks)) {
          throw new Error('Invalid encoded music data');
        }

        // 解码 JSON 数据
        const decoded = decodeJSONToTracks(nftData.encodedTracks);

        if (!decoded) {
          throw new Error('Failed to decode music data');
        }

        // 转换为前端格式
        const tracks: DecodedTrack[] = Object.entries(decoded.tracks).map(([trackType, notes]) => ({
          type: trackType,
          notes: notes.map(encodedNoteToPianoNote)
        }));

        setDecodedData({
          bpm: nftData.bpm,
          totalSixteenthNotes: nftData.totalSixteenthNotes,
          tracks
        });

        showToast('info', `Decoded NFT from local storage (Token ID: ${tokenIdNum}). Connect wallet to use contract data.`);
      } else {
        // 两种方式都失败了
        throw new Error(`No NFT found with Token ID ${tokenIdNum}. Please connect your wallet and ensure the NFT exists on the Hardhat Local network.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to decode NFT');
      console.error('Decode error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!decodedData || !audioEngine) return;

    setIsPlaying(true);
    const bpm = decodedData.bpm;
    const secondsPerBeat = 60 / bpm;
    const secondsPer16th = secondsPerBeat / 4;

    // 播放所有音轨
    decodedData.tracks.forEach(track => {
      track.notes.forEach(note => {
        const startTime = note.startTime * secondsPer16th;
        const duration = note.duration * secondsPer16th;

        setTimeout(() => {
          // 根据音符的 instrumentType 播放
          const instrument = [...Object.values(INSTRUMENT_PRESETS).flat()].find(i => i.id === note.instrumentType);

          if (instrument) {
            if (instrument.category === 'drum') {
              // 播放鼓声
              playDrumSound(instrument.id, duration);
            } else if (instrument.category === 'vocal') {
              // 播放人声合唱
              const frequency = noteToFrequency(note.note, note.octave);
              playVocalSound(frequency, duration, instrument.oscillatorType || 'sine', note.velocity);
            } else {
              // 播放合成器音符
              const frequency = noteToFrequency(note.note, note.octave);
              audioEngine.playNote(frequency, duration, note.velocity, instrument.oscillatorType || 'sine');
            }
          } else {
            // 默认播放
            const frequency = noteToFrequency(note.note, note.octave);
            audioEngine.playNote(frequency, duration, note.velocity, 'sine');
          }
        }, startTime * 1000);
      });
    });

    // 播放完成后停止
    const totalDuration = decodedData.totalSixteenthNotes * secondsPer16th * 1000;
    setTimeout(() => {
      setIsPlaying(false);
      setCurrentBeat(0);
    }, totalDuration);
  };

  const playDrumSound = (type: string, duration: number) => {
    if (!audioEngine) return;
    const ctx = audioEngine.getAudioContext?.();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    switch (type) {
      case 'kick':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        break;
      case 'snare':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(180, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        break;
      case 'hihat':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        break;
      default:
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(100, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    }

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  };

  const playVocalSound = (frequency: number, duration: number, type: string, velocity: number) => {
    if (!audioEngine) return;
    const ctx = audioEngine.getAudioContext?.();
    if (!ctx) return;

    const numVoices = 3;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(velocity / 100 * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    for (let i = 0; i < numVoices; i++) {
      const oscillator = ctx.createOscillator();
      oscillator.type = type as any;
      const detune = (Math.random() - 0.5) * 10;
      oscillator.detune.setValueAtTime(detune, ctx.currentTime);
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.connect(gainNode);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    }

    gainNode.connect(ctx.destination);
  };

  const noteToFrequency = (note: string, octave: number): number => {
    const noteIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(note);
    return 440 * Math.pow(2, (octave - 4) + (noteIndex - 9) / 12);
  };

  const handleDownloadJSON = () => {
    if (!decodedData) return;

    const dataStr = JSON.stringify(decodedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nft-track-${tokenId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 pt-20 px-4">
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

      <div className="max-w-6xl mx-auto">
        {/* 顶部导航 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">NFT Audio Decoder</h1>
          <p className="text-slate-400">
            Decode music data from Track NFTs and play them back in your browser
          </p>
        </div>

        {/* 解码输入区 */}
        <Card className="bg-slate-900/50 border-slate-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-400" />
              Decode NFT
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter a Track NFT Token ID to decode its music data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-slate-300 mb-2 block">Track NFT Token ID</Label>
                <Input
                  type="number"
                  placeholder="Enter Token ID (e.g., 0, 1, 2...)"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  disabled={!isConnected}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleDecode}
                  disabled={!isConnected || loading || !tokenId}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Decoding...
                    </>
                  ) : (
                    <>
                      <Code className="h-4 w-4 mr-2" />
                      Decode
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!isConnected && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertDescription className="text-yellow-300">
                  Please connect your wallet to decode NFTs
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10 mb-6">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* 解码结果 */}
        {decodedData && (
          <Card className="bg-slate-900/50 border-slate-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Music className="h-5 w-5 text-purple-400" />
                Decoded Music Data
              </CardTitle>
              <CardDescription className="text-slate-400">
                BPM: {decodedData.bpm} • Total 16th Notes: {decodedData.totalSixteenthNotes} • {decodedData.tracks.length} Tracks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 播放控制 */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handlePlay}
                  disabled={isPlaying}
                  className="w-32 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-6 w-6" />
                    </>
                  ) : (
                    <>
                      <Play className="h-6 w-6 ml-1" />
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadJSON}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download JSON
                </Button>
              </div>

              {/* 音轨列表 */}
              <div className="space-y-4">
                {decodedData.tracks.map((track, idx) => (
                  <Card key={idx} className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center justify-between">
                        <span>{track.type} Track</span>
                        <span className="text-sm text-slate-400">{track.notes.length} notes</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="text-left py-2 px-3 text-slate-400 font-medium">Note</th>
                              <th className="text-left py-2 px-3 text-slate-400 font-medium">Start</th>
                              <th className="text-left py-2 px-3 text-slate-400 font-medium">Duration</th>
                              <th className="text-left py-2 px-3 text-slate-400 font-medium">Velocity</th>
                              <th className="text-left py-2 px-3 text-slate-400 font-medium">Instrument</th>
                            </tr>
                          </thead>
                          <tbody>
                            {track.notes.slice(0, 10).map((note, noteIdx) => (
                              <tr key={noteIdx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                <td className="py-2 px-3 text-white">{note.note}{note.octave}</td>
                                <td className="py-2 px-3 text-slate-300">{note.startTime}</td>
                                <td className="py-2 px-3 text-slate-300">{note.duration}</td>
                                <td className="py-2 px-3 text-slate-300">{note.velocity}</td>
                                <td className="py-2 px-3 text-slate-300">{note.instrumentType}</td>
                              </tr>
                            ))}
                            {track.notes.length > 10 && (
                              <tr>
                                <td colSpan={5} className="py-2 px-3 text-center text-slate-400">
                                  ...and {track.notes.length - 10} more notes
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 使用说明 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-400 space-y-2">
            <p>1. Enter a Track NFT Token ID (you can find this in your wallet or the Session page)</p>
            <p>2. Click "Decode" to fetch and decode the music data from the blockchain</p>
            <p>3. The decoded data includes all notes, timing, and instrument information</p>
            <p>4. Click "Play" to listen to the music directly in your browser</p>
            <p>5. Download the JSON file to save the decoded data</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
