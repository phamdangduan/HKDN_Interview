import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db/prisma.js";
import {
  generateInterviewQuestions,
  generateAdaptiveNextTurn,
  evaluateStarInterview,
  analyzeCvAndJdMatching
} from "../services/aiEngine.js";
import { synthesizeSpeechBlaze, BLAZE_VOICES } from "../services/blazeTts.js";
import { getLevelConfig } from "../interview/config.js";
import { createInitialState, parseState, summarizeCompetencies } from "../interview/state.js";
import { buildInterviewPlan, buildOpeningLine, runInterviewTurn } from "../interview/brain.js";
import { Action } from "../interview/policy.js";

export const interviewsRouter = Router();

// Trạng thái v2 chứa đáp án kỳ vọng nên không trả về trình duyệt
function publicSession<T extends { interview_state?: string | null }>(session: T): Omit<T, "interview_state"> {
  const { interview_state, ...rest } = session;
  return rest;
}

// Ánh xạ hành động v2 sang 3 huy hiệu chiến lược đang có trên giao diện mock_room
const ACTION_BRANCH: Record<Action, string> = {
  STEP_UP: "PROBE_DEEPER",
  ASK_TOPIC: "PROBE_DEEPER",
  FOLLOW_UP: "GROUND_TO_PRACTICE",
  PROBE_MISCONCEPTION: "GROUND_TO_PRACTICE",
  OPEN_QUESTION: "GROUND_TO_PRACTICE",
  OPEN_FOLLOW_UP: "GROUND_TO_PRACTICE",
  ANSWER_CANDIDATE: "GROUND_TO_PRACTICE",
  STEP_DOWN: "EMPATHIC_PIVOT",
  HINT: "EMPATHIC_PIVOT",
  REPHRASE: "EMPATHIC_PIVOT",
  REASSURE_EASIER: "EMPATHIC_PIVOT",
  CLOSE: "GROUND_TO_PRACTICE"
};

// Memory Cache cho TTS Audio
const ttsCache = new Map<string, Buffer>();

