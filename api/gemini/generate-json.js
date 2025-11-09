/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless API Handler - JSON Generation
 */
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Allowed models for security
const ALLOWED_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, schema, modelName = 'gemini-2.0-flash-exp' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!schema) {
      return res.status(400).json({ error: 'Schema is required for JSON generation' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Validate model name
    if (!ALLOWED_MODELS.includes(modelName)) {
      return res.status(400).json({ error: 'Invalid model name' });
    }

    // Generate JSON content
    const result = await genAI.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      },
    });

    const text = result.text;

    // Parse JSON response
    try {
      const jsonData = JSON.parse(text);
      return res.status(200).json({ data: jsonData });
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return res.status(500).json({
        error: 'Failed to parse AI response as JSON',
        rawText: text,
      });
    }
  } catch (error) {
    console.error('Gemini JSON API error:', error);

    if (error.message?.includes('quota')) {
      return res.status(429).json({
        error: 'API quota exceeded',
        retryAfter: 60,
      });
    }

    return res.status(500).json({
      error: 'Failed to generate JSON content',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
