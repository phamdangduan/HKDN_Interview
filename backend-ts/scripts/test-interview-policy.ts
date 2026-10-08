// Kiểm thử luật điều phối phỏng vấn (không gọi AI). Chạy: npm run test:interview
import assert from "node:assert/strict";
import { INTERN_CONFIG as cfg } from "../src/interview/config.js";
import { decideNextMove, TurnTiming } from "../src/interview/policy.js";
import { AnswerAnalysis, AnswerCategory, InterviewState, createInitialState, summarizeCompetencies } from "../src/interview/state.js";

const EARLY: TurnTiming = { secondsLeft: 1700, durationSeconds: 1800 };

function an(category: AnswerCategory, extra: Partial<AnswerAnalysis> = {}): AnswerAnalysis {
  return {
    category, pointsHit: [], pointsMissed: ["ý còn thiếu"], misconception: "", clue: "", emotion: "",
    candidateFacts: [], requestedTopic: "", needsFollowUp: false, followUpAngle: "", candidateQuestion: "", quote: "",
    ...extra
  };
}

let state: InterviewState;
function step(a: AnswerAnalysis, t: TurnTiming = EARLY) {
  const r = decideNextMove(state, cfg, a, "câu trả lời mẫu", t);
  state = r.state;
  return r.move;
}

// Đi từ chào hỏi tới câu kỹ thuật đầu tiên
function toTechnical() {
  state = createInitialState(cfg, { persona: "Alex Chen", role: "Java Intern", company: "", cvText: "", openingText: "Chào em" });
  assert.equal(step(an("OPEN_ANSWER")).phase, "intro");
  assert.equal(step(an("OPEN_ANSWER")).phase, "project");
  assert.equal(step(an("OPEN_ANSWER")).action, "OPEN_FOLLOW_UP"); // project cần tối thiểu 2 lượt
  const m = step(an("OPEN_ANSWER"));
  assert.equal(m.action, "ASK_TOPIC");
  assert.equal(m.topicId, "oop");
  assert.equal(m.level, cfg.startLevel);
}

