import { VerificationResult } from './verification-pipeline';
import { VerificationStatus } from './verification-types';
import { verificationService } from './verification-service';
import {  } from './verify-claim';
import { migrationMonitor } from './migration-monitor';
import { v4 as uuidv4 } from 'uuid';
import { SourceType } from './source-reliability';

export class MigrationLayer {
  private useNewArchitecture: boolean = false;

  constructor() {
    // Enable new architecture gradually
    this.useNewArchitecture = process.env.USE_NEW_ARCHITECTURE === 'true';
  }

  public async verifyClaim(claim: string): Promise<VerificationResult> {
    const requestId = uuidv4();
    migrationMonitor.startRequest(requestId);

    try {
      let result: VerificationResult;
      
      if (this.useNewArchitecture) {
        // Use new architecture
        result = await verificationService.verifyClaim(claim);
      } else {
        // Use old architecture but convert to new format
        const oldResult = await (claim);
        result = this.convertOldToNewResult(oldResult);

        // Compare results if both architectures are available
        if (process.env.COMPARE_RESULTS === 'true') {
          const newResult = await verificationService.verifyClaim(claim);
          if (this.hasDiscrepancy(result, newResult)) {
            migrationMonitor.recordDiscrepancy();
            console.warn('Discrepancy found between old and new architectures:', {
              claim,
              oldResult: result,
              newResult
            });
          }
        }
      }

      migrationMonitor.endRequest(requestId, this.useNewArchitecture);
      return result;
    } catch (error) {
      migrationMonitor.endRequest(requestId, this.useNewArchitecture, error as Error);
      console.error('Error in migration layer:', error);
      return this.createErrorResult(claim);
    }
  }

  private hasDiscrepancy(oldResult: VerificationResult, newResult: VerificationResult): boolean {
    // Check for significant discrepancies
    if (oldResult.status !== newResult.status) return true;
    if (Math.abs(oldResult.confidence - newResult.confidence) > 0.2) return true;
    if (oldResult.evidence.length !== newResult.evidence.length) return true;
    
    return false;
  }

  private convertOldToNewResult(oldResult: any): VerificationResult {
    return {
      claim: oldResult.claim,
      status: this.convertOldStatus(oldResult.status),
      confidence: oldResult.confidence / 100, // Convert percentage to decimal
      evidence: this.convertOldEvidence(oldResult.evidence),
      sources: this.convertOldSources(oldResult.sources),
      timestamp: new Date(),
      explanation: oldResult.explanation || 'No explanation provided',
      metadata: {
        isTemporalClaim: this.isTemporalClaim(oldResult.claim),
        isFactualClaim: this.isFactualClaim(oldResult.claim),
        isPredictiveClaim: this.isPredictiveClaim(oldResult.claim),
        categories: this.extractCategories(oldResult.claim),
        contradictionRatio: 0,
        evidenceScores: []
      }
    };
  }

  private convertOldStatus(oldStatus: string): VerificationStatus {
    const statusMap: Record<string, VerificationStatus> = {
      'VERIFIED': VerificationStatus.VERIFIED,
      'FALSE': VerificationStatus.FALSE,
      'UNVERIFIED': VerificationStatus.UNVERIFIED,
      'DISPUTED': VerificationStatus.DISPUTED
    };
    return statusMap[oldStatus.toUpperCase() as keyof typeof statusMap] || VerificationStatus.UNVERIFIED;
  }

  private convertOldEvidence(oldEvidence: any[]): any[] {
    return oldEvidence.map(e => ({
      id: e.id || `old-${Date.now()}-${Math.random()}`,
      content: e.content || e.text || '',
      source: this.convertOldSource(e.source),
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      url: e.url || '',
      confidence: e.confidence || 0.5,
      categories: e.categories || [],
      metadata: {
        isPrimarySource: e.isPrimarySource || false,
        isDirectStatement: e.isDirectStatement || false,
        isOfficialDocument: e.isOfficialDocument || false,
        isResearch: e.isResearch || false,
        isNews: e.isNews || false
      }
    }));
  }

