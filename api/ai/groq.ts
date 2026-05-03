import axios from 'axios';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const { messages, model = DEFAULT_MODEL } = parseBody(req.body) as {
    messages?: unknown;
    model?: string;
  };

  if (!messages) {
    return res.status(400).json({ error: 'messages is required' });
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model,
        messages,
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.status(200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Failed to fetch from Groq' };
    return res.status(status).json(data);
  }
}
