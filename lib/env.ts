import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_HUGGING_FACE_API_TOKEN: z.string().min(1),
  NEXT_PUBLIC_NEWS_API_KEY: z.string().min(1),
  // Make NEWS_API_KEY optional since we'll use NEXT_PUBLIC_NEWS_API_KEY as fallback
  NEWS_API_KEY: z.string().min(1).optional(),
  // Add Google Fact Check API keys
  GOOGLE_FACTCHECK_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_GOOGLE_FACTCHECK_API_KEY: z.string().min(1).optional(),
  // Add OpenAI API key
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_OPENAI_API_KEY: z.string().min(1).optional(),
  // Add Gemini API key
  GEMINI_API_KEY: z.string().min(1).optional(),
});

// Get the NewsAPI key, preferring the server-side key if available
const getNewsApiKey = () => {
  return process.env.NEWS_API_KEY || process.env.NEXT_PUBLIC_NEWS_API_KEY;
};

// Get the OpenAI API key, preferring the server-side key if available
const getOpenAIKey = () => {
  console.log('OPENAI_API_KEY from process.env:', process.env.OPENAI_API_KEY);
  console.log('NEXT_PUBLIC_OPENAI_API_KEY from process.env:', process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  return process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
};

// Log all environment variables for debugging
console.log('All environment variables:', process.env);

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_HUGGING_FACE_API_TOKEN: process.env.NEXT_PUBLIC_HUGGING_FACE_API_TOKEN,
  NEXT_PUBLIC_NEWS_API_KEY: process.env.NEXT_PUBLIC_NEWS_API_KEY,
  NEWS_API_KEY: getNewsApiKey(),
  GOOGLE_FACTCHECK_API_KEY: process.env.GOOGLE_FACTCHECK_API_KEY,
  NEXT_PUBLIC_GOOGLE_FACTCHECK_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_FACTCHECK_API_KEY,
  OPENAI_API_KEY: getOpenAIKey(),
  NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
});

console.log('[env.ts] Parsed GEMINI_API_KEY:', env.GEMINI_API_KEY); // Log the parsed key