// POST /api/interviews/start - Khởi tạo phiên phỏng vấn mới
interviewsRouter.post("/start", async (req: Request, res: Response) => {
  try {
    const {
      candidate_id,
      campaign_id,
      mode = "self_practice",
      role_target = "Backend Software Engineer",
      requirement_text = "",
      persona = "Alex Chen",
      difficulty_level = 4,
      duration_minutes = 30,
      target_level = "fresher",
      track = "backend",
      cv_text: cvTextParam
    } = req.body;

    const sessionId = `sess_${crypto.randomBytes(6).toString("hex")}`;

    let reqFull = requirement_text || "";
    let cvText = cvTextParam || "";
    let jdText = reqFull;

    if (reqFull.includes("[Hồ sơ CV:")) {
      const parts = reqFull.split("[Hồ sơ CV:");
      if (parts[1] && parts[1].includes("]")) {
        const [cvPart, rest] = parts[1].split("]");
        if (!cvText) {
          cvText = cvPart.trim();
        }
        jdText = rest.trim();
      }
    }

    const lvl = target_level || "fresher";
    const trk = track || "backend";
    const levelCfg = getLevelConfig(lvl);
    // setup.html gửi JD riêng qua jd_text; requirement_text có thể chỉ là yêu cầu tự soạn chứ không phải JD
    if (typeof req.body.jd_text === "string") jdText = req.body.jd_text.trim();

    // Phân tích so khớp tự động nếu có đủ CV và JD (engine cũ; engine v2 tự lập kế hoạch bên dưới)
    if (!levelCfg && cvText && jdText) {
      try {
        analyzeCvAndJdMatching(cvText, jdText, role_target, lvl, trk).catch(() => {});
      } catch (e) {
        console.warn("[Start Interview] CV-JD background warning:", e);
      }
    }

    // 1. Cấp bậc đã có engine v2 (hiện là intern): câu mở đầu soạn sẵn, các câu sau sinh theo từng lượt.
    //    Các cấp bậc khác: sinh bộ 10 câu hỏi như cũ.
    let questions: string[];
    let interviewState: string | null = null;
    if (levelCfg) {
      const opening = buildOpeningLine(persona, Number(duration_minutes) || 30);
      questions = [opening];
      // Lập kế hoạch từ CV + JD; lỗi hoặc không có CV/JD thì phỏng vấn theo thứ tự chủ đề mặc định
      const plan = await buildInterviewPlan(cvText, jdText, role_target, levelCfg);
      interviewState = JSON.stringify(createInitialState(levelCfg, {
        persona,
        role: role_target,
        company: req.body.company || "",
        cvText,
        openingText: opening,
        plan
      }));
    } else {
      questions = await generateInterviewQuestions(
        role_target,
        cvText,
        jdText || reqFull,
        persona,
        Number(difficulty_level) || 4,
        Number(duration_minutes) || 30,
        lvl,
        trk
      );
    }

    // 2. Tạo phiên trong cơ sở dữ liệu
    const session = await prisma.interviewSession.create({
      data: {
        id: sessionId,
        candidate_id: candidate_id ? parseInt(candidate_id, 10) : null,
        campaign_id: campaign_id ? parseInt(campaign_id, 10) : null,
        mode,
        role_target,
        target_level: lvl,
        track: trk,
        requirement_text,
        persona,
        difficulty_level: Number(difficulty_level) || 4,
        duration_minutes: Number(duration_minutes) || 30,
        status: "in_progress",
        interview_state: interviewState
      }
    });

    // 3. Lưu sẵn danh sách câu hỏi vào bảng turns
    await prisma.$transaction(
      questions.map((qText, idx) =>
        prisma.interviewTurn.create({
          data: {
            session_id: sessionId,
            turn_number: idx + 1,
            question_text: qText,
            answer_transcript: null
          }
        })
      )
    );

    return res.status(201).json({
      ...publicSession(session),
      questions,
      engine: levelCfg ? "v2" : "v1"
    });
  } catch (err: any) {
    console.error("[Start Interview Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi khởi tạo phiên phỏng vấn" });
  }
});

// GET /api/interviews/voices - Danh sách giọng đọc Blaze AI hỗ trợ
interviewsRouter.get("/voices", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    voices: Object.values(BLAZE_VOICES)
  });
});

// GET /api/interviews/tts - Chuyển văn bản thành giọng nói chuẩn Blaze AI
interviewsRouter.get("/tts", async (req: Request, res: Response) => {
  try {
    const text = ((req.query.text as string) || "").trim();
    const persona = ((req.query.persona as string) || "Alex Chen").trim();
    const voice = ((req.query.voice as string) || "").trim();
    const voiceTarget = voice || persona;

    if (!text) {
      return res.status(400).json({ error: "Vui lòng cung cấp văn bản cần đọc" });
    }

    const cacheKey = `blaze:${voiceTarget}:${text}`;
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(cached);
    }

    // Tạo giọng đọc chuẩn Studio qua Blaze AI API
    const blazeAudio = await synthesizeSpeechBlaze(text, voiceTarget);
    if (blazeAudio && blazeAudio.length > 0) {
      if (ttsCache.size > 300) ttsCache.clear();
      ttsCache.set(cacheKey, blazeAudio);
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(blazeAudio);
    }

    console.warn(`[TTS] Blaze AI chưa thể tạo âm thanh cho: "${text.substring(0, 50)}..."`);
    return res.status(502).json({ error: "Dịch vụ giọng nói Blaze AI tạm thời chưa hoàn thành bản đọc." });
  } catch (err: any) {
    console.error("[TTS Error]:", err);
    return res.status(500).json({ error: `Lỗi tạo giọng nói: ${err.message}` });
  }
});

