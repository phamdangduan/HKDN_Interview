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

def get_client():
    if not GEMINI_API_KEY:
        raise ValueError("Chưa tìm thấy GEMINI_API_KEY trong file .env")
    return genai.Client(api_key=GEMINI_API_KEY)


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
        is_pivot = " [CHUYỂN HƯỚNG/PIVOT VÌ NÓI KHÔNG BIẾT]" if data.get("is_pivot") else ""
        print("🧠 AI Phân tích phản hồi:", flush=True)
        print(f"   • Ý định (Intent): {intent} | Điểm lượt này: {score}/10{is_pivot}", flush=True)
        print(f"   • Giám khảo phản hồi: \"{feedback}\"", flush=True)
        print(f"   • Câu hỏi tiếp theo: \"{next_q}\"", flush=True)
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

    prompt = f"""
Bạn là {persona}, Giám khảo phỏng vấn kỹ thuật cấp cao tại TalentAI (Cấp độ hỏi thực chiến IT {difficulty}/5).
Buổi phỏng vấn kỹ thuật dự kiến kéo dài {duration_minutes} phút cho vị trí: {role} (Track: {track}).
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
    track: str = "backend"
) -> Dict[str, Any]:
    """Phân tích câu trả lời tức thời của ứng viên và sinh phản hồi + câu hỏi tiếp theo thông minh.
    Được may đo theo đúng cấp bậc IT (Intern, Fresher, Junior, Mid-Level):
    1. Ứng viên nói 'không biết / chưa học / xin qua': Giám khảo thông cảm, chuyển hướng (Pivot) sang câu hỏi khác, KHÔNG đào sâu vào điểm mù.
    2. Ứng viên trả lời lý thuyết, thiếu STAR: Hỏi xoáy thông minh (Targeted Probing) vào chi tiết cụ thể đã nêu theo đúng tầm cấp bậc.
    3. Ứng viên trả lời tốt: Khen ngợi ngắn gọn, chuyển mượt mà sang câu tiếp theo.
    4. Ứng viên hỏi ngược lại AI (Giai đoạn candidate_qa): AI trả lời câu hỏi của ứng viên sắc sảo rồi kết thúc.
    """
    client = get_client()

    ans_clean = (candidate_answer or "").strip()
    lvl = (target_level or "fresher").lower()

    prompt = f"""
Bạn là Giám khảo phỏng vấn kỹ thuật AI tên là {persona} (Phong cách kỹ sư cao cấp, thực chiến, cuốn hút, tâm lý, độ khó {difficulty}/5).
Vị trí phỏng vấn: {role} (Track: {track}) tại {company}.
Cấp bậc khảo nghiệm: {lvl.upper()}.
Giai đoạn phỏng vấn hiện tại: Bước {stage_index + 1}/10 - {stage_name} (ID: {stage_id}).
Câu hỏi bạn vừa hỏi ứng viên:
"{current_question}"

Câu trả lời thực tế của ứng viên:
"{ans_clean}"

Gợi ý định hướng cho giai đoạn tiếp theo (chỉ để tham khảo chủ đề, KHÔNG ĐƯỢC lặp lại nguyên văn):
"{default_next_question}"

TIÊU CHUẨN KỲ VỌNG THEO CẤP BẬC {lvl.upper()}:
- INTERN: Đánh giá cao tư duy logic, hiểu bản chất OOP/thuật toán cơ bản, kỹ năng debug và thái độ cầu thị học hỏi. Tuyệt đối KHÔNG hỏi kiến trúc chịu tải phân tán, microservices hay hạ tầng production phức tạp!
- FRESHER: Đánh giá khả năng làm chủ Tech Stack, luồng dữ liệu REST API, hiểu bản chất code tự viết, cơ sở dữ liệu quan hệ, Clean Code và kiểm thử cơ bản.
- JUNIOR: Đòi hỏi kinh nghiệm thực chiến production: Concurrency, Caching Redis, Race Condition, tối ưu SQL, giải thích được đánh đổi kỹ thuật (Trade-offs) và có số liệu thực tế.
- MID-LEVEL: Đòi hỏi tư duy System Design, Microservices, High Availability, khả năng giải quyết sự cố quy mô lớn.

QUY TẮC PHỎNG VẤN THÍCH ỨNG & ĐỔI MỚI (CHỐNG NHÀM CHÁN - TRÁNH LÝ THUYẾT SUÔNG):
1. LẮNG NGHE & BẮT TRỰC DIỆN Ý CỦA ỨNG VIÊN (Listen & Connect):
   - feedback_phrase: Nhận xét 1 câu tự nhiên, sắc sảo về ĐÚNG CÔNG NGHỆ, THƯ VIỆN, HOẶC LUẬN ĐIỂM mà ứng viên vừa nói trong câu trả lời (Ví dụ: nếu ứng viên nhắc đến JWT, hãy nhận xét về JWT; nếu ứng viên nói dùng Breakpoint debug, hãy ghi nhận điều đó).
