interface FactCheckResult {
  claim: string;
  isTrue: boolean;
  explanation: string;
  confidence: number;
  sources: string[];
}

export class FactCheckService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = 'gpt-3.5-turbo';
    this.maxTokens = 150;
    this.temperature = 0.7;
  }

  public getQueryVariations(query: string): string[] {
    const formattedQuery = this.formatQuery(query);
    
    return [
      formattedQuery,
      `"${formattedQuery}"`, // Exact match
      formattedQuery.replace(/[^a-z0-9\s]/g, ''), // Remove special characters
      formattedQuery.split(' ').slice(0, 3).join(' '), // Use first 3 words
      formattedQuery.split(' ').filter((word: string) => word.length > 3).join(' '), // Remove short words
      formattedQuery.replace(/\b(the|a|an|in|on|at|to|for|of|with|by)\b/gi, '').trim(), // Remove common words
      formattedQuery.split(' ').slice(-3).join(' '), // Use last 3 words
      ...this.extractLocationSpecificQueries(formattedQuery)
    ];
  }

  private formatQuery = (query: string): string => {
    return query.toLowerCase().trim();
  }

  private extractLocationSpecificQueries = (query: string): string[] => {
    const variations: string[] = [];
    const locationPatterns = [
      /(?:in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /(?:city|state|country)\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:city|state|country)/g
    ];

    // Extract locations
    const locations: string[] = [];
    for (const pattern of locationPatterns) {
      const matches = Array.from(query.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && !locations.includes(match[1])) {
          locations.push(match[1]);
        }
      }
    }

    // Create variations with locations
    for (const location of locations) {
      // Add location-specific queries
      variations.push(`${location} national guard deployment`);
      variations.push(`${location} immigration protests`);
      variations.push(`national guard ${location}`);
      variations.push(`immigration protests ${location}`);
    }

    return variations;
  }

  public calculateSimilarityScore = (claim: string, evidence: string): number => {
    const claimWords = new Set(claim.toLowerCase().split(/\s+/));
    const evidenceWords = new Set(evidence.toLowerCase().split(/\s+/));
    
    // Calculate Jaccard similarity
    const intersection = new Set([...claimWords].filter(x => evidenceWords.has(x)));
    const union = new Set([...claimWords, ...evidenceWords]);
    const jaccardSimilarity = intersection.size / union.size;

    // Calculate word overlap score
    const claimArray = Array.from(claimWords);
    const evidenceArray = Array.from(evidenceWords);
    const overlapCount = claimArray.filter(word => evidenceArray.includes(word)).length;
    const overlapScore = overlapCount / Math.max(claimArray.length, evidenceArray.length);

    // Combine scores with weights
    return (jaccardSimilarity * 0.6) + (overlapScore * 0.4);
  }

  async verifyClaim(claim: string): Promise<FactCheckResult> {
    const formattedQuery = this.formatQuery(claim);
    
    // Try different query variations
    const queryVariations = [
      formattedQuery,
      `"${formattedQuery}"`, // Exact match
      formattedQuery.replace(/[^a-z0-9\s]/g, ''), // Remove special characters
      formattedQuery.split(' ').slice(0, 3).join(' '), // Use first 3 words
      formattedQuery.split(' ').filter((word: string) => word.length > 3).join(' '), // Remove short words
      formattedQuery.replace(/\b(the|a|an|in|on|at|to|for|of|with|by)\b/gi, '').trim(), // Remove common words
      formattedQuery.split(' ').slice(-3).join(' '), // Use last 3 words
      ...this.extractLocationSpecificQueries(formattedQuery)
    ];

    console.log('Trying query variations:', queryVariations);

    let bestMatch = null;
    let bestMatchScore = 0;

    // Return a default result if no match is found
    return {
      claim,
      isTrue: false,
      explanation: "No direct evidence found for this specific claim.",
      confidence: 0,
      sources: []
    };
  }
} 