// GET /api/interviews/:id - Thông tin phiên phỏng vấn
interviewsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    let session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        turns: {
          orderBy: { turn_number: "asc" }
        }
      }
    });

    if (!session) {
      // Phục hồi an toàn nếu session chưa tồn tại
      const questions = await generateInterviewQuestions("Backend Software Engineer");
      session = await prisma.interviewSession.create({
        data: {
          id: sessionId,
          role_target: "Backend Software Engineer",
          persona: "Alex Chen",
          difficulty_level: 4,
          duration_minutes: 30,
          status: "in_progress"
        },
        include: { turns: true }
      });

      await prisma.$transaction(
        questions.map((q, idx) =>
          prisma.interviewTurn.create({
            data: {
              session_id: sessionId,
              turn_number: idx + 1,
              question_text: q
            }
          })
        )
      );

      return res.json({
        ...session,
        questions
      });
    }

    const questions = session.turns?.map(t => t.question_text) || [];
    return res.json({
      ...publicSession(session),
      questions,
      engine: parseState(session.interview_state) ? "v2" : "v1"
    });
  } catch (err: any) {
    console.error("[Get Session Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lấy thông tin phiên phỏng vấn" });
  }
});

// POST /api/interviews/turns - Ghi nhận câu trả lời từng lượt
interviewsRouter.post("/turns", async (req: Request, res: Response) => {
  try {
    const { session_id, turn_number, question_text, answer_transcript, audio_url } = req.body;

    if (!session_id || turn_number === undefined) {
      return res.status(400).json({ error: "Thiếu session_id hoặc turn_number" });
    }

    // Đảm bảo session tồn tại
    let session = await prisma.interviewSession.findUnique({
      where: { id: session_id }
    });
    if (!session) {
      session = await prisma.interviewSession.create({
        data: {
          id: session_id,
          role_target: "Ứng viên",
          persona: "Alex Chen",
          difficulty_level: 4,
          duration_minutes: 30,
          status: "in_progress"
        }
      });
    }

    const existingTurn = await prisma.interviewTurn.findFirst({
      where: {
        session_id,
        turn_number: Number(turn_number)
      }
    });

    if (existingTurn) {
      const updated = await prisma.interviewTurn.update({
        where: { id: existingTurn.id },
        data: {
          question_text: question_text || existingTurn.question_text,
          answer_transcript,
          audio_url: audio_url || existingTurn.audio_url
        }
      });
      return res.json(updated);
    }

    const created = await prisma.interviewTurn.create({
      data: {
        session_id,
        turn_number: Number(turn_number),
        question_text: question_text || "Câu hỏi",
        answer_transcript,
        audio_url
      }
    });

    return res.status(201).json(created);
  } catch (err: any) {
    console.error("[Record Turn Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lưu lượt phỏng vấn" });
  }
});

// GET /api/interviews/:id/turns - Lịch sử các câu hỏi đáp của phiên
interviewsRouter.get("/:id/turns", async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const turns = await prisma.interviewTurn.findMany({
      where: { session_id: sessionId },
      orderBy: { turn_number: "asc" }
    });
    return res.json(turns);
  } catch (err: any) {
    console.error("[Get Turns Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lấy danh sách turns" });
  }
});

