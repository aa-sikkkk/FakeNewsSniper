import { VerificationResult, verificationPipeline } from './verification-pipeline';
import { VerificationStatus } from './verification-types';
import { Evidence } from './types';
import { evidenceGatherer } from './evidence-gatherer';
import { Source, sourceReliabilityManager } from './source-reliability';
import { env } from './env';

export class VerificationService {
  constructor() {}

  public async verifyClaim(claim: string): Promise<VerificationResult> {
    try {
      // Verify the claim using the pipeline
      const result = await verificationPipeline.verifyClaim(claim);

      // Log the verification result
      this.logVerificationResult(result);

      return result;
    } catch (error) {
      console.error('Error in verification service:', error);
      return {
        claim,
        status: VerificationStatus.UNVERIFIED,
        confidence: 0,
        evidence: [],
        sources: [],
        timestamp: new Date(),
        explanation: 'An error occurred while verifying this claim.',
        metadata: {
          isTemporalClaim: false,
          isFactualClaim: false,
          isPredictiveClaim: false,
          categories: [],
          contradictionRatio: 0,
          evidenceScores: []
        }
      };
    }
  }

  private logVerificationResult(result: VerificationResult): void {
    console.log('Verification Result:', {
      claim: result.claim,
      status: result.status,
      confidence: result.confidence,
      evidenceCount: result.evidence.length,
      sourceCount: result.sources.length,
      timestamp: result.timestamp,
      metadata: result.metadata
    });
  }

  public async getSourceReliability(sourceId: string): Promise<number> {
    const source = sourceReliabilityManager.getSource(sourceId);
    if (!source) {
      return 0;
    }
    return sourceReliabilityManager.getSourceReliabilityScore(source);
  }

  public async verifySource(sourceId: string): Promise<boolean> {
    const source = sourceReliabilityManager.getSource(sourceId);
    if (!source) {
      return false;
    }
    const status = await sourceReliabilityManager.verifySource(source);
    return status === VerificationStatus.VERIFIED;
  }

  public async getEvidenceForClaim(claim: string): Promise<Evidence[]> {
    const result = await evidenceGatherer.gatherEvidence(claim);
    return result.evidence;
  }

  public async getSourcesByCategory(category: string): Promise<Source[]> {
    return sourceReliabilityManager.getSourcesByCategory(category);
  }

  public async getSourcesByType(type: string): Promise<Source[]> {
    return sourceReliabilityManager.getSourcesByCategory(type);
  }

  public async getSourceCategories(): Promise<string[]> {
    const sources = await sourceReliabilityManager.getSourcesByCategory('');
    return [...new Set(sources.map(source => source.categories).flat())];
  }
}

// Export a singleton instance
export const verificationService = new VerificationService(); 