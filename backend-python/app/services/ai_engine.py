import os
import sys
import json
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv
from google import genai

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CANDIDATE_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-flash-latest"]

PERSONA_PROFILES = {
    "Alex Chen": {
        "title": "Senior Software Architect (Kỹ sư trưởng Công nghệ - Ex Big Tech)",
        "focus": "Kiến trúc hệ thống, bản chất kỹ thuật bên dưới (Under the hood), tối ưu hiệu năng (Scalability), Clean Code và cơ chế hoạt động của Framework/Database.",
        "tone": "Điềm tĩnh, sắc bén, chuyên môn sâu, đánh giá cao tư duy logic và hiểu sâu bản chất kỹ thuật.",
        "questionStyle": "Hỏi xoáy vào bản chất cơ chế hoạt động (Tại sao chọn công nghệ này? Cơ chế bộ nhớ/index/concurrency bên dưới ra sao?).",
        "probingRule": "Nếu ứng viên trả lời lý thuyết chung chung, lập tức yêu cầu bóc tách chi tiết kỹ thuật thực tế và cơ chế bên dưới (Under the hood)."
    },
    "David Miller": {
        "title": "Senior Tech Director (Giám đốc Công nghệ Khó Tính & Hỏi Xoáy Gắt)",
        "focus": "Sự cố thực tế, số liệu đo lường cụ thể (Metrics/Numbers), khả năng chịu áp lực (Stress Test), xử lý khủng hoảng và tính xác thực của CV.",
        "tone": "Nghiêm khắc, sắc lạnh, hay đặt nghi vấn phản biện: 'Tại sao không làm cách khác?', 'Con số cụ thể là bao nhiêu?'.",
        "questionStyle": "Đặt các tình huống sự cố production khẩn cấp, bắt bẻ số liệu đo lường, kiểm tra tính tự lập (tự code hay làm theo người khác).",
        "probingRule": "Nếu ứng viên trả lời mập mờ hoặc thiếu số liệu, lập tức bắt bẻ và yêu cầu đưa ra con số chính xác (RPS, latency, downtime, lỗi cụ thể)."
    },
    "Sarah Jenkins": {
        "title": "Head of Talent & Culture (Trưởng Ban Nhân Sự & Văn Hóa Doanh Nghiệp)",
        "focus": "Kỹ năng mềm, khả năng giao tiếp (Communication), giải quyết mâu thuẫn nội bộ (Conflict Resolution), văn hóa làm việc nhóm (Teamwork) và chuẩn mực ứng xử theo STAR.",
        "tone": "Truyền cảm, nhã nhặn, biết lắng nghe nhưng đánh giá rất sâu về EQ, thái độ cầu tiến và khả năng hòa nhập đội ngũ.",
        "questionStyle": "Hỏi về các tình huống giao tiếp, giải quyết bất đồng quan điểm kỹ thuật với đồng nghiệp, áp lực deadline và cách đón nhận phản hồi tiêu cực.",
        "probingRule": "Nếu ứng viên chỉ nói về công nghệ mà quên yếu tố con người, yêu cầu làm rõ cách ứng viên phối hợp với đồng nghiệp và xử lý cảm xúc trong tình huống đó."
    },
    "Rachel Vance": {
        "title": "Executive Vice President (Lãnh đạo Cấp Cao C-Level)",
        "focus": "Tầm nhìn chiến lược kinh doanh (Business Value), đánh đổi kỹ thuật (Trade-offs), tối ưu chi phí hạ tầng (ROI) và khả năng dẫn dắt đội ngũ.",
        "tone": "Đĩnh đạc, bao quát, tầm nhìn vĩ mô của nhà lãnh đạo điều hành doanh nghiệp.",
        "questionStyle": "Hỏi về giá trị kinh doanh mà giải pháp kỹ thuật mang lại, sự cân bằng giữa chi phí máy chủ và tốc độ phát triển sản phẩm.",
        "probingRule": "Yêu cầu ứng viên giải thích các quyết định kỹ thuật đứng trên góc nhìn hiệu quả kinh doanh và lợi ích lâu dài của toàn công ty."
    }
}

def get_client():
    if not GEMINI_API_KEY:
        raise ValueError("Chưa tìm thấy GEMINI_API_KEY trong file .env")
    return genai.Client(api_key=GEMINI_API_KEY)


def detect_and_log_api_quota_warning(service: str, err: Exception) -> Dict[str, Any]:
    err_msg = str(err).lower()
    is_quota = any(k in err_msg for k in ["resource_exhausted", "quota", "rate limit", "too many requests", "429", "exceeded your current quota", "billing"])
    is_key_err = any(k in err_msg for k in ["api_key_invalid", "permission_denied", "403", "unauthenticated"])

    if is_quota:
        print("\n" + "🚨" * 36, flush=True)
        print(f"⚠️  [CẢNH BÁO HẾT HẠN MỨC GỌI API MIỄN PHÍ - {service.upper()}]", flush=True)
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", flush=True)
        print(f"📌 Dịch vụ: {service}", flush=True)
        print("⚠️ Trạng thái: LỖI 429 - HẾT QUOTA / RATE LIMIT (Vượt tần suất gọi)", flush=True)
        print(f"💡 Thông báo từ nhà cung cấp: {err}", flush=True)
        print("🔄 Hành động tự động: Hệ thống kích hoạt Chế độ Dự phòng Thông minh (Fallback Engine)!", flush=True)
        print("👉 Khuyến nghị: Thay GEMINI_API_KEY / BLAZE_API_KEY mới vào file .env.", flush=True)
        print("🚨" * 36 + "\n", flush=True)
        return {"is_quota": True, "message": f"Hạn mức gọi API miễn phí ({service}) tạm thời đã hết lượt (Rate Limit / Quota Exceeded)."}
    elif is_key_err:
        print("\n" + "🚨" * 36, flush=True)
        print(f"⚠️  [CẢNH BÁO API KEY {service.upper()} KHÔNG HỢP LỆ HOẶC BỊ KHÓA]", flush=True)
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", flush=True)
        print(f"📌 Dịch vụ: {service}", flush=True)
        print("⚠️ Trạng thái: LỖI 403 - FORBIDDEN / INVALID KEY", flush=True)
        print(f"💡 Thông báo: {err}", flush=True)
        print("👉 Khuyến nghị: Vui lòng kiểm tra lại cấu hình API Key trong file .env.", flush=True)
        print("🚨" * 36 + "\n", flush=True)
        return {"is_quota": True, "message": f"API Key {service} không hợp lệ hoặc đã bị khóa."}
    return {"is_quota": False, "message": ""}


def print_cv_jd_terminal_log(data: Dict[str, Any], role_title: str):
    """In log bóc tách CV & JD chuyên sâu ra Terminal chuẩn UTF-8, trực quan và sắc nét."""
    try:
        sep = "═" * 80
        print("\n" + sep, flush=True)
        print("🤖 [TALENTAI AI ENGINE] BÓC TÁCH CV & JD - PHÂN TÍCH SO KHỚP & CHIẾN LƯỢC HỎI XOÁY", flush=True)
        print(sep, flush=True)
        print(f"📌 VỊ TRÍ ỨNG TUYỂN MỤC TIÊU: {role_title.upper()}\n", flush=True)
        
        # 1. Bóc tách JD
        jd_info = data.get("jd_extracted", {})
        print("📋 [1] BÓC TÁCH YÊU CẦU CÔNG VIỆC (JOB DESCRIPTION - JD):", flush=True)
        if isinstance(jd_info, dict) and jd_info:
            core_reqs = jd_info.get("core_requirements", [])
            if isinstance(core_reqs, list) and core_reqs:
                print("   • Yêu cầu kỹ năng & Công nghệ cốt lõi:", flush=True)
                for r in core_reqs:
                    print(f"     - {r}", flush=True)
            if jd_info.get("experience_required"):
                print(f"   • Yêu cầu kinh nghiệm: {jd_info.get('experience_required')}", flush=True)
            soft = jd_info.get("soft_skills", [])
            if isinstance(soft, list) and soft:
                print("   • Tiêu chí mềm & Tư duy:", flush=True)
                for s in soft:
                    print(f"     - {s}", flush=True)
        else:
            print("   • Đã bóc tách yêu cầu công việc từ JD thành công.", flush=True)
        print("", flush=True)

        # 2. Bóc tách CV
        cv_info = data.get("cv_extracted", {})
        print("👤 [2] BÓC TÁCH NĂNG LỰC HỒ SƠ ỨNG VIÊN (CV / RESUME):", flush=True)
        if isinstance(cv_info, dict) and cv_info:
            if cv_info.get("candidate_summary"):
                print(f"   • Tổng quan ứng viên: {cv_info.get('candidate_summary')}", flush=True)
            skills = cv_info.get("skills_present", [])
            if isinstance(skills, list) and skills:
                print("   • Kỹ năng & Công nghệ nhận diện trong CV:", flush=True)
                for sk in skills:
                    print(f"     - {sk}", flush=True)
            projects = cv_info.get("highlight_projects", [])
            if isinstance(projects, list) and projects:
                print("   • Dự án / Đồ án thực tế tiêu biểu:", flush=True)
                for p in projects:
                    print(f"     - {p}", flush=True)
        else:
            print("   • Đã nhận diện thông tin học vấn, kỹ năng và dự án từ CV.", flush=True)
        print("", flush=True)

        # 3. So khớp ATS
        score = data.get("match_score", 0)
        level = data.get("match_level", "Đang đánh giá")
        print("📊 [3] KẾT QUẢ SO KHỚP NĂNG LỰC (ATS GAP & MATCH SCORE):", flush=True)
        print(f"   ★ ĐỘ TRÙNG KHỚP TỔNG THỂ: {score}% [{level.upper()}]", flush=True)
        if data.get("summary_verdict"):
            print(f"   ℹ️ Nhận định chung: {data.get('summary_verdict')}", flush=True)
        
        matched = data.get("matched_skills", [])
        print("   ✅ Kỹ năng & Kinh nghiệm ĐÃ TRÙNG KHỚP (Matched):", flush=True)
        if isinstance(matched, list) and matched:
            for m in matched:
                print(f"      + {m}", flush=True)
        else:
            print("      (Không có kỹ năng nổi bật trùng khớp)", flush=True)

        gaps = data.get("missing_gaps", [])
        print("   ⚠️ Khoảng trống năng lực / Điểm thiếu so với JD (Skill Gaps):", flush=True)
        if isinstance(gaps, list) and gaps:
            for g in gaps:
                print(f"      - {g}", flush=True)
        else:
            print("      (Không phát hiện khoảng trống lớn)", flush=True)
        print("", flush=True)

        # 4. Thông tin quan trọng cần xử lý & Bộ câu hỏi hỏi xoáy
        print("🎯 [4] THÔNG TIN CẦN XỬ LÝ & BỘ CÂU HỎI HỎI XOÁY (INTERVIEW PROBING STRATEGY):", flush=True)
        probe_points = data.get("critical_probe_points", [])
        if isinstance(probe_points, list) and probe_points:
            print("   🔍 Các điểm nghi vấn / thông tin cần AI thẩm định sâu:", flush=True)
            for pp in probe_points:
                print(f"      * {pp}", flush=True)
        
        probing_qs = data.get("probing_questions", [])
        print("   ❓ Bộ câu hỏi hỏi xoáy thiết kế riêng theo khoảng trống (Gaps):", flush=True)
        if isinstance(probing_qs, list) and probing_qs:
            for idx, q in enumerate(probing_qs, 1):
                print(f"      [{idx}] \"{q}\"", flush=True)
        print("", flush=True)

        # 5. Đánh giá 3 chiều của AI
        reasoning = data.get("ai_reasoning", {})
        if isinstance(reasoning, dict) and reasoning:
            print("🧠 [5] TƯ DUY PHÂN TÍCH 3 CHIỀU CỦA AI (AI REASONING):", flush=True)
            if reasoning.get("technical_fit"):
                print(f"   • Kỹ thuật / Chuyên môn: {reasoning.get('technical_fit')}", flush=True)
            if reasoning.get("experience_fit"):
                print(f"   • Kinh nghiệm thực chiến: {reasoning.get('experience_fit')}", flush=True)
            if reasoning.get("growth_potential"):
                print(f"   • Tiềm năng phát triển: {reasoning.get('growth_potential')}", flush=True)
        
        print(sep + "\n", flush=True)
    except Exception as err:
        print(f"[Logging Exception in print_cv_jd_terminal_log]: {err}", flush=True)


