import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

export async function handleGroqRequest(messages: any[], model: string = 'llama-3.3-70b-versatile') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw { status: 500, message: 'GROQ_API_KEY not configured' };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw { status: 400, message: 'Invalid or empty messages payload' };
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { model, messages, temperature: 0.1 },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw { 
      status: error.response?.status || 500, 
      message: error.response?.data?.error?.message || error.message 
    };
  }
}

export async function handleGeminiRequest(payload: { contents?: any[], context?: string, query?: string, systemInstruction?: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw { status: 500, message: 'GEMINI_API_KEY not configured' };

  const { contents, context, query, systemInstruction } = payload;

  const resolvedContents = contents || (
    (context || query) 
      ? [{ role: 'user', parts: [{ text: `Context: ${context || ''}\n\nQuery: ${query || ''}` }] }] 
      : null
  );

  if (!resolvedContents) {
    throw { status: 400, message: 'Missing required payload (contents or query/context)' };
  }

  try {
    const genAI = new GoogleGenAI({ apiKey }) as any;
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: systemInstruction 
    });

    const result = await model.generateContent({ contents: resolvedContents });
    return { text: result.response.text() };
  } catch (error: any) {
    throw { 
      status: 500, 
      message: error.message || 'Failed to fetch from Gemini' 
    };
  }
}
