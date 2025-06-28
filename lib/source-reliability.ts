import { env } from './env';
import { VerificationStatus } from './verification-types';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  reliability: ReliabilityLevel;
  url: string;
  lastVerified: Date;
  verificationStatus: VerificationStatus;
  categories: string[];
  metadata: {
    country?: string;
    language?: string;
    isGovernment?: boolean;
    isAcademic?: boolean;
    isFactChecker?: boolean;
    isNews?: boolean;
    isReference?: boolean;
    isAI?: boolean;
  };
}

export enum SourceType {
  NEWS = 'NEWS',
  ACADEMIC = 'ACADEMIC',
  GOVERNMENT = 'GOVERNMENT',
  REFERENCE = 'REFERENCE',
  OTHER = 'OTHER'
}

export enum ReliabilityLevel {
  PRIMARY = 'PRIMARY',           // Highest reliability (official sources)
  VERIFIED = 'VERIFIED',         // High reliability (fact-checkers)
  MODERATE = 'MODERATE',         // Medium reliability (reputable but not authoritative)
  ESTABLISHED = 'ESTABLISHED',   // Medium-high reliability (major news)
  CORROBORATED = 'CORROBORATED', // Medium reliability (multiple sources)
  UNVERIFIED = 'UNVERIFIED'      // Lowest reliability
}

