import { Router, Request, Response } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { prisma } from "../db/prisma.js";
import { analyzeCvAndJdMatching } from "../services/aiEngine.js";

export const candidatesRouter = Router();

// Cấu hình lưu trữ tệp CV trong bộ nhớ RAM tạm thời để trích xuất text
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Trích nội dung chữ từ file CV (.pdf, .docx, .txt). Trả về null nếu không đọc được.
async function extractCvText(file: Express.Multer.File): Promise<{ filename: string; text: string | null }> {
  const filename = Buffer.from(file.originalname, "latin1").toString("utf8");
  const lower = filename.toLowerCase();
  try {
    if (lower.endsWith(".pdf")) {
      const pdfData = await pdfParse(file.buffer);
      return { filename, text: pdfData.text?.trim() || null };
    }
    if (lower.endsWith(".docx")) {
      const docxData = await mammoth.extractRawText({ buffer: file.buffer });
      return { filename, text: docxData.value?.trim() || null };
    }
    return { filename, text: file.buffer.toString("utf-8").trim() || null };
  } catch (e: any) {
    console.warn(`[CV Parse Error] ${filename}:`, e.message);
    return { filename, text: null };
  }
}

// POST /api/candidates/parse-cv - Đọc nội dung CV để dùng khi thiết lập buổi phỏng vấn
candidatesRouter.post("/parse-cv", upload.single("cv_file"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "Chưa có file CV" });
  }
  const { filename, text } = await extractCvText(req.file);
  if (!text) {
    return res.status(422).json({
      error: "Không đọc được nội dung chữ trong file CV. Nếu CV là ảnh scan, hãy dùng bản PDF/DOCX có chữ hoặc dán nội dung CV."
    });
  }
  return res.json({ filename, text, chars: text.length });
});

// POST /api/candidates/apply - Ứng viên nộp CV ứng tuyển
candidatesRouter.post("/apply", upload.single("cv_file"), async (req: Request, res: Response) => {
  try {
    const { full_name, email, phone, campaign_id, target_level = "fresher" } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ error: "Họ và tên cùng email là thông tin bắt buộc" });
    }

    let cvFilename: string | null = null;
    let cvText: string | null = null;

    if (req.file) {
      const parsed = await extractCvText(req.file);
      cvFilename = parsed.filename;
      cvText = parsed.text;
    }

    const candidate = await prisma.candidate.create({
      data: {
        full_name,
        email,
        phone: phone || null,
        campaign_id: campaign_id ? parseInt(campaign_id, 10) : null,
        cv_filename: cvFilename,
        cv_text: cvText,
        target_level: target_level || "fresher"
      }
    });

    return res.status(201).json(candidate);
  } catch (err: any) {
    console.error("[Candidate Apply Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi xử lý hồ sơ ứng viên" });
  }
});

// GET /api/candidates/:id - Chi tiết ứng viên
candidatesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Không tìm thấy hồ sơ ứng viên" });
    }

    return res.json(candidate);
  } catch (err: any) {
    console.error("[Get Candidate Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi lấy thông tin ứng viên" });
  }
});

// POST /api/candidates/match-cv-jd - So khớp ATS giữa CV và JD bằng Gemini AI
candidatesRouter.post("/match-cv-jd", async (req: Request, res: Response) => {
  try {
    const { cv_text, jd_text, role_title = "Backend Software Engineer", target_level = "fresher", track = "backend" } = req.body;

    if (!cv_text && !jd_text) {
      return res.status(400).json({ error: "Vui lòng cung cấp nội dung CV và JD để so khớp" });
    }

    const matchResult = await analyzeCvAndJdMatching(
      cv_text || "",
      jd_text || "",
      role_title,
      target_level,
      track
    );

    return res.json(matchResult);
  } catch (err: any) {
    console.error("[Match CV-JD Error]:", err);
    return res.status(500).json({ error: err.message || "Lỗi phân tích so khớp CV-JD" });
  }
});
