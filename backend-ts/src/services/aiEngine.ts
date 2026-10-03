import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite"
];

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
    console.log("\n" + sep);
    console.log(`🎤 [TALENTAI TS LIVE TURN] GIAI ĐOẠN ${stageIndex + 1}/10: ${stageName.toUpperCase()}`);
    console.log(`❓ Câu hỏi vừa hỏi: "${currentQuestion}"`);
    console.log(`🗣️ Câu trả lời ứng viên: "${candidateAnswer}"`);
    console.log("🧠 Phân tích AI:");
    console.log(`   • Ý định: ${data.intent} | Điểm lượt này: ${data.turn_score}/10 ${data.is_pivot ? "[PIVOT/CHUYỂN HƯỚNG]" : ""}`);
    console.log(`   • Phản hồi: "${data.feedback_phrase}"`);
    console.log(`   • Câu hỏi tiếp theo: "${data.next_question}"`);
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

  const prompt = `
Bạn là ${persona}, Giám khảo phỏng vấn kỹ thuật cấp cao tại TalentAI (Cấp độ hỏi thực chiến IT ${difficulty}/5).
Buổi phỏng vấn kỹ thuật dự kiến kéo dài ${durationMinutes} phút cho vị trí: ${role} (Track: ${track}).
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
  track = "backend"
): Promise<any> {
  const client = getClient();
  const ansClean = (candidateAnswer || "").trim();
  const lvl = (targetLevel || "fresher").toLowerCase();

  const prompt = `
Bạn là Giám khảo phỏng vấn kỹ thuật AI tên là ${persona} (Phong cách kỹ sư cao cấp, thực chiến, cuốn hút, tâm lý, độ khó ${difficulty}/5).
Vị trí phỏng vấn: ${role} (Track: ${track}) tại ${company}.
Cấp bậc khảo nghiệm: ${lvl.toUpperCase()}.
Giai đoạn phỏng vấn hiện tại: Bước ${stageIndex + 1}/10 - ${stageName} (ID: ${stageId}).
Câu hỏi bạn vừa hỏi ứng viên:
"${currentQuestion}"

Câu trả lời thực tế của ứng viên:
"${ansClean}"

Gợi ý định hướng giai đoạn tiếp theo (chỉ để tham khảo chủ đề, KHÔNG ĐƯỢC lặp lại nguyên văn):
"${defaultNextQuestion}"

TIÊU CHUẨN KỲ VỌNG THEO CẤP BẬC ${lvl.toUpperCase()}:
- INTERN: Đánh giá tư duy logic, hiểu bản chất OOP/thuật toán cơ bản, kỹ năng debug và thái độ cầu thị học hỏi. Tuyệt đối KHÔNG ép hỏi kiến trúc chịu tải phân tán, microservices!
- FRESHER: Đánh giá khả năng làm chủ Tech Stack, luồng dữ liệu REST API, hiểu bản chất code tự viết, cơ sở dữ liệu quan hệ, Clean Code và kiểm thử cơ bản.
- JUNIOR: Đòi hỏi kinh nghiệm thực chiến production: Concurrency, Caching Redis, Race Condition, tối ưu SQL, giải thích được đánh đổi kỹ thuật (Trade-offs) và có số liệu thực tế.

QUY TẮC BẮT BUỘC - MỖI LƯỢT CHỈ ĐƯỢC HỎI ĐÚNG 1 CÂU HỎI DUY NHẤT (SINGLE ATOMIC QUESTION):
1. TUYỆT ĐỐI CẤM hỏi kép, hỏi dồn dập, hoặc nhồi nhét 2-3 câu hỏi vào 1 câu!
   - ❌ VÍ DỤ CẤM: "Em tự tay code tính năng gì, thiết kế Database ra sao và cách em test thế nào?" (Đây là 3 câu hỏi, làm ứng viên bị ngợp và không thể phân tích sâu).
   - ✅ CÁCH HỎI ĐÚNG: Chia nhỏ vấn đề, chỉ hỏi 1 khía cạnh duy nhất: "Trong đồ án đó, tính năng nào là do em tự tay viết code từ đầu đến cuối?" (Chờ ứng viên trả lời xong thì ở lượt sau mới hỏi tiếp về Database!).
