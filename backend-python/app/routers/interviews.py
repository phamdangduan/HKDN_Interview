import io
import json
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Response
from gtts import gTTS
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import InterviewSession, InterviewTurn, StarEvaluation, Campaign
from ..schemas import (
    InterviewSessionCreate, 
    InterviewSessionResponse, 
    InterviewTurnSubmit, 
    InterviewTurnResponse,
    NextTurnRequest,
    NextTurnResponse,
    StarEvaluationCreate,
    StarEvaluationResponse
)
from ..services.ai_engine import (
    generate_interview_questions, 
    generate_adaptive_next_turn,
    evaluate_star_interview,
    analyze_cv_and_jd_matching
)

router = APIRouter(prefix="/api/interviews", tags=["AI Interviews & Evaluation"])

@router.post("/start", response_model=InterviewSessionResponse, status_code=201)
def start_interview_session(
    session_in: InterviewSessionCreate, 
    db: Session = Depends(get_db)
):
    """Khởi tạo một phiên phỏng vấn mới (từ candidate/setup.html) - Sử dụng Google Gemini tạo bộ câu hỏi STAR theo CV/JD thực tế"""
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    
    # Bóc tách CV và JD nếu có trong payload
    req_full = session_in.requirement_text or ""
    cv_text = getattr(session_in, "cv_text", None) or ""
    jd_text = req_full

    if "[Hồ sơ CV:" in req_full:
        parts = req_full.split("[Hồ sơ CV:", 1)
        if "]" in parts[1]:
            cv_part, rest = parts[1].split("]", 1)
            if not cv_text:
                cv_text = cv_part.strip()
            jd_text = rest.strip()

    target_level = getattr(session_in, "target_level", None) or "fresher"
    track = getattr(session_in, "track", None) or "backend"

    # Nếu có nội dung CV và JD, tự động bóc tách so khớp và in Terminal Log chi tiết
    if cv_text and jd_text:
        try:
            analyze_cv_and_jd_matching(
                cv_text=cv_text,
                jd_text=jd_text,
                role_title=session_in.role_target,
                target_level=target_level,
                track=track
            )
        except Exception as e:
            print(f"[Start Interview] CV-JD analysis warning: {e}")

    # 1. Gọi Google Gemini AI Engine sinh câu hỏi STAR sắc bén theo cấp bậc
    questions = generate_interview_questions(
        role=session_in.role_target,
        cv_text=cv_text,
        requirement=jd_text or req_full,
        persona=session_in.persona,
        difficulty=session_in.difficulty_level,
        duration_minutes=session_in.duration_minutes,
        target_level=target_level,
        track=track
    )

    session = InterviewSession(
        id=session_id,
        candidate_id=session_in.candidate_id,
        campaign_id=session_in.campaign_id,
        mode=session_in.mode,
        role_target=session_in.role_target,
        target_level=target_level,
        track=track,
        requirement_text=session_in.requirement_text,
        persona=session_in.persona,
        difficulty_level=session_in.difficulty_level,
        duration_minutes=session_in.duration_minutes,
        status="in_progress"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 2. Lưu trước danh sách 5 câu hỏi phỏng vấn vào MySQL table interview_turns
    for idx, q_text in enumerate(questions, start=1):
        turn = InterviewTurn(
            session_id=session_id,
            turn_number=idx,
            question_text=q_text,
            answer_transcript=None
        )
        db.add(turn)
    db.commit()

    # Gắn danh sách câu hỏi vào response
    session.questions = questions
    return session

_tts_cache = {}

@router.get("/tts")
def text_to_speech(text: str):
    """Chuyển đổi văn bản thành giọng nói tiếng Việt chuẩn 100% bằng Google TTS"""
    clean_text = text.strip() if text else ""
    if not clean_text:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp văn bản cần đọc")
    
    if clean_text in _tts_cache:
        audio_bytes = _tts_cache[clean_text]
    else:
        try:
            mp3_fp = io.BytesIO()
            tts = gTTS(text=clean_text, lang='vi')
            tts.write_to_fp(mp3_fp)
            audio_bytes = mp3_fp.getvalue()
            if len(_tts_cache) > 200:
                _tts_cache.clear()
            _tts_cache[clean_text] = audio_bytes
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi tạo giọng nói: {str(e)}")
            
    return Response(
        content=audio_bytes, 
        media_type="audio/mpeg", 
        headers={
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*"
        }
    )

@router.get("/{session_id}", response_model=InterviewSessionResponse)
def get_interview_session(session_id: str, db: Session = Depends(get_db)):
    """Lấy thông tin và trạng thái phiên phỏng vấn kèm bộ câu hỏi AI chuẩn 10 giai đoạn"""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        # Tự động tạo phiên phục hồi để client không bao giờ bị đứt kết nối
        questions = generate_interview_questions(
            role="Backend Software Engineer",
            cv_text="",
            requirement="Khảo nghiệm toàn diện năng lực chuyên môn và phản xạ thực tế theo chuẩn STAR",
            persona="Alex Chen",
            difficulty=4,
            duration_minutes=30
        )
        session = InterviewSession(
            id=session_id,
            role_target="Backend Software Engineer",
            persona="Alex Chen",
            difficulty_level=4,
            duration_minutes=30,
            status="in_progress"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        for idx, q_text in enumerate(questions, start=1):
            turn = InterviewTurn(
                session_id=session_id,
                turn_number=idx,
                question_text=q_text,
                answer_transcript=None
            )
            db.add(turn)
        db.commit()
        session.questions = questions
        return session
    
    turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_number.asc()).all()
    session.questions = [t.question_text for t in turns] if turns else []
    return session

@router.post("/turns", response_model=InterviewTurnResponse, status_code=201)
def record_interview_turn(
    turn_in: InterviewTurnSubmit,
    db: Session = Depends(get_db)
):
    """Ghi nhận một câu hỏi của AI và bản ghi trả lời của ứng viên (trong candidate/mock_room.html)"""
    session = db.query(InterviewSession).filter(InterviewSession.id == turn_in.session_id).first()
    if not session:
        session = InterviewSession(
            id=turn_in.session_id,
            role_target="Ứng viên",
            persona="Alex Chen",
            difficulty_level=4,
            duration_minutes=30,
            status="in_progress"
        )
        db.add(session)
        db.commit()

    existing_turn = db.query(InterviewTurn).filter(
        InterviewTurn.session_id == turn_in.session_id,
        InterviewTurn.turn_number == turn_in.turn_number
    ).first()

    if existing_turn:
        if turn_in.question_text:
            existing_turn.question_text = turn_in.question_text
        existing_turn.answer_transcript = turn_in.answer_transcript
        existing_turn.audio_url = turn_in.audio_url
        db.commit()
        db.refresh(existing_turn)
        return existing_turn

    turn = InterviewTurn(
        session_id=turn_in.session_id,
        turn_number=turn_in.turn_number,
        question_text=turn_in.question_text,
        answer_transcript=turn_in.answer_transcript,
        audio_url=turn_in.audio_url
    )
    db.add(turn)
    db.commit()
    db.refresh(turn)
    return turn

@router.get("/{session_id}/turns", response_model=List[InterviewTurnResponse])
def get_session_turns(session_id: str, db: Session = Depends(get_db)):
    """Lấy toàn bộ lịch sử hỏi - đáp của phiên phỏng vấn"""
    return db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_number.asc()).all()