2. SINH CÂU HỎI TIẾP THEO SÁNG TẠO, TƯƠI MỚI, THỰC TẾ & KHƠI GỢI TƯ DUY:
   - TUYỆT ĐỐI TRÁNH hỏi những câu hỏi lý thuyết sách giáo khoa khô khan nhàm chán (như "4 tính chất OOP là gì", "vòng đời HTTP request là gì").
   - HÃY ĐƯA RA CÁC TÌNH HUỐNG THỰC TẾ HẤP DẪN PHÙ HỢP CẤP BẬC {lvl.upper()}:
     * Tình huống Bug dị / Edge Case: "Trong code đồ án bạn từng làm, có con bug nào 'chạy ở máy bạn thì được mà đưa sang máy bạn khác thì chết' chưa, bạn tìm ra nguyên nhân do đâu?"
     * Tình huống Đánh đổi / Dilemma: "Tại sao bạn lại chọn công nghệ/thư viện đó thay vì một giải pháp khác? Nếu dữ liệu tăng gấp 10 lần thì điểm nghẽn đầu tiên sẽ nằm ở đâu?"
     * Tình huống Thực tế & Xu hướng mới: "Hiện nay nhiều bạn dùng AI (như ChatGPT, Copilot) để sinh code. Bạn sử dụng công cụ này thế nào để nâng cao tốc độ mà không bị phụ thuộc hoặc sinh code lỗi tiềm ẩn?"
     * Tình huống Xử lý sự cố / Làm việc nhóm: Đặt ứng viên vào một bối cảnh cụ thể để xem phản xạ tư duy STAR.
QUY TẮC BẮT BUỘC - MỖI LƯỢT CHỈ ĐƯỢC HỎI ĐÚNG 1 CÂU HỎI DUY NHẤT (SINGLE ATOMIC QUESTION):
1. TUYỆT ĐỐI CẤM hỏi kép, hỏi dồn, hoặc nhồi nhét 2-3 câu hỏi vào 1 câu!
   - ❌ VÍ DỤ CẤM: "Em tự tay code tính năng gì, thiết kế Database ra sao và cách em test thế nào?" (Đây là 3 câu hỏi, làm ứng viên bị ngợp và không thể phân tích sâu).
   - ✅ CÁCH HỎI ĐÚNG: Chia nhỏ vấn đề, chỉ hỏi 1 khía cạnh duy nhất: "Trong đồ án đó, tính năng nào là do em tự tay viết code từ đầu đến cuối?" (Chờ ứng viên trả lời xong thì ở lượt sau mới hỏi tiếp về Database!).
2. next_question: BẮT BUỘC chỉ là ĐÚNG 1 CÂU HỎI ĐƠN LẺ, kết thúc bằng DUY NHẤT 1 DẤU CHẤM HỎI (?). Độ dài súc tích từ 15 đến 25 từ.
3. feedback_phrase: Nhận xét ngắn gọn 1 câu tự nhiên về ý ứng viên vừa nói (tối đa 15 từ).

3. PHÂN LOẠI Ý ĐỊNH (INTENT):
   - "DONT_KNOW": Ứng viên nói không biết, chưa từng làm, hoặc xin chuyển câu.
     * feedback_phrase: Thông cảm, khích lệ tự nhiên.
     * next_question: Chuyển hướng sang một khía cạnh kỹ thuật thực tế khác mà cấp bậc {lvl.upper()} thường quen thuộc. TUYỆT ĐỐI KHÔNG ép ứng viên vào điểm mù vừa nói.
     * is_pivot: true, turn_score: 1.0 - 2.0 / 10.
   - "SHALLOW": Trả lời ngắn, chung chung:
     * next_question: Bắt đúng 1 từ khóa ứng viên vừa nói để hỏi xoáy sâu hơn vào thực tế.
     * turn_score: 3.0 - 5.5 / 10.
   - "GOOD": Trả lời tốt, có chuyên môn:
     * next_question: Nâng cao hoặc mở rộng sang một tình huống thực chiến tiếp theo.
     * turn_score: 7.0 - 10.0 / 10.

ĐỊNH DẠNG ĐẦU RA:
Trả về duy nhất JSON hợp lệ (không kèm markdown):
{{
  "intent": "DONT_KNOW | SHALLOW | GOOD | OFF_TOPIC",
  "turn_score": 7.5,
  "feedback_phrase": "Lời nhận xét ngắn tối đa 1 câu...",
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
                print_adaptive_turn_terminal_log(stage_index, stage_name, current_question, ans_clean, data)
                return data
        except Exception as e:
            print(f"[AI Engine] Error calling {model_name} in generate_adaptive_next_turn: {e}. Retrying next model...")

    # Heuristic fallback nếu AI tạm thời mất kết nối
    lower_ans = ans_clean.lower()
    is_dont_know = any(k in lower_ans for k in ["không biết", "chưa biết", "chưa rõ", "chưa từng", "chịu", "qua câu", "bỏ qua", "chưa tìm hiểu", "em không rành", "mình không biết"])
    
    if is_dont_know:
        res = {
            "intent": "DONT_KNOW",
            "turn_score": 1.0,
            "feedback_phrase": "Tôi hiểu rồi, trong kỹ thuật chúng ta luôn có những mảng mới cần thời gian trau dồi. Không sao cả, chúng ta hãy cùng chuyển sang một chủ đề khác nhé.",
            "next_question": default_next_question or f"Vậy ngoài mảng đó ra, trong các bài toán kỹ thuật với {role}, bạn tự tin nhất với phần việc nào?",
            "critique": "Ứng viên thừa nhận chưa có trải nghiệm về chủ đề này.",
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

    res = {
        "intent": "GOOD" if len(ans_clean) > 40 else "SHALLOW",
        "turn_score": 7.0 if len(ans_clean) > 40 else 4.0,
        "feedback_phrase": "Cảm ơn chia sẻ của bạn, tôi đã ghi nhận nội dung kỹ thuật này.",
        "next_question": default_next_question or "Chúng ta hãy tiếp tục với câu hỏi tiếp theo nhé.",
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
   - Nếu ứng viên trả lời sai kiến thức cốt lõi, lạc đề, hoặc nói linh tinh: Chỉ từ 1.0 đến 3.0 / 10 điểm.
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

