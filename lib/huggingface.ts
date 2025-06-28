import { HuggingFaceVerification } from './types';
import { env } from './env';

// Base URL for Hugging Face Inference API
const HF_API_URL = 'https://api-inference.huggingface.co/models';

// Model endpoints
const MODELS = {
  nli: 'facebook/bart-large-mnli',
  zeroShot: 'facebook/bart-large-mnli',  // We'll use this for zero-shot classification
  qa: 'deepset/roberta-base-squad2',
  whisper: 'openai/whisper-large-v2',
  rebuttal: 'google/flan-t5-base'
};

// Simple rate limiting implementation
const rateLimiter = {
  tokens: new Map<string, { count: number; lastReset: number }>(),
  
  async check() {
    const now = Date.now();
    const key = 'global';
    const limit = 50;
    const interval = 60000; // 1 minute
    
    const token = this.tokens.get(key) || { count: 0, lastReset: now };
    
    if (now - token.lastReset >= interval) {
      token.count = 0;
      token.lastReset = now;
    }
    
    if (token.count >= limit) {
      throw new Error('Rate limit exceeded');
    }
    
    token.count++;
    this.tokens.set(key, token);
  }
};

// Configure fetch options with authorization
const getRequestOptions = (payload: any) => ({
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.NEXT_PUBLIC_HUGGING_FACE_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload)
});

/**
 * Verify a claim using BART NLI model
 */
export async function verifyClaimWithNLI(claim: string): Promise<HuggingFaceVerification> {
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-mnli', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NEXT_PUBLIC_HUGGING_FACE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: claim,
        parameters: {
          candidate_labels: ['entailment', 'contradiction', 'neutral']
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json();
    const scores = data.scores;
    const maxScoreIndex = scores.indexOf(Math.max(...scores));
    const label = data.labels[maxScoreIndex] as 'entailment' | 'contradiction' | 'neutral';

    return {
      label,
      score: scores[maxScoreIndex],
      evidence: `HuggingFace NLI model classified this claim as ${label} with a score of ${scores[maxScoreIndex].toFixed(2)}.`
    };
  } catch (error) {
    console.error('Error verifying claim with HuggingFace:', error);
    return {
      label: 'neutral',
      score: 0,
      evidence: 'HuggingFace NLI verification encountered an error.'
    };
  }
}

/**
 * Extract evidence for a claim using QA model
 */
export async function extractEvidenceWithQA(claim: string, context: string) {
  try {
    await rateLimiter.check();
    
    const payload = {
      inputs: {
        question: claim,
        context: context,
      },
    };

    const response = await fetch(`${HF_API_URL}/${MODELS.qa}`, getRequestOptions(payload));
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      answer: data.answer,
      score: data.score,
    };
  } catch (error) {
    console.error('Error extracting evidence with QA:', error);
    throw error;
  }
}

/**
 * Transcribe audio to text using Whisper
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    await rateLimiter.check();
    
    const formData = new FormData();
    formData.append('file', audioBlob);
    
    const response = await fetch(`${HF_API_URL}/${MODELS.whisper}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NEXT_PUBLIC_HUGGING_FACE_API_TOKEN}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

/**
 * Generate a rebuttal for a false claim
 */
export async function generateRebuttal(claim: string, evidence: string): Promise<string> {
  try {
    await rateLimiter.check();
    
    const prompt = `
      Given this false claim: "${claim}"
      
      And this evidence: "${evidence}"
      
      Generate a clear, concise rebuttal explaining why the claim is false:
    `;

    const payload = {
      inputs: prompt,
    };

    const response = await fetch(`${HF_API_URL}/${MODELS.rebuttal}`, getRequestOptions(payload));
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data[0].generated_text;
  } catch (error) {
    console.error('Error generating rebuttal:', error);
    throw error;
  }
}