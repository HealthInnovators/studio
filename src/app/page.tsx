
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

// Define props for a Next.js Page component in the App Router
interface AskTeRAPageProps {
  params: {}; // For the root page, params is an empty object
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function AskTeRAPage({ params, searchParams }: AskTeRAPageProps) {
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


  useEffect(() => {
    const loadAndSetVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setBrowserVoices(voices);
          console.log('Browser voices loaded on init/change:', voices.map(v => ({name: v.name, lang: v.lang, default: v.default })));
        } else {
          // Voices might load asynchronously, onvoiceschanged will handle it.
          console.log('Browser voices list initially empty during loadAndSetVoices, waiting for onvoiceschanged.');
        }
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // onvoiceschanged is the reliable event for when the voice list is populated/updated
      window.speechSynthesis.onvoiceschanged = loadAndSetVoices;
      loadAndSetVoices(); // Attempt to load immediately in case they are already available
    }

    const welcomeLang = selectedVoiceLanguage;
    const botMessage: Message = {
      id: Date.now().toString() + '_welcome',
      text: welcomeMessages[welcomeLang],
      isUser: false,
      timestamp: new Date().toISOString(),
      language: welcomeLang,
    };

    generateAndSetAudio(botMessage);

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null; // Clean up event listener
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed selectedVoiceLanguage from dependencies to ensure welcome message generates once on mount. Language for welcome can be set from initial selectedVoiceLanguage.


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
        setMessages(prev => {
            if (!prev.find(m => m.id === message.id)) {
                return [...prev, {...message, audioDataUri: ttsResult.audioDataUri}];
            }
            return prev.map(m => m.id === message.id ? {...m, audioDataUri: ttsResult.audioDataUri} : m);
        });
      } catch (error) {
        console.error("Error generating speech:", error);
        toast({ title: "Speech Generation Error", description: "Failed to generate audio for the bot's response.", variant: "destructive" });
        setMessages(prev => {
            if (!prev.find(m => m.id === message.id)) {
                return [...prev, message];
            }
            return prev;
        });
      }
    } else {
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
    if (isUser) {
       setMessages(prev => [...prev, newMessage]);
    }
    return newMessage;
  };

  const handleSendMessage = async (textFromInput: string) => {
    if (!textFromInput.trim()) return;

    const userLang = detectLanguage(textFromInput);
    addMessage(textFromInput, true, userLang);
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

    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const botMessage = {
      id: Date.now().toString() + '_bot_' + Math.random().toString(36).substring(2,9),
      text: botResponseText,
      isUser: false,
      timestamp: new Date().toISOString(),
      language: botResponseLang,
    };

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
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        let currentVoices: SpeechSynthesisVoice[] = [];
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            currentVoices = window.speechSynthesis.getVoices(); // Get freshest list
            if (currentVoices.length === 0 && browserVoices.length > 0) {
              // If getVoices is empty now but was populated before, use the cached one.
              // This can happen if onvoiceschanged hasn't fired yet for a very quick subsequent call.
              currentVoices = browserVoices;
            }
        }
        console.log('TTS: Available voices for playback attempt:', currentVoices.map(v => ({name: v.name, lang: v.lang, default: v.default })));

        let chosenVoice: SpeechSynthesisVoice | undefined = undefined;

        if (language === 'te') {
            utterance.lang = 'te-IN';
            console.log('TTS: Attempting to find Telugu voice...');
            // Prioritize female voices
            chosenVoice = currentVoices.find(voice =>
                (voice.lang === 'te-IN' || voice.lang.toLowerCase().startsWith('te-')) &&
                voice.name.toLowerCase().includes('female')
            );
            if (!chosenVoice) { // Fallback to any Telugu voice
                chosenVoice = currentVoices.find(voice =>
                    voice.lang === 'te-IN' || voice.lang.toLowerCase().startsWith('te-')
                );
            }

            if (chosenVoice) {
                utterance.voice = chosenVoice;
                console.log('TTS: Using Telugu voice:', {name: chosenVoice.name, lang: chosenVoice.lang});
            } else {
                console.log('TTS: No specific Telugu voice found in browser. Relying on lang attribute for Telugu.');
                if (currentVoices.length > 0 && !teluguVoiceWarningShown) {
                    toast({
                        title: "Telugu Speech Note",
                        description: "Your browser may not have a dedicated Telugu voice. Speech quality might be affected or a default voice used.",
                        duration: 7000,
                    });
                    setTeluguVoiceWarningShown(true);
                } else if (currentVoices.length === 0 && !teluguVoiceWarningShown) {
                     console.log('TTS: Browser voice list is empty. Speech synthesis might not work or voices are still loading.');
                      toast({
                        title: "Speech Voice Loading",
                        description: "Browser voices might still be loading. If speech doesn't work, please try again shortly.",
                        duration: 5000,
                    });
                    setTeluguVoiceWarningShown(true);
                }
            }
        } else { // For English
            utterance.lang = 'en-US';
            console.log('TTS: Attempting to find English voice...');
            // Prioritize female voices
            chosenVoice = currentVoices.find(voice =>
                (voice.lang === 'en-US' || voice.lang.toLowerCase().startsWith('en-')) &&
                voice.name.toLowerCase().includes('female')
            );
            if (!chosenVoice) { // Fallback to default English voice
                chosenVoice = currentVoices.find(voice => (voice.lang === 'en-US' || voice.lang.toLowerCase().startsWith('en-')) && voice.default);
            }
            if (!chosenVoice) { // Fallback to any English voice
                chosenVoice = currentVoices.find(voice => voice.lang === 'en-US' || voice.lang.toLowerCase().startsWith('en-'));
            }

            if (chosenVoice) {
                utterance.voice = chosenVoice;
                 console.log('TTS: Using English voice:', {name: chosenVoice.name, lang: chosenVoice.lang});
            } else {
                console.log('TTS: No specific English voice found. Relying on lang attribute for English.');
            }
        }

        utterance.onend = () => {
            playAudioForMessage(messageId, false);
            setActivePlayingAudioId(null);
        };
        utterance.onerror = (e) => {
            console.error("Speech synthesis error:", e.error, e); // Log specific error
            toast({ title: "Speech Error", description: `Could not speak the response. Error: ${e.error}`, variant: "destructive" });
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
            setTeluguVoiceWarningShown(false); // Reset warning when language changes
          }}
          isProcessing={isBotTyping}
          isTranscribing={isTranscribing}
        />
      </Card>
    </div>
  );
}

    