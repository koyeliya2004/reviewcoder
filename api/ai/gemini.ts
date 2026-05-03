import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleGeminiRequest } from '../../src/lib/ai-logic';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic abuse protection
  const referer = req.headers.referer;
  const host = req.headers.host;
  if (process.env.NODE_ENV === 'production' && (!referer || !referer.includes(host || ''))) {
    // Basic protection
  }

  try {
    const data = await handleGeminiRequest(req.body);
    res.json(data);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
}
