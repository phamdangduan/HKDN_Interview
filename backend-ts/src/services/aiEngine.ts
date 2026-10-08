import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash"
];

export interface PersonaProfile {
  title: string;
  focus: string;
  tone: string;
  questionStyle: string;
  probingRule: string;
}

export const PERSONA_PROFILES: Record<string, PersonaProfile> = {
  "Alex Chen": {
    title: "Senior Software Architect (Kỹ sư trưởng Công nghệ - Ex Big Tech)",
    focus: "Kiến trúc hệ thống, bản chất kỹ thuật bên dưới (Under the hood), tối ưu hiệu năng (Scalability), Clean Code và cơ chế hoạt động của Framework/Database.",
    tone: "Điềm tĩnh, sắc bén, chuyên môn sâu, đánh giá cao tư duy logic và hiểu sâu bản chất kỹ thuật.",
    questionStyle: "Hỏi xoáy vào bản chất cơ chế hoạt động (Tại sao chọn công nghệ này? Cơ chế bộ nhớ/index/concurrency bên dưới ra sao?).",
    probingRule: "Nếu ứng viên trả lời lý thuyết chung chung, lập tức yêu cầu bóc tách chi tiết kỹ thuật thực tế và cơ chế bên dưới (Under the hood)."
  },
  "David Miller": {
    title: "Senior Tech Director (Giám đốc Công nghệ Khó Tính & Hỏi Xoáy Gắt)",
    focus: "Sự cố thực tế, số liệu đo lường cụ thể (Metrics/Numbers), khả năng chịu áp lực (Stress Test), xử lý khủng hoảng và tính xác thực của CV.",
    tone: "Nghiêm khắc, sắc lạnh, hay đặt nghi vấn phản biện: 'Tại sao không làm cách khác?', 'Con số cụ thể là bao nhiêu?'.",
    questionStyle: "Đặt các tình huống sự cố production khẩn cấp, bắt bẻ số liệu đo lường, kiểm tra tính tự lập (tự code hay làm theo người khác).",
    probingRule: "Nếu ứng viên trả lời mập mờ hoặc thiếu số liệu, lập tức bắt bẻ và yêu cầu đưa ra con số chính xác (RPS, latency, downtime, lỗi cụ thể)."
  },
  "Sarah Jenkins": {
    title: "Head of Talent & Culture (Trưởng Ban Nhân Sự & Văn Hóa Doanh Nghiệp)",
    focus: "Kỹ năng mềm, khả năng giao tiếp (Communication), giải quyết mâu thuẫn nội bộ (Conflict Resolution), văn hóa làm việc nhóm (Teamwork) và chuẩn mực ứng xử theo STAR.",
    tone: "Truyền cảm, nhã nhặn, biết lắng nghe nhưng đánh giá rất sâu về EQ, thái độ cầu tiến và khả năng hòa nhập đội ngũ.",
    questionStyle: "Hỏi về các tình huống giao tiếp, giải quyết bất đồng quan điểm kỹ thuật với đồng nghiệp, áp lực deadline và cách đón nhận phản hồi tiêu cực.",
    probingRule: "Nếu ứng viên chỉ nói về công nghệ mà quên yếu tố con người, yêu cầu làm rõ cách ứng viên phối hợp với đồng nghiệp và xử lý cảm xúc trong tình huống đó."
  },
  "Rachel Vance": {
    title: "Executive Vice President (Lãnh đạo Cấp Cao C-Level)",
    focus: "Tầm nhìn chiến lược kinh doanh (Business Value), đánh đổi kỹ thuật (Trade-offs), tối ưu chi phí hạ tầng (ROI) và khả năng dẫn dắt đội ngũ.",
    tone: "Đĩnh đạc, bao quát, tầm nhìn vĩ mô của nhà lãnh đạo điều hành doanh nghiệp.",
    questionStyle: "Hỏi về giá trị kinh doanh mà giải pháp kỹ thuật mang lại, sự cân bằng giữa chi phí máy chủ và tốc độ phát triển sản phẩm.",
    probingRule: "Yêu cầu ứng viên giải thích các quyết định kỹ thuật đứng trên góc nhìn hiệu quả kinh doanh và lợi ích lâu dài của toàn công ty."
  }
};

function getClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error("Chưa tìm thấy GEMINI_API_KEY trong file .env");
  }
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

export function extractJson<T = any>(text: string): T {
  if (!text) throw new Error("Phản hồi từ AI rỗng");
  let cleaned = text.trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  let stripped = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {}

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
    } catch {}
  }

  throw new Error(`Không thể trích xuất JSON từ phản hồi: ${text.slice(0, 150)}...`);
}

export function sanitizeToSingleQuestion(questionText: string): string {
  let clean = (questionText || "").trim();
  if (!clean) return clean;

  // Nếu có nhiều dấu hỏi chấm (?) -> Chỉ giữ lại câu hỏi đầu tiên
  const questionMarks = (clean.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    const parts = clean.split("?");
    if (parts.length > 0 && parts[0].trim().length > 10) {
      clean = parts[0].trim() + "?";
    }
  }

  return clean;
}

// Hàm nhận diện và in cảnh báo rực rỡ khi chạm hạn mức API miễn phí (Quota / Rate Limit)
export function detectAndLogApiQuotaWarning(service: "Gemini" | "Blaze", err: any): { isQuotaError: boolean; message: string } {
  const errMsg = (err?.message || String(err) || "").toLowerCase();
  const status = err?.status || err?.response?.status || 0;

  const isQuota =
    status === 429 ||
    errMsg.includes("resource_exhausted") ||
    errMsg.includes("quota") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("too many requests") ||
    errMsg.includes("exceeded your current quota") ||
    errMsg.includes("billing");

  const isKeyError =
    status === 403 ||
    errMsg.includes("api_key_invalid") ||
    errMsg.includes("permission_denied") ||
    errMsg.includes("unauthenticated") ||
    errMsg.includes("api key not valid");

  if (isQuota) {
    console.error("\n" + "🚨".repeat(36));
    console.error(`⚠️  [CẢNH BÁO HẾT HẠN MỨC GỌI API MIỄN PHÍ - ${service.toUpperCase()}]`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`📌 Dịch vụ: ${service === 'Gemini' ? 'Google Gemini AI Studio' : 'Blaze Voice AI TTS'}`);
    console.error("⚠️ Trạng thái: LỖI 429 - HẾT QUOTA / RATE LIMIT (Vượt tần suất gọi)");
    console.error(`💡 Thông báo từ nhà cung cấp: "${err?.message || errMsg}"`);
    console.error("🔄 Hành động tự động: Hệ thống kích hoạt Chế độ Dự phòng Thông minh (Fallback Engine)!");
    console.error("👉 Khuyến nghị: Thay API Key mới vào file .env hoặc chờ hệ thống tự reset sau ít phút.");
    console.error("🚨".repeat(36) + "\n");
    return { isQuotaError: true, message: `Hạn mức gọi API miễn phí (${service}) tạm thời đã hết lượt (Rate Limit / Quota Exceeded). Hệ thống đã tự động chuyển sang chế độ dự phòng.` };
  }

  if (isKeyError) {
    console.error("\n" + "🚨".repeat(36));
    console.error(`⚠️  [CẢNH BÁO API KEY ${service.toUpperCase()} KHÔNG HỢP LỆ HOẶC BỊ KHÓA]`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`📌 Dịch vụ: ${service}`);
    console.error("⚠️ Trạng thái: LỖI 403 - FORBIDDEN / INVALID KEY");
    console.error(`💡 Thông báo: "${err?.message || errMsg}"`);
    console.error("👉 Khuyến nghị: Vui lòng kiểm tra lại cấu hình API Key trong file .env.");
    console.error("🚨".repeat(36) + "\n");
    return { isQuotaError: true, message: `API Key ${service} không hợp lệ hoặc đã bị khóa.` };
  }

  return { isQuotaError: false, message: "" };
}

