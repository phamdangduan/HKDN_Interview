from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Candidate, Campaign
from ..schemas import CandidateResponse

router = APIRouter(prefix="/api/candidates", tags=["Candidates & CV"])

@router.post("/apply", response_model=CandidateResponse, status_code=201)
def apply_to_campaign(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    campaign_id: Optional[int] = Form(None),
    cv_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Ứng viên nộp CV ứng tuyển vào một chiến dịch (apply.html)"""
    cv_filename = None
    cv_text = None

    if cv_file:
        cv_filename = cv_file.filename
        try:
            content = cv_file.file.read()
            # Giả lập hoặc bóc tách cơ bản văn bản từ file tải lên
            cv_text = f"Nội dung trích xuất từ file {cv_filename} (Kích thước: {len(content)} bytes)"
        except Exception:
            cv_text = "Không thể trích xuất văn bản từ tệp này."

    candidate = Candidate(
        full_name=full_name,
        email=email,
        phone=phone,
        campaign_id=campaign_id,
        cv_filename=cv_filename,
        cv_text=cv_text
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate

@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết hồ sơ ứng viên theo ID"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên")
    return candidate

from pydantic import BaseModel
from ..services.ai_engine import analyze_cv_and_jd_matching

class CvJdMatchRequest(BaseModel):
    cv_text: str
    jd_text: str
    role_title: Optional[str] = "Backend Software Engineer"

@router.post("/match-cv-jd")
def match_cv_jd(req: CvJdMatchRequest):
    """Bóc tách và so khớp chuyên sâu giữa CV và JD bằng Gemini AI (ATS Gap Matcher)"""
    return analyze_cv_and_jd_matching(
        cv_text=req.cv_text,
        jd_text=req.jd_text,
        role_title=req.role_title or "Backend Software Engineer"
    )


