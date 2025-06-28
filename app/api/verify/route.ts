import { NextResponse } from 'next/server';
import { queryGoogleFactCheck } from '@/lib/google-factcheck';
import { VerificationResult } from '@/lib/verification-pipeline';
import { VerificationStatus } from '@/lib/verification-types';
import { SourceType, ReliabilityLevel } from '@/lib/source-reliability';
import { evidenceGatherer } from '@/lib/evidence-gatherer';

export async function POST(request: Request) {
  try {
    const { claim } = await request.json();
    
    // Get fact check results
    const factCheckResults = await queryGoogleFactCheck(claim);
    console.log('Fact Check Results:', JSON.stringify(factCheckResults, null, 2));
    
    // Create verification result
    const result: VerificationResult = {
      claim,
      status: VerificationStatus.UNVERIFIED,
      confidence: 0,
      evidence: [],
      sources: [],
      timestamp: new Date(),
      explanation: '',
      metadata: {
        isTemporalClaim: false,
        isFactualClaim: true,
        isPredictiveClaim: false,
        categories: [],
        contradictionRatio: 0,
        evidenceScores: []
      }
    };

    // If we have fact check results, update the verification result
    if (factCheckResults && factCheckResults.length > 0) {
      const latestFactCheck = factCheckResults[0];
      if (latestFactCheck.claimReview && latestFactCheck.claimReview.length > 0) {
        const latestReview = latestFactCheck.claimReview[0];
        
        // Update the verification result with fact check information
        const normalizedRating = latestReview.textualRating.toLowerCase();
        let status: VerificationStatus;
        
        // Extract the first word of the rating (before any period or additional text)
        const firstWord = normalizedRating.split(/[.\s]/)[0];
        console.log('Fact Check Rating:', { normalizedRating, firstWord });
        
        // Check for false claims first
        if (firstWord === 'false' || normalizedRating.includes('incorrect') || normalizedRating.includes('wrong')) {
          status = VerificationStatus.FALSE;
          result.confidence = 0.95; // High confidence for false claims
          result.explanation = `This claim has been fact-checked and found to be FALSE by ${latestReview.publisher?.name || 'Unknown'}. According to the review: "${latestReview.title}". This is a high-confidence verification based on professional fact-checking.`;
        } else if (firstWord === 'true' || normalizedRating.includes('correct') || normalizedRating.includes('verified')) {
          status = VerificationStatus.VERIFIED;
          result.confidence = 0.95; // High confidence for verified claims
          result.explanation = `This claim has been fact-checked and verified as TRUE by ${latestReview.publisher?.name || 'Unknown'}. According to the review: "${latestReview.title}". This is a high-confidence verification based on professional fact-checking.`;
        } else {
          status = VerificationStatus.DISPUTED;
          result.confidence = 0.7; // Lower confidence for disputed claims
          result.explanation = `This claim has been fact-checked and found to be DISPUTED by ${latestReview.publisher?.name || 'Unknown'}. According to the review: "${latestReview.title}".`;
        }
        
        result.status = status;
        
        // Add the fact check as evidence
        result.evidence.push({
          id: `factcheck-${Date.now()}`,
          content: `Claim: ${claim}\n\nFact Check: ${latestReview.title}\nRating: ${firstWord.toUpperCase()}\nPublisher: ${latestReview.publisher?.name || 'Unknown'}\nReview Date: ${new Date(latestReview.reviewDate).toLocaleDateString()}\n\n${latestReview.textualRating}`,
          source: {
            id: latestReview.publisher?.name || 'Unknown',
            name: latestReview.publisher?.name || 'Unknown',
            type: SourceType.REFERENCE,
            reliability: ReliabilityLevel.VERIFIED,
            url: latestReview.url,
            lastVerified: new Date(),
            verificationStatus: VerificationStatus.VERIFIED,
            categories: ['fact-checking'],
            metadata: {
              isFactChecker: true
            }
          },
          timestamp: new Date(latestReview.reviewDate),
          url: latestReview.url,
          confidence: 0.95,
          categories: ['fact-checking'],
          metadata: {
            originalClaim: claim,
            isContradictory: firstWord === 'false',
            isPrimarySource: true,
            isDirectStatement: true
          }
        });
        
        // Add the fact check source
        result.sources.push({
          id: latestReview.publisher?.name || 'Unknown',
          name: latestReview.publisher?.name || 'Unknown',
          type: SourceType.REFERENCE,
          reliability: ReliabilityLevel.VERIFIED,
          url: latestReview.url,
          lastVerified: new Date(),
          verificationStatus: VerificationStatus.VERIFIED,
          categories: ['fact-checking'],
          metadata: {
            isFactChecker: true
          }
        });

        // Return immediately after processing fact check
        return NextResponse.json(result);
      }
    }

    // Only proceed with other evidence if no fact check results were found
    if (!factCheckResults || factCheckResults.length === 0) {
      const evidenceResult = await evidenceGatherer.gatherEvidence(claim);
      if (evidenceResult.evidence.length > 0) {
        result.evidence = evidenceResult.evidence;
        result.sources = evidenceResult.evidence.map(e => e.source);
        result.confidence = evidenceResult.reliabilityScore;
        result.explanation = `This claim has been verified using ${evidenceResult.totalSources} source${evidenceResult.totalSources > 1 ? 's' : ''}.`;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in verify route:', error);
    return NextResponse.json(
      { error: 'Failed to verify claim' },
      { status: 500 }
    );
  }
}