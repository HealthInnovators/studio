'use server';

/**
 * @fileOverview Converts voice input in English or Telugu to text.
 *
 * - voiceInputToText - A function that handles the voice input conversion.
 * - VoiceInputToTextInput - The input type for the voiceInputToText function.
 * - VoiceInputToTextOutput - The return type for the voiceInputToText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceInputToTextInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A data URI containing the audio data to transcribe.  Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z.enum(['en', 'te']).describe('The language of the audio input (en for English, te for Telugu).'),
});
export type VoiceInputToTextInput = z.infer<typeof VoiceInputToTextInputSchema>;

const VoiceInputToTextOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the audio input.'),
});
export type VoiceInputToTextOutput = z.infer<typeof VoiceInputToTextOutputSchema>;

export async function voiceInputToText(input: VoiceInputToTextInput): Promise<VoiceInputToTextOutput> {
  return voiceInputToTextFlow(input);
}

const voiceInputToTextPrompt = ai.definePrompt({
  name: 'voiceInputToTextPrompt',
  input: {schema: VoiceInputToTextInputSchema},
  output: {schema: VoiceInputToTextOutputSchema},
  prompt: `You are a multilingual transcription expert. Please transcribe the following audio data into text, using the specified language.

Language: {{{language}}}
Audio: {{media url=audioDataUri}}`,
});

const voiceInputToTextFlow = ai.defineFlow(
  {
    name: 'voiceInputToTextFlow',
    inputSchema: VoiceInputToTextInputSchema,
    outputSchema: VoiceInputToTextOutputSchema,
  },
  async input => {
    const {output} = await voiceInputToTextPrompt(input);
    return output!;
  }
);
