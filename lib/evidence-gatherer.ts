import { Source, SourceType, ReliabilityLevel, sourceReliabilityManager } from './source-reliability';
import { VerificationStatus } from './verification-types';
import { env } from './env';
import { getEvidenceForClaim } from './wikipedia';
import { verifyClaimWithNLI, extractEvidenceWithQA } from './huggingface';
import { verifyClaimWithOpenAI, extractEvidenceWithOpenAI } from './openai';
import { getNewsEvidence } from './newsapi';
import { Evidence, EvidenceResult, HuggingFaceVerification } from '@/lib/types';
import { searchWikipedia, getWikipediaArticle } from './wikipedia';
import { queryGoogleFactCheck } from './google-factcheck';

interface WikipediaSearchResult {
  title: string;
  snippet: string;
}

export class EvidenceGatherer {
  private readonly MIN_EVIDENCE_LENGTH = 20; // Lowered from 50 to allow shorter but valid evidence
  private readonly MAX_EVIDENCE_LENGTH = 5000; // Increased from 1000 to allow longer Wikipedia content
  private readonly REQUIRED_SOURCE_TYPES = [
    SourceType.NEWS,
    SourceType.ACADEMIC,
    SourceType.GOVERNMENT,
    SourceType.REFERENCE
  ];

  constructor() {}

