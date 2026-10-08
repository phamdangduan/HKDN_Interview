import dotenv from "dotenv";

dotenv.config();

const BLAZE_API_KEY = process.env.BLAZE_API_KEY || "68f5578def0d2c60d7cd49e9743f0c27ede87304";
const BLAZE_BASE_URL = "https://api.blaze.vn";

// Danh mục các giọng đọc Tiếng Việt chuẩn chất lượng cao được kiểm thử thành công trên Blaze AI
export const BLAZE_VOICES: Record<string, { id: string; name: string; gender: "Nam" | "Nữ"; region: string; desc: string }> = {
  "HN-Nam-2-BL": {
    id: "HN-Nam-2-BL",
    name: "BTV Khắc Cường",
    gender: "Nam",
    region: "Hà Nội",
    desc: "Trầm ấm, bản lĩnh, phong thái Tech Lead chuyên nghiệp (Mặc định)"
  },
  "HN-Nam-3-BL": {
    id: "HN-Nam-3-BL",
    name: "BTV Thanh Tùng",
    gender: "Nam",
    region: "Hà Nội",
    desc: "Đĩnh đạc, phong thái Giám đốc kỹ thuật / Quản lý cấp cao"
  },
  "quangminh_mc": {
    id: "quangminh_mc",
    name: "Quang Minh MC",
    gender: "Nam",
    region: "Hà Nội",
    desc: "Trẻ trung, năng động, rất hợp phong cách Tech Startup"
  },
  "Nam-AdamTiktok": {
    id: "Nam-AdamTiktok",
    name: "Adam Miền Nam",
    gender: "Nam",
    region: "TP. Hồ Chí Minh",
    desc: "Giọng nam miền Nam tự nhiên, hiện đại, gần gũi"
  },
  "HN-Nu-1-TM": {
    id: "HN-Nu-1-TM",
    name: "BTV Hương Giang",
    gender: "Nữ",
    region: "Hà Nội",
    desc: "Thuyết minh truyền cảm, chuẩn mực, phong thái HR Lead"
  },
  "HN-Pod-Nu-NgocNhu": {
    id: "HN-Pod-Nu-NgocNhu",
    name: "Ngọc Như Podcast",
    gender: "Nữ",
    region: "Hà Nội",
    desc: "Nhẹ nhàng, điềm đạm, phong cách phỏng vấn tâm lý / văn hóa"
  },
  "HCM-Nar-Nu-SaleThuyVy": {
    id: "HCM-Nar-Nu-SaleThuyVy",
    name: "Thúy Vy Miền Nam",
    gender: "Nữ",
    region: "TP. Hồ Chí Minh",
    desc: "Giọng nữ miền Nam ngọt ngào, rõ ràng, phong thái chuyên nghiệp"
  }
};

/**
 * Tạo giọng nói Tiếng Việt chuẩn chất lượng cao qua Blaze AI API
 * @param text Đoạn văn bản cần đọc
 * @param personaOrVoiceId Tên persona hoặc mã giọng đọc (Mặc định HN-Nam-2-BL)
 * @returns Buffer âm thanh MP3 hoặc null nếu thất bại
 */
export async function synthesizeSpeechBlaze(
  text: string,
  personaOrVoiceId = "HN-Nam-2-BL"
): Promise<Buffer | null> {
  const apiKey = (process.env.BLAZE_API_KEY || BLAZE_API_KEY).trim();
  if (!apiKey) {
    console.error("❌ [Blaze TTS] Thiếu BLAZE_API_KEY trong cấu hình.");
    return null;
  }

  const cleanText = (text || "").trim();
  if (!cleanText) return null;

  // Xác định speaker ID: ưu tiên mã giọng hợp lệ, nếu là persona thì map hoặc fallback
  let speakerId = "HN-Nam-2-BL";
  if (BLAZE_VOICES[personaOrVoiceId]) {
    speakerId = personaOrVoiceId;
  } else if (personaOrVoiceId === "Sarah Jenkins" || personaOrVoiceId === "Rachel Vance") {
    speakerId = "HN-Nu-1-TM";
  } else if (personaOrVoiceId === "David Miller") {
    speakerId = "HN-Nam-3-BL";
  }

  const startTime = Date.now();

  // Thử tạo job (có retry nếu gặp 429 rate limit)
  let jobId: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const createRes = await fetch(`${BLAZE_BASE_URL}/v1/tts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: cleanText,
          speaker_id: speakerId,
          language: "vi",
          model: "v2.0_pro",
          audio_format: "mp3",
          audio_speed: 1.0
        })
      });

      if (createRes.status === 429) {
        console.warn(`⚠️ [Blaze TTS] Gặp Rate Limit 429 (lần ${attempt}/3). Chờ 1.2s thử lại...`);
        await new Promise(resolve => setTimeout(resolve, 1200));
        continue;
      }

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => "");
        console.warn(`[Blaze TTS] Tạo job thất bại (Status ${createRes.status}):`, errText);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        return null;
      }

      const resData = await createRes.json() as { id?: string };
      jobId = resData.id || null;
      if (jobId) break;
    } catch (err: any) {
      console.warn(`[Blaze TTS Exception khi tạo job lần ${attempt}]: ${err.message}`);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!jobId) {
    console.error(`❌ [Blaze TTS] Không thể tạo Job âm thanh sau 3 lần thử.`);
    return null;
  }

  // Polling kết quả xử lý (tối đa 35 lần * 260ms ~ 9.1s)
  const maxRetries = 35;
  const intervalMs = 260;

  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    try {
      const infoRes = await fetch(`${BLAZE_BASE_URL}/v1/tts/${jobId}/info`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });

      if (!infoRes.ok) continue;

      const info = await infoRes.json() as { status?: string };
      if (info.status === "completed") {
        // Tải Audio MP3
        const audioRes = await fetch(`${BLAZE_BASE_URL}/v1/tts/${jobId}/play`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });

        if (audioRes.ok) {
          const arrayBuf = await audioRes.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuf);
          const duration = Date.now() - startTime;
          console.log(`🎙️ [Blaze Voice AI] Sinh âm thanh thành công (${audioBuffer.length} bytes, giọng: ${speakerId}, thời gian: ${duration}ms)`);
          return audioBuffer;
        }
      } else if (info.status === "failed") {
        console.warn(`❌ [Blaze TTS] Job ${jobId} báo trạng thái failed.`);
        return null;
      }
    } catch (pollErr: any) {
      console.warn(`[Blaze TTS Poll Exception]: ${pollErr.message}`);
    }
  }

  console.warn(`⚠️ [Blaze TTS] Timeout quá ${maxRetries * intervalMs}ms chưa có kết quả.`);
  return null;
}