const tests: Record<string, () => void> = {
  "Quy trình: chào hỏi -> giới thiệu -> đồ án -> kiến thức": () => toTechnical(),

  "Bí câu cơ bản: gợi ý 1 lần, vẫn bí thì hạ bậc trong CÙNG chủ đề": () => {
    toTechnical();
    assert.equal(step(an("DONT_KNOW")).action, "HINT");
    const m = step(an("DONT_KNOW"));
    assert.equal(m.action, "STEP_DOWN");
    assert.equal(m.topicId, "oop");
    assert.equal(m.level, 1);
    assert.equal(m.lastVerdict, "fail");
  },

  "Hạ bậc trả lời được thì đã tìm ra trần năng lực -> sang chủ đề mới": () => {
    toTechnical();
    step(an("DONT_KNOW"));
    step(an("DONT_KNOW"));
    const m = step(an("FULL"));
    assert.equal(m.action, "ASK_TOPIC");
    assert.equal(m.topicId, "java_basics");
    assert.equal(state.topics.oop.ceiling, 1);
  },

  "Trả lời tốt liên tiếp: tăng bậc tới khi không trả lời được": () => {
    toTechnical();
    assert.equal(step(an("FULL")).action, "STEP_UP");     // L2 -> L3
    const m3 = step(an("FULL"));                          // L3 -> L4
    assert.equal(m3.action, "STEP_UP");
    assert.equal(m3.level, 4);
    const m4 = step(an("DONT_KNOW"));                     // L4 khó: không gợi ý, ghi trượt
    assert.equal(m4.action, "ASK_TOPIC");
    assert.equal(state.topics.oop.ceiling, 3);
  },

  "Sai mà tự tin: hỏi để tự nhận ra trước, vẫn sai thì hạ bậc": () => {
    toTechnical();
    const p = step(an("WRONG_CONFIDENT", { misconception: "private làm code chạy nhanh hơn" }));
    assert.equal(p.action, "PROBE_MISCONCEPTION");
    assert.equal(p.misconception, "private làm code chạy nhanh hơn");
    assert.equal(step(an("WRONG_CONFIDENT")).action, "STEP_DOWN");
  },

  "Đúng một phần: hỏi tiếp ý còn thiếu, vẫn một phần thì chốt và sang chủ đề": () => {
    toTechnical();
    assert.equal(step(an("PARTIAL")).action, "FOLLOW_UP");
    assert.equal(step(an("PARTIAL")).action, "ASK_TOPIC");
    assert.deepEqual(state.topics.oop.partial, [2]);
  },

  "Cần gợi ý mới trả lời được thì không đẩy lên bậc khó hơn": () => {
    toTechnical();
    step(an("DONT_KNOW"));                                // gợi ý
    const m = step(an("FULL"));
    assert.equal(m.action, "ASK_TOPIC");
    assert.equal(state.topics.oop.evidence[0].assisted, true);
  },

  "Trượt liên tiếp 2 chủ đề: chủ đề kế tiếp bắt đầu từ L1 để lấy lại tự tin": () => {
    toTechnical();
    assert.equal(step(an("DONT_KNOW")).action, "HINT");      // oop L2: gợi ý
    assert.equal(step(an("DONT_KNOW")).action, "STEP_DOWN"); // oop L2 trượt -> L1
    assert.equal(step(an("DONT_KNOW")).action, "HINT");      // oop L1: gợi ý
    const after = step(an("DONT_KNOW"));                      // oop L1 trượt (trượt liên tiếp lần 2) -> chủ đề mới
    assert.equal(after.action, "ASK_TOPIC");
    assert.equal(after.topicId, "java_basics");
    assert.equal(after.level, 1);
    assert.equal(after.recovery, true);
  },

  "Chưa hiểu câu hỏi: diễn đạt lại 1 lần, không tính lượt": () => {
    toTechnical();
    const m = step(an("ASK_CLARIFY"));
    assert.equal(m.action, "REPHRASE");
    assert.equal(m.level, cfg.startLevel);
    assert.equal(state.topics.oop.evidence.length, 0);
  },

  "Căng thẳng: trấn an và hỏi dễ hơn, chưa ghi điểm": () => {
    toTechnical();
    const m = step(an("NERVOUS"));
    assert.equal(m.action, "REASSURE_EASIER");
    assert.equal(m.level, 1);
    assert.equal(state.topics.oop.evidence.length, 0);
  },

  "Xin chuyển chủ đề: đồng ý chuyển, không trừ điểm": () => {
    toTechnical();
    const m = step(an("PIVOT_REQUEST", { requestedTopic: "sql" }));
    assert.equal(m.action, "ASK_TOPIC");
    assert.equal(m.topicId, "sql_basic");
    assert.equal(state.topics.oop.evidence.length, 0);
  },

  "Còn dưới 2.5 phút: ghi nhận câu vừa rồi rồi chuyển sang phần ứng viên hỏi": () => {
    toTechnical();
    const m = step(an("FULL"), { secondsLeft: 120, durationSeconds: 1800 });
    assert.equal(m.phase, "candidate_qa");
    assert.equal(m.action, "OPEN_QUESTION");
    assert.equal(state.topics.oop.ceiling, 2);
  },

  "Còn dưới 45 giây: kết thúc": () => {
    toTechnical();
    assert.equal(step(an("FULL"), { secondsLeft: 30, durationSeconds: 1800 }).action, "CLOSE");
  },

  "Ứng viên hỏi: trả lời rồi hỏi còn gì không, hết câu hỏi thì kết thúc": () => {
    toTechnical();
    step(an("FULL"), { secondsLeft: 120, durationSeconds: 1800 });
    const ans = step(an("OPEN_ANSWER", { candidateQuestion: "Kỳ thực tập kéo dài bao lâu ạ?" }), { secondsLeft: 100, durationSeconds: 1800 });
    assert.equal(ans.action, "ANSWER_CANDIDATE");
    assert.equal(step(an("OPEN_ANSWER"), { secondsLeft: 80, durationSeconds: 1800 }).action, "CLOSE");
  },

  "Có JD: chủ đề JD yêu cầu được hỏi trước, khoảng trống bắt đầu từ L1": () => {
    toTechnical();
    // Gắn kế hoạch: JD cần SQL và Git; CV không có Git
    state.plan = {
      candidateSummary: "", jdFacts: [], projects: [], claimsToVerify: [],
      topicPriority: { oop: "normal", java_basics: "normal", collections: "low", sql_basic: "high", exception: "normal", algorithm: "low", git_debug: "high" },
      gapTopics: ["git_debug"]
    };
    const first = step(an("FULL"));                         // oop L2 đạt -> lên L3
    assert.equal(first.action, "STEP_UP");
    const next = step(an("DONT_KNOW"));                      // oop L3 trượt -> chủ đề mới theo ưu tiên JD
    assert.equal(next.topicId, "sql_basic");
    assert.equal(next.level, cfg.startLevel);
    step(an("FULL")); step(an("DONT_KNOW"));                 // sql: đạt L2, trượt L3
    const gap = state.current;
    assert.equal(gap.topicId, "git_debug");
    assert.equal(gap.level, 1);
    const c = summarizeCompetencies(state, cfg);
    assert.equal(c.find(x => x.topic_id === "sql_basic")!.jd_priority, "high");
  },

  "Báo cáo năng lực: đạt / chưa đạt / chưa hỏi": () => {
    toTechnical();
    step(an("FULL")); step(an("DONT_KNOW"));                // oop: đạt L2, trượt L3 -> trần 2
    step(an("DONT_KNOW")); step(an("DONT_KNOW")); step(an("DONT_KNOW")); step(an("DONT_KNOW")); // java_basics trượt cả L2, L1
    const c = summarizeCompetencies(state, cfg);
    assert.equal(c.find(x => x.topic_id === "oop")!.status, "passed");
    assert.equal(c.find(x => x.topic_id === "java_basics")!.status, "below_bar");
    assert.equal(c.find(x => x.topic_id === "git_debug")!.status, "not_assessed");
  }
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err: any) {
    failed++;
    console.log(`✗ ${name}\n   ${err.message}`);
  }
}
console.log(`\n${Object.keys(tests).length - failed}/${Object.keys(tests).length} kiểm thử đạt`);
process.exit(failed ? 1 : 0);
