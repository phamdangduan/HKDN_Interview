// Bộ não phỏng vấn v2: mỗi lượt gồm 3 bước
//   1. AI phân tích câu trả lời (phân loại, ý trúng/thiếu, hiểu nhầm, manh mối)
//   2. CODE chọn hành động theo luật (policy.ts)
//   3. AI viết lời nói tự nhiên cho hành động đó
import { GoogleGenAI } from "@google/genai";
import {
  PERSONA_PROFILES,
  detectAndLogApiQuotaWarning,
  extractJson,
  isDontKnowAnswer,
  sanitizeToSingleQuestion
} from "../services/aiEngine.js";
import { LevelConfig, PhaseId } from "./config.js";
import { NextMove, TurnTiming, decideNextMove } from "./policy.js";
import { AnswerAnalysis, AnswerCategory, InterviewPlan, InterviewState } from "./state.js";

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];
const CALL_TIMEOUT_MS = 6000;

const FEMALE_PERSONAS = ["Sarah Jenkins", "Rachel Vance"];

export interface HistoryTurn {
  question_text: string;
  answer_transcript?: string | null;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key) return null;
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

async function callJson(
  prompt: string, temperature: number, timeoutMs = CALL_TIMEOUT_MS
): Promise<{ data: any; quotaWarning: string | null }> {
  const ai = getClient();
  let quotaWarning: string | null = null;
  if (!ai) return { data: null, quotaWarning };
  for (const model of MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature, abortSignal: AbortSignal.timeout(timeoutMs) }
      });
      return { data: extractJson(res.text || ""), quotaWarning };
    } catch (err: any) {
      const q = detectAndLogApiQuotaWarning("Gemini", err);
      if (q.isQuotaError) quotaWarning = q.message;
      console.warn(`[Interview Brain] ${model} lỗi: ${err?.message}. Thử model tiếp theo...`);
    }
  }
  return { data: null, quotaWarning };
}

function pronoun(persona: string): string {
  return FEMALE_PERSONAS.includes(persona) ? "chị" : "anh";
}

function formatHistory(history: HistoryTurn[], limit: number): string {
  const recent = history.filter(h => (h.answer_transcript || "").trim()).slice(-limit);
  if (!recent.length) return "(chưa có)";
  return recent.map(h => `Giám khảo: ${h.question_text}\nỨng viên: ${(h.answer_transcript || "").trim()}`).join("\n\n");
}

function phaseName(cfg: LevelConfig, id: PhaseId): string {
  return cfg.phases.find(p => p.id === id)?.name || id;
}

// -------------------------------------------------------------
// Câu mở đầu (không cần gọi AI để buổi phỏng vấn bắt đầu ngay)
// -------------------------------------------------------------
export function buildOpeningLine(persona: string, durationMinutes: number): string {
  const p = pronoun(persona);
  return `Chào em, ${p} là ${persona}. Hôm nay mình trò chuyện khoảng ${durationMinutes} phút về Java và những gì em đã làm, em cứ thoải mái như đang nói chuyện bình thường nhé. Trước khi bắt đầu, em đang cảm thấy thế nào?`;
}

// -------------------------------------------------------------
// Lập kế hoạch phỏng vấn từ CV + JD (gọi một lần lúc bắt đầu buổi)
// -------------------------------------------------------------
const PLAN_TIMEOUT_MS = 15000;