// POST /api/interviews/next-question - AI phản hồi tức thời & sinh câu hỏi thích ứng tiếp theo
interviewsRouter.post("/next-question", async (req: Request, res: Response) => {
  try {
    const {
      session_id,
      stage_id,
      stage_name,
      stage_index,
      current_question,
      candidate_answer,
      default_next_question = "",
      target_level,
      track,
      duration_minutes,
      seconds_left
    } = req.body;

    const session = session_id
      ? await prisma.interviewSession.findUnique({
          where: { id: session_id },
          include: { campaign: true }
        })
      : null;

    const role = session?.role_target || "Backend Software Engineer";
    const persona = session?.persona || "Alex Chen";
    const difficulty = session?.difficulty_level || 4;
    const company = session?.campaign?.company || "doanh nghiệp";
    const lvl = target_level || session?.target_level || "fresher";
    const trk = track || session?.track || "backend";
    const duration = Number(duration_minutes) || session?.duration_minutes || 30;
    const secLeft = seconds_left !== undefined ? Number(seconds_left) : duration * 60;

    // Lấy lịch sử các lượt trước từ cơ sở dữ liệu để AI có trí nhớ hoàn chỉnh (Working Memory)
    // CHỈ lấy các lượt đã diễn ra và có câu trả lời (loại bỏ các câu rỗng tương lai)
    let turnsHistory: Array<{ turn_number: number; question_text: string; answer_transcript?: string | null }> = [];
    if (session_id) {
      turnsHistory = await prisma.interviewTurn.findMany({
        where: {
          session_id,
          answer_transcript: { not: null }
        },
        orderBy: { turn_number: "asc" },
        select: { turn_number: true, question_text: true, answer_transcript: true }
      });
    }

    // Engine v2: phân tích -> luật điều phối -> lời nói, trạng thái lưu trong session
    const levelCfg = getLevelConfig(session?.target_level);
    const v2State = parseState(session?.interview_state);
    if (session && levelCfg && v2State) {
      const answer = String(candidate_answer || "").trim();
      // /turns đã lưu lượt hiện tại trước khi gọi API này; bỏ nó khỏi lịch sử để không bị lặp trong prompt
      const last = turnsHistory[turnsHistory.length - 1];
      const history = last && (last.answer_transcript || "").trim() === answer ? turnsHistory.slice(0, -1) : turnsHistory;

      const result = await runInterviewTurn(v2State, levelCfg, answer, history, {
        secondsLeft: secLeft,
        durationSeconds: duration * 60
      });

      await prisma.interviewSession.update({
        where: { id: session.id },
        data: { interview_state: JSON.stringify(result.state) }
      });

      const phase = levelCfg.phases.find(p => p.id === result.move.phase)!;
      return res.json({
        engine: "v2",
        action: result.move.action,
        branch: ACTION_BRANCH[result.move.action],
        branch_reason: result.move.reason,
        competency_focus: result.move.topicName ? `${result.move.topicName} · L${result.move.level}` : phase.name,
        intent: result.analysis.category,
        feedback_phrase: "",
        next_question: result.spoken,
        stage_id: phase.id,
        stage_index: phase.stageIndex,
        stage_name: phase.name,
        is_finished: result.move.action === "CLOSE",
        quota_warning: result.quotaWarning,
        is_fallback: result.isFallback
      });
    }

    const aiResult = await generateAdaptiveNextTurn(
      role,
      persona,
      stage_id,
      stage_name,
      Number(stage_index) || 0,
      current_question,
      candidate_answer,
      company,
      difficulty,
      default_next_question,
      lvl,
      trk,
      turnsHistory,
      duration,
      secLeft
    );

    return res.json({
      branch: aiResult.branch || "PROBE_DEEPER",
      branch_reason: aiResult.branch_reason || "",
      candidate_statement_analysis: aiResult.candidate_statement_analysis || "",
      competency_focus: aiResult.competency_focus || "Kỹ năng lập trình cốt lõi",
      intent: aiResult.intent || "GOOD",
      turn_score: Number(aiResult.turn_score) || 6.0,
      feedback_phrase: aiResult.feedback_phrase || "Tôi đã ghi nhận câu trả lời của bạn.",
      next_question: aiResult.next_question || default_next_question || "Hãy tiếp tục với câu hỏi tiếp theo.",
      critique: aiResult.critique || "",
      is_pivot: Boolean(aiResult.is_pivot),
      should_advance_stage: Boolean(aiResult.should_advance_stage ?? true),
      quota_warning: aiResult.quota_warning || null,
      is_fallback: Boolean(aiResult.is_fallback)
    });
  } catch (err: any) {
    console.error("[Adaptive Next Turn Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi xử lý câu hỏi thích ứng" });
  }
});

