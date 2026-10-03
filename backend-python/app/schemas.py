from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

# ==================== CAMPAIGN SCHEMAS ====================
class CampaignCreate(BaseModel):
    title: str = Field(..., example="Thực tập sinh Lập trình Java Backend")
    company: str = Field(..., example="FPT Software")
    location: Optional[str] = Field(None, example="F-Ville Hòa Lạc, Hà Nội")
    stipend: Optional[str] = Field(None, example="6.000.000 - 9.000.000 VNĐ")
    perks: Optional[str] = Field(None, example="Laptop, 2 màn hình, Cơm trưa Canteen miễn phí")
    job_description: str = Field(..., example="Nắm vững Java Core, Spring Boot 3, RESTful API, MySQL...")
    cutoff_score: int = Field(80, example=80)
    target_level: Optional[str] = Field("fresher", example="fresher") # intern, fresher, junior, mid_level
    track: Optional[str] = Field("backend", example="backend") # backend, frontend, fullstack, mobile, devops, ai_data

class CampaignResponse(CampaignCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== CANDIDATE SCHEMAS ====================
class CandidateCreate(BaseModel):
    full_name: str = Field(..., example="Nguyễn Văn An")
    email: str = Field(..., example="an.nguyen@email.com")
    phone: Optional[str] = Field(None, example="0987654321")
    cv_filename: Optional[str] = None
    cv_text: Optional[str] = None
    campaign_id: Optional[int] = None
    target_level: Optional[str] = Field("fresher", example="fresher")

class CandidateResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    cv_filename: Optional[str] = None
    campaign_id: Optional[int] = None
    target_level: Optional[str] = "fresher"
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== INTERVIEW SESSION SCHEMAS ====================
class InterviewSessionCreate(BaseModel):
    candidate_id: Optional[int] = None
    campaign_id: Optional[int] = None
    mode: str = Field("self_practice", example="self_practice")
    role_target: str = Field(..., example="Java Backend Developer")
    target_level: Optional[str] = Field("fresher", example="fresher") # intern, fresher, junior, mid_level
    track: Optional[str] = Field("backend", example="backend") # backend, frontend, fullstack, mobile, devops, ai_data
    cv_text: Optional[str] = None
    requirement_text: Optional[str] = None
    persona: str = Field("Alex Chen", example="Alex Chen")
    difficulty_level: int = Field(4, ge=1, le=5)
    duration_minutes: int = Field(30, ge=10, le=90)

class InterviewSessionResponse(BaseModel):
    id: str
    candidate_id: Optional[int] = None
    campaign_id: Optional[int] = None
    mode: str
    role_target: str
    target_level: Optional[str] = "fresher"
    track: Optional[str] = "backend"
    requirement_text: Optional[str] = None
    persona: str
    difficulty_level: int
    duration_minutes: int
    status: str
    questions: Optional[List[str]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== INTERVIEW TURN SCHEMAS ====================
class InterviewTurnSubmit(BaseModel):
    session_id: str
    turn_number: int
    question_text: str
    answer_transcript: str
    audio_url: Optional[str] = None

class InterviewTurnResponse(BaseModel):
    id: int
    session_id: str
    turn_number: int
    question_text: str
    answer_transcript: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== ADAPTIVE INTERVIEW TURN SCHEMAS ====================
class NextTurnRequest(BaseModel):
    session_id: str
    stage_id: str = "technical"
    stage_name: str = "Chuyên môn"
    stage_index: int = 3
    current_question: str
    candidate_answer: str
    target_level: Optional[str] = "fresher"
    default_next_question: Optional[str] = ""

class NextTurnResponse(BaseModel):
    intent: str
    turn_score: float
    feedback_phrase: str
    next_question: str
    critique: Optional[str] = None
    is_pivot: bool = False
    should_advance_stage: bool = True


# ==================== STAR EVALUATION SCHEMAS ====================
class StarEvaluationCreate(BaseModel):
    session_id: str
    situation_score: float = Field(..., ge=0, le=25)
    task_score: float = Field(..., ge=0, le=25)
    action_score: float = Field(..., ge=0, le=25)
    result_score: float = Field(..., ge=0, le=25)
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    ai_recommendations: Optional[str] = None
    dossier_summary: Optional[str] = None
    turn_evaluations: Optional[str] = None

class StarEvaluationResponse(BaseModel):
    id: int
    session_id: str
    situation_score: float
    task_score: float
    action_score: float
    result_score: float
    total_score: float
    is_passed: bool
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    ai_recommendations: Optional[str] = None
    dossier_summary: Optional[str] = None
    turn_evaluations: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

