'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile, Paperclip, Plus, Search, Hash, Users, Settings, MoreVertical, Bell, Pin, Heart, Reply, X } from 'lucide-react';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  reactions?: { emoji: string; count: number; users: string[] }[];
  replyTo?: string;
  isPinned?: boolean;
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  unread?: number;
}

interface Member {
  id: string;
  name: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  avatar?: string;
  role?: 'owner' | 'admin' | 'mod' | 'member';
}

const statusColors = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-slate-500'
};

export function ChatRoom({ sessionId, sessionName }: { sessionId: number; sessionName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      userId: 'user1',
      userName: 'MusicMaster',
      content: 'Hey everyone! Welcome to the Neon Dreams session! 🎵',
      timestamp: new Date(Date.now() - 3600000 * 2),
      reactions: [{ emoji: '🎉', count: 3, users: ['user2', 'user3', 'user4'] }],
      isPinned: true
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'BassKing',
      content: 'Working on the bass line! Anyone finished the drums?',
      timestamp: new Date(Date.now() - 3600000 * 1.5),
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'DrumGod',
      content: 'Yeah! Just uploaded my drum track. Check it out! 🥁',
      timestamp: new Date(Date.now() - 3600000),
      reactions: [{ emoji: '🔥', count: 2, users: ['user2', 'user4'] }],
    },
    {
      id: '4',
      userId: 'user4',
      userName: 'SynthWizard',
      content: 'The drum track sounds amazing! I\'ll start working on the synth now 🎹',
      timestamp: new Date(Date.now() - 1800000),
    },
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [showMembers, setShowMembers] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const channels: Channel[] = [
    { id: 'general', name: 'general', type: 'text' },
    { id: 'collaboration', name: 'collaboration', type: 'text', unread: 2 },
    { id: 'feedback', name: 'feedback', type: 'text' },
    { id: 'voice-chat', name: 'voice-chat', type: 'voice' },
  ];

  const members: Member[] = [
    { id: 'user1', name: 'MusicMaster', status: 'online', role: 'owner' },
    { id: 'user2', name: 'BassKing', status: 'online', role: 'member' },
    { id: 'user3', name: 'DrumGod', status: 'idle', role: 'member' },
    { id: 'user4', name: 'SynthWizard', status: 'dnd', role: 'member' },
    { id: 'user5', name: 'VocalsQueen', status: 'offline', role: 'member' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      userId: 'currentUser',
      userName: 'You',
      content: newMessage,
      timestamp: new Date(),
      ...(replyTo && { replyTo })
    };

    setMessages([...messages, message]);
    setNewMessage('');
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatAddress = (userId: string) => {
    return userId.slice(0, 6) + userId.slice(-4);
  };

  const getAvatarColor = (userId: string) => {
    const colors = ['#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4'];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex h-[600px] bg-slate-900 rounded-lg overflow-hidden">
      {/* 服务器/频道侧边栏 */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* 服务器信息 */}
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Hash className="h-6 w-6 text-purple-500" />
            {sessionName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Session #{sessionId}</p>
        </div>

        {/* 频道列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Text Channels</h2>
            {channels.filter(c => c.type === 'text').map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                  selectedChannel === channel.id 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Hash className="h-4 w-4" />
                <span className="flex-1">{channel.name}</span>
                {channel.unread && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {channel.unread}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Voice Channels</h2>
            {channels.filter(c => c.type === 'voice').map((channel) => (
              <button
                key={channel.id}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                  selectedChannel === channel.id 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 用户信息 */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: getAvatarColor('currentUser') }}
            >
              YO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">You</p>
              <p className="text-xs text-slate-500 truncate">Online</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* 聊天头部 */}
        <div className="h-12 bg-slate-950 border-b border-slate-800 flex items-center px-4 gap-4">
          <Hash className="h-5 w-5 text-slate-400" />
          <h2 className="text-white font-semibold">{selectedChannel}</h2>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="text-slate-400">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400">
            <Pin className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMembers(!showMembers)}
            className="text-slate-400"
          >
            <Users className="h-5 w-5" />
          </Button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 固定消息 */}
          {messages.filter(m => m.isPinned).map((message) => (
            <div key={`pinned-${message.id}`} className="flex items-start gap-3 p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              <Pin className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{message.userName}</span>
                  <span className="text-xs text-slate-500">{formatTime(message.timestamp)}</span>
                  <span className="text-xs text-slate-500">• Pinned</span>
                </div>
                <p className="text-slate-300 text-sm">{message.content}</p>
              </div>
            </div>
          ))}

          {/* 普通消息 */}
          {messages.filter(m => !m.isPinned).map((message) => (
            <div key={message.id} className="flex items-start gap-3 group">
              {/* 头像 */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(message.userId) }}
              >
                {message.userName.slice(0, 2).toUpperCase()}
              </div>

              {/* 消息内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white hover:underline cursor-pointer">
                    {message.userName}
                  </span>
                  <span className="text-xs text-slate-500">{formatTime(message.timestamp)}</span>
                </div>
                
                {/* 回复引用 */}
                {message.replyTo && (
                  <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
                    <Reply className="h-3 w-3" />
                    <span>Replying to message</span>
                  </div>
                )}

                <p className="text-slate-200 break-words">{message.content}</p>

                {/* 反应 */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {message.reactions.map((reaction, idx) => (
                      <button
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-700 rounded-md text-sm transition-colors"
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-slate-400">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 消息操作 */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* 回复指示器 */}
        {replyTo && (
          <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Reply className="h-4 w-4" />
              <span>Replying to a message</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(null)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* 输入区域 */}
        <div className="p-4 bg-slate-950">
          <div className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
            <Button variant="ghost" size="icon" className="text-slate-400">
              <Plus className="h-5 w-5" />
            </Button>
            
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message #${selectedChannel}`}
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none"
            />
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-slate-400">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400">
                <Smile className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 成员列表 */}
      {showMembers && (
        <div className="w-56 bg-slate-950 border-l border-slate-800 p-4 overflow-y-auto flex-shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-4">
            Online — {members.filter(m => m.status !== 'offline').length}
          </h3>
          
          <div className="space-y-3">
            {members.filter(m => m.status !== 'offline').map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="relative">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getAvatarColor(member.id) }}
                  >
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${statusColors[member.status]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{member.name}</p>
                  {member.role === 'owner' && (
                    <p className="text-xs text-slate-500">Owner</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold text-slate-500 uppercase mt-6 mb-4">
            Offline — {members.filter(m => m.status === 'offline').length}
          </h3>
          
          <div className="space-y-3">
            {members.filter(m => m.status === 'offline').map((member) => (
              <div key={member.id} className="flex items-center gap-3 opacity-50">
                <div className="relative">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getAvatarColor(member.id) }}
                  >
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${statusColors[member.status]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{member.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
