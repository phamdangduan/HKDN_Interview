import { LevelConfig, PhaseId } from "./config.js";

// Phân loại câu trả lời do AI phân tích (bước 1 mỗi lượt)
export type AnswerCategory =
  | "FULL"             // đủ các ý chính
  | "PARTIAL"          // đúng một phần
  | "WRONG_CONFIDENT"  // sai nhưng khẳng định chắc chắn
  | "DONT_KNOW"        // thừa nhận không biết
  | "STUCK"            // ấp úng, không có nội dung
  | "MISUNDERSTOOD"    // trả lời sang câu hỏi khác
  | "ASK_CLARIFY"      // hỏi lại / xin nhắc lại câu hỏi
  | "OFF_TOPIC"        // lạc đề
  | "PIVOT_REQUEST"    // xin chuyển chủ đề / ngôn ngữ
  | "NERVOUS"          // nói rõ là đang căng thẳng
  | "OPEN_ANSWER"      // trả lời cho câu hỏi mở (giới thiệu, đồ án, động lực...)
  | "UNJUDGED";        // AI không phản hồi, không đánh giá được

export interface AnswerAnalysis {
  category: AnswerCategory;
  pointsHit: string[];
  pointsMissed: string[];
  misconception: string;
  // Chi tiết ứng viên vô tình tiết lộ, dùng để dẫn dắt câu tiếp theo
  clue: string;
  emotion: string;
  // Thông tin đáng nhớ về ứng viên (trường, đồ án, công nghệ...)
  candidateFacts: string[];
  requestedTopic: string;
  needsFollowUp: boolean;
  followUpAngle: string;
  candidateQuestion: string;
  quote: string;
}

export type Verdict = "pass" | "partial" | "fail";

export interface Evidence {
  level: number;
  verdict: Verdict;
  // Có cần gợi ý / hỏi thêm mới trả lời được không
  assisted: boolean;
  quote: string;
}

export interface TopicProgress {
  status: "pending" | "active" | "done";
  turns: number;
  // Bậc cao nhất ứng viên trả lời được (0 = chưa đạt bậc nào)
  ceiling: number;
  passed: number[];
  failed: number[];
  partial: number[];
  evidence: Evidence[];
}

export interface CurrentQuestion {
  kind: "ladder" | "open";
  phase: PhaseId;
  text: string;
  topicId?: string;
  level?: number;
  hintsGiven: number;
  followUpsGiven: number;
  probesGiven: number;
  rephrases: number;
}

// Kế hoạch phỏng vấn lập từ CV + JD lúc bắt đầu buổi
export interface InterviewPlan {
  // Tóm tắt ngắn để giám khảo nắm nhanh ứng viên
  candidateSummary: string;
  // Thông tin có thật trong JD (công việc, yêu cầu, quyền lợi) để trả lời câu hỏi của ứng viên
  jdFacts: string[];
  // Mức ưu tiên từng chủ đề theo JD: high = JD yêu cầu rõ, low = JD không nhắc tới
  topicPriority: Record<string, "high" | "normal" | "low">;
  // Chủ đề JD cần nhưng CV không thể hiện -> hỏi từ bậc dễ nhất cho công bằng
  gapTopics: string[];
  // Đồ án trong CV nên đào sâu
  projects: string[];
  // Điều ghi trong CV cần kiểm chứng bằng câu hỏi
  claimsToVerify: string[];
}

export interface InterviewState {
  version: 1;
  engine: "v2";
  level: string;
  persona: string;
  role: string;
  company: string;
  cvExcerpt: string;
  phase: PhaseId;
  phaseTurns: number;
  turnCount: number;
  consecutiveFails: number;
  candidateFacts: string[];
  topics: Record<string, TopicProgress>;
  current: CurrentQuestion;
  plan: InterviewPlan | null;
}

export function newQuestion(
  kind: CurrentQuestion["kind"],
  phase: PhaseId,
  extra: { topicId?: string; level?: number } = {}
): CurrentQuestion {
  return { kind, phase, text: "", hintsGiven: 0, followUpsGiven: 0, probesGiven: 0, rephrases: 0, ...extra };
}

export function createInitialState(
  cfg: LevelConfig,
  info: { persona: string; role: string; company: string; cvText: string; openingText: string; plan?: InterviewPlan | null }
): InterviewState {
  const topics: Record<string, TopicProgress> = {};
  for (const t of cfg.topics) {
    topics[t.id] = { status: "pending", turns: 0, ceiling: 0, passed: [], failed: [], partial: [], evidence: [] };
  }
  const current = newQuestion("open", "greeting");
  current.text = info.openingText;

  return {
    version: 1,
    engine: "v2",
    level: cfg.level,
    persona: info.persona,
    role: info.role,
    company: info.company,
    cvExcerpt: (info.cvText || "").slice(0, 3000),
    phase: "greeting",
    phaseTurns: 0,
    turnCount: 0,
    consecutiveFails: 0,
    candidateFacts: [],
    topics,
    current,
    plan: info.plan || null
  };
}

export function parseState(raw: string | null | undefined): InterviewState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return s && s.engine === "v2" ? (s as InterviewState) : null;
  } catch {
    return null;
  }
}

export interface CompetencyResult {
  topic_id: string;
  topic_name: string;
  status: "not_assessed" | "passed" | "below_bar";
  ceiling_level: number;
  pass_level: number;
  // Mức JD yêu cầu chủ đề này (null nếu không có JD)
  jd_priority: "high" | "normal" | "low" | null;
  summary: string;
  evidence: Evidence[];
}

// Kết quả đo theo từng năng lực, dùng cho báo cáo và đưa vào prompt chấm điểm cuối buổi
export function summarizeCompetencies(state: InterviewState, cfg: LevelConfig): CompetencyResult[] {
  return cfg.topics.map(t => {
    const tp = state.topics[t.id];
    const assessed = !!tp && tp.evidence.length > 0;
    const ceiling = tp?.ceiling || 0;
    const passedBar = ceiling >= cfg.passLevel;
    let summary = "Chưa được hỏi trong buổi phỏng vấn.";
    if (assessed) {
      const assisted = tp.evidence.some(e => e.level === ceiling && e.verdict === "pass" && e.assisted);
      const partialAbove = tp.partial.filter(l => l > ceiling);
      const partialNote = partialAbove.length ? `, trả lời được một phần L${Math.max(...partialAbove)}` : "";
      summary = ceiling > 0
        ? `Trả lời được tới bậc L${ceiling}/${cfg.maxLevel}${assisted ? " (cần gợi ý)" : ""}${partialNote}, yêu cầu L${cfg.passLevel}.`
        : `Chưa trả lời trọn bậc nào${partialNote} (thấp nhất đã hỏi: L${Math.min(...tp.evidence.map(e => e.level))}).`;
    }
    return {
      topic_id: t.id,
      topic_name: t.name,
      status: !assessed ? "not_assessed" : passedBar ? "passed" : "below_bar",
      ceiling_level: ceiling,
      pass_level: cfg.passLevel,
      jd_priority: state.plan?.topicPriority[t.id] || null,
      summary,
      evidence: tp?.evidence || []
    };
  });
}
