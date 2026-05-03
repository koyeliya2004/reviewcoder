import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contents, context, query, systemInstruction } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: systemInstruction 
    });

    const result = await model.generateContent({
      contents: contents || [{ role: 'user', parts: [{ text: `Context: ${context}\n\nQuery: ${query}` }] }]
    });
    
    res.json({ text: result.response.text() });
  } catch (error: any) {
    console.error('Gemini Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from Gemini' });
  }
}