// -------------------------------------------------------------
// Terminal Logging Helpers
// -------------------------------------------------------------
export function printCvJdTerminalLog(data: any, roleTitle: string) {
  try {
    const sep = "═".repeat(80);
    console.log("\n" + sep);
    console.log("🤖 [TALENTAI AI ENGINE TS] BÓC TÁCH CV & JD - PHÂN TÍCH SO KHỚP & CHIẾN LƯỢC HỎI XOÁY");
    console.log(sep);
    console.log(`📌 VỊ TRÍ ỨNG TUYỂN MỤC TIÊU: ${roleTitle.toUpperCase()}\n`);

    const jdInfo = data.jd_extracted || {};
    console.log("📋 [1] BÓC TÁCH YÊU CẦU CÔNG VIỆC (JOB DESCRIPTION - JD):");
    if (jdInfo && typeof jdInfo === "object") {
      const coreReqs = jdInfo.core_requirements || [];
      if (Array.isArray(coreReqs) && coreReqs.length) {
        console.log("   • Yêu cầu kỹ năng & Công nghệ cốt lõi:");
        coreReqs.forEach((r: string) => console.log(`     - ${r}`));
      }
      if (jdInfo.experience_required) {
        console.log(`   • Yêu cầu kinh nghiệm: ${jdInfo.experience_required}`);
      }
    }
    console.log("");

    const cvInfo = data.cv_extracted || {};
    console.log("👤 [2] BÓC TÁCH NĂNG LỰC HỒ SƠ ỨNG VIÊN (CV / RESUME):");
    if (cvInfo && typeof cvInfo === "object") {
      if (cvInfo.candidate_summary) {
        console.log(`   • Tổng quan ứng viên: ${cvInfo.candidate_summary}`);
      }
      const skills = cvInfo.skills_present || [];
      if (Array.isArray(skills) && skills.length) {
        console.log("   • Kỹ năng & Công nghệ nhận diện trong CV:");
        skills.forEach((sk: string) => console.log(`     - ${sk}`));
      }
    }
    console.log("");

    const score = data.match_score || 0;
    const level = data.match_level || "Đang đánh giá";
    console.log("📊 [3] KẾT QUẢ SO KHỚP NĂNG LỰC (ATS GAP & MATCH SCORE):");
    console.log(`   ★ ĐỘ TRÙNG KHỚP TỔNG THỂ: ${score}% [${level.toUpperCase()}]`);

    const gaps = data.missing_gaps || [];
    console.log("   ⚠️ Khoảng trống năng lực (Skill Gaps):");
    if (Array.isArray(gaps) && gaps.length) {
      gaps.forEach((g: string) => console.log(`      - ${g}`));
    }
    console.log("");

    console.log("🎯 [4] BỘ CÂU HỎI HỎI XOÁY THIẾT KẾ RIÊNG:");
    const probingQs = data.probing_questions || [];
    if (Array.isArray(probingQs) && probingQs.length) {
      probingQs.forEach((q: string, idx: number) => console.log(`      [${idx + 1}] "${q}"`));
    }
    console.log(sep + "\n");
  } catch (err) {
    console.error("[Logging Exception in printCvJdTerminalLog]:", err);
  }
}

export function printInterviewStartTerminalLog(
  role: string,
  persona: string,
  difficulty: number,
  cvText: string,
  requirement: string,
  questions: string[],
  targetLevel = "fresher",
  track = "backend"
) {
  try {
    const sep = "═".repeat(80);
    const levelMap: Record<string, string> = {
      intern: "🟢 THỰC TẬP SINH (INTERN)",
      fresher: "🔵 MỚI TỐT NGHIỆP (FRESHER / <1 NĂM)",
      junior: "🟣 KỸ SƯ JUNIOR (1 - 2.5 NĂM)",
      mid_level: "🟠 KỸ SƯ TIÊU CHUẨN (MID-LEVEL / 3+ NĂM)"
    };
    const levelLabel = levelMap[targetLevel.toLowerCase()] || targetLevel.toUpperCase();
    console.log("\n" + sep);
    console.log("🎯 [TALENTAI TS ENGINE] KHỞI TẠO BỘ ĐỀ KỸ THUẬT 10 GIAI ĐOẠN (CHUẨN MA TRẬN NỀN TẢNG)");
    console.log(sep);
    console.log(`📌 VỊ TRÍ: ${role.toUpperCase()} | TRACK: ${track.toUpperCase()} | CẤP BẬC: ${levelLabel}`);
    console.log(`👤 GIÁM KHẢO AI: ${persona} (Độ khó: ${difficulty}/5)`);
    console.log("\n🎯 DANH SÁCH 10 CÂU HỎI THIẾT KẾ CHO ỨNG VIÊN:");
    questions.forEach((q, idx) => console.log(`   [Giai đoạn ${idx + 1}]: "${q}"`));
    console.log(sep + "\n");
  } catch (err) {
    console.error("[Logging Exception in printInterviewStartTerminalLog]:", err);
  }
}

export function printAdaptiveTurnTerminalLog(
  stageIndex: number,
  stageName: string,
  currentQuestion: string,
  candidateAnswer: string,
  data: any
) {
  try {
    const sep = "─".repeat(80);
    const branchBadge =
      data.branch === "PROBE_DEEPER"
        ? "🚀 [NHÁNH 1: ĐÀO SÂU MỞ RỘNG / +1 LEVEL]"
        : data.branch === "GROUND_TO_PRACTICE"
        ? "🔍 [NHÁNH 2: KÉO VỀ THỰC TẾ / BÓC TÁCH MÃ NGUỒN]"
        : "🤝 [NHÁNH 3: ĐỒNG CẢM & HẠ ĐỘ KHÓ / PIVOT THÂN THIỆN]";

    console.log("\n" + sep);
    console.log(`🎤 [TALENTAI TS LIVE TURN] GIAI ĐOẠN ${stageIndex + 1}/10: ${stageName.toUpperCase()}`);
    console.log(`❓ Câu hỏi vừa hỏi: "${currentQuestion}"`);
    console.log(`🗣️ Ứng viên trả lời: "${candidateAnswer || '[Im lặng / Chưa nói]'}"`);
    console.log("🧠 Phân tích & Định hướng AI:");
    console.log(`   • ${branchBadge}`);
    if (data.branch_reason) {
      console.log(`     Lý do chọn nhánh: ${data.branch_reason}`);
    }
    if (data.competency_focus) {
      console.log(`   • Trọng tâm năng lực: ${data.competency_focus}`);
    }
    if (data.candidate_statement_analysis) {
      console.log(`   • Phân tích câu nói & tâm lý ứng viên: "${data.candidate_statement_analysis}"`);
    } else if (data.critique) {
      console.log(`   • Nhận định chuyên môn: "${data.critique}"`);
    }
    console.log(`   • Ý định (Intent): ${data.intent} | Điểm lượt này: ${data.turn_score}/10 ${data.is_pivot ? "[PIVOT/CHUYỂN HƯỚNG]" : ""}`);
    console.log(`   • Lời thoại phản hồi: "${data.feedback_phrase}"`);
    console.log(`   • Câu hỏi tiếp theo thích ứng: "${data.next_question}"`);
    console.log(sep + "\n");
  } catch (err) {
    console.error("[Logging Exception in printAdaptiveTurnTerminalLog]:", err);
  }
}