export async function buildInterviewPlan(
  cvText: string, jdText: string, role: string, cfg: LevelConfig
): Promise<InterviewPlan | null> {
  const cv = (cvText || "").trim().slice(0, 6000);
  const jd = (jdText || "").trim().slice(0, 4000);
  if (!cv && !jd) return null;

  const prompt = `Bạn là trưởng nhóm kỹ thuật chuẩn bị kế hoạch cho buổi phỏng vấn THỰC TẬP SINH vị trí "${role}".
Chỉ dùng thông tin có trong văn bản dưới đây, tuyệt đối không suy diễn hay bịa thêm.

JD (MÔ TẢ CÔNG VIỆC):
${jd || "(không có)"}

CV CỦA ỨNG VIÊN:
${cv || "(không có)"}

CÁC CHỦ ĐỀ KIẾN THỨC CÓ THỂ HỎI:
${cfg.topics.map(t => `- ${t.id}: ${t.name}`).join("\n")}

Trả về JSON:
{
  "candidate_summary": "1-2 câu tóm tắt ứng viên theo CV (để trống nếu không có CV)",
  "jd_facts": ["các thông tin cụ thể có trong JD: nhiệm vụ, yêu cầu, quyền lợi, thời gian, địa điểm, hình thức làm việc; chép đúng ý, không thêm"],
  "topic_priority": { "<topic_id>": "high nếu JD yêu cầu rõ kỹ năng thuộc chủ đề này | normal | low nếu JD không liên quan" },
  "gap_topics": ["topic_id mà JD yêu cầu nhưng CV không thể hiện"],
  "projects": ["mỗi đồ án/dự án trong CV: tên - công nghệ - phần ứng viên tự làm nếu CV có ghi"],
  "claims_to_verify": ["điều CV khẳng định cần kiểm chứng bằng câu hỏi, ví dụ đã tự xây dựng chức năng X bằng công nghệ Y"]
}
Nếu không có JD: mọi chủ đề là "normal", jd_facts và gap_topics để mảng rỗng.`;

  const { data } = await callJson(prompt, 0.2, PLAN_TIMEOUT_MS);
  if (!data || typeof data !== "object") return null;

  const ids = new Set(cfg.topics.map(t => t.id));
  const arr = (v: any, max: number) => (Array.isArray(v) ? v.map(String).map(x => x.trim()).filter(Boolean).slice(0, max) : []);
  const topicPriority: InterviewPlan["topicPriority"] = {};
  for (const t of cfg.topics) {
    const p = data.topic_priority?.[t.id];
    topicPriority[t.id] = jd && (p === "high" || p === "low") ? p : "normal";
  }
  const plan: InterviewPlan = {
    candidateSummary: typeof data.candidate_summary === "string" ? data.candidate_summary.trim() : "",
    jdFacts: jd ? arr(data.jd_facts, 12) : [],
    topicPriority,
    gapTopics: jd ? arr(data.gap_topics, 7).filter(id => ids.has(id)) : [],
    projects: cv ? arr(data.projects, 4) : [],
    claimsToVerify: cv ? arr(data.claims_to_verify, 5) : []
  };

  console.log(`\n📋 [INTERVIEW v2] Kế hoạch từ ${cv ? "CV" : ""}${cv && jd ? " + " : ""}${jd ? "JD" : ""}:`);
  console.log(`   Ứng viên: ${plan.candidateSummary || "-"}`);
  console.log(`   Ưu tiên cao: ${Object.entries(topicPriority).filter(([, p]) => p === "high").map(([id]) => id).join(", ") || "-"}`);
  console.log(`   Khoảng trống: ${plan.gapTopics.join(", ") || "-"}`);
  console.log(`   Đồ án: ${plan.projects.join(" | ") || "-"}`);
  console.log(`   Cần kiểm chứng: ${plan.claimsToVerify.join(" | ") || "-"}\n`);
  return plan;
}

// -------------------------------------------------------------
// BƯỚC 1: Phân tích câu trả lời
// -------------------------------------------------------------
const CATEGORY_GUIDE = `- FULL: nêu được đủ các ý chính (diễn đạt khác đi vẫn tính, không cần đúng thuật ngữ).
- PARTIAL: đúng ít nhất một ý chính nhưng thiếu ý quan trọng khác.
- WRONG_CONFIDENT: khẳng định một điều sai về mặt kỹ thuật.
- DONT_KNOW: thừa nhận không biết / chưa học / xin bỏ qua.
- STUCK: ấp úng, nói vòng vo, không có nội dung kỹ thuật nào.
- MISUNDERSTOOD: trả lời cho một câu hỏi khác với câu được hỏi.
- ASK_CLARIFY: hỏi lại, xin nhắc lại hoặc xin giải thích câu hỏi.
- OFF_TOPIC: nói chuyện không liên quan.
- PIVOT_REQUEST: chủ động xin chuyển sang chủ đề/ngôn ngữ khác.
- NERVOUS: nói rõ là đang run, căng thẳng, sợ.`;

const OPEN_CATEGORY_GUIDE = `- OPEN_ANSWER: trả lời bình thường cho câu hỏi mở.
- DONT_KNOW / STUCK / ASK_CLARIFY / OFF_TOPIC / NERVOUS: như định nghĩa thông thường.`;