export class SourceReliabilityManager {
  private sources: Map<string, Source>;
  private readonly VERIFICATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.sources = new Map();
    this.initializeDefaultSources();
  }

  private initializeDefaultSources() {
    // Government Sources
    this.addSource({
      id: 'whitehouse-gov',
      name: 'The White House',
      type: SourceType.GOVERNMENT,
      reliability: ReliabilityLevel.PRIMARY,
      url: 'https://www.whitehouse.gov',
      lastVerified: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
      categories: ['government', 'politics', 'policy'],
      metadata: {
        country: 'USA',
        language: 'en',
        isGovernment: true
      }
    });

    // Fact Checkers
    this.addSource({
      id: 'snopes',
      name: 'Snopes',
      type: SourceType.REFERENCE,
      reliability: ReliabilityLevel.VERIFIED,
      url: 'https://www.snopes.com',
      lastVerified: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
      categories: ['fact-checking', 'reference'],
      metadata: {
        country: 'USA',
        language: 'en',
        isFactChecker: true,
        isReference: true
      }
    });

    this.addSource({
      id: 'factcheck-org',
      name: 'FactCheck.org',
      type: SourceType.REFERENCE,
      reliability: ReliabilityLevel.VERIFIED,
      url: 'https://www.factcheck.org',
      lastVerified: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
      categories: ['fact-checking', 'reference'],
      metadata: {
        country: 'USA',
        language: 'en',
        isFactChecker: true,
        isReference: true
      }
    });

    this.addSource({
      id: 'reuters-factcheck',
      name: 'Reuters Fact Check',
      type: SourceType.REFERENCE,
      reliability: ReliabilityLevel.VERIFIED,
      url: 'https://www.reuters.com/fact-check',
      lastVerified: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
      categories: ['fact-checking', 'news', 'reference'],
      metadata: {
        country: 'UK',
        language: 'en',
        isFactChecker: true,
        isNews: true,
        isReference: true
      }
    });

    // News Sources
    this.addSource({
      id: 'reuters',
      name: 'Reuters',
      type: SourceType.NEWS,
      reliability: ReliabilityLevel.ESTABLISHED,
      url: 'https://www.reuters.com',
      lastVerified: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
      categories: ['news', 'business', 'politics'],
      metadata: {
        country: 'UK',
        language: 'en',
        isNews: true
      }
    });

    // Academic Sources
    this.addSource({
      id: 'arxiv',
      name: 'arXiv',
      type: SourceType.ACADEMIC,
      reliability: ReliabilityLevel.VERIFIED,
      url: 'https://arxiv.org',
      lastVerified: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
      categories: ['academic', 'research', 'science'],
      metadata: {
        language: 'en',
        isAcademic: true
      }
    });
  }

  public addSource(source: Source): void {
    this.sources.set(source.id, source);
  }

  public getSource(sourceId: string): Source | undefined {
    return this.sources.get(sourceId);
  }

  public getSourcesByReliability(reliability: ReliabilityLevel): Source[] {
    return Array.from(this.sources.values())
      .filter(source => source.reliability === reliability);
  }

  private async checkAccessibility(source: Source): Promise<boolean> {
    try {
      const response = await fetch(source.url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'FactCheckBot/1.0'
        }
      });
      return response.ok;
    } catch (error) {
      console.error(`Failed to check accessibility for source ${source.id}:`, error);
      return false;
    }
  }

  private async checkContent(source: Source): Promise<boolean> {
    try {
      const response = await fetch(source.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'FactCheckBot/1.0'
        }
      });
      
      if (!response.ok) return false;
      
      const contentType = response.headers.get('content-type') || '';
      return contentType.includes('text/html') || contentType.includes('application/json');
    } catch (error) {
      console.error(`Failed to check content for source ${source.id}:`, error);
      return false;
    }
  }

  private async checkSSL(source: Source): Promise<boolean> {
    try {
      const url = new URL(source.url);
      return url.protocol === 'https:';
    } catch (error) {
      console.error(`Failed to check SSL for source ${source.id}:`, error);
      return false;
    }
  }

  public async verifySource(source: Source): Promise<VerificationStatus> {
    try {
      // Add more verification steps
      const [accessibility, content, ssl] = await Promise.all([
        this.checkAccessibility(source),
        this.checkContent(source),
        this.checkSSL(source)
      ]);

      // Combine results
      const isVerified = accessibility && content && ssl;
      
      // Update source verification status
      source.lastVerified = new Date();
      source.verificationStatus = isVerified ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED;
      this.sources.set(source.id, source);

      return source.verificationStatus;
    } catch (error) {
      console.error(`Failed to verify source ${source.id}:`, error);
      return VerificationStatus.UNVERIFIED;
    }
  }

  public async verifyAllSources(): Promise<void> {
    const verificationPromises = Array.from(this.sources.values())
      .filter(source => {
        const timeSinceLastVerification = Date.now() - source.lastVerified.getTime();
        return timeSinceLastVerification > this.VERIFICATION_INTERVAL;
      })
      .map(source => this.verifySource(source));

    await Promise.all(verificationPromises);
  }

  public getSourceReliabilityScore(source: Source): number {
    const baseScores = {
      [ReliabilityLevel.PRIMARY]: 1.0,
      [ReliabilityLevel.VERIFIED]: 0.9,
      [ReliabilityLevel.MODERATE]: 0.75,
      [ReliabilityLevel.ESTABLISHED]: 0.8,
      [ReliabilityLevel.CORROBORATED]: 0.6,
      [ReliabilityLevel.UNVERIFIED]: 0.3
    };

    let score = baseScores[source.reliability];

    // Adjust score based on verification status
    if (source.verificationStatus === VerificationStatus.VERIFIED) {
      score *= 1.1;
    } else if (source.verificationStatus === VerificationStatus.UNVERIFIED) {
      score *= 0.5;
    }

    // Adjust score based on metadata
    if (source.metadata.isGovernment) {
      score *= 1.2;
    }
    if (source.metadata.isFactChecker) {
      // Give higher weight to fact-checking sources
      score *= 1.3;
      
      // Additional boost for established fact-checking organizations
      if (source.name.toLowerCase().includes('snopes') || 
          source.name.toLowerCase().includes('factcheck.org') ||
          source.name.toLowerCase().includes('reuters fact check')) {
        score *= 1.1;
      }
    }
    if (source.metadata.isAcademic) {
      score *= 1.1;
    }
    if (source.metadata.isNews && source.metadata.isReference) {
      // Boost for news organizations with fact-checking departments
      score *= 1.15;
    }

    // Cap the final score at 1.0
    return Math.min(1.0, score);
  }

  public getSourcesByCategory(category: string): Source[] {
    return Array.from(this.sources.values())
      .filter(source => source.categories.includes(category));
  }
}

// Export a singleton instance
export const sourceReliabilityManager = new SourceReliabilityManager(); 