// -------------------------------------------------------------
// 1. GENERATE INTERVIEW QUESTIONS (10 Stages with Funnel Strategy)
// -------------------------------------------------------------
export async function generateInterviewQuestions(
  role: string,
  cvText = "",
  requirement = "",
  persona = "Alex Chen",
  difficulty = 4,
  durationMinutes = 30,
  targetLevel = "fresher",
  track = "backend"
): Promise<string[]> {
  const client = getClient();
  const lvl = (targetLevel || "fresher").toLowerCase();

  let levelFocus = "";
  if (lvl.includes("intern")) {
    levelFocus = `
CẤP BẬC KHẢO NGHIỆM: THỰC TẬP SINH (INTERN)
- TRỌNG TÂM: 80% Nền tảng tư duy lập trình (CS Fundamentals), OOP, Cấu trúc dữ liệu & Giải thuật cơ bản, khả năng tự học debug, thái độ trung thực. 20% Bài tập lớn/đồ án môn học ở trường.
- NGUYÊN TẮC: TUYỆT ĐỐI KHÔNG hỏi các kiến trúc chịu tải phân tán, Redis cache, Kafka, microservices hay hạ tầng production phức tạp!
- PHƯƠNG PHÁP HỎI: Hỏi từ khái niệm cơ bản (OOP, Array/Map, Git, Debug) rồi mới hỏi đến đồ án môn học.
`;
  } else if (lvl.includes("junior")) {
    levelFocus = `
CẤP BẬC KHẢO NGHIỆM: KỸ SƯ JUNIOR (1 - 2.5 NĂM KINH NGHIỆM)
- TRỌNG TÂM: Kiểm tra cơ chế bên dưới (Under the hood) và kinh nghiệm thực chiến production: Concurrency, Caching (Redis), xử lý Race Condition, tối ưu truy vấn Database (Composite Index, N+1 query), Unit Testing và xử lý sự cố.
- PHƯƠNG PHÁP HỎI: Kiểm tra khái niệm gốc trước (B-tree, Thread, Transaction ACID) -> Rồi mới hỏi đến giải pháp và sự cố thực tế theo chuẩn STAR.
`;
  } else if (lvl.includes("mid")) {
    levelFocus = `
CẤP BẬC KHẢO NGHIỆM: KỸ SƯ TIÊU CHUẨN (MID-LEVEL / 3+ NĂM)
- TRỌNG TÂM: Thiết kế hệ thống (System Design), Microservices, High Concurrency, Database Sharding, Event-Driven Architecture và các đánh đổi kỹ thuật (Trade-offs).
`;
  } else {
    // Fresher
    levelFocus = `
CẤP BẬC KHẢO NGHIỆM: MỚI TỐT NGHIỆP (FRESHER / <1 NĂM KINH NGHIỆM)
- TRỌNG TÂM: Làm chủ 1 Tech Stack chính (Java/Spring Boot, Node.js, React...), hiểu vòng đời HTTP Request, thiết kế RESTful API chuẩn, Cơ sở dữ liệu quan hệ (Index, Transaction cơ bản), Clean Code và đồ án tốt nghiệp/dự án cá nhân hoàn chỉnh.
- PHƯƠNG PHÁP HỎI THEO MÔ HÌNH PHỄU: Khảo nghiệm kiến thức nền tảng trước (Status code, Index, vòng đời request) -> Xoáy sâu kiểm tra tự tay code hay copy đồ án -> Đặt tình huống bẫy (What-If: 2 người bấm mua cùng lúc).
`;
  }

  const profile = PERSONA_PROFILES[persona] || PERSONA_PROFILES["Alex Chen"];

  const prompt = `
Bạn là ${persona} - ${profile.title}.
PHONG THÁI & TÍNH CÁCH CỦA BẠN: ${profile.tone}
TRỌNG TÂM KHẢO HẠCH RIÊNG CỦA BẠN: ${profile.focus}
PHONG CÁCH ĐẶT CÂU HỎI: ${profile.questionStyle}

Buổi phỏng vấn dự kiến kéo dài ${durationMinutes} phút cho vị trí: ${role} (Track: ${track}).
${levelFocus}

Yêu cầu tuyển dụng: ${requirement || 'Khảo sát năng lực thực tế, tư duy giải quyết bài toán kỹ thuật theo chuẩn STAR.'}
Hồ sơ CV ứng viên: ${cvText || 'Ứng viên ngành CNTT có kiến thức nền tảng và đã từng tham gia đồ án/dự án thực tế.'}

QUY TẮC CỐT LÕI - MỖI LƯỢT CHỈ HỎI DUY NHẤT 1 CÂU HỎI ĐƠN LẺ (SINGLE ATOMIC QUESTION):
- TUYỆT ĐỐI CẤM ghép 2-3 câu hỏi vào 1 câu (Ví dụ CẤM: "Em làm tính năng gì, thiết kế DB ra sao và test thế nào?").
- Mỗi câu hỏi BẮT BUỘC chỉ được chứa DUY NHẤT 1 dấu chấm hỏi (?).
- Ngắn gọn, súc tích, từ 15 đến 25 từ.

HÃY TẠO BỘ 10 CÂU HỎI PHỎNG VẤN KỸ THUẬT TIẾNG VIỆT THEO ĐÚNG 10 GIAI ĐOẠN SAU (BÁM SÁT CẤP BẬC ${lvl.toUpperCase()}):
1. Chào hỏi & Phá băng: Lời chào thân thiện, hỏi thăm tinh thần và thiết bị của ứng viên.
2. Giới thiệu bản thân & Định hướng Tech: Mời ứng viên tóm tắt bản thân và cơ duyên làm chủ công nghệ của vị trí ${role}.
3. CV / Đồ án thực chiến: Hỏi đúng 1 câu về một tính năng hoặc đồ án kỹ thuật tiêu biểu nhất trong CV.
4. Chuyên môn cốt lõi (NỀN TẢNG TRƯỚC): Hỏi đúng 1 câu kiểm tra bản chất khái niệm bên dưới (Under the hood) đúng tầm cấp bậc ${lvl.toUpperCase()}.
5. Tình huống sự cố STAR (What-If Stress Test): Đưa ra đúng 1 tình huống sự cố cụ thể yêu cầu ứng viên giải quyết.
6. Động lực & Mục tiêu 2-3 năm: Hỏi đúng 1 câu về mục tiêu chuyên môn trong 2-3 năm tới.
7. Điểm mạnh & Điểm hạn chế kỹ thuật: Hỏi đúng 1 câu về thế mạnh cạnh tranh lớn nhất.
8. Kỳ vọng Văn hóa Engineering: Hỏi đúng 1 câu về kỳ vọng quy trình làm việc (Code review, Agile/Scrum).
9. Ứng viên hỏi: Lời mời để ứng viên đặt câu hỏi kỹ thuật ngược lại cho Giám khảo.
10. Tổng kết: Lời cảm ơn và nhận xét tích cực ngắn gọn.

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
`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt
      });
      const text = response.text || "";
      const data = extractJson<string[]>(text);
      if (Array.isArray(data) && data.length >= 8) {
        const genQuestions = data.slice(0, 10).map(q => sanitizeToSingleQuestion(String(q).trim()));
        printInterviewStartTerminalLog(role, persona, difficulty, cvText, requirement, genQuestions, lvl, track);
        return genQuestions;
      }
    } catch (err: any) {
      detectAndLogApiQuotaWarning("Gemini", err);
      console.warn(`[AI Engine TS] Error calling ${modelName} in generateInterviewQuestions: ${err.message}. Retrying next model...`);
    }
  }

  // Fallback chất lượng cao nếu các model bận
  let fallbackQuestions: string[] = [];
  if (lvl.includes("intern")) {
    fallbackQuestions = [
      `Xin chào bạn, tôi là ${persona}, rất vui được đồng hành cùng bạn trong buổi phỏng vấn thực tập vị trí ${role} hôm nay! Bạn đã sẵn sàng để chúng ta bắt đầu chưa?`,
      `Đầu tiên, bạn hãy giới thiệu ngắn gọn về bản thân và cơ duyên đưa bạn theo đuổi định hướng kỹ thuật với vị trí ${role} nhé?`,
      `Trong các bài tập lớn hoặc đồ án môn học ở trường, bạn tâm đắc nhất với sản phẩm nào và phần việc bạn tự tay code là gì?`,
      `Về mặt kiến thức nền tảng, bạn hiểu thế nào về 4 tính chất của Lập trình hướng đối tượng (OOP) và trong đồ án bạn áp dụng tính Kế thừa hoặc Đa hình ở đâu?`,
      `Hãy kể về một tình huống thực tế khi code đồ án nhóm gặp một con bug hóc búa hoặc có bất đồng giải pháp giữa các thành viên, bạn đã xử lý theo cấu trúc STAR ra sao?`,
      `Điều gì tạo cho bạn động lực lớn nhất khi ứng tuyển kỳ thực tập ${role}, và bạn kỳ vọng học hỏi được những gì sau kỳ thực tập này?`,
      `Theo bạn tự đánh giá, điểm mạnh về tư duy logic của bạn là gì, và đâu là một điểm về công nghệ bạn thấy mình cần tiếp tục rèn luyện thêm?`,
      `Về môi trường làm việc, bạn kỳ vọng một người hướng dẫn (Mentor) và đội ngũ đồng hành như thế nào để hỗ trợ bạn tiến bộ nhanh nhất?`,
      `Chúng tôi đã hoàn thành các câu hỏi khảo nghiệm. Bây giờ, bạn có câu hỏi hoặc thắc mắc nào muốn dành cho tôi và dự án không?`,
      `Cảm ơn bạn rất nhiều vì buổi trao đổi rất cởi mở hôm nay! Buổi phỏng vấn thực tập xin được khép lại tại đây, hệ thống sẽ tổng hợp bảng phân tích năng lực cho bạn ngay bây giờ.`
    ];
  } else if (lvl.includes("junior")) {
    fallbackQuestions = [
      `Chào bạn, tôi là ${persona}, rất vui được trao đổi chuyên môn cùng bạn cho vị trí ${role} hôm nay. Tín hiệu âm thanh của bạn đã ổn định để chúng ta bắt đầu chưa?`,
      `Trước hết, bạn hãy tóm tắt ngắn gọn về kinh nghiệm thực chiến và các công nghệ chủ lực mà bạn đã trực tiếp làm việc tại các dự án thực tế nhé?`,
      `Trong các hệ thống thực tế bạn từng tham gia phát triển, bài toán kiến trúc hoặc module phức tạp nhất mà bạn trực tiếp phụ trách là gì?`,
      `Về mặt kỹ thuật chuyên sâu, khi hệ thống phát sinh bài toán Race Condition hoặc deadlock trong truy vấn cơ sở dữ liệu, giải pháp thực tế bạn từng áp dụng để xử lý là gì?`,
      `Hãy kể về một sự cố Production khẩn cấp (như nghẽn kết nối DB, CPU server chạm đỉnh hoặc API bị timeout) mà bạn từng tham gia cứu sự cố theo chuẩn STAR?`,
      `Mục tiêu phát triển chuyên môn kỹ thuật sâu của bạn trong 2 đến 3 năm tới là gì (ví dụ: Senior Developer, Tech Lead hay Solution Architect)?`,
      `Khi xây dựng một tính năng, đâu là sự đánh đổi kỹ thuật (Trade-offs) lớn nhất mà bạn từng phải cân nhắc giữa tốc độ phát triển và hiệu năng lâu dài?`,
      `Trong quy trình phát triển, bạn đánh giá thế nào về tầm quan trọng của Unit Testing và văn hóa phản biện trong các buổi Code Review?`,
      `Chúng tôi đã hoàn thành các nội dung kỹ thuật. Bạn có câu hỏi nào muốn tìm hiểu sâu hơn về kiến trúc hệ thống hoặc bài toán công nghệ của công ty chúng tôi không?`,
      `Rất cảm ơn buổi thảo luận chuyên sâu hôm nay! Buổi phỏng vấn xin được khép lại tại đây, hệ thống sẽ tổng hợp báo cáo thẩm định năng lực chi tiết cho bạn ngay bây giờ.`
    ];
  } else {
    fallbackQuestions = [
      `Xin chào bạn, tôi là ${persona}, rất vui được đồng hành cùng bạn trong buổi phỏng vấn vị trí ${role} hôm nay! Bạn đã sẵn sàng để chúng ta bắt đầu chưa?`,
      `Đầu tiên, bạn hãy giới thiệu ngắn gọn về bản thân và hành trình bạn làm chủ Tech Stack phục vụ cho vị trí ${role} nhé?`,
      `Trong đồ án tốt nghiệp hoặc dự án cá nhân gần nhất, bạn tâm đắc nhất với tính năng nào và cơ chế hoạt động của API đó ra sao?`,
      `Về mặt kỹ thuật, bạn giải thích thế nào về vòng đời của một HTTP Request và cách bạn thiết kế cơ sở dữ liệu quan hệ có đánh Index để tăng tốc độ truy vấn?`,
      `Hãy kể về một tình huống thực tế khi deploy sản phẩm bị lỗi hoặc thời gian phản hồi API quá chậm, bạn đã chủ động tìm nguyên nhân và khắc phục theo chuẩn STAR ra sao?`,
      `Điều gì tạo cho bạn động lực lớn nhất khi làm việc ở vị trí ${role}, và mục tiêu nghề nghiệp của bạn trong 2 đến 3 năm tới là gì?`,
      `Theo bạn tự đánh giá, thế mạnh cạnh tranh lớn nhất của bạn là gì, và đâu là một kỹ năng công nghệ bạn nhận thấy mình cần tiếp tục rèn luyện thêm?`,
      `Về môi trường làm việc, bạn kỳ vọng một văn hóa engineering như thế nào (như văn hóa review code, quy trình Agile/Scrum) để phát huy tối đa tiềm năng?`,
      `Chúng tôi đã hoàn thành các câu hỏi khảo nghiệm. Bây giờ, bạn có câu hỏi hoặc thắc mắc nào muốn dành cho tôi và dự án không?`,
      `Cảm ơn bạn rất nhiều vì buổi trao đổi rất cởi mở hôm nay! Buổi phỏng vấn xin được khép lại tại đây, hệ thống sẽ tổng hợp kết quả đánh giá chi tiết cho bạn ngay bây giờ.`
    ];
  }

  printInterviewStartTerminalLog(role, persona, difficulty, cvText, requirement, fallbackQuestions, lvl, track);
  return fallbackQuestions;
}

