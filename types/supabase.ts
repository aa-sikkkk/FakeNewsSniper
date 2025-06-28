export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          email: string | null
          avatar_url: string | null
          created_at: string
          verified_claims: number
          trust_score: number
        }
        Insert: {
          id: string
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
          verified_claims?: number
          trust_score?: number
        }
        Update: {
          id?: string
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
          verified_claims?: number
          trust_score?: number
        }
      }
      claims: {
        Row: {
          id: string
          text: string
          user_id: string | null
          status: 'VERIFIED' | 'FALSE' | 'UNVERIFIED' | 'DISPUTED'
          confidence: number
          evidence: string[]
          sources: string[]
          created_at: string
          votes_up: number
          votes_down: number
          model_verdicts: {
            bart?: {
              verdict: string
              confidence: number
            }
            roberta?: {
              verdict: string
              confidence: number
            }
          }
          categories: string[]
          is_temporal: boolean
          is_factual: boolean
          is_predictive: boolean
          contradiction_ratio: number
          evidence_scores: number[]
          source_reliability: {
            name: string
            type: string
            reliability: string
            verification_status: string
          }[]
        }
        Insert: {
          id?: string
          text: string
          user_id?: string | null
          status: 'VERIFIED' | 'FALSE' | 'UNVERIFIED' | 'DISPUTED'
          confidence: number
          evidence: string[]
          sources: string[]
          created_at?: string
          votes_up?: number
          votes_down?: number
          model_verdicts?: {
            bart?: {
              verdict: string
              confidence: number
            }
            roberta?: {
              verdict: string
              confidence: number
            }
          }
          categories?: string[]
          is_temporal?: boolean
          is_factual?: boolean
          is_predictive?: boolean
          contradiction_ratio?: number
          evidence_scores?: number[]
          source_reliability?: {
            name: string
            type: string
            reliability: string
            verification_status: string
          }[]
        }
        Update: {
          id?: string
          text?: string
          user_id?: string | null
          status?: 'VERIFIED' | 'FALSE' | 'UNVERIFIED' | 'DISPUTED'
          confidence?: number
          evidence?: string[]
          sources?: string[]
          created_at?: string
          votes_up?: number
          votes_down?: number
          model_verdicts?: {
            bart?: {
              verdict: string
              confidence: number
            }
            roberta?: {
              verdict: string
              confidence: number
            }
          }
          categories?: string[]
          is_temporal?: boolean
          is_factual?: boolean
          is_predictive?: boolean
          contradiction_ratio?: number
          evidence_scores?: number[]
          source_reliability?: {
            name: string
            type: string
            reliability: string
            verification_status: string
          }[]
        }
      }
      claim_votes: {
        Row: {
          id: string
          claim_id: string
          user_id: string
          vote_type: 'up' | 'down'
          created_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          user_id: string
          vote_type: 'up' | 'down'
          created_at?: string
        }
        Update: {
          id?: string
          claim_id?: string
          user_id?: string
          vote_type?: 'up' | 'down'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_claim_votes: {
        Args: {
          claim_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 