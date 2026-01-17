'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Play, Pause, RotateCcw, Volume2, UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TrackType = 'Drum' | 'Bass' | 'Synth' | 'Vocal';

interface TrackUploaderProps {
  sessionId?: number;
  currentTrackType?: TrackType;
  onUploadComplete?: (trackId: string, ipfsHash: string) => void;
}

interface TrackData {
  id: string;
  type: TrackType;
  file: File;
  url: string;
  duration: number;
  volume: number;
}

const trackColors: Record<TrackType, string> = {
  Drum: 'bg-blue-500',
  Bass: 'bg-green-500',
  Synth: 'bg-purple-500',
  Vocal: 'bg-pink-500'
};

export function TrackUploader({ sessionId, currentTrackType = 'Drum', onUploadComplete }: TrackUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedTrackType, setSelectedTrackType] = useState<TrackType>(currentTrackType);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [masterVolume, setMasterVolume] = useState(80);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const url = URL.createObjectURL(file);
    
    const newTrack: TrackData = {
      id: Date.now().toString(),
      type: selectedTrackType,
      file,
      url,
      duration: 0,
      volume: 80
    };

    setTracks([...tracks, newTrack]);
    
    // Create audio element
    const audio = new Audio(url);
    audioRefs.current[newTrack.id] = audio;
    
    audio.addEventListener('loadedmetadata', () => {
      setTracks(prev => prev.map(t => 
        t.id === newTrack.id ? { ...t, duration: audio.duration } : t
      ));
    });

    audio.addEventListener('timeupdate', () => {
      if (isPlaying && audio === audioRefs.current[tracks[0]?.id]) {
        setCurrentTime(audio.currentTime);
      }
    });

    audio.addEventListener('ended', () => {
      if (isPlaying) {
        setIsPlaying(false);
      }
    });
  };

  const handleUpload = () => {
    if (tracks.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload to IPFS
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Simulate IPFS hash
          const ipfsHash = `Qm${Math.random().toString(16).slice(2)}...${Math.random().toString(16).slice(2)}`;
          const trackId = Math.random().toString(16).slice(2);
          
          onUploadComplete?.(trackId, ipfsHash);
          
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const togglePlay = () => {
    if (tracks.length === 0) return;

    if (isPlaying) {
      tracks.forEach(track => {
        audioRefs.current[track.id]?.pause();
      });
      setIsPlaying(false);
    } else {
      tracks.forEach(track => {
        const audio = audioRefs.current[track.id];
        if (audio) {
          audio.volume = (track.volume / 100) * (masterVolume / 100);
          audio.currentTime = currentTime;
          audio.play().catch(console.error);
        }
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    setCurrentTime(time);
    tracks.forEach(track => {
      const audio = audioRefs.current[track.id];
      if (audio) {
        audio.currentTime = time;
      }
    });
  };

  const handleTrackVolumeChange = (trackId: string, value: number[]) => {
    const volume = value[0];
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, volume } : t
    ));
    
    const audio = audioRefs.current[trackId];
    if (audio) {
      audio.volume = (volume / 100) * (masterVolume / 100);
    }
  };

  const removeTrack = (trackId: string) => {
    const audio = audioRefs.current[trackId];
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    delete audioRefs.current[trackId];
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (tracks.length === 1) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const resetPlayer = () => {
    tracks.forEach(track => {
      const audio = audioRefs.current[track.id];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maxDuration = Math.max(...tracks.map(t => t.duration), 0);

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Upload Track</CardTitle>
          <CardDescription className="text-slate-400">
            Upload your audio file to contribute to the session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 mb-2 block">Track Type</Label>
              <Select value={selectedTrackType} onValueChange={(value: TrackType) => setSelectedTrackType(value)}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="Drum">🥁 Drum</SelectItem>
                  <SelectItem value="Bass">🎸 Bass</SelectItem>
                  <SelectItem value="Synth">🎹 Synth</SelectItem>
                  <SelectItem value="Vocal">🎤 Vocal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Session ID</Label>
              <Input
                value={sessionId ? sessionId.toString() : ''}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-400"
              />
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
              id="track-upload"
            />
            <label htmlFor="track-upload" className="cursor-pointer">
              <UploadCloud className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 mb-1">
                Drop your audio file here or click to browse
              </p>
              <p className="text-sm text-slate-500">
                Supports MP3, WAV, OGG (Max 50MB)
              </p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Tracks List */}
      {tracks.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Your Tracks ({tracks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${trackColors[track.type]} flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">
                        {track.type[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{track.file.name}</p>
                      <p className="text-sm text-slate-400">
                        {formatTime(track.duration)} • {(track.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTrack(track.id)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    Remove
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Volume2 className="h-4 w-4 text-slate-400" />
                  <Slider
                    value={[track.volume]}
                    onValueChange={(value) => handleTrackVolumeChange(track.id, value)}
                    max={100}
                    className="flex-1"
                  />
                  <span className="text-sm text-slate-400 w-12">{track.volume}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Player Control */}
      {tracks.length > 0 && (
        <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900/50 border-purple-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-slate-500'}`} />
              Sync Playback
            </CardTitle>
            <CardDescription className="text-slate-400">
              All tracks play in perfect sync
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                onValueChange={handleSeek}
                max={maxDuration || 100}
                step={0.1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(maxDuration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={resetPlayer}
                className="border-slate-700 hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={togglePlay}
                className="w-14 h-14 bg-purple-600 hover:bg-purple-700 rounded-full"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </Button>
              <div className="flex items-center gap-2 w-32">
                <Volume2 className="h-4 w-4 text-slate-400" />
                <Slider
                  value={[masterVolume]}
                  onValueChange={(value) => {
                    setMasterVolume(value[0]);
                    tracks.forEach(track => {
                      const audio = audioRefs.current[track.id];
                      if (audio) {
                        audio.volume = (track.volume / 100) * (value[0] / 100);
                      }
                    });
                  }}
                  max={100}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Sync Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Synced playback active • All tracks aligned</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {tracks.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full bg-purple-600 hover:bg-purple-700 h-12"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Uploading to IPFS... {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              Upload Track & Commit to Session
            </>
          )}
        </Button>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-slate-900/50 border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Uploading to IPFS</span>
            <span className="text-sm text-purple-400">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Success Message */}
      {!isUploading && uploadProgress === 100 && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">Upload Complete!</p>
              <p className="text-sm text-slate-400">
                Track committed to Session #{sessionId}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ value, disabled, className }: { value: string; disabled?: boolean; className?: string }) {
  return (
    <input
      value={value}
      disabled={disabled}
      className={className}
      readOnly
    />
  );
}
