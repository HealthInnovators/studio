
'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message, LanguageCode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useToast } from "@/hooks/use-toast";
import { voiceInputToText } from '@/ai/flows/voice-input-to-text';
import { textToSpeechOutput } from '@/ai/flows/text-to-speech-output';
import { generateChatResponse } from '@/ai/flows/generate-chat-response-flow'; // Added import
import { 
  detectLanguage, 
  getFaqResponse, 
  checkForPinCode, 
  checkPinCodeServiceability,
  defaultResponses,
  welcomeMessages
} from '@/lib/chat-logic';
import Image from 'next/image';

export default function AskTeRAPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState<LanguageCode>('en');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activePlayingAudioId, setActivePlayingAudioId] = useState<string | null>(null);

  const { toast } = useToast();
  const { isRecording, startRecording, stopRecording, error: recorderError } = useAudioRecorder();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);


  useEffect(() => {
    // Send initial welcome message from TeRA
    const welcomeLang = selectedVoiceLanguage; 
    const botMessage: Message = {
      id: Date.now().toString(),
      text: welcomeMessages[welcomeLang],
      isUser: false,
      timestamp: new Date().toISOString(),
      language: welcomeLang,
    };
    
    // Generate audio for welcome message
    generateAndSetAudio(botMessage); // This will also add the message to state
    
  }, []); 


  useEffect(() => {
    if (recorderError) {
      toast({
        title: "Voice Recording Error",
        description: recorderError,
        variant: "destructive",
      });
    }
  }, [recorderError, toast]);


  const generateAndSetAudio = async (message: Message) => {
     if (!message.isUser) {
      try {
        const ttsResult = await textToSpeechOutput({ text: message.text, language: message.language });
        // Add message to state first, then update with audioDataUri
        setMessages(prev => {
            const existingMessage = prev.find(m => m.id === message.id);
            if (existingMessage) {
                return prev.map(m => m.id === message.id ? {...m, audioDataUri: ttsResult.audioDataUri} : m);
            }
            return [...prev, {...message, audioDataUri: ttsResult.audioDataUri}];
        });
      } catch (error) {
        console.error("Error generating speech:", error);
        toast({ title: "Speech Generation Error", description: "Failed to generate audio for the bot's response.", variant: "destructive" });
         // Ensure message is added even if TTS fails
        setMessages(prev => {
            if (!prev.find(m => m.id === message.id)) {
                return [...prev, message];
            }
            return prev;
        });
      }
    } else {
       setMessages(prev => [...prev, message]);
    }
  }

  const addMessage = (text: string, isUser: boolean, language: LanguageCode): Message => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substring(2,9),
      text,
      isUser,
      timestamp: new Date().toISOString(),
      language,
    };
    // For bot messages, generateAndSetAudio will handle adding to messages state.
    // For user messages, they are added directly here.
    if (isUser) {
       setMessages(prev => [...prev, newMessage]);
    }
    return newMessage;
  };

  const handleSendMessage = async (textFromInput: string) => {
    if (!textFromInput.trim()) return;

    const userLang = detectLanguage(textFromInput);
    addMessage(textFromInput, true, userLang); // User message added here
    setInputValue('');
    setIsBotTyping(true);

    let botResponseText: string;
    let botResponseLang: LanguageCode = userLang;

    const pinCode = checkForPinCode(textFromInput);
    if (pinCode) {
      botResponseText = checkPinCodeServiceability(pinCode, userLang);
    } else {
      const faqResponse = getFaqResponse(textFromInput, userLang);
      if (faqResponse) {
        botResponseText = faqResponse;
      } else {
        // Call Genkit flow for general queries
        try {
          const chatResponse = await generateChatResponse({ text: textFromInput, language: userLang });
          if (chatResponse && chatResponse.responseText) {
            botResponseText = chatResponse.responseText;
          } else {
            botResponseText = defaultResponses[userLang]; // Fallback if Genkit returns no text
          }
        } catch (error) {
          console.error("Error generating chat response:", error);
          toast({ title: "AI Response Error", description: "Failed to get a response from the AI. Using default response.", variant: "destructive" });
          botResponseText = defaultResponses[userLang]; // Fallback on error
        }
      }
    }
    
    // Simulate bot thinking time if not using LLM, or short delay if LLM was fast.
    // If LLM call took time, this might be very short.
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const botMessage = { // Create bot message object, ID will be set by addMessage or generateAndSetAudio
      id: Date.now().toString() + '_bot_' + Math.random().toString(36).substring(2,9),
      text: botResponseText,
      isUser: false,
      timestamp: new Date().toISOString(),
      language: botResponseLang,
    };
    
    await generateAndSetAudio(botMessage); // This will add the message to state and generate audio.

    setIsBotTyping(false);
  };

  const handleStopRecording = async () => {
    setIsTranscribing(true);
    const audioDataUri = await stopRecording();
    if (audioDataUri) {
      try {
        const transcriptionResult = await voiceInputToText({ audioDataUri, language: selectedVoiceLanguage });
        setInputValue(transcriptionResult.transcription); 
        // Optional: automatically send message after transcription
        // await handleSendMessage(transcriptionResult.transcription);
      } catch (err) {
        console.error("Error transcribing audio:", err);
        toast({ title: "Transcription Error", description: "Could not transcribe audio. Please try again.", variant: "destructive" });
      }
    }
    setIsTranscribing(false);
    return audioDataUri;
  };
  
  const playAudioForMessage = (messageId: string, play: boolean) => {
    setMessages(prev => prev.map(m => m.id === messageId ? {...m, isPlayingAudio: play} : {...m, isPlayingAudio: false}));
  };

  const handlePlayAudio = (audioDataUri: string, language: LanguageCode, messageId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    playAudioForMessage(messageId, true);
    setActivePlayingAudioId(messageId);

    if (audioDataUri.startsWith('data:audio')) {
      audioRef.current = new Audio(audioDataUri);
      audioRef.current.play()
        .catch(e => {
          console.error("Error playing audio:", e);
          toast({ title: "Playback Error", description: "Could not play audio.", variant: "destructive" });
          playAudioForMessage(messageId, false);
          setActivePlayingAudioId(null);
        });
      audioRef.current.onended = () => {
        playAudioForMessage(messageId, false);
        setActivePlayingAudioId(null);
      };
    } else if (audioDataUri.startsWith('data:text/plain')) { 
        const textToSpeak = decodeURIComponent(audioDataUri.split(',')[1]);
        speechSynthesisRef.current = new SpeechSynthesisUtterance(textToSpeak);
        speechSynthesisRef.current.lang = language === 'te' ? 'te-IN' : 'en-US';
        speechSynthesisRef.current.onend = () => {
            playAudioForMessage(messageId, false);
            setActivePlayingAudioId(null);
        };
        speechSynthesisRef.current.onerror = (e) => {
            console.error("Speech synthesis error:", e);
            toast({ title: "Speech Error", description: "Could not speak the response.", variant: "destructive" });
            playAudioForMessage(messageId, false);
            setActivePlayingAudioId(null);
        };
        window.speechSynthesis.speak(speechSynthesisRef.current);
    } else {
        console.warn("Unsupported audioDataUri format:", audioDataUri);
        toast({ title: "Playback Error", description: "Unsupported audio format.", variant: "warning" });
        playAudioForMessage(messageId, false);
        setActivePlayingAudioId(null);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl h-[calc(100vh-40px)] md:h-[700px] shadow-2xl flex flex-col rounded-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-4">
          <div className="flex items-center space-x-3">
            <Image src="https://placehold.co/40x40.png" alt="TeRA Logo" width={40} height={40} className="rounded-full" data-ai-hint="logo letter T" />
            <CardTitle className="text-xl font-semibold">Ask TeRA</CardTitle>
          </div>
        </CardHeader>
        <ChatWindow 
            messages={messages.map(m => ({...m, isPlayingAudio: m.id === activePlayingAudioId && m.isPlayingAudio }))} 
            isBotTyping={isBotTyping} 
            onPlayAudio={(uri, lang, messageId) => { // Ensure messageId is passed from MessageBubble
                if(messageId) handlePlayAudio(uri, lang, messageId);
            }}
        />
        <ChatInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={handleStopRecording}
          selectedVoiceLanguage={selectedVoiceLanguage}
          onVoiceLanguageChange={setSelectedVoiceLanguage}
          isProcessing={isBotTyping}
          isTranscribing={isTranscribing}
        />
      </Card>
    </div>
  );
}
