import { env } from './env'; // Assuming env is needed here

// Utility functions to interact with the Wikipedia API for evidence gathering

interface WikipediaSearchResult {
  title: string;
  url: string;
  snippet?: string; // Add snippet to the interface
}

interface WikipediaSearchResponse {
  titles: string[];
  snippets: string[];
}

/**
 * Search Wikipedia for articles related to a claim
 * @param query The search query
 * @param limit The number of results to return (default: 5)
 * @returns Promise with search results
 */
export async function searchWikipedia(query: string, limit = 5): Promise<{
  results: WikipediaSearchResult[];
}> {
  try {
    // Clean and format the search query
    const cleanQuery = query
      .replace(/[^\w\s]/g, '') // Remove special characters but keep alphanumeric
      .split(' ')
      .filter(word => word.length > 2) // Remove very short words
      .join(' ');

    if (!cleanQuery) {
      console.log('Query was empty after cleaning');
      return { results: [] };
    }

    // For animal behavior claims, construct a more specific search
    let searchQuery = cleanQuery;
    if (cleanQuery.toLowerCase().includes('memory') && 
        (cleanQuery.toLowerCase().includes('fish') || cleanQuery.toLowerCase().includes('goldfish'))) {
      searchQuery = `goldfish memory span myth scientific research`;
      console.log('Enhanced search for fish memory claim:', searchQuery);
    }

    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.search = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: searchQuery,
      format: 'json',
      srlimit: limit.toString(),
      origin: '*',
      srwhat: 'text' // Use text search for better results
    }).toString();

    console.log('Searching Wikipedia with query:', searchQuery);

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.query || !data.query.search) {
      console.log('No search results found in Wikipedia response');
      return { results: [] };
    }
    
    const results = data.query.search;
    
    // Enhanced relevance filtering for animal behavior claims
    const relevantResults: WikipediaSearchResult[] = results.filter((result: any) => {
      const snippet = result.snippet.toLowerCase();
      const title = result.title.toLowerCase();
      const queryTerms = searchQuery.toLowerCase().split(' ');
      
      // For fish memory claims, require specific terms
      if (searchQuery.toLowerCase().includes('goldfish memory')) {
        const requiredTerms = ['goldfish', 'memory', 'span', 'myth', 'research'];
        const hasRequiredTerms = requiredTerms.some(term => 
          snippet.includes(term) || title.includes(term)
        );
        
        // Check for myth debunking or scientific evidence
        const hasEvidence = snippet.includes('myth') || 
                          snippet.includes('research') || 
                          snippet.includes('study') || 
                          snippet.includes('scientific') ||
                          snippet.includes('debunked');
        
        return hasRequiredTerms && hasEvidence;
      }
      
      // For other claims, use standard relevance check
      return queryTerms.some(term => 
        snippet.includes(term) || title.includes(term)
      );
    }).map((result: any) => ({
      title: result.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
      snippet: result.snippet.replace(/<\/?[^>]+(>|$)/g, "") // Remove HTML tags
    }));
    
    return {
      results: relevantResults
    };
  } catch (error) {
    console.error('Error searching Wikipedia:', error);
    throw error;
  }
}

/**
 * Get the content of a Wikipedia article by title
 * @param title The article title
 * @returns Promise with article content
 */
export async function getWikipediaArticle(title: string): Promise<{
  title: string;
  content: string;
  url: string;
} | null> {
  try {
    const params: Record<string, string> = {
      action: 'query',
      prop: 'extracts|info',
      exintro: '0', // Get full extract
      explaintext: '1',
      inprop: 'url',
      titles: title,
      format: 'json',
      origin: '*'
    };

    const contentUrl = new URL('https://en.wikipedia.org/w/api.php');
    contentUrl.search = new URLSearchParams(params).toString();

    const response = await fetch(contentUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`);
    }
    
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    // Handle cases where the page doesn't exist or has no extract
    if (!page || !page.extract) {
      return null;
    }
    
    return {
      title: page.title,
      content: page.extract,
      url: page.fullurl
    };
  } catch (error) {
    console.error('Error fetching Wikipedia article:', error);
    // Return null or throw error depending on desired error handling in gatherEvidence
    throw error;
  }
}

/**
 * Checks if a claim is likely biographical.
 * (Copied from evidence-gatherer.ts)
 */
function isBiographicalClaim(claim: string): boolean {
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

/**
 * Get evidence from Wikipedia for a given claim
 * @param claim The claim to find evidence for
 * @returns Promise with evidence data
 */
export async function getEvidenceForClaim(claim: string): Promise<{
  relevantText: string;
  sources: WikipediaSearchResult[];
}> {
  try {
    let searchQuery = claim; // Default to using the full claim

    // Add scientific context for animal behavior claims
    if (claim.toLowerCase().includes('memory') && 
        (claim.toLowerCase().includes('fish') || claim.toLowerCase().includes('animal'))) {
      const animalType = claim.toLowerCase().includes('goldfish') ? 'goldfish' : 
                        claim.toLowerCase().includes('fish') ? 'fish' : 'animal';
      searchQuery = `${animalType} memory cognition research study scientific`;
      console.log('Enhanced search query with scientific context:', searchQuery);
    }

    // If it's a biographical claim, try searching with the person's name first
    if (isBiographicalClaim(claim)) {
      const fullName = claim.split(' is ')[0].trim();
      if (fullName) {
        searchQuery = fullName; // Use name if extracted
        console.log('Searching Wikipedia with biographical name:', searchQuery);
      } else {
         console.log('Biographical claim detected, but could not extract name. Searching with full claim:', searchQuery);
      }
    } else {
      console.log('Searching Wikipedia with full claim:', searchQuery);
    }

    const searchResponse = await searchWikipedia(searchQuery);
    const searchResults = searchResponse.results;

    if (searchResults.length === 0) {
      return { relevantText: '', sources: [] };
    }

    // Prioritize using snippets if they are highly relevant
    const claimTerms = claim.toLowerCase().split(' ').filter(term => term.length > 2);
    const highlyRelevantSnippets = searchResults.filter(result => {
      const snippet = result.snippet?.toLowerCase() || '';
      // Consider a snippet highly relevant if it contains most of the key terms
      const matchingTerms = claimTerms.filter(term => snippet.includes(term)).length;
      return matchingTerms >= claimTerms.length * 0.7; // e.g., 70% of terms
    });

    if (highlyRelevantSnippets.length > 0) {
      console.log('Using highly relevant snippet as evidence.');
      // Combine snippets from highly relevant results
      const combinedSnippets = highlyRelevantSnippets.map(result => result.snippet).join(' ... ');
      return {
        relevantText: combinedSnippets,
        sources: highlyRelevantSnippets.map(result => ({
          title: result.title,
          url: result.url
        }))
      };
    }

    // If no highly relevant snippets, fetch the content of the top search result
    const topSearchResult = searchResults[0];
    console.log('Fetching full article for top search result:', topSearchResult.title);
    const articleContent = await getWikipediaArticle(topSearchResult.title);

    if (!articleContent) {
      return { relevantText: '', sources: [] };
    }

    // Now, extract the most relevant section from the full article content
    // This will require a more sophisticated extraction logic, potentially in evidence-gatherer
    // For now, we'll return the full content and rely on evidence-gatherer to refine it.
    
    return {
      relevantText: articleContent.content,
      sources: [{
        title: articleContent.title,
        url: articleContent.url
      }]
    };
  } catch (error) {
    console.error('Error getting Wikipedia evidence:', error);
    return { relevantText: '', sources: [] };
  }
}