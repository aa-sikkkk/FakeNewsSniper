import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { env } from '@/lib/env';

// Get the NewsAPI key, using NEXT_PUBLIC_NEWS_API_KEY as fallback
const NEWS_API_KEY = env.NEWS_API_KEY || env.NEXT_PUBLIC_NEWS_API_KEY;

export async function GET(request: Request) {
  try {
    // Add CORS headers
    const headersList = headers();
    const origin = headersList.get('origin') || '*';

    // Debug environment
    console.log('Server Environment:', {
      nodeEnv: process.env.NODE_ENV,
      hasApiKey: !!NEWS_API_KEY,
      apiKeyLength: NEWS_API_KEY?.length,
      envKeys: Object.keys(process.env).filter(key => key.includes('NEWS'))
    });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const from = searchParams.get('from');

    if (!query) {
      return new NextResponse(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }

    if (!NEWS_API_KEY) {
      console.error('NewsAPI key is missing from server environment');
      return new NextResponse(
        JSON.stringify({ error: 'NewsAPI configuration error' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }

    // Construct the NewsAPI v2 request
    const apiUrl = new URL('https://newsapi.org/v2/everything');
    apiUrl.searchParams.append('q', query);
    apiUrl.searchParams.append('apiKey', NEWS_API_KEY);
    apiUrl.searchParams.append('language', 'en');
    apiUrl.searchParams.append('sortBy', 'relevancy');
    apiUrl.searchParams.append('pageSize', '10');

    if (from) {
      apiUrl.searchParams.append('from', from);
    }

    console.log('Making NewsAPI request:', {
      url: apiUrl.toString().replace(NEWS_API_KEY, '***'),
      query
    });

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('NewsAPI request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      if (response.status === 401) {
        return new NextResponse(
          JSON.stringify({ error: 'NewsAPI authentication failed' }),
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          }
        );
      }

      return new NextResponse(
        JSON.stringify({ error: `NewsAPI error: ${response.status}` }),
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }

    const data = await response.json();
    console.log('NewsAPI response received:', {
      status: response.status,
      articleCount: data.articles?.length || 0
    });

    return new NextResponse(
      JSON.stringify(data),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  } catch (error) {
    console.error('Error in news API route:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 