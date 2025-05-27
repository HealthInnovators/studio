'use client';

import type { LanguageCode } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, SendHorizontal, Square, Loader2 } from 'lucide-react';
import { LanguageToggle } from './LanguageToggle';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';


interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (text: string) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => Promise<string | null>;
  selectedVoiceLanguage: LanguageCode;
  onVoiceLanguageChange: (lang: LanguageCode) => void;
  isProcessing: boolean; // True if bot is typing or voice is processing
  isTranscribing: boolean;
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSendMessage,
  isRecording,
  onStartRecording,
  onStopRecording,
  selectedVoiceLanguage,
  onVoiceLanguageChange,
  isProcessing,
  isTranscribing,
}: ChatInputProps) {
  const { toast } = useToast();

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      const audioDataUri = await onStopRecording();
      if (audioDataUri) {
        // The main page will handle transcription and then call onSendMessage
      } else {
        // Error handled by useAudioRecorder hook and displayed via toast in page.tsx
      }
    } else {
      onStartRecording();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 md:p-4 border-t bg-background">
      <div className="flex items-center space-x-2 mb-2">
        <LanguageToggle 
          selectedLanguage={selectedVoiceLanguage} 
          onLanguageChange={onVoiceLanguageChange}
          disabled={isRecording || isProcessing}
        />
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleVoiceRecord} 
          disabled={isProcessing || isTranscribing}
          className="h-9 w-9"
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <Square size={20} className="text-destructive" /> : isTranscribing ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <Textarea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message or use the mic..."
          className="flex-grow resize-none rounded-xl p-3 pr-12 min-h-[40px] max-h-[120px] text-base"
          rows={1}
          disabled={isProcessing || isRecording || isTranscribing}
        />
        <Button 
          size="icon" 
          onClick={handleSend} 
          disabled={!inputValue.trim() || isProcessing || isRecording || isTranscribing}
          className="h-10 w-10 rounded-full shrink-0"
          aria-label="Send message"
        >
          {isProcessing && !isRecording && !isTranscribing ? <Loader2 size={20} className="animate-spin" /> : <SendHorizontal size={20} />}
        </Button>
      </div>
    </div>
  );
}
