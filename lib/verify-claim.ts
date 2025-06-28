import { VerificationStatus } from "./verification-types"
import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from "lucide-react"
import { verificationPipeline, VerificationResult } from "./verification-pipeline"

interface VerdictDisplay {
  text: string;
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  glowClass: string;
}

export async function verifyClaimComprehensive(claim: string): Promise<VerificationResult> {
  return await verificationPipeline.verifyClaim(claim);
}

export function getVerdictDisplay(status: VerificationStatus, confidence: number): VerdictDisplay {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return {
        text: "Verified",
        icon: "CheckCircle",
        bgColor: "bg-green-500/20",
        textColor: "text-green-500",
        borderColor: "border-green-500",
        glowClass: "glow-green"
      };
    case VerificationStatus.FALSE:
      return {
        text: "False",
        icon: "XCircle",
        bgColor: "bg-red-500/20",
        textColor: "text-red-500",
        borderColor: "border-red-500",
        glowClass: "glow-red"
      };
    case VerificationStatus.DISPUTED:
      return {
        text: "Disputed",
        icon: "AlertTriangle",
        bgColor: "bg-yellow-500/20",
        textColor: "text-yellow-500",
        borderColor: "border-yellow-500",
        glowClass: "glow-amber"
      };
    case VerificationStatus.UNVERIFIED:
    default:
      return {
        text: "Unverified",
        icon: "HelpCircle",
        bgColor: "bg-gray-500/20",
        textColor: "text-gray-500",
        borderColor: "border-gray-500",
        glowClass: "glow-gray"
      };
  }
} 