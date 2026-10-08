// Luật điều phối phỏng vấn: CODE quyết định hành động tiếp theo, AI chỉ phân tích và diễn đạt.
// Hàm thuần (không gọi AI) để hành vi luôn nhất quán và kiểm thử được.
import { LevelConfig, PhaseConfig, PhaseId } from "./config.js";
import { AnswerAnalysis, InterviewState, Verdict, newQuestion } from "./state.js";

export type Action =
  | "ASK_TOPIC"            // hỏi câu đầu tiên của một chủ đề mới
  | "STEP_UP"              // trả lời tốt -> bậc khó hơn, cùng chủ đề
  | "STEP_DOWN"            // chưa trả lời được -> bậc dễ hơn, cùng chủ đề
  | "HINT"                 // bí -> gợi ý rồi cho thử lại cùng câu
  | "FOLLOW_UP"            // đúng một phần -> hỏi vào ý còn thiếu
  | "PROBE_MISCONCEPTION"  // sai mà tự tin -> hỏi để ứng viên tự nhận ra
  | "REPHRASE"             // chưa hiểu câu hỏi -> diễn đạt lại
  | "REASSURE_EASIER"      // căng thẳng -> trấn an, hỏi dễ hơn
  | "OPEN_QUESTION"        // mở đầu một giai đoạn hỏi mở
  | "OPEN_FOLLOW_UP"       // hỏi tiếp trong giai đoạn hỏi mở
  | "ANSWER_CANDIDATE"     // trả lời câu hỏi của ứng viên
  | "CLOSE";               // kết thúc buổi phỏng vấn

export interface NextMove {
  action: Action;
  phase: PhaseId;
  phaseChanged: boolean;
  topicId?: string;
  topicName?: string;
  level?: number;
  question?: string;
  hint?: string;
  missingPoints?: string[];
  misconception?: string;
  followUpAngle?: string;
  candidateQuestion?: string;
  // Câu trước vừa được ghi nhận kết quả gì (để lời nói ghi nhận cho đúng: không khen khi sai)
  lastVerdict?: Verdict;
  // Ứng viên vừa trượt liên tiếp, cần giọng khích lệ và câu dễ
  recovery: boolean;
  reason: string;
}

export interface TurnTiming {
  secondsLeft: number;
  durationSeconds: number;
}

const CLOSING_SECONDS = 45;
const CANDIDATE_QA_SECONDS = 150;

function phaseIndex(cfg: LevelConfig, id: PhaseId): number {
  return cfg.phases.findIndex(p => p.id === id);
}

function phaseConfig(cfg: LevelConfig, id: PhaseId): PhaseConfig {
  return cfg.phases[phaseIndex(cfg, id)];
}

// Thời điểm (tỷ lệ 0..1 của buổi) mà giai đoạn này nên kết thúc
function phaseEndRatio(cfg: LevelConfig, id: PhaseId): number {
  let sum = 0;
  for (const p of cfg.phases) {
    sum += p.share;
    if (p.id === id) return sum;
  }
  return 1;
}

function elapsedRatio(t: TurnTiming): number {
  return t.durationSeconds > 0 ? 1 - Math.max(0, t.secondsLeft) / t.durationSeconds : 1;
}

function phaseOverBudget(cfg: LevelConfig, id: PhaseId, t: TurnTiming): boolean {
  return elapsedRatio(t) >= phaseEndRatio(cfg, id);
}

function forcedPhaseByTime(s: InterviewState, cfg: LevelConfig, t: TurnTiming): PhaseId | null {
  if (t.secondsLeft <= CLOSING_SECONDS && s.phase !== "closing") return "closing";
  if (t.secondsLeft <= CANDIDATE_QA_SECONDS && phaseIndex(cfg, s.phase) < phaseIndex(cfg, "candidate_qa")) {
    return "candidate_qa";
  }
  return null;
}

function mergeFacts(s: InterviewState, facts: string[]) {
  for (const f of facts) {
    const clean = (f || "").trim();
    if (clean && !s.candidateFacts.includes(clean)) s.candidateFacts.push(clean);
  }
  s.candidateFacts = s.candidateFacts.slice(-15);
}