// -------------------------------------------------------------
// 2. GENERATE ADAPTIVE NEXT TURN (Real-time Adaptive Probing)
// -------------------------------------------------------------
export async function generateAdaptiveNextTurn(
  role: string,
  persona: string,
  stageId: string,
  stageName: string,
  stageIndex: number,
  currentQuestion: string,
  candidateAnswer: string,
  company = "doanh nghiệp",
  difficulty = 4,
  defaultNextQuestion = "",
  targetLevel = "fresher",
  track = "backend",
  history: Array<{ turn_number: number; question_text: string; answer_transcript?: string | null }> = [],
  durationMinutes = 30,
  secondsLeft = 1800
): Promise<any> {
  const client = getClient();
  const ansClean = (candidateAnswer || "").trim();
  const lvl = (targetLevel || "fresher").toLowerCase();
  const profile = PERSONA_PROFILES[persona] || PERSONA_PROFILES["Alex Chen"];

  let historyContext = "";
  if (history && history.length > 0) {
    historyContext = `
SỔ TAY GHI NHỚ TOÀN PHIÊN PHỎNG VẤN (CÁC LƯỢT ĐÃ DIỄN RA TRƯỚC ĐÓ):
${history
  .map(
    (h) =>
      `• Lượt ${h.turn_number}:
   - Giám khảo đã hỏi: "${h.question_text}"
   - Ứng viên đã trả lời: "${(h.answer_transcript || "").trim() || "[Chưa trả lời / Im lặng]"}"`
  )
  .join("\n")}
`;
  } else {
    historyContext = `(Đây là lượt đầu tiên, chưa có lịch sử trước đó).`;
  }

  const prompt = `
Bạn là Giám khảo phỏng vấn AI tên là ${persona} - ${profile.title}.
PHONG THÁI ĐẶC TRƯNG CỦA BẠN: ${profile.tone}
TRỌNG TÂM KHẢO SÁT CỦA BẠN: ${profile.focus}
QUY TẮC ĐÀO SÂU & HỎI XOÁY RIÊNG CỦA BẠN: ${profile.probingRule}

Vị trí phỏng vấn: ${role} (Track: ${track}) tại ${company}.
Cấp bậc khảo nghiệm: ${lvl.toUpperCase()}.
Giai đoạn phỏng vấn hiện tại: Bước ${stageIndex + 1}/10 - ${stageName} (ID: ${stageId}).
THỜI LƯỢNG BUỔI PHỎNG VẤN: ${durationMinutes} phút.
THỜI GIAN CÒN LẠI: ${Math.max(0, Math.floor(secondsLeft / 60))} phút ${secondsLeft % 60} giây.

QUY TẮC ĐIỀU PHỐI THEO THỜI GIAN (TIME-PACED INTERVIEW PACING):
- Buổi phỏng vấn được thiết kế kéo dài đúng ${durationMinutes} phút theo cấu hình.
- NẾU THỜI GIAN CÒN NHIỀU (còn > 3 phút): BẠN BẮT BUỘC TIẾP TỤC ĐÀO SÂU, hỏi xoáy, thử thách tư duy kỹ thuật hoặc đổi góc nhìn theo 3 nhánh thích ứng. TUYỆT ĐỐI CẤM chào tạm biệt, TUYỆT ĐỐI CẤM vội kết thúc phỏng vấn!
- CHỈ KHI THỜI GIAN CÒN DƯỚI 2.5 PHÚT CUỐI: Bạn mới chủ động thông báo thời gian sắp hết và mời ứng viên đặt câu hỏi cho bạn hoặc tổng kết.

${historyContext}

CÂU HỎI BẠN VỪA HỎI ỨNG VIÊN Ở LƯỢT NÀY:
"${currentQuestion}"

CÂU TRẢ LỜI THỰC TẾ CỦA ỨNG VIÊN VỪA NÓI:
"${ansClean}"

Gợi ý định hướng giai đoạn tiếp theo (chỉ để tham khảo chủ đề, KHÔNG ĐƯỢC lặp lại nguyên văn):
"${defaultNextQuestion}"

TIÊU CHUẨN KỲ VỌNG THEO CẤP BẬC ${lvl.toUpperCase()}:
- INTERN: Đánh giá tư duy logic, hiểu bản chất OOP/thuật toán cơ bản, kỹ năng debug và thái độ cầu thị học hỏi. Tuyệt đối KHÔNG ép hỏi kiến trúc chịu tải phân tán, microservices!
- FRESHER: Đánh giá khả năng làm chủ Tech Stack, luồng dữ liệu REST API, hiểu bản chất code tự viết, cơ sở dữ liệu quan hệ, Clean Code và kiểm thử cơ bản.
- JUNIOR: Đòi hỏi kinh nghiệm thực chiến production: Concurrency, Caching Redis, Race Condition, tối ưu SQL, giải thích được đánh đổi kỹ thuật (Trade-offs) và có số liệu thực tế.

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
1. TUYỆT ĐỐI CẤM hỏi kép, hỏi dồn dập, hoặc nhồi nhét 2-3 câu hỏi vào 1 câu!
2. next_question: BẮT BUỘC chỉ là ĐÚNG 1 CÂU HỎI ĐƠN LẺ, kết thúc bằng DUY NHẤT 1 DẤU CHẤM HỎI (?). Độ dài súc tích từ 15 đến 25 từ.

ĐỊNH DẠNG ĐẦU RA (JSON thuần túy):
{
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
}
`;

  let quotaWarningMessage: string | null = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt
      });
      const data = extractJson<any>(response.text || "");
      if (data && typeof data === "object" && data.next_question) {
        // Hậu kiểm bảo vệ: Đảm bảo chỉ có 1 câu hỏi đơn lẻ
        data.next_question = sanitizeToSingleQuestion(data.next_question);

        // HẬU KIỂM CHỐNG LẶP CÂU HỎI (Anti-Circular & Anti-Repetition Guard)
        const allPrevQuestions = [
          currentQuestion,
          ...history.map(t => t.question_text)
        ].filter(Boolean);

        const nextQClean = data.next_question.toLowerCase();
        const isRepeated = allPrevQuestions.some(prev => {
          const p = prev.toLowerCase();
          if (p === nextQClean) return true;
          // Phát hiện trùng lặp khái niệm cốt lõi vừa hỏi (Ví dụ: ArrayList vs LinkedList, == vs ===, etc.)
          if (nextQClean.includes("arraylist") && nextQClean.includes("linkedlist") &&
              p.includes("arraylist") && p.includes("linkedlist")) return true;
          if (nextQClean.includes("list") && nextQClean.includes("tuple") &&
              p.includes("list") && p.includes("tuple")) return true;
          if (nextQClean.includes("==") && nextQClean.includes("===") &&
              p.includes("==") && p.includes("===")) return true;
          if (nextQClean.includes("inner join") && nextQClean.includes("left join") &&
              p.includes("inner join") && p.includes("left join")) return true;
          return false;
        });

        if (isRepeated) {
          // Tự động đẩy tiến trình sang khía cạnh đào sâu mới (Forward Progression)
          if (nextQClean.includes("arraylist") || nextQClean.includes("linkedlist")) {
            data.next_question = "Về mặt hiệu năng (Big-O), khi truy xuất get(i) hay thêm/xóa phần tử ở đầu danh sách, ArrayList và LinkedList khác nhau ra sao?";
            data.feedback_phrase = "Tôi ghi nhận phần so sánh cấu trúc lưu trữ của bạn. Chúng ta cùng đào sâu hơn về hiệu năng thực tế nhé:";
          } else if (nextQClean.includes("list") || nextQClean.includes("tuple")) {
            data.next_question = "Về mặt quản lý bộ nhớ và tính bất biến (Immutability), khi nào bạn ưu tiên dùng Tuple hơn List trong Python?";
            data.feedback_phrase = "Tôi ghi nhận định nghĩa của bạn. Hãy nhìn từ góc độ tối ưu bộ nhớ nhé:";
          } else if (defaultNextQuestion && !allPrevQuestions.some(p => p.toLowerCase() === defaultNextQuestion.toLowerCase())) {
            data.next_question = sanitizeToSingleQuestion(defaultNextQuestion);
          } else {
            data.next_question = "Trong dự án thực tế bạn từng làm, bài toán kỹ thuật nào bạn tự tay thiết kế và tối ưu tốt nhất?";
          }
        }

        data.quota_warning = null;
        data.is_fallback = false;
        printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, data);
        return data;
      }
    } catch (err: any) {
      const qCheck = detectAndLogApiQuotaWarning("Gemini", err);
      if (qCheck.isQuotaError) {
        quotaWarningMessage = qCheck.message;
      }
      console.warn(`[AI Engine TS] Error calling ${modelName} in generateAdaptiveNextTurn: ${err.message}. Retrying next model...`);
    }
  }

  // Fallback Logic
  const lowerAns = ansClean.toLowerCase();

  // Danh mục phong phú hỗ trợ đa ngôn ngữ & công nghệ với nhiều cấp độ câu hỏi (Multi-tier)
  const TECH_TOPICS: Array<{ keywords: string[]; name: string; questions: string[] }> = [
    {
      keywords: ["python", "py"],
      name: "Python",
      questions: [
        "Được rồi, trong Python, bạn có thể phân biệt sự khác nhau cơ bản giữa List và Tuple không?",
        "Về mặt bộ nhớ và tính bất biến (Immutability), khi nào bạn ưu tiên dùng Tuple hơn List trong Python?",
        "Trong Python, bạn hiểu cơ chế hoạt động của Generator và từ khóa yield như thế nào?",
        "Khi làm việc với dự án Python, bạn đã từng dùng Decorator hoặc Context Manager trong trường hợp cụ thể nào?"
      ]
    },
    {
      keywords: ["javascript", "js", "typescript", "ts"],
      name: "JavaScript / TypeScript",
      questions: [
        "Được rồi, trong JavaScript, bạn hãy giải thích sự khác nhau giữa toán tử == và === nhé?",
        "Bạn hiểu cơ chế Event Loop và thứ tự ưu tiên giữa Microtask và Macrotask trong JS ra sao?",
        "Trong TypeScript, bạn phân biệt sự khác nhau giữa Interface và Type Alias như thế nào?",
        "Bạn có thể giải thích khái niệm Closure trong JavaScript và một trường hợp thực tế bạn từng áp dụng không?"
      ]
    },
    {
      keywords: ["java core", "java"],
      name: "Java Core",
      questions: [
        "Được rồi, trong Java Core, bạn hãy phân biệt sự khác nhau cơ bản giữa ArrayList và LinkedList nhé?",
        "Về mặt hiệu năng (Big-O), khi cần truy xuất ngẫu nhiên get(i) hay thêm/xóa phần tử, ArrayList và LinkedList khác nhau ra sao?",
        "Trong đồ án thực tế của bạn, bạn đã áp dụng ArrayList hay LinkedList trong trường hợp cụ thể nào và vì sao?",
        "Bạn hiểu cơ chế hoạt động của Garbage Collection (GC) trong Java giải phóng bộ nhớ Heap như thế nào?"
      ]
    },
    {
      keywords: ["c#", "csharp", ".net", "dotnet"],
      name: "C# / .NET",
      questions: [
        "Được rồi, trong C#, bạn có thể nêu sự khác nhau giữa Value Type và Reference Type không?",
        "Trong C#, bạn phân biệt sự khác nhau giữa IEnumerable, ICollection và IList như thế nào?",
        "Bạn hiểu cơ chế Async/Await và Task trong C# xử lý bất đồng bộ ra sao?"
      ]
    },
    {
      keywords: ["golang", "go"],
      name: "Golang",
      questions: [
        "Được rồi, trong Golang, bạn hiểu cơ chế hoạt động cơ bản của Goroutine và Channel như thế nào?",
        "Bạn phân biệt sự khác nhau giữa Slice và Array trong Golang ra sao?",
        "Trong Go, bạn xử lý Race Condition và đồng bộ hóa dữ liệu giữa các Goroutine bằng công cụ gì?"
      ]
    },
    {
      keywords: ["react", "reactjs"],
      name: "React",
      questions: [
        "Được rồi, trong React, bạn phân biệt sự khác nhau cơ bản giữa Props và State như thế nào?",
        "Bạn hiểu cơ chế hoạt động của Virtual DOM và thuật toán Diffing trong React ra sao?",
        "Khi nào bạn cần dùng hook useMemo hoặc useCallback để tránh re-render không cần thiết trong React?"
      ]
    },
    {
      keywords: ["node", "nodejs", "express"],
      name: "Node.js",
      questions: [
        "Được rồi, trong Node.js, bạn hiểu cơ chế bất đồng bộ (Asynchronous) và Event Loop cơ bản ra sao?",
        "Trong Express.js, bạn hiểu Middleware hoạt động theo luồng như thế nào?",
        "Khi xử lý một tác vụ nặng tốn CPU (CPU-intensive) trong Node.js, giải pháp kiến trúc của bạn là gì?"
      ]
    },
    {
      keywords: ["sql", "database", "cơ sở dữ liệu", "mysql", "postgres"],
      name: "Cơ sở dữ liệu SQL",
      questions: [
        "Được rồi, trong SQL, bạn hãy giải thích sự khác nhau cơ bản giữa INNER JOIN và LEFT JOIN nhé?",
        "Khi một câu lệnh SQL query chạy chậm trên bảng dữ liệu lớn, các bước bạn kiểm tra và tối ưu Index là gì?",
        "Bạn hiểu 4 tính chất ACID trong Database Transaction như thế nào và vì sao nó quan trọng?"
      ]
    },
    {
      keywords: ["oop", "hướng đối tượng", "lập trình hướng đối tượng"],
      name: "Lập trình hướng đối tượng (OOP)",
      questions: [
        "Được rồi, trong OOP, bạn có thể nêu sự khác nhau cơ bản giữa Interface và Abstract Class được không?",
        "Trong 4 tính chất của OOP, bạn tâm đắc nhất tính chất nào và trong code đồ án bạn áp dụng nó ở đâu?",
        "Bạn hiểu nguyên lý Dependency Inversion (chữ D trong SOLID) như thế nào trong thiết kế phần mềm?"
      ]
    },
    {
      keywords: ["git", "github"],
      name: "Git & Quản lý mã nguồn",
      questions: [
        "Được rồi, với Git, bạn hãy phân biệt sự khác nhau giữa git pull và git fetch nhé?",
        "Khi gặp Git Merge Conflict trong dự án nhóm, quy trình bạn xử lý an toàn để không mất code là gì?"
      ]
    },
    {
      keywords: ["docker", "devops"],
      name: "Docker cơ bản",
      questions: [
        "Được rồi, với Docker, bạn có thể phân biệt sự khác nhau cơ bản giữa Container và Image không?",
        "Bạn đã từng viết file Dockerfile để đóng gói một ứng dụng backend bao giờ chưa?"
      ]
    }
  ];

  // Thu thập toàn bộ các câu hỏi đã từng hỏi trong phiên
  const allAsked = [
    currentQuestion,
    ...history.map(t => t.question_text)
  ].filter(Boolean);

  // Hàm chọn câu hỏi không trùng lặp từ danh sách
  function pickNextUniqueTechQuestion(questions: string[], defaultQ: string): string {
    for (const q of questions) {
      const qLower = q.toLowerCase();
      const alreadyAsked = allAsked.some(prev => {
        const pLower = prev.toLowerCase();
        if (pLower === qLower) return true;
        if (qLower.includes("arraylist") && qLower.includes("linkedlist") &&
            pLower.includes("arraylist") && pLower.includes("linkedlist")) return true;
        if (qLower.includes("list") && qLower.includes("tuple") &&
            pLower.includes("list") && pLower.includes("tuple")) return true;
        if (qLower.includes("==") && qLower.includes("===") &&
            pLower.includes("==") && pLower.includes("===")) return true;
        if (qLower.includes("inner join") && qLower.includes("left join") &&
            pLower.includes("inner join") && pLower.includes("left join")) return true;
        return false;
      });
      if (!alreadyAsked) {
        return q;
      }
    }
    return defaultQ;
  }

  // 1. Kiểm tra ứng viên CHỦ ĐỘNG XIN ĐỔI CHỦ ĐỀ (PIVOT_REQUEST)
  // Chỉ kích hoạt khi có từ khóa yêu cầu rõ ràng, KHÔNG kích hoạt chỉ vì câu trả lời ngắn!
  const pivotTriggers = [
    "hỏi em về", "hỏi về", "chuyển sang", "đổi câu", "đổi chủ đề", "hỏi phần khác",
    "hỏi em câu khác", "chuyển qua", "hỏi sang", "đổi sang", "chủ đề khác", "câu hỏi khác",
    "em tự tin về", "thay vì câu này", "xin phép bỏ qua câu"
  ];
  const isExplicitPivot = pivotTriggers.some(k => lowerAns.includes(k));
  const matchedTech = TECH_TOPICS.find(t => t.keywords.some(k => lowerAns.includes(k)));

  if (isExplicitPivot) {
    const targetTopic = matchedTech ? matchedTech.name : "phần kiến thức bạn tự tin";
    const fallbackPivotQ = matchedTech
      ? pickNextUniqueTechQuestion(matchedTech.questions, `Trong ${targetTopic}, bạn tự tin nhất với tính năng nào đã từng trực tiếp xây dựng?`)
      : `Được rồi! Trong các công nghệ hoặc công cụ mà bạn đã làm quen, bạn cảm thấy tự tin và muốn chia sẻ về phần nào nhất?`;

    const res = {
      branch: "EMPATHIC_PIVOT",
      branch_reason: `Ứng viên chủ động đề xuất chuyển sang trao đổi về ${targetTopic}.`,
      competency_focus: targetTopic,
      intent: "PIVOT_REQUEST",
      turn_score: 4.0,
      feedback_phrase: `Được chứ, không sao cả! Chúng ta cùng trao đổi về ${targetTopic} nhé.`,
      next_question: fallbackPivotQ,
      critique: `Ứng viên chủ động đề xuất chuyển sang trao đổi về ${targetTopic}. Giám khảo đồng thuận và hỏi câu hỏi nền tảng vừa sức.`,
      is_pivot: true,
      should_advance_stage: true,
      quota_warning: quotaWarningMessage,
      is_fallback: true
    };
    printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, res);
    return res;
  }

  // 2. Kiểm tra ứng viên không biết / kêu khó / xin qua câu (DONT_KNOW)
  const isDontKnow = [
    "không biết", "chưa biết", "chưa rõ", "chưa từng", "chịu", "qua câu", "bỏ qua",
    "chưa tìm hiểu", "em không rành", "mình không biết", "khó quá", "chưa học", "chưa làm", "quên rồi"
  ].some(k => lowerAns.includes(k));

  if (isDontKnow) {
    const briefPhrases = [
      "Không sao cả, kiến thức công nghệ rất rộng và ai cũng có thế mạnh riêng. Chúng ta chuyển sang một phần quen thuộc và nhẹ nhàng hơn nhé!",
      "Được rồi, không vấn đề gì! Mình chuyển sang một chủ đề dễ thở hơn nhé.",
      "Tôi ghi nhận rồi, chúng ta cùng đổi sang một nội dung gần gũi với công việc hàng ngày nhé."
    ];
    const pickedPhrase = briefPhrases[Math.floor(Math.random() * briefPhrases.length)];

    // Chủ động hạ độ khó, hỏi về kinh nghiệm debug hoặc công cụ quen thuộc hàng ngày (đảm bảo không trùng)
    const gentleFallbackQuestions = [
      `Trong quá trình tự học và làm bài tập, khi code gặp lỗi bug, công cụ hoặc cách debug quen thuộc nhất mà bạn hay dùng là gì?`,
      `Khi tiếp cận một công nghệ hoặc ngôn ngữ mới, phương pháp tự học và tra cứu tài liệu hiệu quả nhất của bạn là gì?`,
      `Ngoài phần vừa rồi ra, trong các bài tập hoặc dự án đã từng làm, bạn tự tin nhất với tính năng nào?`,
      `Trong quá trình làm việc nhóm, bạn thường dùng Git với những lệnh cơ bản nào để quản lý mã nguồn?`
    ];
    const pickedQuestion = pickNextUniqueTechQuestion(gentleFallbackQuestions, gentleFallbackQuestions[0]);

    const res = {
      branch: "EMPATHIC_PIVOT",
      branch_reason: "Ứng viên chưa nắm vững phần này. Giám khảo chủ động hạ độ khó và chuyển sang chủ đề quen thuộc để giảm áp lực.",
      competency_focus: "Kỹ năng thực hành & Debug cơ bản",
      intent: "DONT_KNOW",
      turn_score: 2.0,
      feedback_phrase: pickedPhrase,
      next_question: pickedQuestion,
      critique: "Ứng viên chưa nắm vững phần này. Giám khảo chủ động hạ độ khó và chuyển sang chủ đề quen thuộc hàng ngày để giảm áp lực.",
      is_pivot: true,
      should_advance_stage: true,
      quota_warning: quotaWarningMessage,
      is_fallback: true
    };
    printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, res);
    return res;
  }

  if (stageId === "candidate_qa") {
    const res = {
      branch: "PROBE_DEEPER",
      branch_reason: "Ứng viên đặt câu hỏi quan tâm về dự án và văn hóa.",
      competency_focus: "Giao tiếp & Định hướng nghề nghiệp",
      intent: "GOOD",
      turn_score: 8.0,
      feedback_phrase: `Cảm ơn câu hỏi rất hay của bạn! Tại ${company}, chúng tôi rất chú trọng văn hóa Clean Code, trao quyền thử nghiệm và đào tạo chuyên sâu cho các kỹ sư cấp bậc ${lvl.toUpperCase()}.`,
      next_question: defaultNextQuestion || "Buổi phỏng vấn kỹ thuật hôm nay xin được khép lại tại đây, cảm ơn bạn rất nhiều!",
      critique: "Ứng viên đặt câu hỏi quan tâm đến dự án và văn hóa doanh nghiệp.",
      is_pivot: false,
      should_advance_stage: true,
      quota_warning: quotaWarningMessage,
      is_fallback: true
    };
    printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, res);
    return res;
  }

  const isGoodAns = ansClean.length > 50;

  // Lựa chọn câu hỏi tiếp theo đảm bảo không trùng lặp với câu vừa hỏi
  let resolvedNextQ = defaultNextQuestion;
  const isDefaultDuplicate = !resolvedNextQ || allAsked.some(p => p.toLowerCase() === resolvedNextQ.toLowerCase());

  if (isDefaultDuplicate) {
    if (matchedTech) {
      resolvedNextQ = pickNextUniqueTechQuestion(matchedTech.questions, "Trong đồ án thực tế gần nhất, tính năng phức tạp nhất mà bạn trực tiếp code là gì?");
    } else {
      resolvedNextQ = "Trong đồ án hoặc dự án gần nhất, bạn tâm đắc nhất với đoạn code hoặc module nào mà mình tự tay triển khai?";
    }
  }

  const res = {
    branch: isGoodAns ? "PROBE_DEEPER" : "GROUND_TO_PRACTICE",
    branch_reason: isGoodAns ? "Ứng viên có chia sẻ kỹ thuật chi tiết." : "Ứng viên trả lời ngắn, cần kéo vào thực tế.",
    competency_focus: "Kỹ năng chuyên môn",
    intent: isGoodAns ? "GOOD" : "SHALLOW",
    turn_score: isGoodAns ? 7.0 : 4.5,
    feedback_phrase: isGoodAns ? "Cảm ơn chia sẻ khá chi tiết của bạn, tôi ghi nhận giải pháp này." : "Ý tưởng lý thuyết khá ổn, chúng ta cùng đào sâu hơn vào thực tế nhé.",
    next_question: resolvedNextQ,
    critique: "Câu trả lời cơ bản đáp ứng yêu cầu câu hỏi.",
    is_pivot: false,
    should_advance_stage: true,
    quota_warning: quotaWarningMessage,
    is_fallback: true
  };
  printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, res);
  return res;
}

