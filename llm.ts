/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {GoogleGenAI} from '@google/genai'
import type { LLMRequest, LLMResponse } from './types'

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY
})

// Helper for retrying promises with exponential backoff
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export async function retryWithBackoff(
  fn: () => Promise<any>,
  retries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 10000
): Promise<any> {
    let delay = initialDelay;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const errorString = error.toString().toLowerCase();
            const isRateLimitError = errorString.includes('429') ||
                                     errorString.includes('resource_exhausted') ||
                                     errorString.includes('rate limit');

            const isServerError = errorString.includes('500') ||
                                  errorString.includes('internal');

            if ((isRateLimitError || isServerError) && i < retries - 1) {
                if (isRateLimitError) {
                    console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
                } else {
                    console.warn(`Server error (${errorString.match(/(\d{3})/)?.[0] || '5xx'}). Retrying in ${delay}ms...`);
                }
                await sleep(delay);
                delay = Math.min(delay * 2, maxDelay);
            } else {
                throw error;
            }
        }
    }
}


export const queryLlm = async ({
  model = 'gemini-2.5-flash',
  prompt,
  config = {},
}: LLMRequest): Promise<LLMResponse> => {
  const generate = () => ai.models.generateContent({
    model,
    contents: prompt,
    config,
  });

  // Return the full response object to allow access to metadata like grounding.
  const response = await retryWithBackoff(generate);
  return response;
};
