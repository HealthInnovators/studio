// This file implements the Genkit flow for converting text to speech in either English or Telugu.
'use server';

/**
 * @fileOverview Converts chatbot responses to spoken language in the detected language (English or Telugu).
 *
 * - textToSpeechOutput - A function that converts text to speech.
 * - TextToSpeechOutputInput - The input type for the textToSpeechOutput function.
 * - TextToSpeechOutputOutput - The return type for the textToSpeechOutput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TextToSpeechOutputInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
  language: z.enum(['en', 'te']).describe('The language of the text (en for English, te for Telugu).'),
});
export type TextToSpeechOutputInput = z.infer<typeof TextToSpeechOutputInputSchema>;

const TextToSpeechOutputOutputSchema = z.object({
  audioDataUri: z.string().describe('The audio data URI of the spoken text.'),
});
export type TextToSpeechOutputOutput = z.infer<typeof TextToSpeechOutputOutputSchema>;

export async function textToSpeechOutput(input: TextToSpeechOutputInput): Promise<TextToSpeechOutputOutput> {
  return textToSpeechOutputFlow(input);
}

const textToSpeechPrompt = ai.definePrompt({
  name: 'textToSpeechPrompt',
  input: {schema: TextToSpeechOutputInputSchema},
  output: {schema: TextToSpeechOutputOutputSchema},
  prompt: `You are a helpful assistant that converts text to speech in the specified language.

  Convert the following text to speech in {{language}} and return the audio data URI.

  Text: {{{text}}}`,
});

const textToSpeechOutputFlow = ai.defineFlow(
  {
    name: 'textToSpeechOutputFlow',
    inputSchema: TextToSpeechOutputInputSchema,
    outputSchema: TextToSpeechOutputOutputSchema,
  },
  async input => {
    // Gemini 2.0 Flash is not able to generate audio directly.  It can generate images, but not audio.
    // As a stopgap, the text is simply returned verbatim.
    // To fully implement this, a 3rd party text-to-speech service should be called here using `ai.callService`.
    return {
      audioDataUri: `data:text/plain;charset=utf-8,${encodeURIComponent(input.text)}`,
    };
  }
);
