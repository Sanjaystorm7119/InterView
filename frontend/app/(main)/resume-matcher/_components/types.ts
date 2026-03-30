export interface Resume {
  id: number;
  candidate_name?: string;
  candidate_email?: string;
  email?: string;
  phone?: string;
  parsed_data?: {
    current_role?: string;
    candidate_email?: string;
    email?: string;
    phone?: string;
  };
}

export interface JD {
  id: number;
  role_title?: string;
  interview_id?: string;
  interview_link?: string;
  parsed_data?: { company_name?: string; interview_link?: string };
}

export interface Match {
  id: number;
  resume_id: number;
  jd_id: number;
  confidence_score: number;
  skills_score?: number;
  experience_score?: number;
  semantic_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  summary?: string;
  created_at: string;
}

export interface BulkCandidate {
  match: Match;
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  interviewLink: string;
  checked: boolean;
}

export const scoreColor = (s: number) =>
  s >= 70
    ? "text-green-600 bg-green-50"
    : s >= 40
      ? "text-amber-600 bg-amber-50"
      : "text-red-600 bg-red-50";
