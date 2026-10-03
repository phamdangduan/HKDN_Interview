export interface CampaignCreate {
  title: string;
  company: string;
  location?: string | null;
  stipend?: string | null;
  perks?: string | null;
  job_description: string;
  cutoff_score?: number;
  target_level?: string;
  track?: string;
}

export interface CandidateApplyInput {
  full_name: string;
  email: string;
  phone?: string | null;
  campaign_id?: number | null;
  cv_filename?: string | null;
  cv_text?: string | null;
}

export interface InterviewSessionCreate {
  candidate_id?: number | null;
  campaign_id?: number | null;
  mode?: string;
  role_target: string;
  requirement_text?: string | null;
  persona?: string;
  difficulty_level?: number;
  duration_minutes?: number;
  target_level?: string;
  track?: string;
  cv_text?: string;
}

export interface InterviewTurnSubmit {
  session_id: string;
  turn_number: number;
  question_text: string;
  answer_transcript?: string | null;
  audio_url?: string | null;
}

export interface NextTurnRequest {
  session_id: string;
  stage_id: string;
  stage_name: string;
  stage_index: number;
  current_question: string;
  candidate_answer: string;
  default_next_question?: string;
  target_level?: string;
  track?: string;
}

export interface NextTurnResponse {
  intent: "DONT_KNOW" | "SHALLOW" | "GOOD" | "OFF_TOPIC" | string;
  turn_score: number;
  feedback_phrase: string;
  next_question: string;
  critique: string;
  is_pivot: boolean;
  should_advance_stage: boolean;
}

export interface StarEvaluationCreate {
  situation_score: number;
  task_score: number;
  action_score: number;
  result_score: number;
  strengths?: string;
  weaknesses?: string;
  ai_recommendations?: string;
  dossier_summary?: string;
  turn_evaluations?: string;
}

export interface CvJdMatchRequest {
  cv_text: string;
  jd_text: string;
  role_title?: string;
  target_level?: string;
  track?: string;
}
