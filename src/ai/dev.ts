
import { config } from 'dotenv';
config();

import '@/ai/flows/voice-input-to-text.ts';
import '@/ai/flows/text-to-speech-output.ts';
import '@/ai/flows/generate-chat-response-flow.ts'; // Added new flow