2. next_question: BẮT BUỘC chỉ là ĐÚNG 1 CÂU HỎI ĐƠN LẺ, kết thúc bằng DUY NHẤT 1 DẤU CHẤM HỎI (?). Độ dài súc tích từ 15 đến 25 từ.
3. feedback_phrase: Nhận xét ngắn gọn 1 câu tự nhiên về ý ứng viên vừa nói (tối đa 15 từ).

QUY TẮC PHỎNG VẤN THÍCH ỨNG:
1. LẮNG NGHE & BẮT TRỰC DIỆN Ý (Listen & Connect):
   - feedback_phrase: 1 câu ngắn gọn về đúng ý ứng viên vừa nói.
2. SINH CÂU HỎI TIẾP THEO THEO THANG ĐO 3 NẤC (CHỈ 1 CÂU HỎI):
   - Nếu ứng viên trả lời lý thuyết: Hỏi bóc tách 1 chi tiết thực tế: "Cụ thể trong dự án bạn đã triển khai nó như thế nào?"
   - Nếu ứng viên đưa ra giải pháp cao siêu: Kiểm tra xem có hiểu bản chất nền tảng bên dưới không (First Principles).
   - Nếu ứng viên nói "KHÔNG BIẾT / XIN QUA": Thông cảm, chuyển hướng (Pivot) sang chủ đề cơ bản quen thuộc khác. TUYỆT ĐỐI KHÔNG ép ứng viên vào điểm mù!
3. PHÂN LOẠI INTENT:
   - "DONT_KNOW": is_pivot: true, turn_score: 1.0 - 2.0 / 10.
   - "SHALLOW": turn_score: 3.0 - 5.5 / 10.
   - "GOOD": turn_score: 7.0 - 10.0 / 10.