const VALID_CATEGORIES: AnswerCategory[] = [
  "FULL", "PARTIAL", "WRONG_CONFIDENT", "DONT_KNOW", "STUCK", "MISUNDERSTOOD",
  "ASK_CLARIFY", "OFF_TOPIC", "PIVOT_REQUEST", "NERVOUS", "OPEN_ANSWER"
];

function fallbackAnalysis(state: InterviewState, answer: string): AnswerAnalysis {
  const dontKnow = isDontKnowAnswer(answer.trim());
  return {
    category: dontKnow ? "DONT_KNOW" : state.current.kind === "ladder" ? "UNJUDGED" : "OPEN_ANSWER",
    pointsHit: [], pointsMissed: [], misconception: "", clue: "", emotion: "",
    candidateFacts: [], requestedTopic: "", needsFollowUp: false, followUpAngle: "",
    candidateQuestion: "", quote: answer.slice(0, 200)
  };
}

function normalizeAnalysis(raw: any, state: InterviewState, answer: string): AnswerAnalysis {
  const fb = fallbackAnalysis(state, answer);
  if (!raw || typeof raw !== "object") return fb;
  const arr = (v: any) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  const str = (v: any) => (typeof v === "string" ? v.trim() : "");
  let category = str(raw.category).toUpperCase() as AnswerCategory;
  if (!VALID_CATEGORIES.includes(category)) category = fb.category;
  // Câu hỏi mở không có ý kỳ vọng để chấm đúng/sai
  if (state.current.kind === "open" && ["FULL", "PARTIAL", "WRONG_CONFIDENT", "MISUNDERSTOOD"].includes(category)) {
    category = "OPEN_ANSWER";
  }
  return {
    category,
    pointsHit: arr(raw.points_hit),
    pointsMissed: arr(raw.points_missed),
    misconception: str(raw.misconception),
    clue: str(raw.clue),
    emotion: str(raw.emotion),
    candidateFacts: arr(raw.candidate_facts).slice(0, 5),
    requestedTopic: str(raw.requested_topic),
    needsFollowUp: Boolean(raw.needs_follow_up),
    followUpAngle: str(raw.follow_up_angle),
    candidateQuestion: str(raw.candidate_question),
    quote: str(raw.quote) || answer.slice(0, 200)
  };
}

