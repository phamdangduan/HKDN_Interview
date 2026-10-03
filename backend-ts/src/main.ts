import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { campaignsRouter } from "./routers/campaigns.js";
import { candidatesRouter } from "./routers/candidates.js";
import { interviewsRouter } from "./routers/interviews.js";

import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");
const projectRoot = path.resolve(__dirname, "../../");

const app = express();
const port = parseInt(process.env.APP_PORT || process.env.PORT || "8000", 10);

// Middleware
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["*"],
  allowedHeaders: ["*"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Mount Static Files for Frontend
app.use(express.static(frontendDir));
app.use("/frontend", express.static(frontendDir));
app.use(express.static(projectRoot));

// Mount Routers
app.use("/api/campaigns", campaignsRouter);
app.use("/api/candidates", candidatesRouter);
app.use("/api/interviews", interviewsRouter);

// Favicon handler
app.get("/favicon.ico", (_req, res) => res.status(204).end());

// Health Check & Root Entry
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    service: "TalentAI High-Performance TypeScript Backend API Server",
    runtime: `Node.js ${process.version}`,
    database: "MySQL (talentai_db via Prisma ORM)",
    endpoints: {
      campaigns: "/api/campaigns",
      candidates: "/api/candidates",
      interviews: "/api/interviews",
      tts: "/api/interviews/tts?text=..."
    }
  });
});

app.get("/", (req, res) => {
  if (req.accepts("html") && !req.xhr) {
    return res.sendFile(path.join(frontendDir, "index.html"));
  }
  res.json({
    status: "online",
    service: "TalentAI High-Performance TypeScript Backend API Server",
    runtime: `Node.js ${process.version}`,
    database: "MySQL (talentai_db via Prisma ORM)",
    endpoints: {
      campaigns: "/api/campaigns",
      candidates: "/api/candidates",
      interviews: "/api/interviews",
      tts: "/api/interviews/tts?text=..."
    }
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log("========================================================");
  console.log("    🚀 TALENTAI BACKEND SERVER (TypeScript + Express + Prisma)");
  console.log("========================================================");
  console.log(`📡 Server is running at: http://localhost:${port}`);
  console.log(`🔗 Database: MySQL (talentai_db)`);
  console.log(`🤖 AI Engine: Google Gemini 2.5 Flash / Flash Lite`);
  console.log("========================================================");
});