ĐỊNH DẠNG ĐẦU RA (JSON thuần túy):
{
  "intent": "DONT_KNOW | SHALLOW | GOOD | OFF_TOPIC",
  "turn_score": 7.5,
  "feedback_phrase": "Lời nhận xét ngắn tối đa 1 câu...",
  "next_question": "Duy nhất 1 câu hỏi đơn lẻ súc tích kết thúc bằng đúng 1 dấu hỏi chấm?",
  "critique": "Nhận xét ngắn về câu trả lời...",
  "is_pivot": false,
  "should_advance_stage": true
}
`;

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
        printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, data);
        return data;
      }
    } catch (err: any) {
      console.warn(`[AI Engine TS] Error calling ${modelName} in generateAdaptiveNextTurn: ${err.message}. Retrying next model...`);
    }
  }

  // Fallback Logic
  const lowerAns = ansClean.toLowerCase();
  const isDontKnow = ["không biết", "chưa biết", "chưa rõ", "chưa từng", "chịu", "qua câu", "bỏ qua", "chưa tìm hiểu", "em không rành", "mình không biết"]
    .some(k => lowerAns.includes(k));

  if (isDontKnow) {
    const res = {
      intent: "DONT_KNOW",
      turn_score: 1.0,
      feedback_phrase: "Tôi hiểu rồi, trong kỹ thuật chúng ta luôn có những mảng mới cần thời gian trau dồi. Không sao cả, chúng ta hãy cùng chuyển sang một chủ đề khác nhé.",
      next_question: defaultNextQuestion || `Vậy ngoài mảng đó ra, trong các bài toán kỹ thuật với ${role}, bạn tự tin nhất với phần việc nào?`,
      critique: "Ứng viên thừa nhận chưa có trải nghiệm về chủ đề này.",
      is_pivot: true,
      should_advance_stage: true
    };
    printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, res);
    return res;
  }

  if (stageId === "candidate_qa") {
    const res = {
      intent: "GOOD",
      turn_score: 8.0,
      feedback_phrase: `Cảm ơn câu hỏi rất hay của bạn! Tại ${company}, chúng tôi rất chú trọng văn hóa Clean Code, trao quyền thử nghiệm và đào tạo chuyên sâu cho các kỹ sư cấp bậc ${lvl.toUpperCase()}.`,
      next_question: defaultNextQuestion || "Buổi phỏng vấn kỹ thuật hôm nay xin được khép lại tại đây, cảm ơn bạn rất nhiều!",
      critique: "Ứng viên đặt câu hỏi quan tâm đến dự án và văn hóa doanh nghiệp.",
      is_pivot: false,
      should_advance_stage: true
    };
    printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, res);
    return res;
  }

  const res = {
    intent: ansClean.length > 40 ? "GOOD" : "SHALLOW",
    turn_score: ansClean.length > 40 ? 7.0 : 4.0,
    feedback_phrase: "Cảm ơn chia sẻ của bạn, tôi đã ghi nhận nội dung kỹ thuật này.",
    next_question: defaultNextQuestion || "Chúng ta hãy tiếp tục với câu hỏi tiếp theo nhé.",
    critique: "Câu trả lời cơ bản đáp ứng yêu cầu câu hỏi.",
    is_pivot: false,
    should_advance_stage: true
  };
  printAdaptiveTurnTerminalLog(stageIndex, stageName, currentQuestion, ansClean, res);
  return res;
}

// -------------------------------------------------------------
// 3. EVALUATE STAR INTERVIEW (Scorecard Evaluation)
// -------------------------------------------------------------
export async function evaluateStarInterview(
  role: string,
  turnsData: Array<{ question_text: string; answer_transcript?: string | null }>,
  cutoff = 80,
  targetLevel = "fresher",
  track = "backend"
): Promise<any> {
  const client = getClient();
  const lvl = (targetLevel || "fresher").toLowerCase();
  let turnsSummary = "";
  let dontKnowCount = 0;
  const totalTurns = turnsData.length;

  turnsData.forEach((t, idx) => {
    const q = (t.question_text || "").trim();
    const a = (t.answer_transcript || "").trim();
    turnsSummary += `\n--- Lượt ${idx + 1} ---\nGiám khảo hỏi: ${q}\nỨng viên trả lời: ${a || '[Không có câu trả lời / Im lặng]'}\n`;

    const lowA = a.toLowerCase();
    if (["không biết", "chưa biết", "chưa rõ", "chịu", "bỏ qua", "chưa tìm hiểu", "em không rành"].some(k => lowA.includes(k)) || !a) {
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

QUY TẮC CHẤM ĐIỂM THEO CHUẨN CẤP BẬC ${lvl.toUpperCase()}:
- INTERN: Đạt nếu có nền tảng CS tốt (OOP, tư duy giải thuật), trung thực, biết nhận lỗi và có tinh thần tự học.
- FRESHER: Đạt nếu làm chủ Tech Stack chính, viết code có cấu trúc, hiểu luồng xử lý dữ liệu và tự giải thích được đồ án.
- JUNIOR: Đạt nếu có kinh nghiệm thực chiến production, tư duy tối ưu hóa hiệu năng, xử lý lỗi và số liệu đo lường cụ thể theo STAR.

QUY TẮC TÍNH ĐIỂM NGHIÊM NGẶT:
1. ĐỐI CHIẾU THỰC CHẤT:
   - Nếu ứng viên nói "không biết", "chưa học", im lặng: Câu đó chỉ được từ 0.0 đến 2.0 / 10 điểm.
   - Nếu trả lời lý thuyết suông thiếu số liệu: 4.0 đến 6.0 / 10 điểm.
   - Nếu trả lời tốt, có số liệu và tư duy STAR: 7.0 đến 10.0 / 10 điểm.
2. TỔNG ĐIỂM STAR (Thang 100 điểm): Situation (/25) + Task (/25) + Action (/25) + Result (/25).
3. CHỐNG ĐIỂM ẢO:
   - Nếu ứng viên có nhiều câu không biết (${dontKnowCount}/${totalTurns} câu): Tổng điểm CHỈ ĐƯỢC từ 15 đến 45 điểm, và is_passed BẮT BUỘC LÀ FALSE!

ĐỊNH DẠNG ĐẦU RA (JSON thuần túy):
{
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
    {
      "turn_number": 1,
      "score": 7.0,
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
      let sit = Number(data.situation_score) || 0;
      let tsk = Number(data.task_score) || 0;
      let act = Number(data.action_score) || 0;
      let res = Number(data.result_score) || 0;
      let tot = Number(data.total_score) || (sit + tsk + act + res);

      if (dontKnowCount >= Math.max(2, Math.floor(totalTurns / 3))) {
        tot = Math.min(tot, 48.0);
        data.is_passed = false;
      } else {
        data.is_passed = tot >= cutoff;
      }

      data.total_score = Math.round(tot * 10) / 10;
      data.situation_score = Math.round(sit * 10) / 10;
      data.task_score = Math.round(tsk * 10) / 10;
      data.action_score = Math.round(act * 10) / 10;
      data.result_score = Math.round(res * 10) / 10;
      return data;
    } catch (err: any) {
      console.warn(`[AI Evaluation TS] Error calling ${modelName}: ${err.message}. Retrying next model...`);
    }
  }

  // Fallback calculation
  const baseScorePerTurn: number[] = [];
  turnsData.forEach(t => {
    const ans = (t.answer_transcript || "").trim();
    const lowAns = ans.toLowerCase();
    if (["không biết", "chưa biết", "chưa rõ", "chịu", "bỏ qua", "chưa tìm hiểu"].some(k => lowAns.includes(k)) || !ans) {
      baseScorePerTurn.push(1.5);
    } else if (ans.split(/\s+/).length < 10) {
      baseScorePerTurn.push(4.0);
    } else if (ans.split(/\s+/).length > 30) {
      baseScorePerTurn.push(8.0);
    } else {
      baseScorePerTurn.push(6.0);
    }
  });

  const avg10 = baseScorePerTurn.reduce((a, b) => a + b, 0) / Math.max(1, baseScorePerTurn.length);
  const calcTotal = Math.round(avg10 * 10 * 10) / 10;
  const sit = Math.round(calcTotal * 0.25 * 10) / 10;
  const tsk = Math.round(calcTotal * 0.25 * 10) / 10;
  const act = Math.round(calcTotal * 0.25 * 10) / 10;
  const res = Math.round(calcTotal * 0.25 * 10) / 10;
  const isPassed = calcTotal >= cutoff;

  return {
    situation_score: sit,
    task_score: tsk,
    action_score: act,
    result_score: res,
    total_score: calcTotal,
    is_passed: isPassed,
    strengths: isPassed
      ? "Tư duy mạch lạc, trả lời rõ ràng bám sát tình huống thực tế và khung chuẩn STAR."
      : "Thái độ trung thực, có tinh thần cầu tiến trong quá trình trao đổi.",
    weaknesses: isPassed
      ? "Cần bổ sung thêm số liệu định lượng chi tiết cho phần Kết quả (Result)."
      : `Còn nhiều lỗ hổng kiến thức cốt lõi (có ${dontKnowCount} câu chưa nắm rõ hoặc từ chối trả lời).`,
    ai_recommendations: "Cần ôn tập kỹ kiến thức nền tảng và luyện tập cách giải quyết vấn đề theo cấu trúc STAR.",
    dossier_summary: `Ứng viên đạt ${calcTotal}/100 điểm, ${isPassed ? 'vượt' : 'chưa đạt'} ngưỡng cut-off (${cutoff}đ).`,
    turn_evaluations: baseScorePerTurn.map((score, idx) => ({
      turn_number: idx + 1,
      score,
      assessment: score <= 2.0 ? "Chưa nắm rõ câu hỏi" : (score <= 5.0 ? "Cần bổ sung chi tiết" : "Trả lời tốt"),
      critique: score <= 2.0 ? "Ứng viên thừa nhận chưa có trải nghiệm" : "Nên bổ sung thêm số liệu",
      model_answer: "Trình bày theo cấu trúc Tình huống -> Nhiệm vụ -> Hành động -> Kết quả đo lường"
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