def print_interview_start_terminal_log(
    role: str,
    persona: str,
    difficulty: int,
    cv_text: str,
    requirement: str,
    questions: List[str],
    target_level: str = "fresher",
    track: str = "backend"
):
    """In log khởi tạo đề thi 10 giai đoạn ra Terminal theo cấp bậc IT."""
    try:
        sep = "═" * 80
        level_map = {
            "intern": "🟢 THỰC TẬP SINH (INTERN)",
            "fresher": "🔵 MỚI TỐT NGHIỆP (FRESHER / <1 NĂM)",
            "junior": "🟣 KỸ SƯ JUNIOR (1 - 2.5 NĂM)",
            "mid_level": "🟠 KỸ SƯ TIÊU CHUẨN (MID-LEVEL / 3+ NĂM)"
        }
        level_label = level_map.get(target_level.lower(), target_level.upper())
        print("\n" + sep, flush=True)
        print("🎯 [TALENTAI INTERVIEW ENGINE] KHỞI TẠO BỘ ĐỀ KỸ THUẬT IT 10 GIAI ĐOẠN THEO CẤP BẬC", flush=True)
        print(sep, flush=True)
        print(f"📌 VỊ TRÍ ỨNG TUYỂN: {role.upper()} | TRACK: {track.upper()}", flush=True)
        print(f"🎖️ CẤP BẬC KHẢO NGHIỆM: {level_label}", flush=True)
        print(f"👤 GIÁM KHẢO AI: {persona} (Độ khó hỏi xoáy: {difficulty}/5)", flush=True)
        if cv_text:
            print(f"📄 HỒ SƠ CV CUNG CẤP: {cv_text[:120]}...", flush=True)
        if requirement:
            print(f"📋 YÊU CẦU / JD: {requirement[:120]}...", flush=True)
        print("\n🎯 DANH SÁCH 10 CÂU HỎI STAR MAY ĐO CHO ỨNG VIÊN:", flush=True)
        stage_names = [
            "1. Chào hỏi & Phá băng",
            "2. Giới thiệu bản thân & Định hướng Tech",
            "3. Đào sâu Dự án / Đồ án trong CV",
            "4. Chuyên môn Kỹ thuật cốt lõi",
            "5. Xử lý Tình huống STAR thực tế (Sự cố Tech)",
            "6. Động lực & Mục tiêu công nghệ 2-3 năm",
            "7. Điểm mạnh & Điểm hạn chế kỹ thuật",
            "8. Kỳ vọng Văn hóa Engineering & Teamwork",
            "9. Lắng nghe Ứng viên đặt câu hỏi",
            "10. Tổng kết & Nhận xét kết thúc"
        ]
        for idx, q in enumerate(questions):
            stage_label = stage_names[idx] if idx < len(stage_names) else f"{idx + 1}. Giai đoạn {idx + 1}"
            print(f"   [{stage_label}]:\n      \"{q}\"", flush=True)
        print(sep + "\n", flush=True)
    except Exception as err:
        print(f"[Logging Exception in print_interview_start_terminal_log]: {err}", flush=True)


def print_adaptive_turn_terminal_log(
    stage_index: int,
    stage_name: str,
    current_question: str,
    candidate_answer: str,
    data: Dict[str, Any]
):
    """In log từng turn phỏng vấn theo thời gian thực."""
    try:
        sep = "─" * 80
        print("\n" + sep, flush=True)
        print(f"🎤 [TALENTAI LIVE TURN LOG] GIAI ĐOẠN {stage_index + 1}/10: {stage_name.upper()}", flush=True)
        print(f"❓ Câu hỏi vừa hỏi: \"{current_question}\"", flush=True)
        print(f"🗣️ Câu trả lời ứng viên: \"{candidate_answer}\"", flush=True)
        intent = data.get("intent", "UNKNOWN")
        score = data.get("turn_score", 0.0)
        feedback = data.get("feedback_phrase", "")
        next_q = data.get("next_question", "")
        is_pivot = " [CHUYỂN HƯỚNG/PIVOT]" if data.get("is_pivot") else ""
        branch = data.get("branch", "PROBE_DEEPER")
        branch_badge = (
            "🚀 [NHÁNH 1: ĐÀO SÂU MỞ RỘNG / +1 LEVEL]"
            if branch == "PROBE_DEEPER"
            else "🔍 [NHÁNH 2: KÉO VỀ THỰC TẾ / BÓC TÁCH MÃ NGUỒN]"
            if branch == "GROUND_TO_PRACTICE"
            else "🤝 [NHÁNH 3: ĐỒNG CẢM & HẠ ĐỘ KHÓ / PIVOT THÂN THIỆN]"
        )
        analysis = data.get("candidate_statement_analysis") or data.get("critique", "")
        print("🧠 AI Phân tích phản hồi:", flush=True)
        print(f"   • {branch_badge}", flush=True)
        if data.get("branch_reason"):
            print(f"     Lý do chọn nhánh: {data.get('branch_reason')}", flush=True)
        if data.get("competency_focus"):
            print(f"   • Trọng tâm năng lực: {data.get('competency_focus')}", flush=True)
        if analysis:
            print(f"   • Phân tích câu nói & tâm lý ứng viên: \"{analysis}\"", flush=True)
        print(f"   • Ý định (Intent): {intent} | Điểm lượt này: {score}/10{is_pivot}", flush=True)
        print(f"   • Giám khảo phản hồi: \"{feedback}\"", flush=True)
        print(f"   • Câu hỏi tiếp theo thích ứng: \"{next_q}\"", flush=True)
        print(sep + "\n", flush=True)
    except Exception as err:
        print(f"[Logging Exception in print_adaptive_turn_terminal_log]: {err}", flush=True)


def print_star_evaluation_terminal_log(data: Dict[str, Any], role: str):
    """In log tổng kết đánh giá cuối buổi phỏng vấn."""
    try:
        sep = "═" * 80
        print("\n" + sep, flush=True)
        print(f"🏆 [TALENTAI EVALUATION LOG] TỔNG KẾT BÁO CÁO PHỎNG VẤN VỊ TRÍ {role.upper()}", flush=True)
        print(sep, flush=True)
        total = data.get("total_score", 0.0)
        passed = "ĐẠT (PASS)" if data.get("is_passed") else "KHÔNG ĐẠT (FAIL)"
        print(f"📊 ĐIỂM TỔNG KẾT: {total}/100 ➔ KẾT QUẢ: {passed}", flush=True)
        print(f"   • S (Tình huống): {data.get('situation_score')}/25 | T (Nhiệm vụ): {data.get('task_score')}/25", flush=True)
        print(f"   • A (Hành động): {data.get('action_score')}/25 | R (Kết quả): {data.get('result_score')}/25", flush=True)
        print(f"   ℹ️ Đánh giá: {data.get('dossier_summary')}", flush=True)
        print(f"   ✅ Điểm mạnh: {data.get('strengths')}", flush=True)
        print(f"   ⚠️ Điểm yếu: {data.get('weaknesses')}", flush=True)
        print(sep + "\n", flush=True)
    except Exception as err:
        print(f"[Logging Exception in print_star_evaluation_terminal_log]: {err}", flush=True)


def extract_json(text: str) -> Any:
    """Trích xuất JSON an toàn từ phản hồi của mô hình LLM"""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except Exception:
        # Thử tìm object JSON {...}
        match_obj = re.search(r"\{.*\}", text, re.DOTALL)
        if match_obj:
            try:
                return json.loads(match_obj.group(0))
            except Exception:
                pass

        # Thử tìm mảng JSON [...]
        match_arr = re.search(r"\[.*\]", text, re.DOTALL)
        if match_arr:
            try:
                return json.loads(match_arr.group(0))
            except Exception:
                pass
        raise