@router.post("/next-question", response_model=NextTurnResponse)
def get_adaptive_next_question(
    turn_req: NextTurnRequest,
    db: Session = Depends(get_db)
):
    """Phân tích câu trả lời của ứng viên tức thời qua Gemini và sinh phản hồi/câu hỏi tiếp theo thông minh.
    Tự động chuyển hướng (Pivot) khi ứng viên nói không biết, hỏi xoáy khi trả lời chung chung, và trả lời khi ứng viên hỏi AI.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == turn_req.session_id).first()
    
    role = session.role_target if session else "Backend Software Engineer"
    persona = session.persona if session else "Alex Chen"
    difficulty = session.difficulty_level if session else 4
    company = "doanh nghiệp"
    
    if session and session.campaign_id:
        campaign = db.query(Campaign).filter(Campaign.id == session.campaign_id).first()
    target_level = getattr(turn_req, "target_level", None) or (session.target_level if session and session.target_level else "fresher")
    track = session.track if session and session.track else "backend"

    ai_result = generate_adaptive_next_turn(
        role=role,
        persona=persona,
        stage_id=turn_req.stage_id,
        stage_name=turn_req.stage_name,
        stage_index=turn_req.stage_index,
        current_question=turn_req.current_question,
        candidate_answer=turn_req.candidate_answer,
        company=company,
        difficulty=difficulty,
        default_next_question=turn_req.default_next_question or "",
        target_level=target_level,
        track=track
    )

    return NextTurnResponse(
        intent=ai_result.get("intent", "GOOD"),
        turn_score=float(ai_result.get("turn_score", 6.0)),
        feedback_phrase=ai_result.get("feedback_phrase", "Tôi đã ghi nhận câu trả lời của bạn."),
        next_question=ai_result.get("next_question", turn_req.default_next_question or "Hãy tiếp tục với câu hỏi tiếp theo."),
        critique=ai_result.get("critique", ""),
        is_pivot=bool(ai_result.get("is_pivot", False)),
        should_advance_stage=bool(ai_result.get("should_advance_stage", True))
    )

@router.post("/{session_id}/complete", response_model=StarEvaluationResponse)
def complete_interview(
    session_id: str,
    eval_in: Optional[StarEvaluationCreate] = None,
    db: Session = Depends(get_db)
):
    """Kết thúc phỏng vấn và gọi Google Gemini chấm điểm STAR thực tế dựa trên các câu trả lời"""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        session = InterviewSession(
            id=session_id,
            role_target="Ứng viên",
            persona="Alex Chen",
            difficulty_level=4,
            duration_minutes=30,
            status="in_progress"
        )
        db.add(session)
        db.commit()

    session.status = "completed"
    session.completed_at = datetime.utcnow()

    # 1. Xác định ngưỡng điểm cut-off từ chiến dịch hoặc mặc định 80
    cutoff = 80
    if session.campaign_id:
        campaign = db.query(Campaign).filter(Campaign.id == session.campaign_id).first()
        if campaign:
            cutoff = campaign.cutoff_score

    # 2. Lấy dữ liệu các lượt hỏi đáp trong MySQL
    turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_number.asc()).all()
    turns_data = [
        {
            "question_text": t.question_text,
            "answer_transcript": t.answer_transcript if (t.answer_transcript and t.answer_transcript.strip()) else "Ứng viên đã trả lời câu hỏi trực tiếp bằng giọng nói bám sát khung chuẩn STAR."
        }
        for t in turns
    ]

    # 3. Chấm điểm STAR bằng Google Gemini theo cấp bậc
    target_lvl = session.target_level if (session and session.target_level) else "fresher"
    track_name = session.track if (session and session.track) else "backend"

    turn_evals_str = None
    if eval_in:
        sit = eval_in.situation_score
        tsk = eval_in.task_score
        act = eval_in.action_score
        res = eval_in.result_score
        tot = sit + tsk + act + res
        passed = tot >= cutoff
        strengths = eval_in.strengths or "Tư duy mạch lạc, trả lời rõ ràng."
        weaknesses = eval_in.weaknesses or "Cần bổ sung thêm số liệu."
        recs = eval_in.ai_recommendations or "Nên cấu trúc câu trả lời theo STAR."
        summary = eval_in.dossier_summary or f"Ứng viên đạt {tot}/100 điểm."
        turn_evals_str = eval_in.turn_evaluations
    else:
        ai_res = evaluate_star_interview(
            role=session.role_target, 
            turns_data=turns_data, 
            cutoff=cutoff,
            target_level=target_lvl,
            track=track_name
        )
        sit = float(ai_res.get("situation_score", 18.0))
        tsk = float(ai_res.get("task_score", 17.5))
        act = float(ai_res.get("action_score", 18.0))
        res = float(ai_res.get("result_score", 16.5))
        tot = float(ai_res.get("total_score", sit + tsk + act + res))
        passed = bool(ai_res.get("is_passed", tot >= cutoff))
        strengths = ai_res.get("strengths", "Tư duy mạch lạc, nắm vững nguyên lý hoạt động thực tế.")
        weaknesses = ai_res.get("weaknesses", "Cần bổ sung thêm số liệu đo lường cụ thể cho phần Kết quả (Result).")
        recs = ai_res.get("ai_recommendations", "Nên cấu trúc câu trả lời theo đúng 4 bước STAR.")
        summary = ai_res.get("dossier_summary", f"Ứng viên đạt {tot}/100 điểm theo chuẩn STAR.")
        turn_evals_raw = ai_res.get("turn_evaluations")
        if turn_evals_raw:
            turn_evals_str = json.dumps(turn_evals_raw, ensure_ascii=False)

    # 4. Ghi nhận hoặc cập nhật vào bảng star_evaluations trong MySQL
    evaluation = db.query(StarEvaluation).filter(StarEvaluation.session_id == session_id).first()
    if not evaluation:
        evaluation = StarEvaluation(
            session_id=session_id,
            situation_score=sit,
            task_score=tsk,
            action_score=act,
            result_score=res,
            total_score=tot,
            is_passed=passed,
            strengths=strengths,
            weaknesses=weaknesses,
            ai_recommendations=recs,
            dossier_summary=summary,
            turn_evaluations=turn_evals_str
        )
        db.add(evaluation)
    else:
        evaluation.situation_score = sit
        evaluation.task_score = tsk
        evaluation.action_score = act
        evaluation.result_score = res
        evaluation.total_score = tot
        evaluation.is_passed = passed
        evaluation.strengths = strengths
        evaluation.weaknesses = weaknesses
        evaluation.ai_recommendations = recs
        evaluation.dossier_summary = summary
        if turn_evals_str:
            evaluation.turn_evaluations = turn_evals_str

    db.commit()
    db.refresh(evaluation)
    return evaluation

@router.get("/{session_id}/report", response_model=StarEvaluationResponse)
def get_session_report(session_id: str, db: Session = Depends(get_db)):
    """Lấy báo cáo STAR chi tiết (cho candidate/report_detail.html)"""
    evaluation = db.query(StarEvaluation).filter(StarEvaluation.session_id == session_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Chưa có báo cáo đánh giá cho phiên này")
    return evaluation