function askTopic(
  s: InterviewState, cfg: LevelConfig, topicId: string, level: number, action: Action,
  extra: Partial<NextMove> & { reason: string }
): NextMove {
  const topic = cfg.topics.find(t => t.id === topicId)!;
  const lv = topic.levels.find(l => l.level === level)!;
  s.topics[topicId].status = "active";
  s.current = newQuestion("ladder", "technical", { topicId, level });
  return {
    action,
    phase: "technical",
    phaseChanged: false,
    topicId,
    topicName: topic.name,
    level,
    question: lv.question,
    recovery: false,
    ...extra
  };
}

function enterPhase(s: InterviewState, cfg: LevelConfig, phase: PhaseId, t: TurnTiming, base: Partial<NextMove>, reason: string): NextMove {
  s.phase = phase;
  s.phaseTurns = 0;
  if (phase === "technical") {
    const move = pickNextTopic(s, cfg, t, base, reason);
    return { ...move, phaseChanged: true };
  }
  s.current = newQuestion("open", phase);
  return {
    ...base,
    action: phase === "closing" ? "CLOSE" : "OPEN_QUESTION",
    phase,
    phaseChanged: true,
    recovery: false,
    reason
  };
}

function advancePhase(s: InterviewState, cfg: LevelConfig, t: TurnTiming, base: Partial<NextMove>, reason: string): NextMove {
  const next = cfg.phases[Math.min(phaseIndex(cfg, s.phase) + 1, cfg.phases.length - 1)];
  return enterPhase(s, cfg, next.id, t, base, reason);
}

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;

// Chủ đề JD yêu cầu rõ được hỏi trước; cùng mức ưu tiên thì giữ thứ tự trong cấu hình
function orderedTopics(s: InterviewState, cfg: LevelConfig) {
  const prio = (id: string) => PRIORITY_RANK[s.plan?.topicPriority[id] || "normal"];
  return [...cfg.topics].sort((a, b) => prio(a.id) - prio(b.id));
}

function pickNextTopic(s: InterviewState, cfg: LevelConfig, t: TurnTiming, base: Partial<NextMove>, reason: string): NextMove {
  const technical = phaseConfig(cfg, "technical");
  const outOfTime = s.phaseTurns > 0 && (phaseOverBudget(cfg, "technical", t) || s.phaseTurns >= technical.maxTurns);
  const next = orderedTopics(s, cfg).find(tp => s.topics[tp.id].status === "pending");
  if (!next || outOfTime) {
    return advancePhase(s, cfg, t, base, reason + (next ? " Hết thời lượng phần kiến thức." : " Đã hỏi hết các chủ đề."));
  }
  // Vừa trượt liên tiếp: bắt đầu chủ đề mới từ bậc dễ nhất để ứng viên lấy lại tự tin.
  // Chủ đề JD cần mà CV không thể hiện: cũng bắt đầu từ bậc dễ nhất cho công bằng.
  const recovery = s.consecutiveFails >= 2;
  const gap = !!s.plan?.gapTopics.includes(next.id);
  const level = recovery || gap ? 1 : cfg.startLevel;
  const jdNote = s.plan?.topicPriority[next.id] === "high" ? " JD yêu cầu rõ chủ đề này." : "";
  const levelNote = recovery ? " (dễ nhất, để ứng viên lấy lại tự tin)" : gap ? " (JD cần nhưng CV chưa thể hiện)" : "";
  return askTopic(s, cfg, next.id, level, "ASK_TOPIC", {
    ...base,
    recovery,
    reason: reason + ` Chuyển sang chủ đề "${next.name}" từ bậc L${level}${levelNote}.${jdNote}`
  });
}

function finishTopic(s: InterviewState, topicId: string) {
  s.topics[topicId].status = "done";
}

function resolveTopic(cfg: LevelConfig, requested: string): string | null {
  const r = (requested || "").toLowerCase().trim();
  if (!r) return null;
  const found = cfg.topics.find(t => t.id === r || t.aliases.some(a => r.includes(a)));
  return found ? found.id : null;
}