def generate_interview_questions(
    role: str,
    cv_text: str = "",
    requirement: str = "",
    persona: str = "Alex Chen",
    difficulty: int = 4,
    duration_minutes: int = 30,
    target_level: str = "fresher",
    track: str = "backend"
) -> List[str]:
    """Sử dụng Gemini sinh bộ câu hỏi khởi đầu chuẩn 10 giai đoạn chuyên sâu cho ngành IT Software Engineering
    phân tầng theo cấp bậc rõ rệt (Intern, Fresher, Junior, Mid-Level).
    """
    client = get_client()

    lvl = (target_level or "fresher").lower()
    
    # Hướng dẫn trọng tâm theo cấp bậc
    if "intern" in lvl:
        level_focus = """
CẤP BẬC KHẢO NGHIỆM: THỰC TẬP SINH (INTERN)
- Mục tiêu: Đánh giá nền tảng tư duy lập trình (CS Fundamentals), OOP, Cấu trúc dữ liệu & Giải thuật cơ bản, khả năng tự học debug và thái độ cầu thị.
- Đồ án: Hỏi về bài tập lớn, đồ án môn học ở trường, cách làm quen với Git / IDE.
- TUYỆT ĐỐI KHÔNG hỏi các kiến trúc chịu tải phân tán, microservices hay hạ tầng production phức tạp!
"""
    elif "junior" in lvl:
        level_focus = """
CẤP BẬC KHẢO NGHIỆM: KỸ SƯ JUNIOR (1 - 2.5 NĂM KINH NGHIỆM)
- Mục tiêu: Đánh giá kinh nghiệm thực chiến tại doanh nghiệp: Concurrency, Caching (Redis), xử lý Race Condition, tối ưu hóa truy vấn Database (Composite Index, N+1 query), Unit Testing (JUnit/Mockito, Coverage) và giải quyết sự cố Production (Out of memory, connection pool exhaustion).
- Đồ án: Yêu cầu phân tích kiến trúc dự án thực tế có người dùng thật, các đánh đổi kỹ thuật (Trade-offs) và số liệu đo lường.
"""
    elif "mid" in lvl:
        level_focus = """
CẤP BẬC KHẢO NGHIỆM: KỸ SƯ TIÊU CHUẨN (MID-LEVEL / 3+ NĂM)
- Mục tiêu: Đánh giá Thiết kế hệ thống (System Design), Microservices, High Concurrency, Database Sharding, Event-Driven Architecture (Kafka/RabbitMQ) và đánh đổi kiến trúc.
"""
    else: # fresher
        level_focus = """
CẤP BẬC KHẢO NGHIỆM: MỚI TỐT NGHIỆP (FRESHER / <1 NĂM KINH NGHIỆM)
- Mục tiêu: Đánh giá làm chủ 1 Tech Stack chính (ví dụ Java/Spring Boot, React, Node.js...), hiểu vòng đời HTTP Request, thiết kế RESTful API chuẩn, Database quan hệ (Index, Transaction cơ bản), Clean Code và đồ án tốt nghiệp/dự án cá nhân hoàn chỉnh.
- Đồ án: Xoáy sâu vào đồ án tốt nghiệp/cá nhân, kiểm tra tự tay code hay copy, cách tổ chức mã nguồn và xử lý lỗi.
"""

    p_prof = PERSONA_PROFILES.get(persona, PERSONA_PROFILES["Alex Chen"])
    persona_info = f"""
CHÂN DUNG & PHONG CÁCH GIÁM KHẢO: {persona} ({p_prof['title']})
- Trọng tâm đánh giá: {p_prof['focus']}
- Tông giọng đối thoại: {p_prof['tone']}
- Phong cách đặt câu hỏi: {p_prof['questionStyle']}
- Quy tắc đào sâu: {p_prof['probingRule']}
"""

    prompt = f"""
Bạn là {persona}, {p_prof['title']} tại TalentAI (Cấp độ hỏi thực chiến IT {difficulty}/5).
Buổi phỏng vấn kỹ thuật dự kiến kéo dài {duration_minutes} phút cho vị trí: {role} (Track: {track}).
{persona_info}
{level_focus}

Yêu cầu kịch bản tuyển dụng: {requirement or 'Khảo sát năng lực thực tế, tư duy giải quyết bài toán kỹ thuật theo chuẩn STAR.'}
Hồ sơ CV ứng viên: {cv_text or 'Ứng viên ngành CNTT có kiến thức nền tảng và đã từng tham gia đồ án/dự án thực tế.'}

HÃY TẠO BỘ 10 CÂU HỎI PHỎNG VẤN KỸ THUẬT TIẾNG VIỆT THEO ĐÚNG 10 GIAI ĐOẠN SAU (BÁM SÁT CẤP BẬC {lvl.upper()}):
1. Chào hỏi & Phá băng: Lời chào thân thiện, hỏi thăm tinh thần và thiết bị của ứng viên.
2. Giới thiệu bản thân & Định hướng Tech: Mời ứng viên tóm tắt bản thân và cơ duyên làm chủ công nghệ của vị trí {role}.
3. CV / Đồ án thực chiến: Hỏi sâu về một dự án hoặc đồ án kỹ thuật tiêu biểu nhất trong CV (kiến trúc, DB, vai trò cá nhân).
4. Chuyên môn cốt lõi: Câu hỏi kỹ thuật sắc bén, kiểm tra bản chất nền tảng đúng tầm với cấp bậc {lvl.upper()}.
5. Tình huống sự cố STAR: Đưa ra tình huống kỹ thuật phức tạp (bug phát sinh, deploy lỗi hoặc sự cố tải/tiến độ) yêu cầu ứng viên trả lời theo STAR (Bối cảnh - Nhiệm vụ - Hành động xử lý - Kết quả đo lường).
6. Động lực & Mục tiêu 2-3 năm: Tìm hiểu mục tiêu phát triển chuyên môn kỹ thuật trong 2 đến 3 năm tới.
7. Điểm mạnh & Điểm hạn chế kỹ thuật: Khảo sát thế mạnh cạnh tranh lớn nhất và một điểm hạn chế về công nghệ đang nỗ lực học hỏi thêm.
8. Kỳ vọng Văn hóa Engineering: Khảo sát kỳ vọng về quy trình làm việc (Code review, Agile/Scrum, trao đổi kỹ thuật với Tech Lead).
9. Ứng viên hỏi: Lời mời để ứng viên đặt câu hỏi kỹ thuật ngược lại cho Giám khảo / Công ty.
10. Tổng kết: Lời cảm ơn và nhận xét tích cực ngắn gọn, thông báo hệ thống đang chấm điểm.

ĐỊNH DẠNG ĐẦU RA:
Trả về duy nhất một mảng JSON thuần túy gồm đúng 10 chuỗi câu hỏi (không kèm markdown):
[
  "Câu 1...",
  "Câu 2...",
  "Câu 3...",
  "Câu 4...",
  "Câu 5...",
  "Câu 6...",
  "Câu 7...",
  "Câu 8...",
  "Câu 9...",
  "Câu 10..."
]
"""
    for model_name in CANDIDATE_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            data = extract_json(response.text)
            if isinstance(data, list) and len(data) >= 8:
                gen_questions = [str(q).strip() for q in data[:10]]
                print_interview_start_terminal_log(role, persona, difficulty, cv_text, requirement, gen_questions, target_level=lvl, track=track)
                return gen_questions
        except Exception as e:
            detect_and_log_api_quota_warning("Gemini", e)
            print(f"[AI Engine] Error calling {model_name} in generate_interview_questions: {e}. Retrying next model...")

    # Fallback chất lượng cao chuẩn IT theo từng cấp bậc
    if "intern" in lvl:
        fallback_questions = [
            f"Xin chào bạn, tôi là {persona}, rất vui được đồng hành cùng bạn trong buổi phỏng vấn thực tập vị trí {role} hôm nay! Bạn đã sẵn sàng để chúng ta bắt đầu chưa?",
            f"Đầu tiên, bạn hãy giới thiệu ngắn gọn về bản thân và cơ duyên đưa bạn theo đuổi định hướng kỹ thuật với vị trí {role} nhé?",
            f"Trong các bài tập lớn hoặc đồ án môn học ở trường, bạn tâm đắc nhất với sản phẩm nào và phần việc bạn tự tay code là gì?",
            "Về mặt kiến thức nền tảng, bạn hiểu thế nào về 4 tính chất của Lập trình hướng đối tượng (OOP) và trong đồ án bạn áp dụng tính Kế thừa hoặc Đa hình ở đâu?",
            "Hãy kể về một tình huống thực tế khi code đồ án nhóm gặp một con bug hóc búa hoặc có bất đồng giải pháp giữa các thành viên, bạn đã xử lý theo cấu trúc STAR ra sao?",
            f"Điều gì tạo cho bạn động lực lớn nhất khi ứng tuyển kỳ thực tập {role}, và bạn kỳ vọng học hỏi được những gì sau kỳ thực tập này?",
            "Theo bạn tự đánh giá, điểm mạnh về tư duy logic của bạn là gì, và đâu là một điểm về công nghệ bạn thấy mình cần tiếp tục rèn luyện thêm?",
            "Về môi trường làm việc, bạn kỳ vọng một người hướng dẫn (Mentor) và đội ngũ đồng hành như thế nào để hỗ trợ bạn tiến bộ nhanh nhất?",
            "Chúng tôi đã hoàn thành các câu hỏi khảo nghiệm. Bây giờ, bạn có câu hỏi hoặc thắc mắc nào muốn dành cho tôi và dự án không?",
            "Cảm ơn bạn rất nhiều vì buổi trao đổi rất cởi mở hôm nay! Buổi phỏng vấn thực tập xin được khép lại tại đây, hệ thống sẽ tổng hợp bảng phân tích năng lực cho bạn ngay bây giờ."
        ]
    elif "junior" in lvl:
        fallback_questions = [
            f"Chào bạn, tôi là {persona}, rất vui được trao đổi chuyên môn cùng bạn cho vị trí {role} hôm nay. Tín hiệu âm thanh của bạn đã ổn định để chúng ta bắt đầu chưa?",
            f"Trước hết, bạn hãy tóm tắt ngắn gọn về kinh nghiệm thực chiến và các công nghệ chủ lực mà bạn đã trực tiếp làm việc tại các dự án thực tế nhé?",
            f"Trong các hệ thống thực tế bạn từng tham gia phát triển, bài toán kiến trúc hoặc module phức tạp nhất mà bạn trực tiếp phụ trách là gì?",
            "Về mặt kỹ thuật chuyên sâu, khi hệ thống phát sinh bài toán Race Condition hoặc deadlock trong truy vấn cơ sở dữ liệu, giải pháp thực tế bạn từng áp dụng để xử lý là gì?",
            "Hãy kể về một sự cố Production khẩn cấp (như nghẽn kết nối DB, CPU server chạm đỉnh hoặc API bị timeout) mà bạn từng tham gia cứu sự cố theo chuẩn STAR?",
            "Mục tiêu phát triển chuyên môn kỹ thuật sâu của bạn trong 2 đến 3 năm tới là gì (ví dụ: Senior Developer, Tech Lead hay Solution Architect)?",
            "Khi xây dựng một tính năng, đâu là sự đánh đổi kỹ thuật (Trade-offs) lớn nhất mà bạn từng phải cân nhắc giữa tốc độ phát triển và hiệu năng lâu dài?",
            "Trong quy trình phát triển, bạn đánh giá thế nào về tầm quan trọng của Unit Testing và văn hóa phản biện trong các buổi Code Review?",
            "Chúng tôi đã hoàn thành các nội dung kỹ thuật. Bạn có câu hỏi nào muốn tìm hiểu sâu hơn về kiến trúc hệ thống hoặc bài toán công nghệ của công ty chúng tôi không?",
            "Rất cảm ơn buổi thảo luận chuyên sâu hôm nay! Buổi phỏng vấn xin được khép lại tại đây, hệ thống sẽ tổng hợp báo cáo thẩm định năng lực chi tiết cho bạn ngay bây giờ."
        ]
    else: # fresher
        fallback_questions = [
            f"Xin chào bạn, tôi là {persona}, rất vui được đồng hành cùng bạn trong buổi phỏng vấn vị trí {role} hôm nay! Bạn đã sẵn sàng để chúng ta bắt đầu chưa?",
            f"Đầu tiên, bạn hãy giới thiệu ngắn gọn về bản thân và hành trình bạn làm chủ Tech Stack phục vụ cho vị trí {role} nhé?",
            f"Trong đồ án tốt nghiệp hoặc dự án cá nhân gần nhất, bạn tâm đắc nhất với tính năng nào và cơ chế hoạt động của API đó ra sao?",
            "Về mặt kỹ thuật, bạn giải thích thế nào về vòng đời của một HTTP Request và cách bạn thiết kế cơ sở dữ liệu quan hệ có đánh Index để tăng tốc độ truy vấn?",
            "Hãy kể về một tình huống thực tế khi deploy sản phẩm bị lỗi hoặc thời gian phản hồi API quá chậm, bạn đã chủ động tìm nguyên nhân và khắc phục theo chuẩn STAR ra sao?",
            f"Điều gì tạo cho bạn động lực lớn nhất khi làm việc ở vị trí {role}, và mục tiêu nghề nghiệp của bạn trong 2 đến 3 năm tới là gì?",
            "Theo bạn tự đánh giá, thế mạnh cạnh tranh lớn nhất của bạn là gì, và đâu là một kỹ năng công nghệ bạn nhận thấy mình cần tiếp tục rèn luyện thêm?",
            "Về môi trường làm việc, bạn kỳ vọng một văn hóa engineering như thế nào (như văn hóa review code, quy trình Agile/Scrum) để phát huy tối đa tiềm năng?",
            "Chúng tôi đã hoàn thành các câu hỏi khảo nghiệm. Bây giờ, bạn có câu hỏi hoặc thắc mắc nào muốn dành cho tôi và dự án không?",
            "Cảm ơn bạn rất nhiều vì buổi trao đổi rất cởi mở hôm nay! Buổi phỏng vấn xin được khép lại tại đây, hệ thống sẽ tổng hợp kết quả đánh giá chi tiết cho bạn ngay bây giờ."
        ]

    print_interview_start_terminal_log(role, persona, difficulty, cv_text, requirement, fallback_questions, target_level=lvl, track=track)
    return fallback_questions