  private convertOldSources(oldSources: any[]): any[] {
    return oldSources.map(s => ({
      id: s.id || `old-source-${Date.now()}-${Math.random()}`,
      name: s.name || 'Unknown Source',
      type: this.convertOldSourceType(s.type),
      reliability: this.convertOldReliability(s.reliability),
      url: s.url || '',
      lastVerified: new Date(),
      verificationStatus: 'VERIFIED',
      categories: s.categories || [],
      metadata: {
        country: s.country,
        language: s.language || 'en',
        isGovernment: s.isGovernment || false,
        isAcademic: s.isAcademic || false,
        isFactChecker: s.isFactChecker || false,
        isNews: s.isNews || false
      }
    }));
  }

  private convertOldSource(oldSource: any): any {
    return {
      id: oldSource?.id || `old-source-${Date.now()}-${Math.random()}`,
      name: oldSource?.name || 'Unknown Source',
      type: this.convertOldSourceType(oldSource?.type),
      reliability: this.convertOldReliability(oldSource?.reliability),
      url: oldSource?.url || '',
      lastVerified: new Date(),
      verificationStatus: 'VERIFIED',
      categories: oldSource?.categories || [],
      metadata: {
        country: oldSource?.country,
        language: oldSource?.language || 'en',
        isGovernment: oldSource?.isGovernment || false,
        isAcademic: oldSource?.isAcademic || false,
        isFactChecker: oldSource?.isFactChecker || false,
        isNews: oldSource?.isNews || false
      }
    };
  }

  private convertOldSourceType(type: string): SourceType {
    const typeMap: Record<string, SourceType> = {
      'news': SourceType.NEWS,
      'academic': SourceType.ACADEMIC,
      'government': SourceType.GOVERNMENT,
      'fact_checker': SourceType.REFERENCE,
      'social_media': SourceType.OTHER,
      'other': SourceType.OTHER
    };
    return typeMap[type] || SourceType.OTHER;
  }

  private convertOldReliability(oldReliability: string): string {
    const reliabilityMap: Record<string, string> = {
      'VERIFIED': 'VERIFIED',
      'UNVERIFIED': 'UNVERIFIED'
    };
    return reliabilityMap[oldReliability?.toUpperCase() as keyof typeof reliabilityMap] || 'UNVERIFIED';
  }

  private isTemporalClaim(claim: string): boolean {
    const temporalIndicators = [
      'is', 'was', 'will be', 'going to',
      'current', 'former', 'previous',
      'now', 'then', 'future', 'past'
    ];
    return temporalIndicators.some(indicator => 
      claim.toLowerCase().includes(indicator)
    );
  }

  private isFactualClaim(claim: string): boolean {
    const factualIndicators = [
      'is', 'was', 'has', 'had',
      'contains', 'includes', 'consists of',
      'located in', 'based in', 'from'
    ];
    return factualIndicators.some(indicator => 
      claim.toLowerCase().includes(indicator)
    );
  }

  private isPredictiveClaim(claim: string): boolean {
    const predictiveIndicators = [
      'will', 'going to', 'plan to',
      'intend to', 'expected to', 'likely to',
      'may', 'might', 'could'
    ];
    return predictiveIndicators.some(indicator => 
      claim.toLowerCase().includes(indicator)
    );
  }

  private extractCategories(claim: string): string[] {
    const categories = new Set<string>();
    const lowerClaim = claim.toLowerCase();
    
    if (lowerClaim.includes('president')) {
      categories.add('politics');
      categories.add('government');
    }
    if (lowerClaim.includes('actor') || lowerClaim.includes('actress')) {
      categories.add('entertainment');
      categories.add('biography');
    }
    if (lowerClaim.includes('research') || lowerClaim.includes('study')) {
      categories.add('research');
      categories.add('academic');
    }
    
    return Array.from(categories);
  }

  private createErrorResult(claim: string): VerificationResult {
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

// Export a singleton instance
export const migrationLayer = new MigrationLayer(); 