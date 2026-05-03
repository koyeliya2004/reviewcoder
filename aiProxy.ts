import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import type { ContentListUnion } from '@google/genai';

export type ProxyRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string | null;
  };
};

export type ProxyResponse = {
  status: (code: number) => ProxyResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_RATE_LIMIT_MAX = 60;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

const rateLimitState = new Map<string, { count: number; resetAt: number }>();

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_LIMIT_MAX = toPositiveInt(process.env.AI_PROXY_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX);
const RATE_LIMIT_WINDOW_MS = toPositiveInt(
  process.env.AI_PROXY_RATE_LIMIT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_WINDOW_MS
);

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

const getHeader = (
  headers: ProxyRequest['headers'],
  name: string
): string | undefined => {
  if (!headers) {
    return undefined;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
};

const getClientId = (req: ProxyRequest) => {
  const forwardedFor = getHeader(req.headers, 'x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || forwardedFor;
  }
  const realIp = getHeader(req.headers, 'x-real-ip');
  if (realIp) {
    return realIp;
  }
  return req.socket?.remoteAddress || 'unknown';
};

const isRateLimited = (req: ProxyRequest, res: ProxyResponse) => {
  if (!RATE_LIMIT_MAX || RATE_LIMIT_MAX <= 0) {
    return false;
  }
  const clientId = getClientId(req);
  const now = Date.now();
  const existing = rateLimitState.get(clientId);

  if (!existing || now >= existing.resetAt) {
    rateLimitState.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(RATE_LIMIT_MAX - 1, 0)));
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(Math.max(retryAfter, 0)));
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.status(429).json({ error: 'Too many requests' });
    return true;
  }

  existing.count += 1;
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(RATE_LIMIT_MAX - existing.count, 0)));
  return false;
};

const ensurePost = (req: ProxyRequest, res: ProxyResponse) => {
  if (req.method && req.method.toUpperCase() !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
};

const normalizeError = (error: any, fallbackMessage: string) => {
  const status = error?.response?.status || error?.status || 500;
  const data = error?.response?.data ?? error?.data ?? error?.body;

  if (data && typeof data === 'object') {
    return { status, body: data };
  }
  if (typeof data === 'string') {
    return { status, body: { error: data } };
  }
  if (typeof error?.message === 'string') {
    return { status, body: { error: error.message } };
  }
  return { status, body: { error: fallbackMessage } };
};

export const handleGroqProxy = async (req: ProxyRequest, res: ProxyResponse) => {
  if (!ensurePost(req, res)) {
    return;
  }
  if (isRateLimited(req, res)) {
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    return;
  }

  const { messages, model = DEFAULT_GROQ_MODEL } = parseBody(req.body) as {
    messages?: unknown;
    model?: string;
  };

  if (!messages) {
    res.status(400).json({ error: 'messages is required' });
    return;
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
    res.status(200).json(response.data);
  } catch (error: any) {
    const { status, body } = normalizeError(error, 'Failed to fetch from Groq');
    res.status(status).json(body);
  }
};

export const handleGeminiProxy = async (req: ProxyRequest, res: ProxyResponse) => {
  if (!ensurePost(req, res)) {
    return;
  }
  if (isRateLimited(req, res)) {
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    return;
  }

  const { contents, context, query, systemInstruction } = parseBody(req.body) as {
    contents?: ContentListUnion;
    context?: string;
    query?: string;
    systemInstruction?: string;
  };

  const contextText = typeof context === 'string' ? context : '';
  const queryText = typeof query === 'string' ? query : '';
  const hasContents = contents !== undefined && contents !== null;
  const hasPrompt = Boolean(contextText.trim() || queryText.trim());

  if (!hasContents && !hasPrompt) {
    res.status(400).json({ error: 'contents or context/query is required' });
    return;
  }

  const resolvedContents: ContentListUnion =
    hasContents
      ? contents
      : [
          {
            role: 'user',
            parts: [
              {
                text: `Context: ${contextText}\n\nQuery: ${queryText}`,
              },
            ],
          },
        ];

  try {
    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: resolvedContents,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    res.status(200).json({ text: response.text });
  } catch (error: any) {
    const { status, body } = normalizeError(error, 'Failed to fetch from Gemini');
    res.status(status).json(body);
  }
};