function handleLadder(s: InterviewState, cfg: LevelConfig, a: AnswerAnalysis, answer: string, t: TurnTiming): NextMove {
  const topicId = s.current.topicId!;
  const L = s.current.level!;
  const topic = cfg.topics.find(x => x.id === topicId)!;
  const lv = topic.levels.find(x => x.level === L)!;
  const tp = s.topics[topicId];
  tp.turns++;
  const cat = a.category;
  const same = { phase: "technical" as PhaseId, phaseChanged: false, topicId, topicName: topic.name, level: L, question: lv.question, recovery: false };

  if (cat === "PIVOT_REQUEST") {
    finishTopic(s, topicId);
    const target = resolveTopic(cfg, a.requestedTopic);
    if (target && s.topics[target].status === "pending") {
      return askTopic(s, cfg, target, s.plan?.gapTopics.includes(target) ? 1 : cfg.startLevel, "ASK_TOPIC", {
        reason: `Ứng viên xin chuyển chủ đề, đồng ý chuyển sang "${cfg.topics.find(x => x.id === target)!.name}" (không trừ điểm).`
      });
    }
    return pickNextTopic(s, cfg, t, {}, "Ứng viên xin chuyển chủ đề.");
  }

  if (cat === "NERVOUS") {
    const easier = Math.max(1, L - 1);
    const q = topic.levels.find(x => x.level === easier)!;
    s.current = newQuestion("ladder", "technical", { topicId, level: easier });
    return { ...same, action: "REASSURE_EASIER", level: easier, question: q.question, reason: `Ứng viên căng thẳng: trấn an và hỏi câu dễ hơn (L${easier}), chưa ghi điểm.` };
  }

  // Các bước "cho thêm một cơ hội" trên cùng câu hỏi, chưa ghi kết quả
  if (cat === "PARTIAL" && s.current.followUpsGiven < 1) {
    s.current.followUpsGiven++;
    return { ...same, action: "FOLLOW_UP", missingPoints: a.pointsMissed, reason: `Đúng một phần ở L${L}: hỏi tiếp vào ý còn thiếu.` };
  }
  if (cat === "WRONG_CONFIDENT" && s.current.probesGiven < 1) {
    s.current.probesGiven++;
    return { ...same, action: "PROBE_MISCONCEPTION", misconception: a.misconception, reason: `Hiểu nhầm ở L${L}: hỏi để ứng viên tự nhận ra, không sửa thẳng.` };
  }
  if ((cat === "DONT_KNOW" || cat === "STUCK") && s.current.hintsGiven < 1 && L <= cfg.passLevel) {
    s.current.hintsGiven++;
    return { ...same, action: "HINT", hint: lv.hint, reason: `Bí ở câu cơ bản L${L}: gợi ý một lần rồi cho thử lại.` };
  }

  if (cat === "UNJUDGED") {
    finishTopic(s, topicId);
    return pickNextTopic(s, cfg, t, {}, "Không chấm được câu trả lời (AI không phản hồi).");
  }

  // Ghi nhận kết quả cho bậc này
  const verdict: Verdict = cat === "FULL" ? "pass" : cat === "PARTIAL" ? "partial" : "fail";
  const assisted = s.current.hintsGiven + s.current.followUpsGiven + s.current.probesGiven > 0;
  tp.evidence.push({ level: L, verdict, assisted, quote: (a.quote || answer).slice(0, 300) });

  let nextLevel: number | null = null;
  let reason = "";
  if (verdict === "pass") {
    tp.passed.push(L);
    tp.ceiling = Math.max(tp.ceiling, L);
    s.consecutiveFails = 0;
    // Phải có gợi ý mới trả lời được thì coi như đã chạm trần, không đẩy lên nữa
    if (!assisted && L + 1 <= cfg.maxLevel && !tp.failed.includes(L + 1)) nextLevel = L + 1;
    reason = `Trả lời được L${L}${assisted ? " (có gợi ý)" : ""}.`;
  } else if (verdict === "fail") {
    tp.failed.push(L);
    s.consecutiveFails++;
    if (L - 1 >= 1 && !tp.passed.includes(L - 1) && !tp.failed.includes(L - 1)) nextLevel = L - 1;
    reason = `Chưa trả lời được L${L}.`;
  } else {
    tp.partial.push(L);
    s.consecutiveFails = 0;
    reason = `Trả lời được một phần L${L}, xác định trần năng lực quanh bậc này.`;
  }

  const base = { lastVerdict: verdict };
  if (nextLevel !== null && tp.turns < cfg.maxTurnsPerTopic && !phaseOverBudget(cfg, "technical", t)) {
    const action: Action = nextLevel > L ? "STEP_UP" : "STEP_DOWN";
    return askTopic(s, cfg, topicId, nextLevel, action, {
      ...base,
      reason: reason + (action === "STEP_UP" ? ` Thử bậc khó hơn L${nextLevel}.` : ` Hạ xuống L${nextLevel} trong cùng chủ đề để tìm ứng viên nắm tới đâu.`)
    });
  }
  finishTopic(s, topicId);
  return pickNextTopic(s, cfg, t, base, reason);
}

