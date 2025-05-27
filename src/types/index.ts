export type LanguageCode = 'en' | 'te';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  language: LanguageCode;
  audioDataUri?: string; 
  isPlayingAudio?: boolean;
}
