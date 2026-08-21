export type EvidenceRole =
  | "assignment_brief"
  | "rubric"
  | "teacher_instructions"
  | "solution"
  | "reference"
  | "other";

export type EvidenceType = "text" | "pdf" | "image" | "screenshot" | "table";

export interface ReviewEvidenceInput {
  id: string;
  role: EvidenceRole;
  type: EvidenceType;
  reference?: string;
}

export interface ReviewLimits {
  maxEvidenceItems?: number;
  maxObjectiveLength?: number;
}

export interface ReviewRequest {
  reviewId: string;
  objective: string;
  evidence?: ReviewEvidenceInput[];
  limits?: ReviewLimits;
}

export type FindingSeverity = "info" | "low" | "medium" | "high";

export interface ReviewFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  summary: string;
  evidenceIds: string[];
}

export interface ReviewResponse {
  requestId: string;
  status: "accepted";
  findings: ReviewFinding[];
  metadata: {
    serverName: string;
    serverVersion: string;
    generatedAt: string;
  };
}

export interface ReviewToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
}
