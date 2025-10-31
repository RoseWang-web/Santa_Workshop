'use server';

/**
 * @fileOverview Suggests appropriate gifts based on a child's behavior category and age range.
 *
 * - suggestAppropriateGifts - A function that suggests associated toys and accessories for a child.
 * - SuggestAppropriateGiftsInput - The input type for the suggestAppropriateGifts function.
 * - SuggestAppropriateGiftsOutput - The return type for the suggestAppropriateGifts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAppropriateGiftsInputSchema = z.object({
  gift: z.string().describe('The gift assigned to the child.'),
  behaviorCategory: z.string().describe('The behavior category of the child (e.g., good, neutral, mischievous).'),
  ageRange: z.string().describe('The age range of the child (e.g., 2-4, 5-7, 8-10).'),
});
export type SuggestAppropriateGiftsInput = z.infer<typeof SuggestAppropriateGiftsInputSchema>;

const SuggestAppropriateGiftsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested toys and accessories appropriate for the child.'),
});
export type SuggestAppropriateGiftsOutput = z.infer<typeof SuggestAppropriateGiftsOutputSchema>;

export async function suggestAppropriateGifts(input: SuggestAppropriateGiftsInput): Promise<SuggestAppropriateGiftsOutput> {
  return suggestAppropriateGiftsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAppropriateGiftsPrompt',
  input: {schema: SuggestAppropriateGiftsInputSchema},
  output: {schema: SuggestAppropriateGiftsOutputSchema},
  prompt: `You are a toy expert specializing in suggesting appropriate toys and accessories for children based on their behavior and age range.

  Given the child's desired gift, behavior category, and age range, suggest a list of associated toys and accessories.

  Desired Gift: {{{gift}}}
  Behavior Category: {{{behaviorCategory}}}
  Age Range: {{{ageRange}}}

  Suggestions should be appropriate and safe for the child.
  Format your response as a list of strings.
  `,
});

const suggestAppropriateGiftsFlow = ai.defineFlow(
  {
    name: 'suggestAppropriateGiftsFlow',
    inputSchema: SuggestAppropriateGiftsInputSchema,
    outputSchema: SuggestAppropriateGiftsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
