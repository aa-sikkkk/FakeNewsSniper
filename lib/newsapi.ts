import { env } from './env';
import { NEWS_API_KEY } from '@/lib/constants';

interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

interface NewsSearchResult {
  articles: NewsArticle[];
  totalResults: number;
}

interface NewsEvidence {
  relevantText: string;
  sources: { title: string; url: string }[];
}

/**
 * Search news articles related to a claim
 * @param query The search query
 * @param from Optional date to search from (ISO format)
 * @returns Promise with news articles
 */
export async function searchNews(query: string, from?: string): Promise<NewsArticle[]> {
  try {
    const params = new URLSearchParams({
      q: query
    });

    if (from) {
      params.append('from', from);
    }

    console.log('Making news API request with query:', query);
    const response = await fetch(`/api/news?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      // Add cache control to prevent stale responses
      cache: 'no-store'
    });
    
    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }

      console.error('NewsAPI request failed:', {
        status: response.status,
        error: errorMessage
      });
      
      if (response.status === 401 || response.status === 500) {
        console.log('NewsAPI configuration error, skipping news search');
        return [];
      }
      throw new Error(`NewsAPI error: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('NewsAPI response received:', {
      articleCount: data.articles?.length || 0
    });
    return data.articles || [];
  } catch (error) {
    console.error('Error searching news:', error);
    return [];
  }
}

/**
 * Get evidence from news sources for a given claim
 * @param claim The claim to find evidence for
 * @returns Promise with evidence data
 */
export async function getNewsEvidence(claim: string): Promise<NewsEvidence> {
  try {
    // Extract and normalize names
    const nameMatches = claim.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g) || [];
    const names = nameMatches.map(name => name.trim());
    
    // Extract key entities from claim
    const entities = claim.toLowerCase().split(' ')
      .filter(word => word.length > 3)
      .filter(word => !['will', 'going', 'that', 'this', 'with', 'from', 'into', 'about'].includes(word));
    
    // Add common name variations
    const nameVariations = names.flatMap(name => {
      const parts = name.split(' ');
      const variations = [name];
      
      // Handle common name variations
      if (name.toLowerCase().includes('donald')) {
        variations.push('Donald Trump', 'Trump');
      }
      if (name.toLowerCase().includes('joe')) {
        variations.push('Joe Biden', 'Biden');
      }
      if (name.toLowerCase().includes('johnny') && name.toLowerCase().includes('deep')) {
        variations.push('Johnny Depp', 'Depp', 'John Christopher Depp II');
      }
      // Add more name variations as needed
      
      return variations;
    });
    
    // Construct search query with name variations and context
    const searchTerms = [
      ...nameVariations,
      ...entities.filter(entity => !nameVariations.some(name => name.toLowerCase().includes(entity)))
    ];
    
    // Add context terms based on claim content
    if (claim.toLowerCase().includes('president')) {
      searchTerms.push('president', 'white house', 'administration');
      
      // Add temporal context for president claims
      if (claim.toLowerCase().includes('is') || claim.toLowerCase().includes('current')) {
        searchTerms.push(
          'current president',
          'president of the united states',
          'potus',
          '46th president',
          '2021 to 2025'
        );
      } else if (claim.toLowerCase().includes('was')) {
        searchTerms.push(
          'former president',
          'ex-president',
          'previous administration',
          'was president',
          'served as president'
        );
      }
    } else if (claim.toLowerCase().includes('actor') || claim.toLowerCase().includes('actress')) {
      searchTerms.push(
        'actor',
        'actress',
        'film',
        'movie',
        'hollywood',
        'entertainment',
        'biography',
        'career'
      );
    }
    if (claim.toLowerCase().includes('usa')) {
      searchTerms.push('United States', 'America', 'US');
    }
    
    const searchQuery = searchTerms.join(' OR ');
    
    console.log('Searching news with query:', searchQuery);
    
    // Add date filtering for current status claims
    const dateParams = new URLSearchParams();
    if (claim.toLowerCase().includes('is') || claim.toLowerCase().includes('current')) {
      // For current status, prioritize recent news
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateParams.append('from', oneMonthAgo.toISOString().split('T')[0]);
    }
    
    const response = await fetch(
      `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `language=en&` +
      `sortBy=relevancy&` +
      `pageSize=10` +
      (dateParams.toString() ? `&${dateParams.toString()}` : '') +
      `&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.articles || data.articles.length === 0) {
      return {
        relevantText: '',
        sources: []
      };
    }

    // Filter and process articles with improved relevance scoring
    const relevantArticles = data.articles
      .map((article: any) => {
        const articleText = `${article.title} ${article.description}`.toLowerCase();
        const claimText = claim.toLowerCase();
        
        // Calculate relevance score
        let score = 0;
        
        // Check for name matches
        nameVariations.forEach(name => {
          if (articleText.includes(name.toLowerCase())) {
            score += 2;
          }
        });
        
        // Check for context matches
        if (claimText.includes('president')) {
          if (claimText.includes('is') || claimText.includes('current')) {
            // Current status scoring
            if (articleText.includes('current president') || 
                articleText.includes('president of the united states') ||
                articleText.includes('potus') ||
                articleText.includes('46th president')) {
              score += 3;
            }
            if (articleText.includes('white house') || 
                articleText.includes('administration')) {
              score += 2;
            }
            // Check for term dates
            const termDatePattern = /\b(20\d{2})\s+to\s+(20\d{2})\b/;
            const termDateMatch = articleText.match(termDatePattern);
            if (termDateMatch) {
              const currentYear = new Date().getFullYear();
              if (parseInt(termDateMatch[1]) <= currentYear && 
                  parseInt(termDateMatch[2]) >= currentYear) {
                score += 3; // High score for current term dates
              }
            }
          } else if (claimText.includes('was')) {
            // Past status scoring
            if (articleText.includes('former president') || 
                articleText.includes('ex-president') ||
                articleText.includes('previous administration') ||
                articleText.includes('was president') ||
                articleText.includes('served as president')) {
              score += 3;
            }
          }
        } else if (claimText.includes('actor') || claimText.includes('actress')) {
          // Actor/actress scoring
          if (articleText.includes('actor') || articleText.includes('actress')) {
            score += 3;
          }
          if (articleText.includes('film') || 
              articleText.includes('movie') || 
              articleText.includes('hollywood') ||
              articleText.includes('entertainment') ||
              articleText.includes('biography') ||
              articleText.includes('career')) {
            score += 2;
          }
        }
        
        // Check for other entity matches
        entities.forEach(entity => {
          if (articleText.includes(entity)) {
            score += 1;
          }
        });
        
        // Boost score for recent articles when checking current status
        if (claimText.includes('is') || claimText.includes('current')) {
          const articleDate = new Date(article.publishedAt);
          const now = new Date();
          const daysOld = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysOld <= 7) {
            score += 2; // Boost for very recent articles
          } else if (daysOld <= 30) {
            score += 1; // Small boost for recent articles
          }
        }
        
        return { ...article, relevanceScore: score };
      })
      .filter((article: any) => article.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    const sources = relevantArticles.map((article: any) => ({
      title: article.title,
      url: article.url
    }));

    const relevantText = relevantArticles
      .map((article: any) => `${article.title}: ${article.description}`)
      .join('\n\n');

    return {
      relevantText,
      sources
    };
  } catch (error) {
    console.error('Error fetching news evidence:', error);
    return {
      relevantText: '',
      sources: []
    };
  }
} 