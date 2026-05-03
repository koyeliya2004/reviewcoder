<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/80345b35-fbd0-4753-9d9f-1b8885ea4933

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` and `GROQ_API_KEY` in your local `.env` file (see `.env.example`).
3. Run the app:
   `npm run dev`

## Deploy to Vercel

1. Set the `GEMINI_API_KEY` and `GROQ_API_KEY` environment variables in Vercel.
2. Deploy the project; Vercel will build the Vite app and run the API routes under `/api/*`.
