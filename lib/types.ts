import { Source, SourceType, ReliabilityLevel } from './source-reliability';
import { VerificationStatus } from './verification-types';

export interface Evidence {
  id: string;
  content: string;
  source: Source;
  timestamp: Date;
  url: string;
  confidence: number;
  categories: string[];
  metadata: {
    isPrimarySource?: boolean;
    isDirectStatement?: boolean;
    isOfficialDocument?: boolean;
    isResearch?: boolean;
    isNews?: boolean;
    isBiographical?: boolean;
    isReference?: boolean;
    isAI?: boolean;
    isContradictory?: boolean;
    originalClaim?: string;
    similarityScore?: number;
  };
}

export interface EvidenceResult {
  evidence: Evidence[];
  totalSources: number;
  reliabilityScore: number;
  timestamp: Date;
}

export interface HuggingFaceVerification {
  label: 'entailment' | 'contradiction' | 'neutral';
  score: number;
  evidence?: string;
} 