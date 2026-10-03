import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export const campaignsRouter = Router();

// POST /api/campaigns - Tạo mới một đợt tuyển dụng
campaignsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const {
      title,
      company,
      location,
      stipend,
      perks,
      job_description,
      cutoff_score = 80,
      target_level = "fresher",
      track = "backend"
    } = req.body;

    if (!title || !company || !job_description) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc: title, company, job_description" });
    }

    const campaign = await prisma.campaign.create({
      data: {
        title,
        company,
        location: location || null,
        stipend: stipend || null,
        perks: perks || null,
        job_description,
        cutoff_score: Number(cutoff_score) || 80,
        target_level: target_level || "fresher",
        track: track || "backend",
        status: "active"
      }
    });

    return res.status(201).json(campaign);
  } catch (err: any) {
    console.error("[Create Campaign Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi tạo chiến dịch" });
  }
});

// GET /api/campaigns - Lấy danh sách các đợt tuyển dụng đang mở
campaignsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const list = await prisma.campaign.findMany({
      orderBy: { created_at: "desc" }
    });
    return res.json(list);
  } catch (err: any) {
    console.error("[List Campaigns Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lấy danh sách chiến dịch" });
  }
});

// GET /api/campaigns/:id - Chi tiết một đợt tuyển dụng
campaignsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID chiến dịch không hợp lệ" });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Không tìm thấy đợt tuyển dụng" });
    }

    return res.json(campaign);
  } catch (err: any) {
    console.error("[Get Campaign Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lấy thông tin chiến dịch" });
  }
});

// GET /api/campaigns/:id/vetted-matrix - Ma trận ứng viên đã qua vòng lọc AI
campaignsRouter.get("/:id/vetted-matrix", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        interview_sessions: {
          include: {
            candidate: true,
            evaluation: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Không tìm thấy đợt tuyển dụng" });
    }

    const results = campaign.interview_sessions.map(s => {
      const candidate = s.candidate;
      const evalData = s.evaluation;
      return {
        session_id: s.id,
        candidate_id: candidate?.id || null,
        full_name: candidate?.full_name || "Ẩn danh",
        email: candidate?.email || "",
        role: s.role_target,
        persona: s.persona,
        status: s.status,
        total_score: evalData?.total_score || 0,
        is_passed: evalData?.is_passed || false,
        cutoff_score: campaign.cutoff_score,
        created_at: s.created_at
      };
    });

    return res.json({
      campaign_id: campaign.id,
      campaign_title: campaign.title,
      company: campaign.company,
      cutoff_score: campaign.cutoff_score,
      total_applicants: results.length,
      passed_count: results.filter(r => r.is_passed).length,
      candidates: results
    });
  } catch (err: any) {
    console.error("[Vetted Matrix Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lấy ma trận ứng viên" });
  }
});
