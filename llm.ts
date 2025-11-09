/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Secure LLM client that proxies requests through backend server.
 * API key is NEVER exposed to the client - it's securely stored server-side.
 */
/// <reference types="vite/client" />
import type { LLMRequest, LLMResponse } from './types'

// Backend API URL - defaults to local development, can be overridden for production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

/**
 * Query the LLM through the secure backend proxy
 * This function sends requests to our backend server, which then communicates with Gemini
 * The API key is NEVER exposed to the client
 */
export const queryLlm = async ({
  model = 'gemini-2.0-flash-exp',
  prompt,
  config = {},
}: LLMRequest): Promise<LLMResponse> => {
  const generate = async () => {
    // Check if this is a JSON schema request
    const hasJsonSchema = config?.generationConfig?.responseMimeType === 'application/json'
                          && config?.generationConfig?.responseSchema;

    const endpoint = hasJsonSchema
      ? `${API_BASE_URL}/api/gemini/generate-json`
      : `${API_BASE_URL}/api/gemini/generate`;

    const requestBody: any = {
      prompt,
      modelName: model,
      stream: false,
    };

    // Add schema if present
    if (hasJsonSchema) {
      requestBody.schema = config.generationConfig.responseSchema;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform backend response to match expected LLMResponse format
    if (hasJsonSchema) {
      // For JSON responses, return the parsed data as text
      return {
        text: JSON.stringify(data.data),
        candidates: [], // Empty candidates array
      } as LLMResponse;
    } else {
      // For text responses
      return {
        text: data.text,
        candidates: [], // Empty candidates array
      } as LLMResponse;
    }
  };

  // Return the full response object to allow access to metadata
  const response = await retryWithBackoff(generate);
  return response;
};
