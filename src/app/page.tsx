
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
import { generateChatResponse } from '@/ai/flows/generate-chat-response-flow';
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
  
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [teluguVoiceWarningShown, setTeluguVoiceWarningShown] = useState(false);

  const { toast } = useToast();
  const { isRecording, startRecording, stopRecording, error: recorderError } = useAudioRecorder();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Use a local variable for utterance to ensure a new one is created each time.
  // The ref can be used to cancel if needed, but direct creation is cleaner for speaking.
  // const speechSynthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadAndSetVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setBrowserVoices(voices);
        }
        // If voices is empty, onvoiceschanged should ideally fire when they are ready.
        // If it never fires or browser has no voices, browserVoices will remain empty.
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // onvoiceschanged is the most reliable event for when voices are ready or change.
      window.speechSynthesis.onvoiceschanged = loadAndSetVoices;
      // Attempt to load them immediately as well, as some browsers might have them ready.
      loadAndSetVoices();
    }
    
    // Send initial welcome message from TeRA
    const welcomeLang = selectedVoiceLanguage; 
    const botMessage: Message = {
      id: Date.now().toString() + '_welcome',
      text: welcomeMessages[welcomeLang],
      isUser: false,
      timestamp: new Date().toISOString(),
      language: welcomeLang,
    };
    
    // Don't auto-add to messages here, generateAndSetAudio will do it
    // setMessages([botMessage]); 
    generateAndSetAudio(botMessage); // This will add the message after attempting TTS
    
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null; // Cleanup
        window.speechSynthesis.cancel(); // Cancel any ongoing speech on unmount
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Welcome message effect runs once on mount.


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
        // Ensure message is added to state before attempting to update it with audioDataUri
        setMessages(prev => {
            if (!prev.find(m => m.id === message.id)) { // If message not already present
                return [...prev, {...message, audioDataUri: ttsResult.audioDataUri}];
            }
            // If message was already added (e.g. optimistic update), update it
            return prev.map(m => m.id === message.id ? {...m, audioDataUri: ttsResult.audioDataUri} : m);
        });
      } catch (error) {
        console.error("Error generating speech:", error);
        toast({ title: "Speech Generation Error", description: "Failed to generate audio for the bot's response.", variant: "destructive" });
        setMessages(prev => { // Ensure message is added even if TTS fails
            if (!prev.find(m => m.id === message.id)) {
                return [...prev, message];
            }
            return prev;
        });
      }
    } else { // For user messages, just add to state
       setMessages(prev => {
         if (!prev.find(m => m.id === message.id)) {
           return [...prev, message];
         }
         return prev;
       });
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
    // For user messages, add them immediately. Bot messages are handled by generateAndSetAudio.
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
        try {
          const chatResponse = await generateChatResponse({ text: textFromInput, language: userLang });
          if (chatResponse && chatResponse.responseText) {
            botResponseText = chatResponse.responseText;
          } else {
            botResponseText = defaultResponses[userLang]; 
          }
        } catch (error) {
          console.error("Error generating chat response:", error);
          toast({ title: "AI Response Error", description: "Failed to get a response from the AI. Using default response.", variant: "destructive" });
          botResponseText = defaultResponses[userLang];
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300)); // Simulate thinking

    const botMessage = { 
      id: Date.now().toString() + '_bot_' + Math.random().toString(36).substring(2,9),
      text: botResponseText,
      isUser: false,
      timestamp: new Date().toISOString(),
      language: botResponseLang,
    };
    
    // Bot message will be added to state by generateAndSetAudio
    await generateAndSetAudio(botMessage);

    setIsBotTyping(false);
  };

  const handleStopRecording = async () => {
    setIsTranscribing(true);
    const audioDataUri = await stopRecording();
    if (audioDataUri) {
      try {
        const transcriptionResult = await voiceInputToText({ audioDataUri, language: selectedVoiceLanguage });
        setInputValue(transcriptionResult.transcription); 
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
        window.speechSynthesis.cancel(); // Cancel any previous speech
    }

    playAudioForMessage(messageId, true);
    setActivePlayingAudioId(messageId);

    if (audioDataUri.startsWith('data:audio')) { // For actual server-generated audio files
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
    } else if (audioDataUri.startsWith('data:text/plain')) { // For browser-based TTS
        const textToSpeak = decodeURIComponent(audioDataUri.split(',')[1]);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        if (language === 'te') {
            utterance.lang = 'te-IN'; // Set language hint
            // Try to find and set a specific Telugu voice
            const teluguVoice = browserVoices.find(voice => voice.lang === 'te-IN' || voice.lang.startsWith('te-'));
            if (teluguVoice) {
                utterance.voice = teluguVoice;
            } else {
                // Only show warning if voices have been loaded (browserVoices is not empty) but no Telugu voice was found
                if (browserVoices.length > 0 && !teluguVoiceWarningShown) {
                    toast({
                        title: "Telugu Speech Note",
                        description: "Your browser may not have a dedicated Telugu voice. Speech quality might be affected or a default voice may be used.",
                        duration: 7000,
                    });
                    setTeluguVoiceWarningShown(true);
                }
                // If browserVoices is empty, it means voices might not have loaded yet or none exist.
                // The .lang = 'te-IN' is the best effort in that case.
            }
        } else { // For English or other languages, default to en-US or try to find a specific English voice
            utterance.lang = 'en-US';
            const englishVoice = browserVoices.find(voice => voice.lang === 'en-US' || (voice.default && voice.lang.startsWith('en')));
            if (englishVoice) {
                utterance.voice = englishVoice;
            }
        }

        utterance.onend = () => {
            playAudioForMessage(messageId, false);
            setActivePlayingAudioId(null);
        };
        utterance.onerror = (e) => {
            console.error("Speech synthesis error:", e);
            toast({ title: "Speech Error", description: "Could not speak the response.", variant: "destructive" });
            playAudioForMessage(messageId, false);
            setActivePlayingAudioId(null);
        };
        window.speechSynthesis.speak(utterance);
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
            onPlayAudio={(uri, lang, msgId) => { 
                if(msgId) handlePlayAudio(uri, lang, msgId);
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
          onVoiceLanguageChange={(lang) => {
            setSelectedVoiceLanguage(lang);
            setTeluguVoiceWarningShown(false); // Reset warning if language changes
          }}
          isProcessing={isBotTyping}
          isTranscribing={isTranscribing}
        />
      </Card>
    </div>
  );
}
