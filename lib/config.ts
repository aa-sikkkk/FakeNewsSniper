// Environment variable validation
function validateEnv() {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Get environment variables based on context
  const getEnvVar = (key: string) => {
    if (isBrowser) {
      // In browser, only use NEXT_PUBLIC_ prefixed variables
      return process.env[`NEXT_PUBLIC_${key}`];
    }
    // In server, try both prefixed and unprefixed
    return process.env[key] || process.env[`NEXT_PUBLIC_${key}`];
  };

  const requiredEnvVars = {
    NEWS_API_KEY: getEnvVar('NEWS_API_KEY'),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_HUGGING_FACE_API_TOKEN: process.env.NEXT_PUBLIC_HUGGING_FACE_API_TOKEN
  };

  // Log environment state
  console.log('Environment Variables State:', {
    isBrowser,
    nodeEnv: process.env.NODE_ENV,
    hasNewsApiKey: !!requiredEnvVars.NEWS_API_KEY,
    newsApiKeyLength: requiredEnvVars.NEWS_API_KEY?.length,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('NEWS')),
    // Safely log first few characters of API key
    newsApiKeyPrefix: requiredEnvVars.NEWS_API_KEY ? 
      `${requiredEnvVars.NEWS_API_KEY.substring(0, 4)}...` : 
      'not found'
  });

  // Validate required environment variables
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return requiredEnvVars;
}

// Export validated environment variables
export const {
  NEWS_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_HUGGING_FACE_API_TOKEN
} = validateEnv(); 