function handleOpen(s: InterviewState, cfg: LevelConfig, a: AnswerAnalysis, t: TurnTiming): NextMove {
  const phase = phaseConfig(cfg, s.phase);
  const stay = { phase: s.phase, phaseChanged: false, recovery: false };

  if (s.phase === "candidate_qa") {
    if (a.candidateQuestion) {
      if (s.phaseTurns < phase.maxTurns) {
        s.current = newQuestion("open", s.phase);
        return { ...stay, action: "ANSWER_CANDIDATE", candidateQuestion: a.candidateQuestion, reason: "Trả lời câu hỏi của ứng viên." };
      }
      return enterPhase(s, cfg, "closing", t, { candidateQuestion: a.candidateQuestion }, "Trả lời câu hỏi cuối của ứng viên rồi kết thúc.");
    }
    return enterPhase(s, cfg, "closing", t, {}, "Ứng viên không còn câu hỏi.");
  }

  if (s.phase === "greeting") {
    return advancePhase(s, cfg, t, {}, "Đã chào hỏi xong.");
  }

  const struggling = a.category === "DONT_KNOW" || a.category === "STUCK" || a.category === "NERVOUS";
  if (phaseOverBudget(cfg, s.phase, t) && s.phaseTurns >= phase.minTurns) {
    return advancePhase(s, cfg, t, {}, `Hết thời lượng giai đoạn "${phase.name}".`);
  }
  if (s.phaseTurns < phase.maxTurns && (s.phaseTurns < phase.minTurns || a.needsFollowUp || struggling)) {
    s.current = newQuestion("open", s.phase);
    return {
      ...stay,
      action: "OPEN_FOLLOW_UP",
      followUpAngle: struggling ? "một khía cạnh dễ trả lời hơn, gần gũi hơn" : a.followUpAngle,
      recovery: struggling,
      reason: struggling ? "Ứng viên đang gặp khó: hỏi tiếp nhẹ nhàng hơn." : `Hỏi tiếp trong giai đoạn "${phase.name}".`
    };
  }
  return advancePhase(s, cfg, t, {}, `Đã đủ thông tin giai đoạn "${phase.name}".`);
}

export function decideNextMove(
  prev: InterviewState,
  cfg: LevelConfig,
  a: AnswerAnalysis,
  answer: string,
  t: TurnTiming
): { state: InterviewState; move: NextMove } {
  const s: InterviewState = structuredClone(prev);
  s.turnCount++;
  s.phaseTurns++;
  mergeFacts(s, a.candidateFacts);

  const forced = forcedPhaseByTime(s, cfg, t);

  // Chưa hiểu câu hỏi / lạc đề: diễn đạt lại một lần, không tính là một lượt của giai đoạn
  const confused = a.category === "ASK_CLARIFY" || a.category === "MISUNDERSTOOD" || a.category === "OFF_TOPIC";
  if (confused && s.current.rephrases < 1 && forced !== "closing") {
    s.current.rephrases++;
    s.phaseTurns--;
    const cur = s.current;
    const topic = cur.topicId ? cfg.topics.find(x => x.id === cur.topicId) : undefined;
    return {
      state: s,
      move: {
        action: "REPHRASE",
        phase: s.phase,
        phaseChanged: false,
        topicId: cur.topicId,
        topicName: topic?.name,
        level: cur.level,
        question: topic?.levels.find(l => l.level === cur.level)?.question,
        recovery: false,
        reason: "Ứng viên chưa hiểu câu hỏi: diễn đạt lại đơn giản hơn."
      }
    };
  }

  let move: NextMove;
  if (s.current.kind === "ladder") {
    move = handleLadder(s, cfg, a, answer, t);
    // Câu trả lời đã được ghi nhận ở trên; nếu sắp hết giờ thì chuyển giai đoạn bắt buộc
    if (forced && move.phase !== forced) {
      move = enterPhase(s, cfg, forced, t, { lastVerdict: move.lastVerdict }, "Sắp hết thời gian.");
    }
  } else if (forced && s.phase !== forced) {
    move = enterPhase(s, cfg, forced, t, { candidateQuestion: a.candidateQuestion || undefined }, "Sắp hết thời gian.");
  } else {
    move = handleOpen(s, cfg, a, t);
  }
  return { state: s, move };
}
