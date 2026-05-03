import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import { handleGroqRequest, handleGeminiRequest } from './src/lib/ai-logic';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Security: Prevent direct calls from outside the application if in production
  app.use('/api/ai/*', (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      const referer = req.get('Referer');
      const host = req.get('host');
      if (!referer || !referer.includes(host || '')) {
        return res.status(403).json({ error: 'UNAUTHORIZED_ACCESS: External proxy detected.' });
      }
    }
    next();
  });

  // AI Proxy Route for Groq
  app.post('/api/ai/groq', async (req, res) => {
    try {
      const data = await handleGroqRequest(req.body.messages, req.body.model);
      res.json(data);
    } catch (error: any) {
      console.error('Groq Proxy Error:', error.message);
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // AI Proxy Route for Gemini
  app.post('/api/ai/gemini', async (req, res) => {
    try {
      const data = await handleGeminiRequest(req.body);
      res.json(data);
    } catch (error: any) {
      console.error('Gemini Proxy Error:', error.message);
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.RENDER) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listening
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  return app;
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