  public async gatherEvidence(claim: string): Promise<EvidenceResult> {
    try {
      // For factual claims, prioritize Wikipedia
      console.log('Gathering evidence...');
      const isFactualClaim = this.isFactualClaim(claim);
      
      // Always gather Wikipedia evidence first for factual claims
      const wikipediaEvidence = await this.gatherFromWikipedia(claim);
      
      // If we have good Wikipedia evidence, use it as primary source
      if (isFactualClaim && wikipediaEvidence.length > 0) {
        console.log('Found Wikipedia evidence for factual claim:', wikipediaEvidence);
        return {
          evidence: wikipediaEvidence,
          reliabilityScore: 0.9, // High reliability for Wikipedia
          totalSources: wikipediaEvidence.length,
          timestamp: new Date()
        };
      }
      
      // For non-factual claims or if Wikipedia doesn't have good results, try fact-checking
      console.log('Checking fact-checking sources...');
      const factCheckEvidence = await this.gatherFromFactCheckSources(claim);
      
      if (factCheckEvidence.length > 0) {
        console.log('Found fact check evidence:', factCheckEvidence);
        return {
          evidence: factCheckEvidence,
          reliabilityScore: 0.85, // Slightly lower than Wikipedia
          totalSources: factCheckEvidence.length,
          timestamp: new Date()
        };
      }

      // If no Wikipedia or fact-check evidence, gather from other sources
      console.log('No primary evidence found, checking other sources...');
      const [newsEvidence, referenceEvidence] = await Promise.all([
        this.gatherFromNewsSources(claim),
        this.gatherFromReferenceSources(claim)
      ]);

      const allEvidence = [...wikipediaEvidence, ...newsEvidence, ...referenceEvidence];
      
      return {
        evidence: allEvidence,
        reliabilityScore: this.calculateReliabilityScore(allEvidence),
        totalSources: allEvidence.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error gathering evidence:', error);
      return {
        evidence: [],
        reliabilityScore: 0,
        totalSources: 0,
        timestamp: new Date()
      };
    }
  }

  private async gatherFromWikipedia(claim: string): Promise<Evidence[]> {
    try {
      const evidence: Evidence[] = [];
      const searchResults = await searchWikipedia(claim);
      
      if (searchResults.results && searchResults.results.length > 0) {
        const topResult = searchResults.results[0];
        const article = await getWikipediaArticle(topResult.title);
        
        if (article) {
          evidence.push({
            id: `wiki-${Date.now()}`,
            content: article.content,
            source: {
              id: 'wikipedia',
              name: 'Wikipedia',
              type: SourceType.REFERENCE,
              reliability: ReliabilityLevel.VERIFIED,
              url: article.url,
              lastVerified: new Date(),
              verificationStatus: VerificationStatus.VERIFIED,
              categories: ['reference', 'encyclopedia'],
              metadata: {
                language: 'en',
                isReference: true
              }
            },
            timestamp: new Date(),
            url: article.url,
            confidence: 0.9,
            categories: ['reference', 'encyclopedia'],
            metadata: {
              originalClaim: claim,
              isDirectStatement: true,
              isOfficialDocument: false,
              isPrimarySource: false
            }
          });
        }
      }
      
      return evidence;
    } catch (error) {
      console.error('Error gathering from Wikipedia:', error);
      return [];
    }
  }

  private async gatherFromSourceType(claim: string, sourceType: SourceType): Promise<Evidence[]> {
    try {
      switch (sourceType) {
        case SourceType.REFERENCE:
          return await this.gatherFromReferenceSources(claim);
        case SourceType.ACADEMIC:
          return await this.gatherFromAcademicSources(claim);
        case SourceType.NEWS:
          return await this.gatherFromNewsSources(claim);
        case SourceType.GOVERNMENT:
          return await this.gatherFromGovernmentSources(claim);
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error gathering evidence from ${sourceType}:`, error);
      return [];
    }
  }

  private async gatherFromReferenceSources(claim: string): Promise<Evidence[]> {
    try {
      const evidence: Evidence[] = [];
      const lowerClaim = claim.toLowerCase();

      // For historical claims about specific figures, use more targeted search
      if (this.isHistoricalFigureClaim(claim)) {
        const searchVariations = this.generateHistoricalSearchVariations(claim);
        const searchResults = await Promise.all(
          searchVariations.map(variation => searchWikipedia(variation))
        );

        // Filter and combine results
        const validResults = searchResults
          .flatMap(result => result.results)
          .filter(result => this.isRelevantHistoricalEvidence(result, claim));

        if (validResults.length > 0) {
          // Get the most relevant article
          const topResult = validResults[0];
          const article = await getWikipediaArticle(topResult.title);
          
          if (article) {
            const isSnopes = topResult.title.toLowerCase().includes('snopes');
            evidence.push({
              id: `wiki-${Date.now()}`,
              content: article.content,
              source: {
                id: isSnopes ? 'snopes' : 'wikipedia',
                name: isSnopes ? 'Snopes' : 'Wikipedia',
                type: SourceType.REFERENCE,
                reliability: ReliabilityLevel.VERIFIED,
                url: article.url,
                lastVerified: new Date(),
                verificationStatus: VerificationStatus.VERIFIED,
                categories: ['reference', 'encyclopedia'],
                metadata: {
                  language: 'en',
                  isReference: true,
                  ...(isSnopes ? { isFactChecker: true } : {})
                }
              },
              timestamp: new Date(),
              url: article.url,
              confidence: 0.9,
              categories: ['reference', 'encyclopedia'],
              metadata: {
                originalClaim: claim,
                isDirectStatement: true,
                isOfficialDocument: false,
                isPrimarySource: false
              }
            });
          }
        }
      } else {
        // Regular search for non-historical claims
        const searchResults = await searchWikipedia(claim);
        if (searchResults.results.length > 0) {
          const topResult = searchResults.results[0];
          const article = await getWikipediaArticle(topResult.title);
          
          if (article) {
            const isSnopes = topResult.title.toLowerCase().includes('snopes');
            evidence.push({
              id: `wiki-${Date.now()}`,
              content: article.content,
              source: {
                id: isSnopes ? 'snopes' : 'wikipedia',
                name: isSnopes ? 'Snopes' : 'Wikipedia',
                type: SourceType.REFERENCE,
                reliability: ReliabilityLevel.VERIFIED,
                url: article.url,
                lastVerified: new Date(),
                verificationStatus: VerificationStatus.VERIFIED,
                categories: ['reference', 'encyclopedia'],
                metadata: {
                  language: 'en',
                  isReference: true,
                  ...(isSnopes ? { isFactChecker: true } : {})
                }
              },
              timestamp: new Date(),
              url: article.url,
              confidence: 0.9,
              categories: ['reference', 'encyclopedia'],
              metadata: {
                originalClaim: claim,
                isDirectStatement: true,
                isOfficialDocument: false,
                isPrimarySource: false
              }
            });
          }
        }
      }

      return evidence;
    } catch (error) {
      console.error('Error gathering evidence from reference sources:', error);
      return [];
    }
  }

  private isHistoricalFigureClaim(claim: string): boolean {
    const historicalFigures = [
      'napoleon', 'bonaparte', 'emperor', 'king', 'queen',
      'president', 'caesar', 'alexander', 'cleopatra'
    ];
    
    return historicalFigures.some(figure => 
      claim.toLowerCase().includes(figure)
    );
  }

  private generateHistoricalSearchVariations(claim: string): string[] {
    const variations = [];
    const lowerClaim = claim.toLowerCase();

    // For Napoleon's height specifically
    if (lowerClaim.includes('napoleon') && lowerClaim.includes('short')) {
      variations.push(
        'Napoleon Bonaparte height',
        'Napoleon I height',
        'Emperor Napoleon height',
        'Napoleon Bonaparte stature',
        'Napoleon height myth',
        'Napoleon Bonaparte physical appearance'
      );
    } else {
      // For other historical figures
      const figure = this.extractHistoricalFigure(claim);
      if (figure) {
        variations.push(
          figure,
          `${figure} biography`,
          `${figure} historical facts`
        );
      }
    }

    return variations;
  }

  private extractHistoricalFigure(claim: string): string | null {
    const historicalFigures = [
      'napoleon bonaparte',
      'napoleon',
      'bonaparte',
      'emperor napoleon'
    ];

    for (const figure of historicalFigures) {
      if (claim.toLowerCase().includes(figure)) {
        return figure;
      }
    }

    return null;
  }

  private isRelevantHistoricalEvidence(result: any, claim: string): boolean {
    const title = result.title.toLowerCase();
    const snippet = result.snippet.toLowerCase();
    const lowerClaim = claim.toLowerCase();

    // For Napoleon's height specifically
    if (lowerClaim.includes('napoleon') && lowerClaim.includes('short')) {
      // Must be about Napoleon Bonaparte, not other Napoleons
      const isAboutNapoleonBonaparte = 
        title.includes('napoleon bonaparte') || 
        title.includes('emperor napoleon') ||
        title.includes('napoleon i');

      // Must not be about other Napoleons
      const isNotOtherNapoleon = 
        !title.includes('napoleon iii') && 
        !title.includes('napoleon-jérôme') &&
        !title.includes('plon-plon');

      // Must contain relevant terms
      const hasRelevantTerms = 
        snippet.includes('height') || 
        snippet.includes('stature') || 
        snippet.includes('physical') ||
        snippet.includes('appearance') ||
        snippet.includes('myth');

      return isAboutNapoleonBonaparte && isNotOtherNapoleon && hasRelevantTerms;
    }

    return true;
  }

  private extractRelevantSection(text: string, claim: string): string {
    // Split the text into paragraphs
    const paragraphs = text.split('\n\n');
    
    // Find the most relevant paragraph
    const claimTerms = this.extractKeyTerms(claim);
    let bestParagraph = paragraphs[0];
    let bestScore = 0;

    for (const paragraph of paragraphs) {
      const score = this.calculateRelevanceScore(paragraph, paragraph, claimTerms);
      
      if (score > bestScore) {
        bestScore = score;
        bestParagraph = paragraph;
      }
    }

    // If we found a highly relevant paragraph, return it
    if (bestScore >= claimTerms.length) {
      return bestParagraph;
    }

    // Otherwise, return the first paragraph (usually contains the most important information)
    return paragraphs[0];
  }

  private extractKeyTerms(claim: string): string[] {
    // Remove common words and split into terms
    const commonWords = new Set(['is', 'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return claim.toLowerCase()
      .split(/\s+/)
      .filter((term: string) => !commonWords.has(term) && term.length > 2);
  }

  private calculateRelevanceScore(title: string, content: string, keyTerms: string[]): number {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    return keyTerms.reduce((score, term) => {
      // Give more weight to matches in the title
      const titleMatches = (titleLower.match(new RegExp(term, 'g')) || []).length;
      const contentMatches = (contentLower.match(new RegExp(term, 'g')) || []).length;
      
      return score + (titleMatches * 2) + contentMatches;
    }, 0);
  }

  private async gatherFromOtherReferenceSources(claim: string): Promise<Evidence[]> {
    // Implementation for other reference sources (e.g., Britannica, official websites)
    return [];
  }

  private async gatherFromAcademicSources(claim: string): Promise<Evidence[]> {
    // Implementation for academic sources (e.g., research papers, academic databases)
    return [];
  }

  private async gatherFromNewsSources(claim: string): Promise<Evidence[]> {
    try {
      const { articles } = await getNewsEvidence(claim) as any; // Assuming getNewsEvidence now returns articles array directly
      
      if (!articles || articles.length === 0) {
        return [];
      }

      const evidence: Evidence[] = [];
      const personName = this.extractPersonName(claim);
      const isBiographical = this.isBiographicalClaim(claim);
      const claimTerms = this.extractKeyTerms(claim); // Also get key terms for general filtering

      for (const article of articles) {
        const title = article.title?.toLowerCase() || '';
        const content = article.content?.toLowerCase() || article.description?.toLowerCase() || '';
        
        let isRelevant = false;

        if (isBiographical && personName) {
          // For biographical claims, stricter check
          const mentionsName = title.includes(personName) || content.includes(personName);
          const nameMentionCount = (content.match(new RegExp(personName, 'g')) || []).length;
          isRelevant = mentionsName && nameMentionCount > 2; // Require at least 3 mentions
        } else {
          // For non-biographical claims, check for key terms
          isRelevant = claimTerms.some(term => 
            title.includes(term) || content.includes(term)
          );
        }

        if (isRelevant) {
          // Extract relevant section from the *article's* content
          const relevantContent = this.extractRelevantSection(article.content || article.description || '', claim);
          
          // Only add evidence if relevant content is found and meets minimum length
          if (relevantContent.length >= this.MIN_EVIDENCE_LENGTH) {
            evidence.push({
              id: `news-${Date.now()}-${evidence.length}`,
              content: relevantContent,
              source: {
                id: `news-${article.source.name}`,
                name: article.source.name,
                type: SourceType.NEWS,
                reliability: ReliabilityLevel.ESTABLISHED,
                url: article.url,
                lastVerified: new Date(article.publishedAt),
                verificationStatus: VerificationStatus.VERIFIED,
                categories: ['news', 'media'],
                metadata: {
                  language: article.language || 'en', // Assuming API provides language
                  isNews: true
                }
              },
              timestamp: new Date(article.publishedAt),
              url: article.url,
              confidence: 0.7, // Base confidence for news
              categories: ['news', 'media'],
              metadata: {
                isNews: true,
                isPrimarySource: false
              }
            });
          }
        }
      }

      return evidence;
    } catch (error) {
      console.error('Error gathering from news sources:', error);
      return [];
    }
  }

  private extractPersonName(claim: string): string {
    // Extract the person's name from the claim (assuming name is before ' is ')
    const parts = claim.toLowerCase().split(' is ');
    return parts.length > 0 ? parts[0].trim() : '';
  }

  private async gatherFromGovernmentSources(claim: string): Promise<Evidence[]> {
    // Implementation for government sources (e.g., official records, public databases)
    return [];
  }

  private async gatherFromHuggingFace(claim: string): Promise<Evidence[]> {
    try {
      // Try OpenAI first
      const openAIResult = await verifyClaimWithOpenAI(claim);
      
      if (openAIResult.score > 0.7) {
        return [{
          id: `openai-${Date.now()}`,
          content: openAIResult.evidence || claim,
          source: {
            id: 'openai-gpt',
            name: 'OpenAI GPT',
            type: SourceType.REFERENCE,
            reliability: ReliabilityLevel.VERIFIED,
            url: 'https://openai.com',
            lastVerified: new Date(),
            verificationStatus: VerificationStatus.VERIFIED,
            categories: ['ai', 'verification'],
            metadata: {
              isReference: true,
              isAI: true
            }
          },
          timestamp: new Date(),
          url: 'https://openai.com',
          confidence: openAIResult.score,
          categories: ['ai', 'verification'],
          metadata: {
            isReference: true,
            isAI: true
          }
        }];
      }

      // Fallback to HuggingFace if OpenAI confidence is low
      const verification = await verifyClaimWithNLI(claim);
      
      if (!verification || verification.label === 'neutral') {
        return [];
      }

      return [{
        id: `huggingface-${Date.now()}`,
        content: verification.evidence || claim,
        source: {
          id: 'huggingface-nli',
          name: 'HuggingFace NLI',
          type: SourceType.REFERENCE,
          reliability: ReliabilityLevel.VERIFIED,
          url: 'https://huggingface.co',
          lastVerified: new Date(),
          verificationStatus: VerificationStatus.VERIFIED,
          categories: ['ai', 'verification'],
          metadata: {
            isReference: true,
            isAI: true
          }
        },
        timestamp: new Date(),
        url: 'https://huggingface.co',
        confidence: verification.score || 0.7,
        categories: ['ai', 'verification'],
        metadata: {
          isReference: true,
          isAI: true
        }
      }];
    } catch (error) {
      console.error('Error gathering from AI models:', error);
      return [];
    }
  }

  private validateEvidence(evidence: Evidence[]): Evidence[] {
    // Remove duplicates based on content
    const uniqueEvidence = Array.from(new Map(
      evidence.map(e => [e.content, e])
    ).values());

    return uniqueEvidence.filter(e => {
      // Check evidence length
      if (e.content.length < this.MIN_EVIDENCE_LENGTH) {
        console.log(`Evidence too short: ${e.content.length} characters (minimum: ${this.MIN_EVIDENCE_LENGTH})`);
        return false;
      }
      if (e.content.length > this.MAX_EVIDENCE_LENGTH) {
        console.log(`Evidence too long: ${e.content.length} characters (maximum: ${this.MAX_EVIDENCE_LENGTH})`);
        return false;
      }

      // Check source reliability
      const reliabilityScore = sourceReliabilityManager.getSourceReliabilityScore(e.source);
      if (reliabilityScore < 0.5) {
        console.log(`Source reliability too low: ${reliabilityScore} (minimum: 0.5)`);
        return false;
      }

      // Check for recent verification
      const verificationAge = Date.now() - new Date(e.source.lastVerified).getTime();
      if (verificationAge > 30 * 24 * 60 * 60 * 1000) { // 30 days
        console.log(`Source verification too old: ${verificationAge}ms (maximum: 30 days)`);
        return false;
      }

      // For Wikipedia sources, be more lenient with verification age
      if (e.source.type === SourceType.REFERENCE && e.source.name.toLowerCase().includes('wikipedia')) {
        return true;
      }

      return true;
    });
  }

  private calculateReliabilityScore(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    const sourceScores = evidence.map(e => {
      let score = sourceReliabilityManager.getSourceReliabilityScore(e.source);
      
      // Boost score for biographical evidence from reference sources
      if (e.metadata.isBiographical && e.source.type === SourceType.REFERENCE) {
        score = Math.min(score * 1.2, 0.95);
      }
      
      // Boost score for Wikipedia sources
      if (e.source.type === SourceType.REFERENCE && e.source.name.toLowerCase().includes('wikipedia')) {
        score = Math.min(score * 1.1, 0.95);
      }
      
      // Boost score for primary sources
      if (e.metadata.isPrimarySource) {
        score = Math.min(score * 1.1, 0.95);
      }
      
      return score;
    });
    
    const averageSourceScore = sourceScores.reduce((a, b) => a + b, 0) / sourceScores.length;

    const sourceTypeDiversity = new Set(evidence.map(e => e.source.type)).size;
    const diversityScore = sourceTypeDiversity / this.REQUIRED_SOURCE_TYPES.length;

    return (averageSourceScore * 0.7) + (diversityScore * 0.3);
  }

  private extractUniqueSources(evidence: Evidence[]): Source[] {
    const sourceMap = new Map<string, Source>();
    evidence.forEach(e => {
      if (!sourceMap.has(e.source.id)) {
        sourceMap.set(e.source.id, e.source);
      }
    });
    return Array.from(sourceMap.values());
  }

  private isBiographicalClaim(claim: string): boolean {
    const biographicalPatterns = [
      /born\s+\w+\s+\d{1,2},\s+\d{4}/i,  // Born date pattern
      /is\s+an?\s+\w+\s+(?:actor|actress|musician|singer|writer|director|producer)/i,  // Profession pattern
      /from\s+\w+(?:\s+\w+)*/i,  // Origin pattern
      /\d{4}\s*-\s*present/i,  // Career span pattern
      /(?:actor|actress|musician|singer|writer|director|producer)\s+(?:known|famous|renowned|celebrated)/i,  // Fame pattern
      /(?:starred|appeared|performed|released)\s+in/i  // Career achievement pattern
    ];
    
    return biographicalPatterns.some(pattern => pattern.test(claim));
  }

  private async gatherBasicReferenceEvidence(claim: string): Promise<Evidence[]> {
    try {
      // Create a basic reference evidence with the claim itself
      return [{
        id: `basic-${Date.now()}`,
        content: claim,
        source: {
          id: 'basic-reference',
          name: 'Basic Reference',
          type: SourceType.REFERENCE,
          reliability: ReliabilityLevel.UNVERIFIED,
          url: '',
          lastVerified: new Date(),
          verificationStatus: VerificationStatus.PENDING,
          categories: ['reference'],
          metadata: {
            language: 'en',
            isReference: true
          }
        },
        timestamp: new Date(),
        url: '',
        confidence: 0.3,
        categories: ['reference'],
        metadata: {
          originalClaim: claim,
          isReference: true,
          isPrimarySource: false,
          isDirectStatement: true
        }
      }];
    } catch (error) {
      console.error('Error gathering basic reference evidence:', error);
      return [];
    }
  }

  private isNewsClaim(claim: string): boolean {
    const newsPatterns = [
      /(?:today|yesterday|tomorrow|this week|last week|next week)/i,
      /(?:announced|reported|revealed|disclosed|unveiled)/i,
      /(?:breaking|latest|recent|new)/i,
      /\d{1,2}\s+(?:hours|days|weeks|months)\s+ago/i,
      /(?:just|recently|lately)/i
    ];
    return newsPatterns.some(pattern => pattern.test(claim));
  }

  private isFactualClaim(claim: string): boolean {
    const factualIndicators = [
      'is the', 'are the', 'was the', 'were the', 
      'is a', 'are a', 'was a', 'were a',
      'is an', 'are an', 'was an', 'were an',
      'current', 'currently', 'now', 'present', 'currently',
      'president', 'prime minister', 'leader', 'mayor', 'governor',
      'population', 'capital', 'currency', 'language', 'religion'
    ];
    
    const lowerClaim = claim.toLowerCase();
    return factualIndicators.some(indicator => lowerClaim.includes(indicator));
  }

  private isScientificClaim(claim: string): boolean {
    const scientificPatterns = [
      /(?:research|study|experiment|scientific|scientists)/i,
      /(?:proven|discovered|found|observed|measured)/i,
      /(?:memory|cognition|behavior|intelligence|learning)/i,
      /(?:animal|fish|bird|mammal|reptile)/i,
      /(?:brain|neural|psychological|biological)/i
    ];
    return scientificPatterns.some(pattern => pattern.test(claim));
  }

  private async gatherFromFactCheckSources(claim: string): Promise<Evidence[]> {
    try {
      const factCheckResults = await queryGoogleFactCheck(claim);
      console.log('Fact check results:', factCheckResults);

      if (!factCheckResults || factCheckResults.length === 0) {
        return [];
      }

      return factCheckResults.flatMap(result => {
        if (!result.claimReview || result.claimReview.length === 0) {
          return [];
        }

        // Find the most recent review
        const latestReview = result.claimReview.reduce((latest, current) => {
          const currentDate = new Date(current.reviewDate);
          const latestDate = latest ? new Date(latest.reviewDate) : new Date(0);
          return currentDate > latestDate ? current : latest;
        }, result.claimReview[0]);

        const normalizedRating = latestReview.textualRating.toLowerCase();
        const firstWord = normalizedRating.split(/[.\s]/)[0].toUpperCase();
        const isGeminiAnalysis = latestReview.publisher?.name?.toLowerCase().includes('gemini');
        
        // For Gemini analysis, we want to be more cautious with the confidence
        const confidence = isGeminiAnalysis ? 0.8 : 0.95;
        
        // If this is a Gemini analysis, we'll add a note about potential limitations
        const geminiNote = isGeminiAnalysis ? 
          '\n\nNote: This analysis is based on Gemini AI and may not reflect the most current information. Please verify with other sources.' : '';

        return [{
          id: `factcheck-${Date.now()}`,
          content: `Claim: ${claim}\n\nFact Check: ${latestReview.title}\nRating: ${firstWord}\nPublisher: ${latestReview.publisher?.name || 'Unknown'}\nReview Date: ${new Date(latestReview.reviewDate).toLocaleDateString()}${geminiNote}`,
          source: {
            id: latestReview.publisher?.name?.toLowerCase() || 'unknown',
            name: latestReview.publisher?.name || 'Unknown',
            type: SourceType.REFERENCE,
            reliability: isGeminiAnalysis ? ReliabilityLevel.MODERATE : ReliabilityLevel.VERIFIED,
            url: latestReview.url || '',
            lastVerified: new Date(latestReview.reviewDate),
            verificationStatus: isGeminiAnalysis ? VerificationStatus.UNVERIFIED : VerificationStatus.VERIFIED,
            categories: ['fact-checking', ...(isGeminiAnalysis ? ['ai'] : [])],
            metadata: {
              isFactChecker: !isGeminiAnalysis,
              isAI: isGeminiAnalysis,
              isCurrent: true
            }
          },
          timestamp: new Date(latestReview.reviewDate),
          url: latestReview.url || '',
          confidence,
          categories: ['fact-checking', ...(isGeminiAnalysis ? ['ai'] : [])],
          metadata: {
            originalClaim: claim,
            isContradictory: firstWord === 'FALSE',
            isPrimarySource: !isGeminiAnalysis,
            isDirectStatement: true,
            similarityScore: result.similarityScore || 0,
            requiresVerification: isGeminiAnalysis
          }
        }];
      });
    } catch (error) {
      console.error('Error gathering fact check evidence:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const evidenceGatherer = new EvidenceGatherer(); 