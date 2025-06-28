import { env } from './env';
import { HuggingFaceVerification } from './types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Verify a claim using Gemini API (Google's Gemini-pro model)
 * Enhanced: logs, robust parsing, always returns verdict/confidence/reasoning.
 */
export interface GeminiVerificationResult {
  score: number; // Our mapped score (0.1, 0.5, 0.9)
  label: 'entailment' | 'contradiction' | 'neutral';
  evidence: string; // The explanation string
  aiConfidence: number; // The confidence score (0-1) provided by Gemini itself
  rawResponse?: any;
}

export async function verifyClaimWithGemini(claim: string): Promise<GeminiVerificationResult> {
  try {
    console.log('[Gemini] Calling Gemini API for claim verification:', claim);
    const response = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    `You are a fact-checking assistant specialized in current events. Your task is to verify the following claim using the most up-to-date information available. For claims about current positions or roles (like political offices), ensure you have the most recent information.\n\nClaim: "${claim}"\n\nBefore responding, follow these steps:\n1. Check if this is about a current fact that might have changed recently\n2. If uncertain about current information, mark as DISPUTED\n3. Only mark as TRUE if you're highly confident based on reliable sources\n4. For political positions, verify the current office holder\n\nRespond in this exact format:\nVerdict: [TRUE/FALSE/DISPUTED]\nConfidence: [0-1]\nReasoning: [Your explanation, including any relevant dates or sources]\n\nCurrent date: ${new Date().toISOString().split('T')[0]}`
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    // Gemini's response format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[Gemini] Raw response:', text);

    let parsedVerdict: 'TRUE' | 'FALSE' | 'DISPUTED' | 'NEUTRAL' = 'NEUTRAL';
    let parsedAiConfidence: number = 0.5;
    let parsedReasoning: string = '';

    try {
      // Check if the response is a JSON string block
      if (text.startsWith('```json') && text.endsWith('```')) {
        const jsonString = text.substring(7, text.length - 3).trim(); // Remove ```json and ```
        const geminiJson = JSON.parse(jsonString);

        if (typeof geminiJson.isTrue === 'boolean') {
          parsedVerdict = geminiJson.isTrue ? 'TRUE' : 'FALSE';
        } else if (typeof geminiJson.verdict === 'string') {
          const upperVerdict = geminiJson.verdict.toUpperCase();
          if (['TRUE', 'FALSE', 'DISPUTED'].includes(upperVerdict)) {
            parsedVerdict = upperVerdict as 'TRUE' | 'FALSE' | 'DISPUTED';
          }
        }
        
        if (typeof geminiJson.confidence === 'number') {
          parsedAiConfidence = Math.max(0, Math.min(1, geminiJson.confidence)); // Clamp between 0 and 1
        } else if (typeof geminiJson.confidence === 'string') {
          const conf = parseFloat(geminiJson.confidence);
          if (!isNaN(conf)) {
            parsedAiConfidence = Math.max(0, Math.min(1, conf));
          }
        }

        parsedReasoning = geminiJson.explanation || geminiJson.reasoning || '';

        // If the prompt asked for Verdict/Confidence/Reasoning format and it's NOT in the JSON
        // try to parse it from the raw text as a fallback (less likely now we know it's JSON)
        if (parsedVerdict === 'NEUTRAL' && parsedReasoning === '') {
            const fallbackVerdictMatch = text.match(/Verdict:\s*(TRUE|FALSE|DISPUTED)/i);
            if (fallbackVerdictMatch) parsedVerdict = fallbackVerdictMatch[1].toUpperCase() as 'TRUE' | 'FALSE' | 'DISPUTED';
            const fallbackConfidenceMatch = text.match(/Confidence:\s*([0-9.]+)/i);
            if (fallbackConfidenceMatch) parsedAiConfidence = parseFloat(fallbackConfidenceMatch[1]);
            const fallbackReasoningMatch = text.match(/Reasoning:\s*([\s\S]+)/i);
            if (fallbackReasoningMatch) parsedReasoning = fallbackReasoningMatch[1].trim();
        }

      } else {
        // Fallback to old regex parsing if not a JSON block (should be less common now)
        console.warn('[Gemini] Response was not a JSON block. Attempting regex parsing.');
        const verdictMatch = text.match(/Verdict:\s*(TRUE|FALSE|DISPUTED)/i);
        const confidenceMatch = text.match(/Confidence:\s*([0-9.]+)/i);
        const reasoningMatch = text.match(/Reasoning:\s*([\s\S]+)/i);

        if (verdictMatch) parsedVerdict = verdictMatch[1].toUpperCase() as 'TRUE' | 'FALSE' | 'DISPUTED';
        if (confidenceMatch) parsedAiConfidence = parseFloat(confidenceMatch[1]);
        if (reasoningMatch) parsedReasoning = reasoningMatch[1].trim();
        
        if (!verdictMatch && !confidenceMatch && !reasoningMatch) {
            console.warn('[Gemini] Fallback regex parsing also failed for non-JSON response.');
            parsedReasoning = 'Could not parse Gemini response (neither JSON nor regex matched).';
        }
      }
    } catch (e) {
      console.error('[Gemini] Error parsing Gemini response (JSON or regex):', e, '\nRaw text:', text);
      parsedReasoning = 'Error parsing Gemini response. Raw: ' + text.substring(0, 100) + '...';
      // Keep default NEUTRAL verdict and 0.5 confidence
    }

    // Map Gemini verdict to NLI labels (for internal use)
    const label = parsedVerdict === 'TRUE' ? 'entailment' :
      parsedVerdict === 'FALSE' ? 'contradiction' : 'neutral';

    // Log parsed values
    console.log('[Gemini] Parsed:', { verdict: parsedVerdict, confidence: parsedAiConfidence, reasoning: parsedReasoning, label });

    // Map the verdict to a score between 0 and 1
    const score = parsedVerdict === 'TRUE' ? 0.9 : 
                 parsedVerdict === 'FALSE' ? 0.1 : 0.5;

    let finalEvidence = parsedReasoning;

    // Clean up the reasoning string if it starts with the claim or common prefixes
    if (parsedReasoning && parsedReasoning.trim() !== '') {
      const lowerReasoning = parsedReasoning.toLowerCase();
      const lowerClaim = claim.toLowerCase();
      if (lowerReasoning.startsWith(lowerClaim)) {
        finalEvidence = parsedReasoning.substring(claim.length).trim();
      }
      // Remove common leading phrases like 'Fact Check:', 'Analysis:', 'Reasoning:' etc.
      // This might be less necessary if Gemini's 'explanation' field is clean
      finalEvidence = finalEvidence.replace(/^\s*(fact check|analysis|reasoning):\s*/i, '').trim();
      if (finalEvidence.startsWith(':')) {
        finalEvidence = finalEvidence.substring(1).trim();
      }
    }

    if (!finalEvidence || finalEvidence.trim() === '') {
      if (parsedVerdict && parsedVerdict !== 'NEUTRAL') {
        finalEvidence = `Gemini determined the claim to be ${parsedVerdict} but did not provide detailed reasoning.`;
      } else {
        finalEvidence = 'Gemini did not provide a clear verdict or reasoning.';
      }
    }
    
    return {
      score, // Our mapped score
      label,
      evidence: finalEvidence,
      aiConfidence: parsedAiConfidence, // Use the parsed AI confidence
      rawResponse: text
    };
  } catch (error) {
    console.error('Error verifying claim with Gemini:', error);
    return {
      score: 0.5,
      label: 'neutral',
      evidence: 'Gemini API error or parsing failure.',
      aiConfidence: 0, // No confidence in case of error
      rawResponse: error instanceof Error ? error.message : String(error)
    };
  }
} 