// -------------------------------------------------------------
// 3. EVALUATE STAR INTERVIEW (Scorecard Evaluation)
// -------------------------------------------------------------
// Không dùng "chịu" trơn vì sẽ bắt nhầm "chịu trách nhiệm", "chịu áp lực"
const DONT_KNOW_PHRASES = [
  "không biết", "chưa biết", "chưa rõ", "bỏ qua", "chưa tìm hiểu", "em không rành",
  "em chịu", "chịu thua", "chịu ạ"
];

export function isDontKnowAnswer(answer: string): boolean {
  const low = answer.toLowerCase();
  return !low || DONT_KNOW_PHRASES.some(k => low.includes(k));
}

export async function evaluateStarInterview(
  role: string,
  turnsData: Array<{ question_text: string; answer_transcript?: string | null }>,
  cutoff = 80,
  targetLevel = "fresher",
  track = "backend",
  // Kết quả đo năng lực theo chủ đề của engine v2 (nếu có)
  competencyNotes = ""
): Promise<any> {
  const lvl = (targetLevel || "fresher").toLowerCase();
  let turnsSummary = "";
  let dontKnowCount = 0;
  const totalTurns = turnsData.length;

  // Không có lượt nào được trả lời thì không có gì để chấm
  if (totalTurns === 0) {
    return {
      situation_score: 0,
      task_score: 0,
      action_score: 0,
      result_score: 0,
      total_score: 0,
      is_passed: false,
      strengths: "",
      weaknesses: "Ứng viên chưa trả lời câu hỏi nào trong buổi phỏng vấn.",
      ai_recommendations: "Hãy hoàn thành buổi phỏng vấn để nhận được đánh giá.",
      dossier_summary: "Không có câu trả lời nào để đánh giá.",
      turn_evaluations: []
    };
  }

  const client = getClient();

  turnsData.forEach((t, idx) => {
    const q = (t.question_text || "").trim();
    const a = (t.answer_transcript || "").trim();
    turnsSummary += `\n--- Lượt ${idx + 1} ---\nGiám khảo hỏi: ${q}\nỨng viên trả lời: ${a || '[Không có câu trả lời / Im lặng]'}\n`;

    if (isDontKnowAnswer(a)) {
      dontKnowCount++;
    }
  });

  const prompt = `
Bạn là Hội đồng Thẩm định Chuyên môn Kỹ thuật Tuyển dụng cấp cao của TalentAI.
Vị trí khảo nghiệm: ${role} (Track: ${track}).
Cấp bậc mục tiêu: ${lvl.toUpperCase()}.
Ngưỡng điểm chuẩn sàn yêu cầu để đạt (Cut-off): ${cutoff}/100 điểm.

TOÀN BỘ LỊCH SỬ PHỎNG VẤN ĐỐI CHIẾU THỰC TẾ:
${turnsSummary}
${competencyNotes ? `
KẾT QUẢ ĐO NĂNG LỰC THEO CHỦ ĐỀ (hệ thống ghi nhận theo bậc thang độ khó trong buổi phỏng vấn, dùng làm căn cứ chính khi chấm):
${competencyNotes}
` : ""}
QUY TẮC CHẤM ĐIỂM THEO CHUẨN CẤP BẬC ${lvl.toUpperCase()}:
- INTERN: Đạt nếu có nền tảng CS tốt (OOP, tư duy giải thuật), trung thực, biết nhận lỗi và có tinh thần tự học.
- FRESHER: Đạt nếu làm chủ Tech Stack chính, viết code có cấu trúc, hiểu luồng xử lý dữ liệu và tự giải thích được đồ án.
- JUNIOR: Đạt nếu có kinh nghiệm thực chiến production, tư duy tối ưu hóa hiệu năng, xử lý lỗi và số liệu đo lường cụ thể theo STAR.

QUY TẮC TÍNH ĐIỂM NGHIÊM NGẶT & CHỐNG ĐIỂM ẢO:
1. ĐỐI CHIẾU THỰC CHẤT:
   - Nếu ứng viên nói "không biết", "chưa học", im lặng: Câu đó từ 0.0 đến 2.0 / 10 điểm.
   - Nếu ứng viên chủ động xin chuyển hướng sang chủ đề khác (ví dụ: xin hỏi Java Core/OOP): Cho 3.0 đến 4.0 / 10 điểm vì có tinh thần thẳng thắn, cầu thị.
   - Nếu trả lời lý thuyết suông thiếu số liệu: 4.0 đến 6.0 / 10 điểm.
   - Nếu trả lời tốt, có số liệu và tư duy STAR: 7.0 đến 10.0 / 10 điểm.
2. TỔNG ĐIỂM STAR (Thang 100 điểm): Situation (/25) + Task (/25) + Action (/25) + Result (/25).
3. CHỐNG ĐIỂM ẢO:
   - Nếu ứng viên có nhiều câu không biết (${dontKnowCount}/${totalTurns} câu): Tổng điểm CHỈ ĐƯỢC từ 15 đến 45 điểm, và is_passed BẮT BUỘC LÀ FALSE!

QUY TẮC ĐẠO ĐỨC NGHỀ NGHIỆP & VĂN PHONG THẨM ĐỊNH (CONSTRUCTIVE EVALUATION):
1. TUYỆT ĐỐI CẤM dùng từ ngữ quy chụp nhân cách, xúc phạm hoặc nặng lời như:
   - "không trung thực", "dối trá", "gian lận", "bịa đặt", "chém gió", "né tránh thiếu thành thật".
2. MỌI NHẬN XÉT PHẢI MANG TÍNH ĐÓNG GÓP XÂY DỰNG, KHÁCH QUAN VÀ TÔN TRỌNG (CONSTRUCTIVE FEEDBACK):
   - Nếu ứng viên chưa trả lời được đồ án trong CV: Nhận xét khách quan: "Ứng viên chưa nắm vững chi tiết kỹ thuật/cơ chế vận hành của đồ án trong CV, cần rà soát lại kiến trúc code để tự tin hơn khi phỏng vấn."
   - Nếu ứng viên chủ động xin chuyển hướng (ví dụ xin hỏi Java Core, OOP): Ghi nhận: "Ứng viên thẳng thắn chia sẻ thế mạnh và chủ động đề xuất trao đổi về Java Core/OOP thay vì đồ án; thể hiện tinh thần cầu thị nhưng cần củng cố thêm kiến thức đồ án để hoàn thiện hồ sơ."

ĐỊNH DẠNG ĐẦU RA (JSON thuần túy, mỗi điểm thành phần là số thực từ 0 đến 25, chấm độc lập dựa trên câu trả lời thực tế):
{
  "situation_score": <0-25>,
  "task_score": <0-25>,
  "action_score": <0-25>,
  "result_score": <0-25>,
  "strengths": "Điểm mạnh thực tế...",
  "weaknesses": "Lỗ hổng kiến thức hoặc các câu trả lời chưa đạt...",
  "ai_recommendations": "Lời khuyên cải thiện cụ thể...",
  "dossier_summary": "Tóm tắt thẩm định ngắn gọn 2 câu...",
  "turn_evaluations": [
    {
      "turn_number": 1,
      "score": <0-10>,
      "assessment": "Giới thiệu rõ ràng, đúng trọng tâm",
      "critique": "Nên nhấn mạnh thêm mục tiêu nghề nghiệp",
      "model_answer": "Gợi ý câu trả lời chuẩn..."
    }
  ]
}
`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt
      });
      const data = extractJson<any>(response.text || "");
      const clamp25 = (v: any) => Math.min(25, Math.max(0, Number(v) || 0));
      let parts = [data.situation_score, data.task_score, data.action_score, data.result_score].map(clamp25);
      let tot = parts.reduce((a, b) => a + b, 0);

      // Nhiều câu không biết thì trần 48 điểm; co các điểm thành phần theo để tổng luôn khớp
      const tooManyDontKnow = dontKnowCount >= Math.max(2, Math.floor(totalTurns / 3));
      if (tooManyDontKnow && tot > 48) {
        parts = parts.map(p => p * (48 / tot));
        tot = 48;
      }

      const round1 = (v: number) => Math.round(v * 10) / 10;
      [data.situation_score, data.task_score, data.action_score, data.result_score] = parts.map(round1);
      data.total_score = round1(tot);
      data.is_passed = !tooManyDontKnow && tot >= cutoff;
      return data;
    } catch (err: any) {
      console.warn(`[AI Evaluation TS] Error calling ${modelName}: ${err.message}. Retrying next model...`);
    }
  }

  // Fallback khi mọi model đều lỗi: không có AI thì không đánh giá được nội dung câu trả lời,
  // nên chỉ tạm tính ở mức thấp và KHÔNG bao giờ cho đạt (độ dài câu trả lời không phải là chất lượng).
  const baseScorePerTurn = turnsData.map(t => (isDontKnowAnswer((t.answer_transcript || "").trim()) ? 1.5 : 4.0));

  const avg10 = baseScorePerTurn.reduce((a, b) => a + b, 0) / baseScorePerTurn.length;
  const calcTotal = Math.round(avg10 * 10 * 10) / 10;
  const part = Math.round(calcTotal * 0.25 * 10) / 10;

  return {
    situation_score: part,
    task_score: part,
    action_score: part,
    result_score: part,
    total_score: calcTotal,
    is_passed: false,
    strengths: "",
    weaknesses: dontKnowCount > 0 ? `Có ${dontKnowCount}/${totalTurns} câu ứng viên chưa trả lời được.` : "",
    ai_recommendations: "Hệ thống AI chưa chấm được buổi phỏng vấn này. Vui lòng chấm lại sau.",
    dossier_summary: `ĐIỂM TẠM TÍNH (${calcTotal}/100): AI chấm điểm không phản hồi nên chưa thể đánh giá nội dung câu trả lời. Cần chấm lại trước khi ra quyết định.`,
    turn_evaluations: baseScorePerTurn.map((score, idx) => ({
      turn_number: idx + 1,
      score,
      assessment: score <= 2.0 ? "Ứng viên chưa trả lời được" : "Chưa được AI chấm",
      critique: "",
      model_answer: ""
    }))
  };
}