async function analyzeAnswer(
  state: InterviewState, cfg: LevelConfig, answer: string, history: HistoryTurn[]
): Promise<{ analysis: AnswerAnalysis; quotaWarning: string | null }> {
  const cur = state.current;
  let questionBlock: string;
  if (cur.kind === "ladder") {
    const topic = cfg.topics.find(t => t.id === cur.topicId)!;
    const lv = topic.levels.find(l => l.level === cur.level)!;
    questionBlock = `Đây là câu hỏi KIẾN THỨC, chủ đề "${topic.name}", bậc L${lv.level}/${cfg.maxLevel}.
Câu hỏi gốc: "${lv.question}"
Các ý chính kỳ vọng:
${lv.expected.map(e => `- ${e}`).join("\n")}
Lưu ý: nếu ứng viên đã được gợi ý hoặc hỏi thêm, hãy đánh giá cả câu trả lời hiện tại lẫn câu trả lời trước đó cho cùng câu hỏi gốc.

Phân loại (category) theo:
${CATEGORY_GUIDE}`;
  } else {
    const phase = cfg.phases.find(p => p.id === cur.phase)!;
    questionBlock = `Đây là câu hỏi MỞ ở giai đoạn "${phase.name}". Mục tiêu giai đoạn: ${phase.goal}

Phân loại (category) theo:
${OPEN_CATEGORY_GUIDE}
- needs_follow_up = true nếu câu trả lời còn chung chung/mơ hồ hoặc có chi tiết đáng hỏi sâu thêm theo mục tiêu giai đoạn; follow_up_angle = đúng một khía cạnh nên hỏi tiếp, chưa được hỏi trước đó, và KHÔNG thuộc phạm vi vượt cấp: ${cfg.outOfScope}.`;
    if (cur.phase === "candidate_qa") {
      questionBlock += `\n- candidate_question = câu hỏi ứng viên đặt cho giám khảo (để trống nếu ứng viên nói không có câu hỏi).`;
    }
    if (cur.phase === "project" && state.plan?.claimsToVerify.length) {
      questionBlock += `\n- Các điều CV ghi cần kiểm chứng: ${state.plan.claimsToVerify.join("; ")}. Nếu câu trả lời chưa chứng minh được điều nào trong số này thì đó là ứng viên tốt cho follow_up_angle.`;
    }
  }

  const prompt = `Bạn là bộ phận PHÂN TÍCH của một hệ thống phỏng vấn kỹ thuật. Bạn KHÔNG nói chuyện với ứng viên, chỉ phân tích khách quan.
Ứng viên: thực tập sinh (${state.level.toUpperCase()}) Java. Câu trả lời được chuyển từ giọng nói sang chữ nên có thể sai chính tả thuật ngữ (ví dụ "a rây lít" là ArrayList); hãy hiểu theo ý định.

LỊCH SỬ GẦN ĐÂY:
${formatHistory(history, 6)}

CÂU GIÁM KHẢO VỪA NÓI: "${cur.text}"
${questionBlock}

CÂU TRẢ LỜI CỦA ỨNG VIÊN: "${answer}"

Chủ đề kỹ thuật có thể chuyển tới (dùng cho requested_topic nếu PIVOT_REQUEST): ${cfg.topics.map(t => `${t.id} (${t.name})`).join(", ")}.

Trả về JSON:
{
  "category": "...",
  "points_hit": ["ý chính ứng viên đã nêu đúng"],
  "points_missed": ["ý chính còn thiếu"],
  "misconception": "điều ứng viên hiểu sai, để trống nếu không có",
  "clue": "chi tiết cụ thể ứng viên vừa tiết lộ có thể dùng để dẫn dắt tiếp, để trống nếu không có",
  "emotion": "bình tĩnh | tự tin | lúng túng | căng thẳng",
  "candidate_facts": ["thông tin đáng nhớ mới về ứng viên: trường, đồ án, công nghệ đã dùng..."],
  "requested_topic": "",
  "needs_follow_up": false,
  "follow_up_angle": "",
  "candidate_question": "",
  "quote": "trích nguyên văn câu quan trọng nhất của ứng viên"
}`;

  const { data, quotaWarning } = await callJson(prompt, 0.2);
  return { analysis: normalizeAnalysis(data, state, answer), quotaWarning };
}

// -------------------------------------------------------------
// BƯỚC 3: Viết lời nói cho hành động đã chọn
// -------------------------------------------------------------
const FALLBACK_OPEN_QUESTIONS: Partial<Record<PhaseId, string>> = {
  intro: "Em giới thiệu ngắn gọn về bản thân, đang học ở đâu và vì sao em chọn theo Java nhé?",
  project: "Trong các đồ án hay bài tập lớn đã làm, em kể về cái mà em tự tay code nhiều nhất nhé?",
  behavioral: "Em kể một lần làm bài tập nhóm gặp khó khăn, lúc đó em đã xử lý thế nào?",
  motivation: "Điều gì khiến em muốn đi thực tập vào lúc này, và em mong học được gì nhất?",
  candidate_qa: "Phần của anh đến đây là xong rồi. Em có câu hỏi nào muốn hỏi không?"
};

function fallbackSpeech(move: NextMove, state: InterviewState): string {
  const p = pronoun(state.persona);
  const q = move.question || "";
  switch (move.action) {
    case "STEP_UP": return `Tốt lắm. ${q}`;
    case "STEP_DOWN": return `Không sao, mình thử ở góc đơn giản hơn nhé. ${q}`;
    case "HINT": return `${p.charAt(0).toUpperCase() + p.slice(1)} gợi ý một chút nhé: ${move.hint} Em thử nghĩ lại xem?`;
    case "FOLLOW_UP": return "Ý em đang đúng hướng. Em nói rõ thêm một chút được không?";
    case "PROBE_MISCONCEPTION": return "Ừm, em thử giải thích kỹ hơn cơ chế đó xem, nó hoạt động cụ thể ra sao?";
    case "REPHRASE": return q ? `${p.charAt(0).toUpperCase() + p.slice(1)} hỏi lại theo cách khác nhé. ${q}` : "Ý của câu hỏi là em kể cụ thể hơn về điều đó, em thử nói lại xem?";
    case "REASSURE_EASIER": return `Không sao đâu em, cứ bình tĩnh nhé. ${q}`;
    case "ASK_TOPIC": return `Mình chuyển sang phần ${move.topicName} nhé. ${q}`;
    case "OPEN_QUESTION": return FALLBACK_OPEN_QUESTIONS[move.phase] || "Em kể thêm về bản thân mình nhé?";
    case "OPEN_FOLLOW_UP": return "Em kể chi tiết hơn một chút về phần đó được không?";
    case "ANSWER_CANDIDATE": return "Câu hỏi hay đấy. Phần này bộ phận nhân sự sẽ trao đổi kỹ hơn với em sau. Em còn câu hỏi nào khác không?";
    case "CLOSE": return "Buổi phỏng vấn hôm nay đến đây là kết thúc. Cảm ơn em đã trao đổi rất cởi mở, hệ thống sẽ tổng hợp đánh giá cho em ngay sau đây.";
  }
}

