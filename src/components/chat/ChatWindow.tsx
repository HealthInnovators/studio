
'use client';

import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  isBotTyping: boolean;
  onPlayAudio: (audioDataUri: string, language: 'en' | 'te', messageId: string) => void;
}

export function ChatWindow({ messages, isBotTyping, onPlayAudio }: ChatWindowProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isBotTyping]);

  return (
    <ScrollArea className="flex-grow h-[calc(100%-140px)] p-4 md:p-6" viewportRef={viewportRef} ref={scrollAreaRef}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onPlayAudio={onPlayAudio} />
      ))}
      {isBotTyping && (
        <div className="flex items-center space-x-2 my-3 justify-start">
           <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
             <Loader2 size={18} className="animate-spin" />
           </div>
          <div className="max-w-[70%] rounded-xl px-4 py-3 shadow-md bg-card text-card-foreground rounded-bl-none border">
            <p className="text-sm italic text-muted-foreground">TeRA is typing...</p>
          </div>
        </div>
      )}
    </ScrollArea>
  );
}