// POST /api/interviews/:id/complete - Kết thúc và chấm điểm STAR
interviewsRouter.post("/:id/complete", async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;

    let session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { campaign: true }
    });

    if (!session) {
      session = await prisma.interviewSession.create({
        data: {
          id: sessionId,
          role_target: "Ứng viên",
          persona: "Alex Chen",
          difficulty_level: 4,
          duration_minutes: 30,
          status: "in_progress"
        },
        include: { campaign: true }
      });
    }

    // Cập nhật trạng thái completed
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        completed_at: new Date()
      }
    });

    const cutoff = session.campaign?.cutoff_score || 80;

    // Lấy danh sách turns
    const turns = await prisma.interviewTurn.findMany({
      where: { session_id: sessionId },
      orderBy: { turn_number: "asc" }
    });

    // Chỉ chấm các lượt đã thực sự diễn ra: /start tạo sẵn 10 lượt rỗng làm kịch bản,
    // các lượt chưa được hỏi tới không được tính là ứng viên đã trả lời.
    const turnsData = turns
      .filter(t => t.answer_transcript !== null)
      .map(t => ({
        question_text: t.question_text,
        answer_transcript: t.answer_transcript?.trim() || ""
      }));

    const levelCfg = getLevelConfig(session.target_level);
    const v2State = parseState(session.interview_state);
    const competencies = levelCfg && v2State ? summarizeCompetencies(v2State, levelCfg) : null;
    const competencyNotes = competencies
      ? competencies.map(c => `- ${c.topic_name}: ${c.summary}`).join("\n")
      : "";

    // Điểm chỉ do server chấm, không nhận điểm gửi lên từ trình duyệt.
    const aiRes = await evaluateStarInterview(
      session.role_target,
      turnsData,
      cutoff,
      session.target_level || "fresher",
      session.track || "backend",
      competencyNotes
    );

    const sit = Number(aiRes.situation_score) || 0;
    const tsk = Number(aiRes.task_score) || 0;
    const act = Number(aiRes.action_score) || 0;
    const resScore = Number(aiRes.result_score) || 0;
    const tot = Number(aiRes.total_score) || 0;
    const passed = Boolean(aiRes.is_passed);
    const strengths = aiRes.strengths || "";
    const weaknesses = aiRes.weaknesses || "";
    const recs = aiRes.ai_recommendations || "";
    const summary = aiRes.dossier_summary || "";
    const turnEvalsStr = aiRes.turn_evaluations ? JSON.stringify(aiRes.turn_evaluations) : null;

    const evaluation = await prisma.starEvaluation.upsert({
      where: { session_id: sessionId },
      create: {
        session_id: sessionId,
        situation_score: sit,
        task_score: tsk,
        action_score: act,
        result_score: resScore,
        total_score: tot,
        is_passed: passed,
        strengths,
        weaknesses,
        ai_recommendations: recs,
        dossier_summary: summary,
        turn_evaluations: turnEvalsStr
      },
      update: {
        situation_score: sit,
        task_score: tsk,
        action_score: act,
        result_score: resScore,
        total_score: tot,
        is_passed: passed,
        strengths,
        weaknesses,
        ai_recommendations: recs,
        dossier_summary: summary,
        turn_evaluations: turnEvalsStr
      }
    });

    return res.json(competencies ? { ...evaluation, competencies } : evaluation);
  } catch (err: any) {
    console.error("[Complete Interview Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi kết thúc phỏng vấn" });
  }
});

// GET /api/interviews/:id/report - Lấy báo cáo thẩm định
interviewsRouter.get("/:id/report", async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const evalData = await prisma.starEvaluation.findUnique({
      where: { session_id: sessionId }
    });

    if (!evalData) {
      return res.status(404).json({ error: "Chưa có báo cáo đánh giá cho phiên này" });
    }

    const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
    const levelCfg = getLevelConfig(session?.target_level);
    const v2State = parseState(session?.interview_state);
    if (levelCfg && v2State) {
      return res.json({ ...evalData, competencies: summarizeCompetencies(v2State, levelCfg) });
    }

    return res.json(evalData);
  } catch (err: any) {
    console.error("[Get Report Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lấy báo cáo phỏng vấn" });
  }
});