function acknowledgement(move: NextMove): string {
  if (move.lastVerdict === "pass") return "Câu trả lời trước của ứng viên là ĐÚNG: ghi nhận ngắn gọn và cụ thể vào điều em vừa nói (không khen chung chung kiểu 'rất tốt').";
  if (move.lastVerdict === "partial") return "Câu trả lời trước ĐÚNG MỘT PHẦN: ghi nhận phần đúng, không khen quá.";
  if (move.lastVerdict === "fail") return "Câu trả lời trước CHƯA ĐÚNG/CHƯA TRẢ LỜI ĐƯỢC: KHÔNG khen, KHÔNG nói đáp án; phản hồi trung tính, nhẹ nhàng (ví dụ: phần này mình tạm dừng ở đây).";
  return "";
}

// Chỉ được trả lời ứng viên bằng thông tin có trong JD; ngoài ra không khẳng định gì về công ty
function jdFactsRule(state: InterviewState): string {
  const company = state.company || "công ty";
  if (state.plan?.jdFacts.length) {
    return `Chỉ được trả lời dựa trên các thông tin CÓ THẬT trong JD sau:\n${state.plan.jdFacts.map(f => `- ${f}`).join("\n")}\nNếu câu hỏi không có câu trả lời trong danh sách này thì nói thật là bộ phận nhân sự của ${company} sẽ trao đổi chi tiết; TUYỆT ĐỐI không tự thêm thông tin (mentor, lương, lộ trình, thời gian...).`;
  }
  return `Bạn KHÔNG có thông tin gì về chính sách nội bộ của ${company} (mentor, lộ trình đào tạo, lương, thời gian, quy trình). TUYỆT ĐỐI không khẳng định điều gì cụ thể về công ty như thể đó là sự thật. Ghi nhận câu hỏi, có thể chia sẻ góc nhìn chung về điều em nên chuẩn bị, rồi nói rõ bộ phận nhân sự sẽ trao đổi chi tiết.`;
}

