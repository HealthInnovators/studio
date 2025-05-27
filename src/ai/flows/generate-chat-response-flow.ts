
'use server';
/**
 * @fileOverview Generates a conversational response using an LLM for the T-Fiber chatbot.
 *
 * - generateChatResponse - A function that generates a chat response.
 * - GenerateChatResponseInput - The input type for the generateChatResponse function.
 * - GenerateChatResponseOutput - The return type for the generateChatResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChatResponseInputSchema = z.object({
  text: z.string().describe('The user\'s input text/question.'),
  language: z.enum(['en', 'te']).describe('The language of the user\'s input (en for English, te for Telugu).'),
});
export type GenerateChatResponseInput = z.infer<typeof GenerateChatResponseInputSchema>;

const GenerateChatResponseOutputSchema = z.object({
  responseText: z.string().describe('The AI-generated chat response.'),
});
export type GenerateChatResponseOutput = z.infer<typeof GenerateChatResponseOutputSchema>;

export async function generateChatResponse(input: GenerateChatResponseInput): Promise<GenerateChatResponseOutput> {
  return generateChatResponseFlow(input);
}

const chatPrompt = ai.definePrompt({
  name: 'generateChatResponsePrompt',
  input: {schema: GenerateChatResponseInputSchema},
  output: {schema: GenerateChatResponseOutputSchema},
  prompt: `You are TeRA, a friendly and helpful AI assistant for T-Fiber, a high-speed internet service provider in Telangana, India.
Your goal is to answer user questions about T-Fiber services, plans, coverage, troubleshooting, and general inquiries related to T-Fiber.
The user is asking in {{language}}. Please respond in {{language}}. If the question is in English, respond in English. If the question is in Telugu, respond in Telugu.

User's question: {{{text}}}

Provide a concise and helpful answer. If you don't know the answer or if the question is unrelated to T-Fiber, politely state that you cannot help with that specific query. Do not make up information.
If asked about specific current plans or pricing, state that the most up-to-date information can be found on the official T-Fiber website.
`,
});

const generateChatResponseFlow = ai.defineFlow(
  {
    name: 'generateChatResponseFlow',
    inputSchema: GenerateChatResponseInputSchema,
    outputSchema: GenerateChatResponseOutputSchema,
  },
  async (input: GenerateChatResponseInput) => {
    try {
      const {output} = await chatPrompt(input);
      if (!output || !output.responseText) {
        // Fallback if LLM returns empty or unexpected output
        return { 
          responseText: input.language === 'te' 
            ? "క్షమించండి, నేను మీ అభ్యర్థనను ప్రస్తుతం ప్రాసెస్ చేయలేకపోయాను. దయచేసి మళ్ళీ ప్రయత్నించండి." 
            : "Sorry, I couldn't process your request at the moment. Please try again." 
        };
      }
      return output;
    } catch (error) {
      console.error('Error in generateChatResponseFlow:', error);
      // Fallback in case of an exception during the flow
      return { 
        responseText: input.language === 'te' 
          ? "క్షమించండి, ఒక లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి." 
          : "Sorry, an error occurred. Please try again." 
      };
    }
  }
);
