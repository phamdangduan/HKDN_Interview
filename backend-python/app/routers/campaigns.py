from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Campaign, Candidate, InterviewSession, StarEvaluation
from ..schemas import CampaignCreate, CampaignResponse

router = APIRouter(prefix="/api/campaigns", tags=["Enterprise Campaigns"])

@router.post("", response_model=CampaignResponse, status_code=201)
def create_campaign(campaign_in: CampaignCreate, db: Session = Depends(get_db)):
    """Tạo mới một đợt tuyển dụng / chiến dịch vetting"""
    campaign = Campaign(
        title=campaign_in.title,
        company=campaign_in.company,
        location=campaign_in.location,
        stipend=campaign_in.stipend,
        perks=campaign_in.perks,
        job_description=campaign_in.job_description,
        cutoff_score=campaign_in.cutoff_score,
        status="active"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(db: Session = Depends(get_db)):
    """Lấy danh sách các đợt tuyển dụng đang mở"""
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Chi tiết một đợt tuyển dụng theo ID"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt tuyển dụng")
    return campaign

@router.get("/{campaign_id}/vetted-matrix")
def get_campaign_vetted_matrix(campaign_id: int, db: Session = Depends(get_db)):
    """Ma trận ứng viên đã qua vòng lọc AI cho Portal Doanh Nghiệp"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt tuyển dụng")

    # Lấy các session phỏng vấn thuộc campaign này
    sessions = db.query(InterviewSession).filter(InterviewSession.campaign_id == campaign_id).all()
    
    results = []
    for s in sessions:
        candidate = s.candidate
        eval_data = s.evaluation
        
        results.append({
            "session_id": s.id,
            "candidate_id": candidate.id if candidate else None,
            "full_name": candidate.full_name if candidate else "Ẩn danh",
            "email": candidate.email if candidate else "",
            "role": s.role_target,
            "persona": s.persona,
            "status": s.status,
            "total_score": eval_data.total_score if eval_data else 0,
            "is_passed": eval_data.is_passed if eval_data else False,
            "cutoff_score": campaign.cutoff_score,
            "created_at": s.created_at
        })

    return {
        "campaign_id": campaign.id,
        "campaign_title": campaign.title,
        "company": campaign.company,
        "cutoff_score": campaign.cutoff_score,
        "total_applicants": len(results),
        "passed_count": len([r for r in results if r["is_passed"]]),
        "candidates": results
    }