function instructionFor(move: NextMove, state: InterviewState, cfg: LevelConfig, a: AnswerAnalysis): string {
  const q = move.question ? `"${move.question}"` : "";
  const clue = a.clue ? ` Nếu hợp lý, bám vào chi tiết ứng viên vừa nói: "${a.clue}".` : "";
  const ack = acknowledgement(move);
  const phase = cfg.phases.find(p => p.id === move.phase)!;
  switch (move.action) {
    case "STEP_UP":
      return `Ứng viên trả lời tốt. ${ack} Sau đó hỏi câu khó hơn trong cùng chủ đề: ${q}. Có thể nối với điều em vừa nói, nhưng giữ đúng ý hỏi.`;
    case "STEP_DOWN":
      return `Ứng viên chưa trả lời được. ${ack} Hỏi một câu DỄ HƠN trong cùng chủ đề: ${q}.${clue}`;
    case "HINT":
      return `Ứng viên đang bí ở câu hỏi vừa rồi. Không nói đáp án. Đưa gợi ý này bằng lời của mình: "${move.hint}", rồi mời em thử trả lời lại câu hỏi đó.`;
    case "FOLLOW_UP":
      return `Ứng viên trả lời đúng một phần (đã nêu: ${a.pointsHit.join("; ") || "một phần ý"}). Ghi nhận ngắn phần đúng, rồi hỏi gợi mở hướng tới ý còn thiếu: "${(move.missingPoints || [])[0] || "phần còn lại"}". KHÔNG nói thẳng ý còn thiếu ra.`;
    case "PROBE_MISCONCEPTION":
      return `Ứng viên đang hiểu nhầm: "${move.misconception}". KHÔNG khen, KHÔNG sửa thẳng, KHÔNG nói đáp án. Hỏi một câu tình huống cụ thể khiến em tự kiểm chứng lại và nhận ra chỗ chưa đúng.`;
    case "REPHRASE":
      return `Ứng viên chưa hiểu câu hỏi. Diễn đạt lại câu hỏi ${q || `vừa rồi ("${state.current.text}")`} cho đơn giản hơn, có thể kèm một ví dụ đời thường. Không đổi ý hỏi.`;
    case "REASSURE_EASIER":
      return `Ứng viên đang căng thẳng. Trấn an ngắn gọn, chân thành (không sáo rỗng), rồi hỏi câu dễ hơn: ${q}.`;
    case "ASK_TOPIC":
      return `${ack} Chuyển sang chủ đề mới "${move.topicName}" bằng một câu chuyển ý tự nhiên, rồi hỏi: ${q}.${move.recovery ? " Ứng viên vừa gặp khó ở mấy câu trước: giọng khích lệ, nhẹ nhàng." : ""}`;
    case "OPEN_QUESTION": {
      let extra = "";
      if (move.phase === "project") {
        if (state.plan?.projects.length) {
          extra = `\nĐồ án trong CV của em (chọn đồ án phù hợp nhất với vị trí để hỏi, gọi đúng tên):\n${state.plan.projects.map(p => `- ${p}`).join("\n")}`;
        } else if (state.cvExcerpt) {
          extra = `\nTrích CV của ứng viên (dùng để hỏi đúng đồ án của em nếu có):\n${state.cvExcerpt.slice(0, 1500)}`;
        }
      }
      if (move.phase === "candidate_qa") extra = "\nMời ứng viên đặt câu hỏi cho mình.";
      return `${ack} Bắt đầu giai đoạn "${phase.name}" bằng một câu chuyển ý tự nhiên. Mục tiêu: ${phase.goal} Hỏi một câu mở.${extra}`;
    }
    case "OPEN_FOLLOW_UP":
      if (move.recovery) {
        return `Tiếp tục giai đoạn "${phase.name}". Mục tiêu: ${phase.goal} Ứng viên vừa không trả lời được: KHÔNG hỏi lại vấn đề đó dưới bất kỳ hình thức nào. Phản hồi nhẹ nhàng, tự nhiên (không sáo rỗng), rồi chuyển sang một khía cạnh KHÁC, dễ trả lời, gần với những gì em đã tự tay làm.`;
      }
      return `Tiếp tục giai đoạn "${phase.name}". Mục tiêu: ${phase.goal} Hỏi tiếp đúng một khía cạnh: ${move.followUpAngle || "chi tiết cụ thể hơn"}, bám vào điều em vừa kể.${move.phase === "project" && state.plan?.claimsToVerify.length ? `\nĐiều CV ghi cần kiểm chứng (ưu tiên hỏi nếu liên quan và chưa hỏi): ${state.plan.claimsToVerify.join("; ")}` : ""}`;
    case "ANSWER_CANDIDATE":
      return `Ứng viên hỏi: "${move.candidateQuestion}". ${jdFactsRule(state)} Sau đó hỏi em còn câu hỏi nào khác không.`;
    case "CLOSE":
      return `${move.candidateQuestion ? `Trước tiên trả lời ngắn gọn câu hỏi của ứng viên: "${move.candidateQuestion}". ${jdFactsRule(state)} ` : ""}Kết thúc buổi phỏng vấn: cảm ơn chân thành, nói ngắn gọn rằng hệ thống sẽ tổng hợp đánh giá. KHÔNG đặt câu hỏi.`;
  }
}

