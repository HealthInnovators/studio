'use client';

import { useState, useRef } from 'react';

export type AudioRecorderControls = {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  audioBlob: Blob | null;
  error: string | null;
};

export const useAudioRecorder = (): AudioRecorderControls => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const completeBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
          setAudioBlob(completeBlob);
          // Stop all tracks on the stream
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setError('Error during recording.');
          setIsRecording(false);
           stream.getTracks().forEach(track => track.stop());
        }

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        if (err instanceof Error) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setError("Microphone permission denied. Please allow microphone access in your browser settings.");
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setError("No microphone found. Please ensure a microphone is connected and enabled.");
            } else {
                setError(`Error accessing microphone: ${err.message}`);
            }
        } else {
            setError("An unknown error occurred while accessing the microphone.");
        }
        setIsRecording(false);
      }
    } else {
      setError('Audio recording is not supported by your browser.');
      setIsRecording(false);
    }
  };

  const stopRecording = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => { // Overwrite onstop to use the promise
          const completeBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
          setAudioBlob(completeBlob);
          
          // Stop all tracks on the stream used by MediaRecorder
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            setError('Failed to read audio data.');
            resolve(null);
          }
          reader.readAsDataURL(completeBlob);
          setIsRecording(false);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  };

  return { isRecording, startRecording, stopRecording, audioBlob, error };
};
