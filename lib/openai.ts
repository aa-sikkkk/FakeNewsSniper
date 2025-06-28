import { env } from './env';
import { HuggingFaceVerification } from './types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Verify a claim using OpenAI's GPT model
 */
export async function verifyClaimWithOpenAI(claim: string): Promise<HuggingFaceVerification> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a fact-checking assistant. Analyze the given claim and determine if it is TRUE, FALSE, or DISPUTED. Provide your reasoning and confidence level.'
          },
          {
            role: 'user',
            content: `Please verify this claim: "${claim}"\n\nRespond in the following format:\nVerdict: [TRUE/FALSE/DISPUTED]\nConfidence: [0-1]\nReasoning: [Your explanation]`
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0].message.content;

    // Parse the response
    const verdictMatch = content.match(/Verdict:\s*(TRUE|FALSE|DISPUTED)/i);
    const confidenceMatch = content.match(/Confidence:\s*([0-9.]+)/i);
    const reasoningMatch = content.match(/Reasoning:\s*([\s\S]+)/i);

    const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : 'NEUTRAL';
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';

    // Map OpenAI verdict to NLI labels
    const label = verdict === 'TRUE' ? 'entailment' : 
                 verdict === 'FALSE' ? 'contradiction' : 'neutral';

    return {
      label,
      score: confidence,
      evidence: reasoning || 'OpenAI provided a verdict but no detailed reasoning.'
    };
  } catch (error) {
    console.error('Error verifying claim with OpenAI:', error);
    return {
      label: 'neutral',
      score: 0,
      evidence: 'OpenAI verification encountered an error.'
    };
  }
}

/**
 * Extract evidence for a claim using OpenAI's GPT model
 */
export async function extractEvidenceWithOpenAI(claim: string, context: string): Promise<{ answer: string; score: number }> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an evidence extraction assistant. Given a claim and context, extract the most relevant evidence that supports or refutes the claim.'
          },
          {
            role: 'user',
            content: `Claim: "${claim}"\n\nContext: "${context}"\n\nExtract the most relevant evidence that supports or refutes this claim.`
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    const evidence = data.choices[0].message.content.trim();

    return {
      answer: evidence,
      score: 0.9 // High confidence for GPT evidence
    };
  } catch (error) {
    console.error('Error extracting evidence with OpenAI:', error);
    throw error;
  }
} 