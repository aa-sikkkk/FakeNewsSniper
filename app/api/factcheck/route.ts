import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ClaimReview {
  publisher?: {
    name: string;
    site: string;
  };
  url: string;
  title: string;
  reviewDate: string;
  textualRating: string;
  languageCode: string;
}

interface Claim {
  text: string;
  claimant?: string;
  claimDate?: string;
  claimReview: ClaimReview[];
}

interface FactCheckResult {
  claim: string;
  isTrue: boolean;
  explanation: string;
  confidence: number;
  sources: string[];
}

export async function GET(request: Request) {
  console.log('API route hit:', request.method, request.url);
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      console.log('Invalid query parameter:', query);
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Create an instance of FactCheckService
    const factCheckService = new FactCheckService();
    
    // Get query variations from the service
    const queryVariations = factCheckService.getQueryVariations(query);
    console.log('Trying query variations:', queryVariations);

    let bestMatch = null;
    let bestMatchScore = 0;
    let bestSource = '';

    // 0. Try OpenAI first for initial analysis
    const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a fact-checking assistant. Analyze the given claim and provide a detailed response including: 1) Whether the claim is true, false, or partially true 2) Key facts and context 3) Any relevant dates or locations 4) Sources if available. Format your response as JSON with fields: isTrue (boolean), explanation (string), confidence (number 0-1), keyFacts (array of strings), sources (array of strings).'
              },
              {
                role: 'user',
                content: query
              }
            ],
            temperature: 0.3
          })
        });

        const openaiData = await openaiResponse.json();
        console.log('OpenAI Response:', JSON.stringify(openaiData, null, 2));

        if (openaiData.choices && openaiData.choices[0]?.message?.content) {
          try {
            const analysis = JSON.parse(openaiData.choices[0].message.content);
            const similarityScore = 0.9; // High confidence in OpenAI's analysis
            if (similarityScore > bestMatchScore) {
              bestMatchScore = similarityScore;
              bestMatch = {
                text: query,
                claimant: 'AI Analysis',
                claimDate: new Date().toISOString(),
                claimReview: [{
                  publisher: {
                    name: 'AI Fact Check',
                    site: ''
                  },
                  url: '',
                  title: 'AI Analysis',
                  reviewDate: new Date().toISOString(),
                  textualRating: analysis.isTrue ? 'TRUE' : 'FALSE',
                  languageCode: 'en'
                }],
                similarityScore,
                isAIAnalysis: true,
                explanation: analysis.explanation,
                confidence: analysis.confidence,
                keyFacts: analysis.keyFacts || [],
                sources: analysis.sources || []
              };
              bestSource = 'ai';
            }
          } catch (e) {
            console.error('Error parsing OpenAI response:', e);
          }
        }
      } catch (error) {
        console.error('Error fetching from OpenAI:', error);
      }
    }

    // 0.5 Try Gemini for additional analysis
    const geminiKey = process.env.GOOGLE_AI_API_KEY;
    if (geminiKey) {
      try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a fact-checking assistant. Analyze this claim and provide a detailed response in JSON format: "${query}". Include: 1) Whether the claim is true, false, or partially true 2) Key facts and context 3) Any relevant dates or locations 4) Sources if available. Format your response as JSON with fields: isTrue (boolean), explanation (string), confidence (number 0-1), keyFacts (array of strings), sources (array of strings).`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          })
        });

        const geminiData = await geminiResponse.json();
        console.log('Gemini Response:', JSON.stringify(geminiData, null, 2));

        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts?.[0]?.text) {
          try {
            // Extract JSON from markdown code block if present
            const responseText = geminiData.candidates[0].content.parts[0].text;
            const jsonMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
            const analysis = JSON.parse(jsonStr);
            
            const similarityScore = 0.9; // High confidence in Gemini's analysis
            if (similarityScore > bestMatchScore) {
              bestMatchScore = similarityScore;
              bestMatch = {
                text: query,
                claimant: 'Gemini Analysis',
                claimDate: new Date().toISOString(),
                claimReview: [{
                  publisher: {
                    name: 'Gemini LLM',
                    site: ''
                  },
                  url: '',
                  title: 'Gemini LLM Analysis',
                  reviewDate: new Date().toISOString(),
                  textualRating: analysis.isTrue ? 'TRUE' : 'FALSE',
                  languageCode: 'en'
                }],
                similarityScore,
                isGeminiAnalysis: true,
                explanation: analysis.explanation,
                confidence: analysis.confidence,
                keyFacts: analysis.keyFacts || [],
                sources: analysis.sources || []
              };
              bestSource = 'gemini';
            }
          } catch (e) {
            console.error('Error parsing Gemini response:', e);
          }
        }
      } catch (error) {
        console.error('Error fetching from Gemini:', error);
      }
    }

    // 1. Try Wikipedia first
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
      console.log('Fetching from Wikipedia:', wikiUrl);
      
      const wikiResponse = await fetch(wikiUrl);
      const wikiData = await wikiResponse.json();
      
      console.log('Wikipedia Response:', JSON.stringify(wikiData, null, 2));
      
      if (wikiData.query && wikiData.query.search && wikiData.query.search.length > 0) {
        for (const result of wikiData.query.search) {
          const similarityScore = factCheckService.calculateSimilarityScore(query, result.title + ' ' + result.snippet);
          if (similarityScore > bestMatchScore) {
            bestMatchScore = similarityScore;
            bestMatch = {
              text: result.title,
              claimant: 'Wikipedia',
              claimDate: new Date().toISOString(),
              claimReview: [{
                publisher: {
                  name: 'Wikipedia',
                  site: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`
                },
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
                title: result.title,
                reviewDate: new Date().toISOString(),
                textualRating: 'VERIFIED',
                languageCode: 'en'
              }],
              similarityScore,
              isWikiArticle: true,
              description: result.snippet
            };
            bestSource = 'wikipedia';
          }
        }
      }
    } catch (error) {
      console.error('Error fetching from Wikipedia:', error);
    }

    // 2. Try Google Fact Check API
    const apiKey = process.env.GOOGLE_FACTCHECK_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_FACTCHECK_API_KEY;
    if (apiKey) {
    const baseUrl = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';
    
    for (const variation of queryVariations) {
      const params = new URLSearchParams();
      params.append('query', variation);
      params.append('key', apiKey);
      params.append('languageCode', 'en');
      params.append('pageSize', '10');
      params.append('reviewPublisherSiteFilter', '');
      params.append('maxAgeDays', '365');

      const apiUrl = `${baseUrl}?${params.toString()}`;
      console.log(`Trying variation: ${variation}`);
      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
      });

      const responseText = await response.text();
      console.log(`Response for variation "${variation}":`, responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          if (data && data.claims && data.claims.length > 0) {
              for (const claim of data.claims) {
                const similarityScore = factCheckService.calculateSimilarityScore(query, claim.text);
                if (similarityScore > bestMatchScore) {
                  bestMatchScore = similarityScore;
                  bestMatch = {
              text: claim.text,
              claimant: claim.claimant || 'Unknown',
              claimDate: claim.claimDate,
              claimReview: claim.claimReview.map((review: ClaimReview) => ({
                publisher: {
                  name: review.publisher?.name || 'Unknown',
                  site: review.publisher?.site || ''
                },
                url: review.url,
                title: review.title,
                reviewDate: review.reviewDate,
                textualRating: review.textualRating,
                languageCode: review.languageCode
                    })),
                    similarityScore,
                    isFactCheck: true
                  };
                  bestSource = 'fact_check';
                }
              }
          }
        } catch (e) {
          console.error('Error parsing response for variation:', variation, e);
        }
      }
      }
    }

    // 3. Try News API last
    const newsApiKey = process.env.NEWS_API_KEY || process.env.NEXT_PUBLIC_NEWS_API_KEY;
    if (newsApiKey) {
      try {
        // Try different variations of the query for News API
        const newsQueries = [
          query,
          query.split(' ').slice(0, 3).join(' '), // First 3 words
          query.split(' ').filter(word => word.length > 3).join(' '), // Remove short words
          query.replace(/[^a-z0-9\s]/gi, '') // Remove special characters
        ];

        for (const newsQuery of newsQueries) {
          const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(newsQuery)}&apiKey=${newsApiKey}&language=en&sortBy=relevancy&pageSize=5&from=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`;
          console.log('Fetching from News API:', newsApiUrl);
          
          const newsResponse = await fetch(newsApiUrl);
          const newsData = await newsResponse.json();
          
          console.log('News API Response for query:', newsQuery, JSON.stringify(newsData, null, 2));
          
          if (newsData.status === 'ok' && newsData.articles && newsData.articles.length > 0) {
            for (const article of newsData.articles) {
              const similarityScore = factCheckService.calculateSimilarityScore(query, article.title + ' ' + article.description);
              if (similarityScore > bestMatchScore) {
                bestMatchScore = similarityScore;
                bestMatch = {
                  text: article.title,
                  claimant: article.source.name,
                  claimDate: article.publishedAt,
                  claimReview: [{
                    publisher: {
                      name: article.source.name,
                      site: article.url
                    },
                    url: article.url,
                    title: article.title,
                    reviewDate: article.publishedAt,
                    textualRating: 'UNVERIFIED',
                    languageCode: 'en'
                  }],
                  similarityScore,
                  isNewsArticle: true,
                  description: article.description,
                  content: article.content
                };
                bestSource = 'news';
              }
            }
            // If we found articles with this query, no need to try other variations
            break;
          }
        }
      } catch (error) {
        console.error('Error fetching from News API:', error);
      }
    }

    // If we found a match, return it with similarity information
    if (bestMatch) {
      console.log('Found best match with similarity score:', bestMatchScore, 'from source:', bestSource);
      return NextResponse.json({
        claims: [bestMatch],
        isExactMatch: bestMatchScore > 0.8,
        similarityScore: bestMatchScore,
        source: bestSource,
        aiAnalysis: bestSource === 'ai' ? {
          explanation: bestMatch.explanation,
          confidence: bestMatch.confidence,
          keyFacts: bestMatch.keyFacts,
          sources: bestMatch.sources
        } : null,
        geminiAnalysis: bestSource === 'gemini' ? {
          explanation: bestMatch.explanation,
          confidence: bestMatch.confidence,
          keyFacts: bestMatch.keyFacts,
          sources: bestMatch.sources
        } : null
      });
    }

    // If no variations worked, return empty result
    console.log('No results found for any query variation');
    return NextResponse.json({
      claims: [],
      isExactMatch: false,
      similarityScore: 0
    });
  } catch (error) {
    console.error('Error in fact check API route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
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

    // ... rest of the existing code ...

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