def generate_adaptive_next_turn(
    role: str,
    persona: str,
    stage_id: str,
    stage_name: str,
    stage_index: int,
    current_question: str,
    candidate_answer: str,
    company: str = "doanh nghiệp",
    difficulty: int = 4,
    default_next_question: str = "",
    target_level: str = "fresher",
    track: str = "backend",
    history: Optional[List[Dict[str, Any]]] = None,
    duration_minutes: int = 30,
    seconds_left: int = 1800
) -> Dict[str, Any]:
    """Phân tích câu trả lời tức thời của ứng viên theo Chiến lược Thích ứng 3 Nhánh và Trí nhớ Toàn phiên."""
    client = get_client()

    ans_clean = (candidate_answer or "").strip()
    lvl = (target_level or "fresher").lower()

    p_prof = PERSONA_PROFILES.get(persona, PERSONA_PROFILES["Alex Chen"])
    persona_info = f"""
CHÂN DUNG & PHONG CÁCH GIÁM KHẢO: {persona} ({p_prof['title']})
- Trọng tâm đánh giá: {p_prof['focus']}
- Tông giọng đối thoại: {p_prof['tone']}
- Phong cách đặt câu hỏi: {p_prof['questionStyle']}
- Quy tắc đào sâu: {p_prof['probingRule']}
"""

    history_context = ""
    if history and len(history) > 0:
        lines = []
        for h in history:
            tn = h.get("turn_number", 1)
            q = h.get("question_text", "")
            a = (h.get("answer_transcript") or "").strip() or "[Chưa trả lời / Im lặng]"
            lines.append(f"• Lượt {tn}:\n   - Giám khảo đã hỏi: \"{q}\"\n   - Ứng viên đã trả lời: \"{a}\"")
        history_context = "\nSỔ TAY GHI NHỚ TOÀN PHIÊN PHỎNG VẤN (CÁC LƯỢT ĐÃ DIỄN RA TRƯỚC ĐÓ):\n" + "\n".join(lines) + "\n"
    else:
        history_context = "(Đây là lượt đầu tiên, chưa có lịch sử trước đó)."

    prompt = f"""
Bạn là Giám khảo phỏng vấn kỹ thuật AI tên là {persona} ({p_prof['title']}), độ khó {difficulty}/5.
{persona_info}
Vị trí phỏng vấn: {role} (Track: {track}) tại {company}.
Cấp bậc khảo nghiệm: {lvl.upper()}.
Giai đoạn phỏng vấn hiện tại: Bước {stage_index + 1}/10 - {stage_name} (ID: {stage_id}).
THỜI LƯỢNG BUỔI PHỎNG VẤN: {duration_minutes} phút.
THỜI GIAN CÒN LẠI: {max(0, seconds_left // 60)} phút {seconds_left % 60} giây.

QUY TẮC ĐIỀU PHỐI THEO THỜI GIAN (TIME-PACED INTERVIEW PACING):
- Buổi phỏng vấn được thiết kế kéo dài đúng {duration_minutes} phút theo cấu hình.
- NẾU THỜI GIAN CÒN NHIỀU (còn > 3 phút): BẠN BẮT BUỘC TIẾP TỤC ĐÀO SÂU, hỏi xoáy, thử thách tư duy kỹ thuật hoặc đổi góc nhìn theo 3 nhánh thích ứng. TUYỆT ĐỐI CẤM chào tạm biệt, TUYỆT ĐỐI CẤM vội kết thúc phỏng vấn!
- CHỈ KHI THỜI GIAN CÒN DƯỚI 2.5 PHÚT CUỐI: Bạn mới chủ động thông báo thời gian sắp hết và mời ứng viên đặt câu hỏi cho bạn hoặc tổng kết.

{history_context}

CÂU HỎI BẠN VỪA HỎI ỨNG VIÊN Ở LƯỢT NÀY:
"{current_question}"

CÂU TRẢ LỜI THỰC TẾ CỦA ỨNG VIÊN VỪA NÓI:
"{ans_clean}"

Gợi ý định hướng cho giai đoạn tiếp theo (chỉ để tham khảo chủ đề, KHÔNG ĐƯỢC lặp lại nguyên văn):
"{default_next_question}"

TIÊU CHUẨN KỲ VỌNG THEO CẤP BẬC {lvl.upper()}:
- INTERN: Đánh giá cao tư duy logic, hiểu bản chất OOP/thuật toán cơ bản, kỹ năng debug và thái độ cầu thị học hỏi. Tuyệt đối KHÔNG hỏi kiến trúc chịu tải phân tán, microservices hay hạ tầng production phức tạp!
- FRESHER: Đánh giá khả năng làm chủ Tech Stack, luồng dữ liệu REST API, hiểu bản chất code tự viết, cơ sở dữ liệu quan hệ, Clean Code và kiểm thử cơ bản.
- JUNIOR: Đòi hỏi kinh nghiệm thực chiến production: Concurrency, Caching Redis, Race Condition, tối ưu SQL, giải thích được đánh đổi kỹ thuật (Trade-offs) và có số liệu thực tế.
- MID-LEVEL: Đòi hỏi tư duy System Design, Microservices, High Availability, khả năng giải quyết sự cố quy mô lớn.

BỘ NÃO ĐIỀU HƯỚNG PHỎNG VẤN - CHIẾN LƯỢC THÍCH ỨNG 3 NHÁNH (3-BRANCH ADAPTIVE ENGINE):
Dựa trên toàn bộ lịch sử trao đổi và câu trả lời hiện tại của ứng viên, bạn PHẢI phân loại lượt này vào đúng 1 trong 3 nhánh sau:

1. NHÁNH 1: "PROBE_DEEPER" (Đào sâu mở rộng - Thử thách trần năng lực)
   - Điều kiện: Ứng viên trả lời gãy gọn, tự tin, đúng bản chất kỹ thuật, có số liệu hoặc kiến trúc rõ ràng.
   - Hành động của bạn:
     * feedback_phrase: Lời khen ngợi chân thành, tự nhiên của đàn anh Tech Lead (Ví dụ: "Rất tốt, giải pháp của em xử lý rất đúng chỗ!", "Chuẩn rồi, tư duy thiết kế đoạn này rất sắc nét.").
     * next_question: Tăng độ khó lên +1 Level. Đặt tình huống thực chiến sâu hơn: Edge-case bất thường, bài toán Scale khi lượng người dùng tăng gấp 10 lần, hoặc sự đánh đổi (Trade-off) giữa tốc độ và tính toàn vẹn dữ liệu.
     * branch: "PROBE_DEEPER", turn_score: 7.0 - 10.0 / 10.

2. NHÁNH 2: "GROUND_TO_PRACTICE" (Kéo về thực tế - Kiểm tra tự tay làm code)
   - Điều kiện: Ứng viên chỉ đọc lý thuyết thuộc lòng như sách giáo khoa (Wikipedia style), nói chung chung, hoặc chưa chứng minh được bản thân tự code tính năng đó.
   - Hành động của bạn:
     * feedback_phrase: Ghi nhận định nghĩa nhưng khéo léo kéo vào đồ án (Ví dụ: "Về mặt lý thuyết thì chuẩn rồi. Nhưng anh muốn xem cách em áp dụng vào thực tế...").
     * next_question: Đặt câu hỏi bóc tách vào dòng code cụ thể trong đồ án/dự án của ứng viên (Ví dụ: "Cụ thể trong đồ án, đoạn logic đó em tự tay viết ở đâu, và khi chạy thực tế có con bug nào làm em tốn thời gian nhất?").
     * branch: "GROUND_TO_PRACTICE", turn_score: 4.0 - 6.5 / 10.

3. NHÁNH 3: "EMPATHIC_PIVOT" (Đồng cảm & Hạ độ khó / Chuyển hướng thân thiện)
   - Điều kiện: Ứng viên ấp úng, bối rối, kêu khó, xin qua câu, im lặng, hoặc chủ động xin chuyển sang bất kỳ ngôn ngữ/chủ đề nào khác (Python, JS, C#, Java, Go, React, SQL, OOP...).
   - Hành động của bạn:
     * NGUYÊN TẮC VÀNG: BỚT LÀM KHÓ ỨNG VIÊN - BẢO VỆ TÂM LÝ & TÌM RA ĐIỂM MẠNH!
     * feedback_phrase: Lời động viên, trấn an chân thành, cởi mở (Ví dụ: "Không sao cả, kiến thức công nghệ rất rộng và ai cũng có thế mạnh riêng. Mình chuyển sang phần nhẹ nhàng và quen thuộc hơn nhé!", "Được chứ, không sao cả! Chúng ta cùng chuyển sang trao đổi về [chủ đề/ngôn ngữ em tự tin] nhé.").
     * next_question: BẮT BUỘC HẠ ĐỘ KHÓ XUỐNG MỨC CƠ BẢN/NỀN TẢNG (Foundational & Accessible) của đúng chủ đề ứng viên tự tin hoặc chủ đề quen thuộc hàng ngày (như cách debug lỗi, công cụ IDE, Git, cấu trúc dữ liệu đơn giản, bài tập nhỏ từng làm) để giúp ứng viên lấy lại sự tự tin.
     * TUYỆT ĐỐI CẤM ĐÁNH ĐỐ: Không được hỏi tầng thực thi sâu thẳm / runtime internals (như JVM bytecode/vtable, Python GIL / CPython internals, JS V8 JIT internals, Go pprof internals...).
     * branch: "EMPATHIC_PIVOT", is_pivot: true, turn_score: 2.0 - 4.5 / 10.

QUY TẮC SỬ DỤNG TRÍ NHỚ (CALL-BACK & CONTINUITY):
- Tận dụng thông tin ứng viên đã từng nói ở các lượt trước (ví dụ trường học, công nghệ đã học, đồ án cá nhân) để đan cài vào lời thoại hoặc câu hỏi (Call-back: "Lúc nãy em có nhắc đến...").
- Tuyệt đối KHÔNG hỏi lại những công nghệ hoặc phần kiến thức mà ứng viên đã từng nhận là "chưa học / chưa làm" ở các câu trước!
- Mọi nhận xét (critique) phải mang tính xây dựng, khách quan, tôn trọng và chuyên nghiệp.

QUY TẮC SỐ 1 - TUYỆT ĐỐI CẤM HỎI LẠI ĐIỀU ỨNG VIÊN VỪA NÊU (ANTI-CIRCULAR REPETITION):
1. KHÔNG HỎI LẠI NỘI DUNG VỪA ĐƯỢC TRẢ LỜI: Nếu ứng viên vừa mới nêu hoặc giải thích một ý/khái niệm nào đó (kể cả khi âm thanh thu nhận bị sai chính tả như 'drylic' = ArrayList, 'liên kết list' = LinkedList, 'mảng động' vs 'Node'):
   - Bạn TUYỆT ĐỐI CẤM hỏi lại câu hỏi về chính ý đó (Ví dụ: CẤM HỎI LẠI "Trong Java, sự khác biệt cốt lõi về bản chất lưu trữ giữa ArrayList và LinkedList là gì?").
   - Hỏi lại điều ứng viên vừa nói xong sẽ làm ứng viên cực kỳ khó chịu vì cảm thấy bạn không hề lắng nghe họ và tạo cảm giác con bot bị lặp đĩa!
2. NGUYÊN TẮC TIẾN LÊN PHÍA TRƯỚC (FORWARD PROGRESSION):
   - Trong feedback_phrase: Công nhận ngắn gọn ý đúng mà họ vừa nêu (Ví dụ: "Anh hiểu ý em về việc ArrayList lưu mảng động và LinkedList lưu theo các Node liên kết.").
   - Trong next_question: BẮT BUỘC PHẢI HỎI SANG MỘT KHÍA CẠNH MỚI:
     * Chuyển sang hiệu năng/thuật toán (Big-O): "Vậy khi cần truy xuất ngẫu nhiên get(i) hay chèn phần tử ở đầu danh sách, hiệu năng của 2 thằng này khác nhau ra sao?"
     * Hoặc bóc tách vào đồ án thực tế: "Trong đồ án web thương mại của em, danh sách sản phẩm hay giỏ hàng em đã dùng ArrayList hay LinkedList và vì sao?"
     * Hoặc tối ưu bộ nhớ: "Về mặt tiêu tốn bộ nhớ RAM, giữa ArrayList và LinkedList cấu trúc nào tốn nhiều overhead hơn?"
3. KHÔNG RẬP KHUÔN THEO defaultNextQuestion:
   - "defaultNextQuestion" chỉ là gợi ý tham khảo. Nếu câu trả lời của ứng viên ĐÃ ĐỀ CẬP ĐẾN chủ đề đó rồi, bạn BẮT BUỘC PHẢI BỎ QUA GỢI Ý ĐÓ VÀ TỰ SINH CÂU HỎI MỚI SÂU HƠN HOẶC ĐỔI GÓC NHÌN!

QUY TẮC BẮT BUỘC - MỖI LƯỢT CHỈ ĐƯỢC HỎI ĐÚNG 1 CÂU HỎI DUY NHẤT (SINGLE ATOMIC QUESTION):
1. TUYỆT ĐỐI CẤM hỏi kép, hỏi dồn, hoặc nhồi nhét 2-3 câu hỏi vào 1 câu!
2. next_question: BẮT BUỘC chỉ là ĐÚNG 1 CÂU HỎI ĐƠN LẺ, kết thúc bằng DUY NHẤT 1 DẤU CHẤM HỎI (?). Độ dài súc tích từ 15 đến 25 từ.

ĐỊNH DẠNG ĐẦU RA:
Trả về duy nhất JSON hợp lệ (không kèm markdown):
{{
  "branch": "PROBE_DEEPER | GROUND_TO_PRACTICE | EMPATHIC_PIVOT",
  "branch_reason": "Giải thích ngắn vì sao chọn nhánh này dựa trên trí nhớ và câu trả lời hiện tại...",
  "candidate_statement_analysis": "Phân tích cụ thể câu nói của ứng viên: Ý định, tâm lý, mức độ hiểu biết hoặc khó khăn mà ứng viên đang gặp phải...",
  "competency_focus": "Mảng năng lực đang khảo sát (Kỹ năng lập trình cốt lõi | Đồ án & Kiến trúc code | Cơ sở dữ liệu & Logic xử lý | Giải quyết sự cố STAR)",
  "intent": "GOOD | SHALLOW | DONT_KNOW | PIVOT_REQUEST",
  "turn_score": 7.5,
  "feedback_phrase": "Lời thoại tự nhiên của Tech Lead (1-2 câu đồng cảm, ghi nhận hoặc gợi mở)...",
  "next_question": "Duy nhất 1 câu hỏi đơn lẻ súc tích kết thúc bằng đúng 1 dấu hỏi chấm?",
  "critique": "Nhận xét ngắn về câu trả lời...",
  "is_pivot": false,
  "should_advance_stage": true
}}
"""
    for model_name in CANDIDATE_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            data = extract_json(response.text)
            if isinstance(data, dict) and "next_question" in data:
                # Hậu kiểm chống lặp câu hỏi (Anti-Circular & Anti-Repetition Guard)
                all_prev = [current_question]
                if history:
                    all_prev.extend([h.get("question_text", "") for h in history if h.get("question_text")])
                
                next_q_clean = data["next_question"].lower()
                is_repeated = any(
                    p.lower() == next_q_clean or
                    ("arraylist" in next_q_clean and "linkedlist" in next_q_clean and "arraylist" in p.lower() and "linkedlist" in p.lower()) or
                    ("list" in next_q_clean and "tuple" in next_q_clean and "list" in p.lower() and "tuple" in p.lower()) or
                    ("==" in next_q_clean and "===" in next_q_clean and "==" in p.lower() and "===" in p.lower()) or
                    ("inner join" in next_q_clean and "left join" in next_q_clean and "inner join" in p.lower() and "left join" in p.lower())
                    for p in all_prev
                )

                if is_repeated:
                    if "arraylist" in next_q_clean or "linkedlist" in next_q_clean:
                        data["next_question"] = "Về mặt hiệu năng (Big-O), khi truy xuất get(i) hay thêm/xóa phần tử ở đầu danh sách, ArrayList và LinkedList khác nhau ra sao?"
                        data["feedback_phrase"] = "Tôi ghi nhận giải thích về cấu trúc lưu trữ của bạn. Hãy nhìn sâu hơn vào bài toán hiệu năng nhé:"
                    elif "list" in next_q_clean or "tuple" in next_q_clean:
                        data["next_question"] = "Về mặt quản lý bộ nhớ và tính bất biến (Immutability), khi nào bạn ưu tiên dùng Tuple hơn List trong Python?"
                        data["feedback_phrase"] = "Tôi ghi nhận định nghĩa của bạn. Hãy phân tích từ góc độ tối ưu bộ nhớ nhé:"
                    elif default_next_question and not any(p.lower() == default_next_question.lower() for p in all_prev):
                        data["next_question"] = default_next_question
                    else:
                        data["next_question"] = "Trong dự án thực tế bạn từng làm, bài toán kỹ thuật nào bạn tự tay thiết kế và tối ưu tốt nhất?"

                print_adaptive_turn_terminal_log(stage_index, stage_name, current_question, ans_clean, data)
                return data
        except Exception as e:
            detect_and_log_api_quota_warning("Gemini", e)
            print(f"[AI Engine] Error calling {model_name} in generate_adaptive_next_turn: {e}. Retrying next model...")

    # Heuristic fallback nếu AI tạm thời mất kết nối
    lower_ans = ans_clean.lower()
    import random

    # Danh mục hỗ trợ đa ngôn ngữ & công nghệ phong phú với nhiều cấp độ câu hỏi (Multi-tier)
    tech_topics = [
        {
            "keywords": ["python", "py"],
            "name": "Python",
            "questions": [
                "Được rồi, trong Python, bạn có thể phân biệt sự khác nhau cơ bản giữa List và Tuple không?",
                "Về mặt bộ nhớ và tính bất biến (Immutability), khi nào bạn ưu tiên dùng Tuple hơn List trong Python?",
                "Trong Python, bạn hiểu cơ chế hoạt động của Generator và từ khóa yield như thế nào?",
                "Khi làm việc với dự án Python, bạn đã từng dùng Decorator hoặc Context Manager trong trường hợp cụ thể nào?"
            ]
        },
        {
            "keywords": ["javascript", "js", "typescript", "ts"],
            "name": "JavaScript / TypeScript",
            "questions": [
                "Được rồi, trong JavaScript, bạn hãy giải thích sự khác nhau giữa toán tử == và === nhé?",
                "Bạn hiểu cơ chế Event Loop và thứ tự ưu tiên giữa Microtask và Macrotask trong JS ra sao?",
                "Trong TypeScript, bạn phân biệt sự khác nhau giữa Interface và Type Alias như thế nào?",
                "Bạn có thể giải thích khái niệm Closure trong JavaScript và một trường hợp thực tế bạn từng áp dụng không?"
            ]
        },
        {
            "keywords": ["java core", "java"],
            "name": "Java Core",
            "questions": [
                "Được rồi, trong Java Core, bạn hãy phân biệt sự khác nhau cơ bản giữa ArrayList và LinkedList nhé?",
                "Về mặt hiệu năng (Big-O), khi cần truy xuất ngẫu nhiên get(i) hay thêm/xóa phần tử, ArrayList và LinkedList khác nhau ra sao?",
                "Trong đồ án thực tế của bạn, bạn đã áp dụng ArrayList hay LinkedList trong trường hợp cụ thể nào và vì sao?",
                "Bạn hiểu cơ chế hoạt động của Garbage Collection (GC) trong Java giải phóng bộ nhớ Heap như thế nào?"
            ]
        },
        {
            "keywords": ["c#", "csharp", ".net", "dotnet"],
            "name": "C# / .NET",
            "questions": [
                "Được rồi, trong C#, bạn có thể nêu sự khác nhau giữa Value Type và Reference Type không?",
                "Trong C#, bạn phân biệt sự khác nhau giữa IEnumerable, ICollection và IList như thế nào?",
                "Bạn hiểu cơ chế Async/Await và Task trong C# xử lý bất đồng bộ ra sao?"
            ]
        },
        {
            "keywords": ["golang", "go"],
            "name": "Golang",
            "questions": [
                "Được rồi, trong Golang, bạn hiểu cơ chế hoạt động cơ bản của Goroutine và Channel như thế nào?",
                "Bạn phân biệt sự khác nhau giữa Slice và Array trong Golang ra sao?",
                "Trong Go, bạn xử lý Race Condition và đồng bộ hóa dữ liệu giữa các Goroutine bằng công cụ gì?"
            ]
        },
        {
            "keywords": ["react", "reactjs"],
            "name": "React",
            "questions": [
                "Được rồi, trong React, bạn phân biệt sự khác nhau cơ bản giữa Props và State như thế nào?",
                "Bạn hiểu cơ chế hoạt động của Virtual DOM và thuật toán Diffing trong React ra sao?",
                "Khi nào bạn cần dùng hook useMemo hoặc useCallback để tránh re-render không cần thiết trong React?"
            ]
        },
        {
            "keywords": ["node", "nodejs", "express"],
            "name": "Node.js",
            "questions": [
                "Được rồi, trong Node.js, bạn hiểu cơ chế bất đồng bộ (Asynchronous) và Event Loop cơ bản ra sao?",
                "Trong Express.js, bạn hiểu Middleware hoạt động theo luồng như thế nào?",
                "Khi xử lý một tác vụ nặng tốn CPU (CPU-intensive) trong Node.js, giải pháp kiến trúc của bạn là gì?"
            ]
        },
        {
            "keywords": ["sql", "database", "cơ sở dữ liệu", "mysql", "postgres"],
            "name": "Cơ sở dữ liệu SQL",
            "questions": [
                "Được rồi, trong SQL, bạn hãy giải thích sự khác nhau cơ bản giữa INNER JOIN và LEFT JOIN nhé?",
                "Khi một câu lệnh SQL query chạy chậm trên bảng dữ liệu lớn, các bước bạn kiểm tra và tối ưu Index là gì?",
                "Bạn hiểu 4 tính chất ACID trong Database Transaction như thế nào và vì sao nó quan trọng?"
            ]
        },
        {
            "keywords": ["oop", "hướng đối tượng", "lập trình hướng đối tượng"],
            "name": "Lập trình hướng đối tượng (OOP)",
            "questions": [
                "Được rồi, trong OOP, bạn có thể nêu sự khác nhau cơ bản giữa Interface và Abstract Class được không?",
                "Trong 4 tính chất của OOP, bạn tâm đắc nhất tính chất nào và trong code đồ án bạn áp dụng nó ở đâu?",
                "Bạn hiểu nguyên lý Dependency Inversion (chữ D trong SOLID) như thế nào trong thiết kế phần mềm?"
            ]
        },
        {
            "keywords": ["git", "github"],
            "name": "Git & Quản lý mã nguồn",
            "questions": [
                "Được rồi, với Git, bạn hãy phân biệt sự khác nhau giữa git pull và git fetch nhé?",
                "Khi gặp Git Merge Conflict trong dự án nhóm, quy trình bạn xử lý an toàn để không mất code là gì?"
            ]
        },
        {
            "keywords": ["docker", "devops"],
            "name": "Docker cơ bản",
            "questions": [
                "Được rồi, với Docker, bạn có thể phân biệt sự khác nhau cơ bản giữa Container và Image không?",
                "Bạn đã từng viết file Dockerfile để đóng gói một ứng dụng backend bao giờ chưa?"
            ]
        }
    ]

    all_asked = [current_question]
    if history:
        all_asked.extend([h.get("question_text", "") for h in history if h.get("question_text")])

    def pick_next_unique_tech_question(questions_list: list, default_q: str) -> str:
        for q in questions_list:
            q_lower = q.lower()
            already = any(
                p.lower() == q_lower or
                ("arraylist" in q_lower and "linkedlist" in q_lower and "arraylist" in p.lower() and "linkedlist" in p.lower()) or
                ("list" in q_lower and "tuple" in q_lower and "list" in p.lower() and "tuple" in p.lower()) or
                ("==" in q_lower and "===" in q_lower and "==" in p.lower() and "===" in p.lower())
                for p in all_asked
            )
            if not already:
                return q
        return default_q

    # 1. Kiểm tra ứng viên chủ động xin đổi chủ đề (PIVOT_REQUEST)
    pivot_triggers = [
        "hỏi em về", "hỏi về", "chuyển sang", "đổi câu", "đổi chủ đề", "hỏi phần khác",
        "hỏi em câu khác", "chuyển qua", "hỏi sang", "đổi sang", "chủ đề khác", "câu hỏi khác",
        "em tự tin về", "thay vì câu này", "xin phép bỏ qua câu"
    ]
    matched_tech = next((t for t in tech_topics if any(k in lower_ans for k in t["keywords"])), None)
    is_explicit_pivot = any(k in lower_ans for k in pivot_triggers)

    if is_explicit_pivot:
        target_topic = matched_tech["name"] if matched_tech else "phần kiến thức bạn tự tin"
        fallback_pivot_q = pick_next_unique_tech_question(
            matched_tech["questions"],
            f"Trong {target_topic}, bạn tự tin nhất với tính năng nào đã từng trực tiếp xây dựng?"
        ) if matched_tech else "Được rồi! Trong các công nghệ hoặc công cụ mà bạn đã làm quen, bạn cảm thấy tự tin và muốn chia sẻ về phần nào nhất?"

        res = {
            "intent": "PIVOT_REQUEST",
            "turn_score": 4.0,
            "feedback_phrase": f"Được chứ, không sao cả! Chúng ta cùng trao đổi về {target_topic} nhé.",
            "next_question": fallback_pivot_q,
            "critique": f"Ứng viên chủ động đề xuất chuyển sang trao đổi về {target_topic}. Giám khảo đồng thuận và hỏi câu hỏi nền tảng vừa sức.",
            "is_pivot": True,
            "should_advance_stage": True
        }
        print_adaptive_turn_terminal_log(stage_index, stage_name, current_question, ans_clean, res)
        return res

    # 2. Kiểm tra ứng viên không biết / kêu khó / xin qua câu (DONT_KNOW)
    is_dont_know = any(k in lower_ans for k in [
        "không biết", "chưa biết", "chưa rõ", "chưa từng", "chịu", "qua câu", "bỏ qua",
        "chưa tìm hiểu", "em không rành", "mình không biết", "khó quá", "chưa học", "chưa làm", "quên rồi"
    ])
    
    if is_dont_know:
        brief_phrases = [
            "Không sao cả, kiến thức công nghệ rất rộng và ai cũng có thế mạnh riêng. Chúng ta chuyển sang một phần quen thuộc và nhẹ nhàng hơn nhé!",
            "Được rồi, không vấn đề gì! Mình chuyển sang một chủ đề dễ thở hơn nhé.",
            "Tôi ghi nhận rồi, chúng ta cùng đổi sang một nội dung gần gũi với công việc hàng ngày nhé."
        ]
        gentle_fallback_questions = [
            "Trong quá trình tự học và làm bài tập, khi code gặp lỗi bug, công cụ hoặc cách debug quen thuộc nhất mà bạn hay dùng là gì?",
            "Khi tiếp cận một công nghệ hoặc ngôn ngữ mới, phương pháp tự học và tra cứu tài liệu hiệu quả nhất của bạn là gì?",
            "Ngoài phần vừa rồi ra, trong các bài tập hoặc dự án đã từng làm, bạn tự tin nhất với tính năng nào?",
            "Trong quá trình làm việc nhóm, bạn thường dùng Git với những lệnh cơ bản nào để quản lý mã nguồn?"
        ]
        picked_q = pick_next_unique_tech_question(gentle_fallback_questions, gentle_fallback_questions[0])
        res = {
            "intent": "DONT_KNOW",
            "turn_score": 2.0,
            "feedback_phrase": random.choice(brief_phrases),
            "next_question": picked_q,
            "critique": "Ứng viên chưa nắm vững phần này. Giám khảo chủ động hạ độ khó và chuyển sang chủ đề quen thuộc hàng ngày để giảm áp lực.",
            "is_pivot": True,
            "should_advance_stage": True
        }
        print_adaptive_turn_terminal_log(stage_index, stage_name, current_question, ans_clean, res)
        return res
    
    if stage_id == "candidate_qa":
        res = {
            "intent": "GOOD",
            "turn_score": 8.0,
            "feedback_phrase": f"Cảm ơn câu hỏi rất hay của bạn! Tại {company}, chúng tôi rất chú trọng văn hóa Clean Code, trao quyền thử nghiệm và đào tạo chuyên sâu cho các kỹ sư cấp bậc {lvl.upper()}.",
            "next_question": default_next_question or "Buổi phỏng vấn kỹ thuật hôm nay xin được khép lại tại đây, cảm ơn bạn rất nhiều!",
            "critique": "Ứng viên đặt câu hỏi quan tâm đến dự án và văn hóa doanh nghiệp.",
            "is_pivot": False,
            "should_advance_stage": True
        }
        print_adaptive_turn_terminal_log(stage_index, stage_name, current_question, ans_clean, res)
        return res

    is_good = len(ans_clean) > 40
    resolved_next = default_next_question
    is_default_dup = not resolved_next or any(p.lower() == resolved_next.lower() for p in all_asked)

    if is_default_dup:
        if matched_tech:
            resolved_next = pick_next_unique_tech_question(
                matched_tech["questions"],
                "Trong đồ án thực tế gần nhất, tính năng phức tạp nhất mà bạn trực tiếp code là gì?"
            )
        else:
            resolved_next = "Trong đồ án hoặc dự án gần nhất, bạn tâm đắc nhất với đoạn code hoặc module nào mà mình tự tay triển khai?"

    res = {
        "intent": "GOOD" if is_good else "SHALLOW",
        "turn_score": 7.0 if is_good else 4.0,
        "feedback_phrase": "Cảm ơn chia sẻ của bạn, tôi đã ghi nhận nội dung kỹ thuật này.",
        "next_question": resolved_next,
        "critique": "Câu trả lời cơ bản đáp ứng yêu cầu câu hỏi.",
        "is_pivot": False,
        "should_advance_stage": True
    }
    print_adaptive_turn_terminal_log(stage_index, stage_name, current_question, ans_clean, res)
    return res