function cleanSpeech(text: string): string {
  return (text || "").replace(/[*_#`>~]/g, "").replace(/\s+/g, " ").trim();
}

async function speak(
  state: InterviewState, cfg: LevelConfig, move: NextMove, a: AnswerAnalysis, answer: string, history: HistoryTurn[]
): Promise<string> {
  const persona = state.persona;
  const profile = PERSONA_PROFILES[persona] || PERSONA_PROFILES["Alex Chen"];
  const p = pronoun(persona);
  const prompt = `Bạn là ${persona} (${profile.title}) đang phỏng vấn trực tiếp bằng GIỌNG NÓI một sinh viên ứng tuyển thực tập Java${state.company ? ` tại ${state.company}` : ""}.
Phong thái: ${profile.tone} Với thực tập sinh, giữ thái độ thân thiện, kiên nhẫn. Xưng "${p}", gọi ứng viên là "em".

${state.plan?.candidateSummary ? `Tóm tắt CV của ứng viên: ${state.plan.candidateSummary}\n` : ""}Điều ứng viên đã kể trong buổi: ${state.candidateFacts.join("; ") || "(chưa có)"}

LỊCH SỬ GẦN ĐÂY:
${formatHistory(history, 4)}

Câu em vừa nói: "${answer}"
Nhận định nội bộ (không được đọc ra): loại=${a.category}; ý đúng=${a.pointsHit.join("; ") || "-"}; còn thiếu=${a.pointsMissed.join("; ") || "-"}; tâm lý=${a.emotion || "-"}

NHIỆM VỤ LƯỢT NÀY:
${instructionFor(move, state, cfg, a)}

QUY TẮC NÓI:
- Văn nói tiếng Việt tự nhiên như người thật, tối đa 3 câu ngắn, tổng dưới 60 từ.
- ${move.action === "CLOSE" ? "Không đặt câu hỏi." : "Kết thúc bằng ĐÚNG MỘT câu hỏi duy nhất (một dấu chấm hỏi)."}
- Không mở đầu bằng "Cảm ơn" hay "Cảm ơn chia sẻ". Không lặp lại câu hỏi đã hỏi trước đó.
- Không khen khi câu trả lời sai. Không tự giảng đáp án.
- Không hỏi những nội dung vượt tầm thực tập sinh: ${cfg.outOfScope}.
- Không dùng markdown, emoji hay ký hiệu đặc biệt vì lời này sẽ được đọc bằng giọng nói.

Trả về JSON: {"spoken_reply": "..."}`;

  const { data } = await callJson(prompt, 0.7);
  let text = cleanSpeech(data?.spoken_reply);
  if (!text) return fallbackSpeech(move, state);
  if (move.action !== "CLOSE") {
    if (!text.includes("?")) text = `${text} ${cleanSpeech(fallbackSpeech(move, state))}`;
    text = sanitizeToSingleQuestion(text);
  }
  return text;
}

// -------------------------------------------------------------
// Một lượt phỏng vấn hoàn chỉnh
// -------------------------------------------------------------
export interface TurnResult {
  state: InterviewState;
  move: NextMove;
  analysis: AnswerAnalysis;
  spoken: string;
  quotaWarning: string | null;
  isFallback: boolean;
}

export async function runInterviewTurn(
  state: InterviewState, cfg: LevelConfig, answer: string, history: HistoryTurn[], timing: TurnTiming
): Promise<TurnResult> {
  const startedAt = Date.now();
  const { analysis, quotaWarning } = await analyzeAnswer(state, cfg, answer, history);
  const { state: next, move } = decideNextMove(state, cfg, analysis, answer, timing);
  const spoken = await speak(next, cfg, move, analysis, answer, history);
  next.current.text = spoken;

  const sep = "─".repeat(80);
  console.log(`\n${sep}\n🎤 [INTERVIEW v2] Lượt ${next.turnCount} | ${phaseName(cfg, move.phase)}${move.topicName ? ` | ${move.topicName} L${move.level}` : ""} | ${Date.now() - startedAt}ms`);
  console.log(`🙋 Ứng viên: "${answer}"`);
  console.log(`🧠 Phân tích: ${analysis.category}${analysis.misconception ? ` | hiểu nhầm: ${analysis.misconception}` : ""}${analysis.clue ? ` | manh mối: ${analysis.clue}` : ""}`);
  console.log(`⚙️  Hành động: ${move.action} — ${move.reason}`);
  console.log(`🗣️  Giám khảo: "${spoken}"\n${sep}`);

  return { state: next, move, analysis, spoken, quotaWarning, isFallback: analysis.category === "UNJUDGED" };
}
