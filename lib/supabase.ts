import { createClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { env } from './env';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Initialize the Supabase client with proper typing
export const supabase = createClientComponentClient<Database>();

// User types
export type UserProfile = Database['public']['Tables']['profiles']['Row'];

// Claim types
export type ClaimStatus = Database['public']['Tables']['claims']['Row']['status'];

export type Claim = Database['public']['Tables']['claims']['Row'];

// Database helper functions
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

export async function saveClaim(claim: Omit<Claim, 'id' | 'created_at'>): Promise<Claim | null> {
  console.log('Attempting to save claim with data:', JSON.stringify(claim, null, 2));
  
  const { data, error } = await supabase
    .from('claims')
    .insert([{ 
      ...claim, 
      created_at: new Date().toISOString(),
      // Ensure these fields are properly formatted
      evidence: Array.isArray(claim.evidence) ? claim.evidence : [],
      sources: Array.isArray(claim.sources) ? claim.sources : [],
      model_verdicts: typeof claim.model_verdicts === 'object' ? claim.model_verdicts : {},
      categories: Array.isArray(claim.categories) ? claim.categories : [],
      evidence_scores: Array.isArray(claim.evidence_scores) ? claim.evidence_scores : [],
      source_reliability: Array.isArray(claim.source_reliability) ? claim.source_reliability : []
    }])
    .select()
    .single();

  if (error) {
    console.error('Error saving claim:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return null;
  }

  return data;
}

export async function getUserClaims(userId: string): Promise<Claim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user claims:', error);
    return [];
  }

  return data;
}

export async function voteClaim(claimId: string, voteType: 'up' | 'down', userId: string): Promise<boolean> {
  // First check if user has already voted
  const { data: existingVote } = await supabase
    .from('claim_votes')
    .select('*')
    .eq('claim_id', claimId)
    .eq('user_id', userId)
    .single();

  if (existingVote) {
    // Update existing vote
    const { error } = await supabase
      .from('claim_votes')
      .update({ vote_type: voteType })
      .eq('claim_id', claimId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating vote:', error);
      return false;
    }
  } else {
    // Create new vote
    const { error } = await supabase
      .from('claim_votes')
      .insert([{ claim_id: claimId, user_id: userId, vote_type: voteType }]);
    
    if (error) {
      console.error('Error creating vote:', error);
      return false;
    }
  }

  // Update the claim's vote counts
  const { error } = await supabase.rpc(
    'update_claim_votes',
    { claim_id: claimId }
  );

  if (error) {
    console.error('Error updating claim votes:', error);
    return false;
  }

  return true;
}

export async function getClaimStats(userId: string) {
  const { data: claims, error } = await supabase
    .from('claims')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching claim stats:', error)
    return {
      verified: 0,
      false: 0,
      averageConfidence: 0,
      history: [],
      confidence: [],
      categories: []
    }
  }

  if (!claims || claims.length === 0) {
    return {
      verified: 0,
      false: 0,
      averageConfidence: 0,
      history: [],
      confidence: [],
      categories: []
    }
  }

  // Group claims by date for history
  const historyMap = new Map()
  claims.forEach(claim => {
    const date = new Date(claim.created_at).toLocaleDateString()
    if (!historyMap.has(date)) {
      historyMap.set(date, { date, verified: 0, false: 0, unverified: 0 })
    }
    const stats = historyMap.get(date)
    if (claim.status === 'VERIFIED') stats.verified++
    else if (claim.status === 'FALSE') stats.false++
    else stats.unverified++
  })

  // Group claims by category
  const categoryMap = new Map<string, number>()
  claims.forEach(claim => {
    claim.categories?.forEach((category: string) => {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, 0)
      }
      categoryMap.set(category, categoryMap.get(category)! + 1)
    })
  })

  const stats = {
    verified: claims.filter(c => c.status === 'VERIFIED').length,
    false: claims.filter(c => c.status === 'FALSE').length,
    averageConfidence: Math.round(claims.reduce((acc, c) => acc + c.confidence, 0) / claims.length),
    history: Array.from(historyMap.values()),
    confidence: [
      { range: '0-25%', count: claims.filter(c => c.confidence <= 25).length },
      { range: '26-50%', count: claims.filter(c => c.confidence > 25 && c.confidence <= 50).length },
      { range: '51-75%', count: claims.filter(c => c.confidence > 50 && c.confidence <= 75).length },
      { range: '76-90%', count: claims.filter(c => c.confidence > 75 && c.confidence <= 90).length },
      { range: '91-100%', count: claims.filter(c => c.confidence > 90).length }
    ],
    categories: Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))
  }

  return stats
}