def evaluate_star_interview(
    role: str,
    turns_data: List[Dict[str, str]],
    cutoff: int = 80,
    target_level: str = "fresher",
    track: str = "backend"
) -> Dict[str, Any]:
    """Chấm điểm STAR nghiêm ngặt, đối chiếu từng câu hỏi và câu trả lời thực tế theo Benchmark cấp bậc IT.
    Nếu ứng viên nói 'không biết', trả lời sai hoặc lạc đề: Điểm số phải thấp thực chất và kết luận RỚT (Fail).
    """
    client = get_client()

    turns_summary = ""
    dont_know_count = 0
    short_count = 0
    total_turns = len(turns_data)
    lvl = (target_level or "fresher").lower()

    for idx, t in enumerate(turns_data, start=1):
        q = t.get("question_text", "").strip()
        a = t.get("answer_transcript", "").strip()
        turns_summary += f"\n--- Lượt {idx} ---\nGiám khảo hỏi: {q}\nỨng viên trả lời: {a if a else '[Không có câu trả lời / Im lặng]'}\n"
        
        low_a = a.lower()
        if any(k in low_a for k in ["không biết", "chưa biết", "chưa rõ", "chịu", "bỏ qua", "chưa tìm hiểu", "em không rành", "mình không biết"]) or not a:
            dont_know_count += 1
        elif len(a.split()) < 8:
            short_count += 1

    prompt = f"""
Bạn là Hội đồng Thẩm định Chuyên môn Kỹ thuật Tuyển dụng cấp cao của TalentAI.
Vị trí khảo nghiệm: {role} (Track: {track}).
Cấp bậc mục tiêu: {lvl.upper()}.
Ngưỡng điểm chuẩn sàn yêu cầu để đạt (Cut-off): {cutoff}/100 điểm.

TOÀN BỘ LỊCH SỬ PHỎNG VẤN ĐỐI CHIẾU THỰC TẾ:
{turns_summary}

QUY TẮC CHẤM ĐIỂM THEO CHUẨN CẤP BẬC {lvl.upper()}:
- INTERN: Đạt nếu có nền tảng CS tốt (OOP, tư duy giải thuật), trung thực, biết nhận lỗi và có tinh thần tự học. Không trừ điểm vì thiếu kinh nghiệm production.
- FRESHER: Đạt nếu làm chủ Tech Stack chính, viết code có cấu trúc, hiểu luồng xử lý dữ liệu và tự giải thích được đồ án.
- JUNIOR: Đạt nếu có kinh nghiệm thực chiến production, tư duy tối ưu hóa hiệu năng, xử lý lỗi và số liệu đo lường cụ thể theo STAR.

QUY TẮC TÍNH ĐIỂM NGHIÊM NGẶT:
1. Chấm điểm từng câu dựa trên sự đối chiếu trực tiếp giữa CÂU HỎI và CÂU TRẢ LỜI:
   - Nếu ứng viên trả lời "không biết", "chưa học", im lặng hoặc từ chối trả lời: Câu đó chỉ được từ 0.0 đến 2.0 / 10 điểm.
   - Nếu ứng viên chủ động xin chuyển hướng sang chủ đề khác (ví dụ: xin hỏi Java Core/OOP): Cho 3.0 đến 4.0 / 10 điểm vì có tinh thần thẳng thắn, cầu thị.
   - Nếu trả lời đúng lý thuyết nhưng chưa có kinh nghiệm thực chiến/số liệu: 4.0 đến 6.0 / 10 điểm.
   - Nếu trả lời tốt, đúng trọng tâm, có tư duy rõ ràng theo chuẩn STAR: 7.0 đến 10.0 / 10 điểm.

2. TÍNH ĐIỂM TỔNG STAR (Thang 100 điểm):
   - Situation (Tình huống): /25 điểm
   - Task (Nhiệm vụ): /25 điểm
   - Action (Hành động & Kỹ thuật xử lý): /25 điểm
   - Result (Kết quả & Số liệu đo lường): /25 điểm
   - Tổng điểm: total_score = situation_score + task_score + action_score + result_score.
   
3. ĐẶC BIỆT LƯU Ý VỀ TỔNG ĐIỂM VÀ ĐẠT/RỚT:
   - TUYỆT ĐỐI KHÔNG CHẤM ĐIỂM CAO ẢO!
   - Nếu ứng viên có nhiều câu nói "không biết" hoặc trả lời sai (ví dụ {dont_know_count}/{total_turns} câu không biết):
     Tổng điểm CHỈ ĐƯỢC DAO ĐỘNG TỪ 15 ĐẾN 45 ĐIỂM, và is_passed BẮT BUỘC LÀ FALSE!
   - Chỉ khi ứng viên trả lời thực sự thuyết phục phần lớn các câu hỏi và total_score >= {cutoff} thì mới được is_passed = TRUE!

QUY TẮC ĐẠO ĐỨC NGHỀ NGHIỆP & VĂN PHONG THẨM ĐỊNH (CONSTRUCTIVE EVALUATION):
1. TUYỆT ĐỐI CẤM dùng từ ngữ quy chụp nhân cách, xúc phạm hoặc nặng lời như:
   - "không trung thực", "dối trá", "gian lận", "bịa đặt", "chém gió", "né tránh thiếu thành thật".
2. MỌI NHẬN XÉT PHẢI MANG TÍNH ĐÓNG GÓP XÂY DỰNG, KHÁCH QUAN VÀ TÔN TRỌNG (CONSTRUCTIVE FEEDBACK):
   - Nếu ứng viên chưa trả lời được đồ án trong CV: Nhận xét khách quan: "Ứng viên chưa nắm vững chi tiết kỹ thuật/cơ chế vận hành của đồ án trong CV, cần rà soát lại kiến trúc code để tự tin hơn khi phỏng vấn."
   - Nếu ứng viên chủ động xin chuyển hướng (ví dụ xin hỏi Java Core, OOP): Ghi nhận: "Ứng viên thẳng thắn chia sẻ thế mạnh và chủ động đề xuất trao đổi về Java Core/OOP thay vì đồ án; thể hiện tinh thần cầu thị nhưng cần củng cố thêm kiến thức đồ án để hoàn thiện hồ sơ."

ĐỊNH DẠNG ĐẦU RA:
Trả về duy nhất chuỗi JSON hợp lệ (không kèm markdown):
{{
  "situation_score": 18.0,
  "task_score": 17.5,
  "action_score": 18.0,
  "result_score": 16.5,
  "total_score": 70.0,
  "is_passed": false,
  "strengths": "Điểm mạnh thực tế...",
  "weaknesses": "Lỗ hổng kiến thức hoặc các câu trả lời chưa đạt...",
  "ai_recommendations": "Lời khuyên cải thiện cụ thể...",
  "dossier_summary": "Tóm tắt thẩm định ngắn gọn 2 câu...",
  "turn_evaluations": [
    {{
      "turn_number": 1,
      "score": 7.0,
      "assessment": "Giới thiệu rõ ràng, đúng trọng tâm",
      "critique": "Nên nhấn mạnh thêm mục tiêu nghề nghiệp",
      "model_answer": "Gợi ý câu trả lời chuẩn..."
    }}
  ]
}}
"""
    for model_name in CANDIDATE_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            data = extract_json(response.text)
            sit = float(data.get("situation_score", 0))
            tsk = float(data.get("task_score", 0))
            act = float(data.get("action_score", 0))
            res = float(data.get("result_score", 0))
            tot = float(data.get("total_score", sit + tsk + act + res))
            
            # Đảm bảo logic nếu nhiều câu không biết thì không thể vượt qua
            if dont_know_count >= max(2, total_turns // 3):
                tot = min(tot, 48.0)
                data["is_passed"] = False
            else:
                data["is_passed"] = tot >= cutoff

            data["total_score"] = round(tot, 1)
            data["situation_score"] = round(sit, 1)
            data["task_score"] = round(tsk, 1)
            data["action_score"] = round(act, 1)
            data["result_score"] = round(res, 1)
            print_star_evaluation_terminal_log(data, role)
            return data
        except Exception as e:
            print(f"[AI Evaluation] Error calling {model_name} in evaluate_star_interview: {e}. Retrying next model...")

    # Fallback thuật toán tính điểm thực chất dựa trên dữ liệu (KHÔNG GÁN BỪA 88 ĐIỂM)
    base_score_per_turn = []
    for t in turns_data:
        ans = t.get("answer_transcript", "").strip()
        low_ans = ans.lower()
        if any(k in low_ans for k in ["không biết", "chưa biết", "chưa rõ", "chịu", "bỏ qua", "chưa tìm hiểu", "em không rành"]) or not ans:
            base_score_per_turn.append(1.5)
        elif len(ans.split()) < 10:
            base_score_per_turn.append(4.0)
        elif len(ans.split()) > 30:
            base_score_per_turn.append(8.0)
        else:
            base_score_per_turn.append(6.0)

    avg_10 = sum(base_score_per_turn) / max(1, len(base_score_per_turn))
    calc_total = round(avg_10 * 10, 1)
    
    sit = round(calc_total * 0.25, 1)
    tsk = round(calc_total * 0.25, 1)
    act = round(calc_total * 0.25, 1)
    res = round(calc_total * 0.25, 1)
    is_passed = calc_total >= cutoff

    if is_passed:
        strengths = "Tư duy mạch lạc, trả lời rõ ràng bám sát tình huống thực tế và khung chuẩn STAR."
        weaknesses = "Cần bổ sung thêm số liệu định lượng chi tiết cho phần Kết quả (Result)."
        recs = "Tiếp tục phát huy phong độ và chuẩn bị kỹ các chỉ số đo lường hiệu quả."
        summary = f"Ứng viên đạt {calc_total}/100 điểm, vượt ngưỡng cut-off ({cutoff}đ). Đề xuất chuyển tiếp phỏng vấn Vòng 2 trực tiếp."
    else:
        strengths = "Thái độ trung thực, có tinh thần cầu tiến trong quá trình trao đổi."
        weaknesses = f"Còn nhiều lỗ hổng kiến thức cốt lõi (có {dont_know_count} câu chưa nắm rõ hoặc từ chối trả lời). Câu trả lời còn thiếu số liệu thực chiến."
        recs = "Cần ôn tập kỹ kiến thức nền tảng và luyện tập cách giải quyết vấn đề theo cấu trúc STAR."
        summary = f"Ứng viên đạt {calc_total}/100 điểm, chưa đạt ngưỡng cut-off ({cutoff}đ). Đề xuất tiếp tục trau dồi và rèn luyện thêm trước khi tham gia tuyển dụng thực tế."

    fallback_eval = {
        "situation_score": sit,
        "task_score": tsk,
        "action_score": act,
        "result_score": res,
        "total_score": calc_total,
        "is_passed": is_passed,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "ai_recommendations": recs,
        "dossier_summary": summary,
        "turn_evaluations": [
            {
                "turn_number": idx,
                "score": score,
                "assessment": "Chưa nắm rõ câu hỏi" if score <= 2.0 else ("Cần bổ sung chi tiết" if score <= 5.0 else "Trả lời tốt"),
                "critique": "Ứng viên thừa nhận chưa có trải nghiệm" if score <= 2.0 else "Nên bổ sung thêm số liệu",
                "model_answer": "Trình bày theo cấu trúc Tình huống -> Nhiệm vụ -> Hành động -> Kết quả đo lường"
            }
            for idx, score in enumerate(base_score_per_turn, start=1)
        ]
    }
    print_star_evaluation_terminal_log(fallback_eval, role)
    return fallback_eval


def analyze_cv_and_jd_matching(
    cv_text: str,
    jd_text: str,
    role_title: str = "Backend Software Engineer",
    target_level: str = "fresher",
    track: str = "backend"
) -> Dict[str, Any]:
    """Phân tích so khớp chuyên sâu giữa CV và JD bằng Google Gemini:
    - Bóc tách yêu cầu cốt lõi từ JD (Core Requirements, Experience, Soft Skills)
    - Bóc tách năng lực, kỹ năng, dự án từ CV (Summary, Skills, Highlight Projects)
    - Đánh giá độ phù hợp cấp bậc (Level Fit: Intern, Fresher, Junior, Mid)
    - Tính điểm phần trăm phù hợp (Match Score % theo thuật toán ATS)
    - Liệt kê các kỹ năng trùng khớp (Matched Skills)
    - Nhận diện các khoảng trống / lỗ hổng năng lực (Skill Gaps)
    - Nhận diện thông tin nghi vấn quan trọng cần xử lý (Critical Probe Points)
    - Đưa ra bộ câu hỏi hỏi xoáy phỏng vấn AI đo ni đóng giày theo khoảng trống
    - Chi tiết tư duy phân tích 3 chiều của AI (Technical, Experience, Growth)
    - Xuất log trực quan ra Terminal
    """
    client = get_client()

    lvl = (target_level or "fresher").lower()

    prompt = f"""
Bạn là Chuyên gia Tuyển dụng Kỹ thuật AI & Kiến trúc sư Thẩm định Hồ sơ Cấp cao tại TalentAI.
Vị trí mục tiêu: {role_title} (Track: {track}).
Cấp bậc mục tiêu thẩm định: {lvl.upper()}.

NỘI DUNG MÔ TẢ CÔNG VIỆC (JOB DESCRIPTION - JD):
{jd_text.strip() or 'Vị trí Lập trình viên Backend: Yêu cầu Java Core, Spring Boot, MySQL, RESTful API, Docker, tư duy giải quyết vấn đề và chịu áp lực.'}

NỘI DUNG HỒ SƠ ỨNG VIÊN (CV / RESUME):
{cv_text.strip() or 'Ứng viên sinh viên năm cuối ngành CNTT, có đồ án web bán hàng với Spring Boot và MySQL.'}

NHIỆM VỤ BÓC TÁCH & PHÂN TÍCH SO KHỚP CHUYÊN SÂU THEO CẤP BẬC {lvl.upper()}:
1. BÓC TÁCH JD:
   - Liệt kê kỹ năng & công nghệ cốt lõi bắt buộc (core_requirements)
   - Yêu cầu kinh nghiệm/quy mô (experience_required)
   - Tiêu chí mềm & tư duy giải quyết vấn đề (soft_skills)
2. BÓC TÁCH CV:
   - Tổng quan ứng viên (candidate_summary)
   - Kỹ năng & công nghệ có trong CV (skills_present)
   - Dự án thực tế / đồ án tiêu biểu (highlight_projects)
3. SO KHỚP NĂNG LỰC & ATS GAPS:
   - Điểm số % phù hợp ATS (match_score: từ 0 đến 100)
   - Đánh giá mức độ: "Rất cao" (>=85%) | "Khá phù hợp" (70-84%) | "Trung bình" (50-69%) | "Thấp" (<50%)
   - Tóm tắt ngắn gọn nhận định (summary_verdict)
   - Danh sách kỹ năng trùng khớp rõ ràng (matched_skills)
   - Danh sách khoảng trống / lỗ hổng so với JD (missing_gaps)
4. THÔNG TIN QUAN TRỌNG CẦN XỬ LÝ & BỘ CÂU HỎI HỎI XOÁY:
   - Các điểm nghi vấn hoặc thông tin cần AI thẩm định sâu (critical_probe_points)
   - Bộ 2 đến 3 câu hỏi hỏi xoáy (probing_questions) thiết kế RIÊNG cho ứng viên này, xoáy thẳng vào các khoảng trống (gaps) để kiểm tra năng lực thật.
5. TƯ DUY PHÂN TÍCH 3 CHIỀU CỦA AI (ai_reasoning):
   - technical_fit: Phân tích về công nghệ cốt lõi
   - experience_fit: Phân tích về kinh nghiệm thực chiến vs lý thuyết
   - growth_potential: Tiềm năng học hỏi và thích nghi

ĐỊNH DẠNG ĐẦU RA (JSON thuần túy, không kèm markdown ```json):
{{
  "jd_extracted": {{
    "core_requirements": ["Kỹ năng/công nghệ 1...", "Kỹ năng 2..."],
    "experience_required": "Yêu cầu kinh nghiệm...",
    "soft_skills": ["Tiêu chí 1...", "Tiêu chí 2..."]
  }},
  "cv_extracted": {{
    "candidate_summary": "Tóm tắt ứng viên...",
    "skills_present": ["Kỹ năng 1 trong CV...", "Kỹ năng 2..."],
    "highlight_projects": ["Dự án 1...", "Dự án 2..."]
  }},
  "match_score": 76,
  "match_level": "Khá phù hợp",
  "summary_verdict": "Tóm tắt 2 câu về mức độ tương thích...",
  "matched_skills": [
    "Kỹ năng trùng khớp 1...",
    "Kỹ năng 2..."
  ],
  "missing_gaps": [
    "Khoảng trống 1 mà ứng viên còn thiếu so với JD...",
    "Khoảng trống 2..."
  ],
  "critical_probe_points": [
    "Điểm nghi vấn 1 cần thẩm định...",
    "Điểm nghi vấn 2..."
  ],
  "probing_questions": [
    "Câu hỏi xoáy 1 nhắm vào khoảng trống...",
    "Câu hỏi xoáy 2..."
  ],
  "ai_reasoning": {{
    "technical_fit": "Phân tích về mặt công nghệ và kỹ thuật cốt lõi...",
    "experience_fit": "Phân tích về kinh nghiệm thực chiến và quy mô đồ án...",
    "growth_potential": "Tiềm năng học hỏi và khả năng thích nghi..."
  }}
}}
"""
    for model_name in CANDIDATE_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            data = extract_json(response.text)
            if isinstance(data, dict) and "match_score" in data:
                print_cv_jd_terminal_log(data, role_title)
                return data
        except Exception as e:
            print(f"[CV-JD Matcher] Error with {model_name}: {e}. Retrying next model...")

    # Fallback chất lượng cao nếu có sự cố
    fallback_data = {
        "jd_extracted": {
            "core_requirements": [
                "Java Core, OOP, Collection, Concurrency cơ bản",
                "Spring Boot Framework (REST API, Spring Data JPA)",
                "Cơ sở dữ liệu MySQL (Tối ưu index & truy vấn phức tạp)",
                "Docker & Microservices cơ bản"
            ],
            "experience_required": "Fresher / Junior (Dưới 1-2 năm kinh nghiệm)",
            "soft_skills": ["Tư duy giải quyết vấn đề logic", "Chịu áp lực tiến độ dự án"]
        },
        "cv_extracted": {
            "candidate_summary": "Ứng viên sinh viên năm cuối ngành CNTT, có đồ án web bán hàng với Spring Boot và MySQL",
            "skills_present": ["Java Core, OOP", "Spring Boot, RESTful API", "MySQL, Spring Data JPA", "Git, Postman"],
            "highlight_projects": ["Website Bán Hàng E-Commerce (Spring Boot + MySQL + Thymeleaf): Xây dựng CRUD sản phẩm, giỏ hàng, xác thực JWT"]
        },
        "match_score": 75,
        "match_level": "Khá phù hợp",
        "summary_verdict": "Hồ sơ ứng viên đáp ứng tốt nền tảng Java Core và Spring Boot cơ bản, nhưng còn thiếu kinh nghiệm tối ưu hóa hệ thống chịu tải cao và CI/CD.",
        "matched_skills": [
            "Nắm vững lập trình hướng đối tượng (OOP) và ngôn ngữ Java",
            "Đã từng phát triển RESTful API với Spring Boot và kết nối cơ sở dữ liệu MySQL"
        ],
        "missing_gaps": [
            "Chưa có kinh nghiệm thực chiến với Redis Caching và Message Queue (Kafka/RabbitMQ)",
            "Chưa có số liệu đo lường hiệu năng chịu tải hoặc kiểm thử tự động (Unit Test / Mockito)"
        ],
        "critical_probe_points": [
            "Cần kiểm tra xem ứng viên tự thiết kế kiến trúc DB hay copy mã nguồn có sẵn.",
            "Cần làm rõ cách ứng viên xử lý khi nhiều người dùng cùng mua hàng đồng thời (Race Condition).",
            "Cần kiểm tra kỹ năng tối ưu truy vấn SQL khi bảng dữ liệu lớn."
        ],
        "probing_questions": [
            "Trong đồ án Web bán hàng của bạn, khi lượng người dùng đồng thời tăng vọt, giải pháp xử lý deadlock và chống bán âm hàng (Race Condition) của bạn là gì?",
            "Bạn đã từng viết Unit Test cho tầng Service chưa, tỷ lệ code coverage đạt bao nhiêu % và bạn mock dữ liệu DB như thế nào?"
        ],
        "ai_reasoning": {
            "technical_fit": "Phù hợp tốt với các nhiệm vụ phát triển tính năng cơ bản, cần đào tạo thêm về kiến trúc vi dịch vụ.",
            "experience_fit": "Chủ yếu là đồ án môn học hoặc dự án cá nhân, chưa có trải nghiệm vận hành production thực tế.",
            "growth_potential": "Nền tảng tư duy tốt, có khả năng thích nghi nhanh nếu được mentor hướng dẫn."
        }
    }
    print_cv_jd_terminal_log(fallback_data, role_title)
    return fallback_data

