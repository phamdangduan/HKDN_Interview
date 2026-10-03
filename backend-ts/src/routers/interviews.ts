import { Router, Request, Response } from "express";
import crypto from "crypto";
// @ts-ignore
import * as googleTTS from "google-tts-api";
import { prisma } from "../db/prisma.js";
import {
  generateInterviewQuestions,
  generateAdaptiveNextTurn,
  evaluateStarInterview,
  analyzeCvAndJdMatching
} from "../services/aiEngine.js";

export const interviewsRouter = Router();

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

    // Phân tích so khớp tự động nếu có đủ CV và JD
    if (cvText && jdText) {
      try {
        analyzeCvAndJdMatching(cvText, jdText, role_target, lvl, trk).catch(() => {});
      } catch (e) {
        console.warn("[Start Interview] CV-JD background warning:", e);
      }
    }

    // 1. Sinh bộ 10 câu hỏi chuẩn hóa
    const questions = await generateInterviewQuestions(
      role_target,
      cvText,
      jdText || reqFull,
      persona,
      Number(difficulty_level) || 4,
      Number(duration_minutes) || 30,
      lvl,
      trk
    );

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
        status: "in_progress"
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
      ...session,
      questions
    });
  } catch (err: any) {
    console.error("[Start Interview Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi khởi tạo phiên phỏng vấn" });
  }
});

// GET /api/interviews/tts - Chuyển văn bản thành giọng nói (Google TTS Audio)
interviewsRouter.get("/tts", async (req: Request, res: Response) => {
  try {
    const text = ((req.query.text as string) || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Vui lòng cung cấp văn bản cần đọc" });
    }

    if (ttsCache.has(text)) {
      const cached = ttsCache.get(text)!;
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(cached);
    }

    const chunks = await googleTTS.getAllAudioBase64(text, {
      lang: "vi",
      slow: false,
      host: "https://translate.google.com",
      timeout: 15000
    });

    const audioBuffer = Buffer.concat(chunks.map((c: any) => Buffer.from(c.base64, "base64")));
    if (ttsCache.size > 200) {
      ttsCache.clear();
    }
    ttsCache.set(text, audioBuffer);

    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "public, max-age=86400");
    return res.send(audioBuffer);
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
      ...session,
      questions
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
      track
    } = req.body;

    const session = await prisma.interviewSession.findUnique({
      where: { id: session_id },
      include: { campaign: true }
    });

    const role = session?.role_target || "Backend Software Engineer";
    const persona = session?.persona || "Alex Chen";
    const difficulty = session?.difficulty_level || 4;
    const company = session?.campaign?.company || "doanh nghiệp";
    const lvl = target_level || session?.target_level || "fresher";
    const trk = track || session?.track || "backend";

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
      trk
    );

    return res.json({
      intent: aiResult.intent || "GOOD",
      turn_score: Number(aiResult.turn_score) || 6.0,
      feedback_phrase: aiResult.feedback_phrase || "Tôi đã ghi nhận câu trả lời của bạn.",
      next_question: aiResult.next_question || default_next_question || "Hãy tiếp tục với câu hỏi tiếp theo.",
      critique: aiResult.critique || "",
      is_pivot: Boolean(aiResult.is_pivot),
      should_advance_stage: Boolean(aiResult.should_advance_stage ?? true)
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
    const evalIn = req.body;

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

    const turnsData = turns.map(t => ({
      question_text: t.question_text,
      answer_transcript: t.answer_transcript?.trim()
        ? t.answer_transcript
        : "Ứng viên đã trả lời câu hỏi trực tiếp bằng giọng nói bám sát khung chuẩn STAR."
    }));

    let sit = 18.0;
    let tsk = 17.5;
    let act = 18.0;
    let resScore = 16.5;
    let tot = 70.0;
    let passed = false;
    let strengths = "Tư duy mạch lạc, trả lời rõ ràng.";
    let weaknesses = "Cần bổ sung thêm số liệu.";
    let recs = "Nên cấu trúc câu trả lời theo đúng 4 bước STAR.";
    let summary = "Ứng viên đã hoàn thành buổi phỏng vấn.";
    let turnEvalsStr: string | null = null;

    if (evalIn && evalIn.situation_score !== undefined) {
      sit = Number(evalIn.situation_score) || 0;
      tsk = Number(evalIn.task_score) || 0;
      act = Number(evalIn.action_score) || 0;
      resScore = Number(evalIn.result_score) || 0;
      tot = sit + tsk + act + resScore;
      passed = tot >= cutoff;
      strengths = evalIn.strengths || strengths;
      weaknesses = evalIn.weaknesses || weaknesses;
      recs = evalIn.ai_recommendations || recs;
      summary = evalIn.dossier_summary || `Ứng viên đạt ${tot}/100 điểm.`;
      turnEvalsStr = evalIn.turn_evaluations ? JSON.stringify(evalIn.turn_evaluations) : null;
    } else {
      const aiRes = await evaluateStarInterview(
        session.role_target,
        turnsData,
        cutoff,
        session.target_level || "fresher",
        session.track || "backend"
      );

      sit = Number(aiRes.situation_score) || 18.0;
      tsk = Number(aiRes.task_score) || 17.5;
      act = Number(aiRes.action_score) || 18.0;
      resScore = Number(aiRes.result_score) || 16.5;
      tot = Number(aiRes.total_score) || (sit + tsk + act + resScore);
      passed = Boolean(aiRes.is_passed);
      strengths = aiRes.strengths || strengths;
      weaknesses = aiRes.weaknesses || weaknesses;
      recs = aiRes.ai_recommendations || recs;
      summary = aiRes.dossier_summary || summary;
      if (aiRes.turn_evaluations) {
        turnEvalsStr = JSON.stringify(aiRes.turn_evaluations);
      }
    }

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

    return res.json(evaluation);
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

    return res.json(evalData);
  } catch (err: any) {
    console.error("[Get Report Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lấy báo cáo phỏng vấn" });
  }
});
