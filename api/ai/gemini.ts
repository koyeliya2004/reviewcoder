import { GoogleGenAI } from '@google/genai';

const parseBody = (body: unknown) => {
  if (!body) {
    return {};
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body as Record<string, unknown>;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { contents, context, query, systemInstruction } = parseBody(req.body) as {
    contents?: unknown;
    context?: string;
    query?: string;
    systemInstruction?: string;
  };

  const resolvedContents =
    contents ||
    [
      {
        role: 'user',
        parts: [
          {
            text: `Context: ${context ?? ''}\n\nQuery: ${query ?? ''}`,
          },
        ],
      },
    ];

  try {
    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: resolvedContents as any,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch from Gemini' });
  }
}
