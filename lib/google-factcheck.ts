import { env } from './env';

export interface FactCheckResult {
  text: string;
  claimReview: {
    publisher: {
      name: string;
      site: string;
    };
    url: string;
    title: string;
    reviewDate: string;
    textualRating: string;
    languageCode: string;
  }[];
  similarityScore?: number;
  source?: string;
}

interface GoogleFactCheckResponse {
  claims: Array<{
    text: string;
    claimReview: Array<{
      publisher?: {
        name: string;
        site: string;
      };
      url: string;
      title: string;
      reviewDate: string;
      textualRating: string;
      languageCode: string;
    }>;
  }>;
}

export async function queryGoogleFactCheck(claim: string): Promise<FactCheckResult[]> {
  try {
    // Try different variations of the claim
    const variations = [
      claim,
      `"${claim}"`,
      claim.replace(/-/g, ''),
      claim.toLowerCase()
    ];

    console.log('Trying query variations:', variations);

    for (const variation of variations) {
      console.log('Trying variation:', variation);
      const response = await fetch(`/api/factcheck?query=${encodeURIComponent(variation)}`);
      
      if (!response.ok) {
        console.error(`Error fetching fact check for variation "${variation}":`, response.statusText);
        continue;
      }

      const data = await response.json();
      console.log(`Response for variation "${variation}":`, JSON.stringify(data, null, 2));

      if (data.claims && data.claims.length > 0) {
        console.log('Found results with variation:', variation);
        return data.claims.map((claim: any) => ({
          text: claim.text,
          claimant: claim.claimant,
          claimDate: claim.claimDate,
          claimReview: claim.claimReview.map((review: any) => ({
            publisher: {
              name: review.publisher?.name || 'Unknown',
              site: review.publisher?.site || ''
            },
            url: review.url,
            title: review.title,
            reviewDate: review.reviewDate,
            textualRating: review.textualRating,
            languageCode: review.languageCode
          }))
        }));
      }
    }

    return [];
  } catch (error) {
    console.error('Error querying Google Fact Check:', error);
    return [];
  }
} 