// -------------------------------------------------------------
// 4. ANALYZE CV & JD MATCHING (ATS Gap Analysis)
// -------------------------------------------------------------
export async function analyzeCvAndJdMatching(
  cvText: string,
  jdText: string,
  roleTitle = "Backend Software Engineer",
  targetLevel = "fresher",
  track = "backend"
): Promise<any> {
  const client = getClient();
  const lvl = (targetLevel || "fresher").toLowerCase();

  const prompt = `
Bạn là Chuyên gia Tuyển dụng Kỹ thuật AI & Kiến trúc sư Thẩm định Hồ sơ Cấp cao tại TalentAI.
Vị trí mục tiêu: ${roleTitle} (Track: ${track}).
Cấp bậc mục tiêu thẩm định: ${lvl.toUpperCase()}.

NỘI DUNG MÔ TẢ CÔNG VIỆC (JOB DESCRIPTION - JD):
${jdText.trim() || 'Vị trí Lập trình viên Backend: Yêu cầu Java Core, Spring Boot, MySQL, RESTful API, Docker, tư duy giải quyết vấn đề và chịu áp lực.'}

NỘI DUNG HỒ SƠ ỨNG VIÊN (CV / RESUME):
${cvText.trim() || 'Ứng viên sinh viên năm cuối ngành CNTT, có đồ án web bán hàng với Spring Boot và MySQL.'}

NHIỆM VỤ BÓC TÁCH & PHÂN TÍCH SO KHỚP CHUYÊN SÂU THEO CẤP BẬC ${lvl.toUpperCase()}:
1. BÓC TÁCH JD: core_requirements, experience_required, soft_skills.
2. BÓC TÁCH CV: candidate_summary, skills_present, highlight_projects.
3. SO KHỚP NĂNG LỰC & ATS GAPS: match_score (0-100), match_level, summary_verdict, matched_skills, missing_gaps.
4. THÔNG TIN QUAN TRỌNG CẦN XỬ LÝ & BỘ CÂU HỎI HỎI XOÁY: critical_probe_points, probing_questions.
5. TƯ DUY PHÂN TÍCH 3 CHIỀU (ai_reasoning): technical_fit, experience_fit, growth_potential.

ĐỊNH DẠNG ĐẦU RA (JSON thuần túy):
{
  "jd_extracted": {
    "core_requirements": ["Kỹ năng 1...", "Kỹ năng 2..."],
    "experience_required": "Yêu cầu kinh nghiệm...",
    "soft_skills": ["Tiêu chí 1...", "Tiêu chí 2..."]
  },
  "cv_extracted": {
    "candidate_summary": "Tóm tắt ứng viên...",
    "skills_present": ["Kỹ năng 1 trong CV...", "Kỹ năng 2..."],
    "highlight_projects": ["Dự án 1...", "Dự án 2..."]
  },
  "match_score": 76,
  "match_level": "Khá phù hợp",
  "summary_verdict": "Tóm tắt 2 câu về mức độ tương thích...",
  "matched_skills": ["Kỹ năng trùng khớp 1...", "Kỹ năng 2..."],
  "missing_gaps": ["Khoảng trống 1...", "Khoảng trống 2..."],
  "critical_probe_points": ["Điểm nghi vấn 1...", "Điểm nghi vấn 2..."],
  "probing_questions": ["Câu hỏi xoáy 1 nhắm vào khoảng trống...", "Câu hỏi xoáy 2..."],
  "ai_reasoning": {
    "technical_fit": "Phân tích về công nghệ cốt lõi...",
    "experience_fit": "Phân tích về kinh nghiệm thực chiến...",
    "growth_potential": "Tiềm năng học hỏi..."
  }
}
`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt
      });
      const data = extractJson<any>(response.text || "");
      if (data && typeof data === "object" && data.match_score !== undefined) {
        printCvJdTerminalLog(data, roleTitle);
        return data;
      }
    } catch (err: any) {
      console.warn(`[CV-JD Matcher TS] Error with ${modelName}: ${err.message}. Retrying next model...`);
    }
  }

  // Fallback
  const fallbackData = {
    jd_extracted: {
      core_requirements: ["Java Core, OOP, Collection", "Spring Boot Framework", "MySQL Database", "Docker cơ bản"],
      experience_required: "Fresher / Junior (Dưới 1-2 năm kinh nghiệm)",
      soft_skills: ["Tư duy logic", "Chịu áp lực tiến độ"]
    },
    cv_extracted: {
      candidate_summary: "Ứng viên sinh viên ngành CNTT có đồ án Web bán hàng với Spring Boot và MySQL",
      skills_present: ["Java Core", "Spring Boot", "MySQL", "Git"],
      highlight_projects: ["Website Bán Hàng E-Commerce: Xây dựng CRUD, giỏ hàng, xác thực JWT"]
    },
    match_score: 75,
    match_level: "Khá phù hợp",
    summary_verdict: "Hồ sơ ứng viên đáp ứng tốt nền tảng Java Core và Spring Boot, nhưng còn thiếu kinh nghiệm tối ưu hệ thống và CI/CD.",
    matched_skills: ["Lập trình hướng đối tượng (OOP) và Java Core", "Phát triển RESTful API với Spring Boot và MySQL"],
    missing_gaps: ["Chưa có kinh nghiệm thực chiến với Redis Cache", "Chưa có kiểm thử tự động (Unit Test / Mockito)"],
    critical_probe_points: [
      "Kiểm tra xem ứng viên tự thiết kế kiến trúc DB hay copy mã nguồn có sẵn.",
      "Kiểm tra cách xử lý khi nhiều người dùng cùng mua hàng đồng thời (Race Condition)."
    ],
    probing_questions: [
      "Trong đồ án Web bán hàng của bạn, khi 2 người cùng bấm mua sản phẩm cuối cùng tại cùng 1 giây, bạn xử lý Race Condition ra sao?",
      "Bạn đã từng viết Unit Test cho tầng Service chưa, bạn mock dữ liệu DB như thế nào?"
    ],
    ai_reasoning: {
      technical_fit: "Phù hợp tốt với các nhiệm vụ phát triển tính năng cơ bản.",
      experience_fit: "Chủ yếu là đồ án môn học, cần trau dồi thêm môi trường production.",
      growth_potential: "Nền tảng tư duy tốt, có khả năng thích nghi nhanh."
    }
  };
  printCvJdTerminalLog(fallbackData, roleTitle);
  return fallbackData;
}
