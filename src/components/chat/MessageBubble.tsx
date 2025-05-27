'use client';

import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bot, User, Volume2, Loader2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onPlayAudio: (audioDataUri: string, language: 'en' | 'te') => void;
}

export function MessageBubble({ message, onPlayAudio }: MessageBubbleProps) {
  const { text, isUser, timestamp, language, audioDataUri, isPlayingAudio } = message;

  const handlePlayAudio = () => {
    if (audioDataUri) {
      onPlayAudio(audioDataUri, language);
    }
  };

  return (
    <div className={cn('flex items-end space-x-2 my-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
          <AvatarFallback><Bot size={18} /></AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-xl px-4 py-3 shadow-md break-words',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card text-card-foreground rounded-bl-none border'
        )}
      >
        <p className="text-sm">{text}</p>
        <div className={cn("text-xs mt-1.5 flex items-center", isUser ? "text-primary-foreground/70 justify-end" : "text-muted-foreground justify-between")}>
          <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {!isUser && audioDataUri && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-2 p-0 text-muted-foreground hover:text-accent-foreground"
              onClick={handlePlayAudio}
              disabled={isPlayingAudio}
              aria-label={isPlayingAudio ? "Playing audio" : "Play audio"}
            >
              {isPlayingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 size={16} />}
            </Button>
          )}
        </div>
      </div>
      {isUser && (
         <Avatar className="h-8 w-8 bg-accent text-accent-foreground">
          <AvatarFallback><User size={18} /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
