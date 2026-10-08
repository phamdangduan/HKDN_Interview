// Mô phỏng trọn một buổi phỏng vấn qua API thật, với một AI đóng vai ứng viên.
// Chạy (server đang chạy ở cổng 8000):
//   npm run simulate:interview -- [--minutes 20] [--cv cv.pdf] [--jd jd.txt] [--keep]
// --cv/--jd: phỏng vấn dựa trên CV (.pdf/.docx/.txt, đọc qua API parse-cv) và JD (file chữ),
//            AI đóng vai đúng ứng viên trong CV.
// Mặc định xoá phiên mô phỏng khỏi DB sau khi chạy xong; --keep để giữ lại xem trên giao diện.
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "../src/db/prisma.js";

dotenv.config();

const BASE = process.env.SIM_BASE_URL || "http://127.0.0.1:8000/api/interviews";
const args = process.argv.slice(2);
const minutes = Number(args[args.indexOf("--minutes") + 1]) || 20;
const keep = args.includes("--keep");
const argValue = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : "");
const cvPath = argValue("--cv");
const jdPath = argValue("--jd");
const SECONDS_PER_TURN = 60;
// Gói miễn phí Gemini giới hạn 15 lượt gọi/phút cho mỗi model; mỗi lượt phỏng vấn gọi 2 lần
// nên giãn tối thiểu 9 giây/lượt (người thật trả lời chậm hơn nhiều nên không gặp giới hạn này)
const MIN_MS_PER_TURN = 9000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const DEFAULT_PROFILE = `Bạn đóng vai Minh, sinh viên năm 3 ngành CNTT, đang phỏng vấn thực tập Java. Trả lời bằng văn nói, 1-3 câu, xưng "em".
Năng lực thật của bạn (phải nhất quán):
- Đồ án: quản lý thư viện bằng Java Swing + MySQL, em tự làm phần mượn/trả sách (kiểm tra còn sách, tạo phiếu mượn, trừ số lượng).
- OOP: hiểu class/object, đóng gói; đa hình chỉ hiểu lờ mờ; không phân biệt được interface và abstract class.
- Java cơ bản: NHẦM, tin chắc rằng dùng == để so sánh nội dung chuỗi là đúng.
- Collection: biết ArrayList tự tăng kích thước, biết HashMap lưu key-value, KHÔNG biết vì sao HashMap nhanh hay va chạm hash.
- SQL: biết khoá chính, khoá ngoại; INNER JOIN và LEFT JOIN thì nhớ mang máng.
- Khi gặp câu quá khó: lúc thì nói không biết, lúc thì nói ấp úng. Có một lần bạn nói thật là đang hơi run.
- Ở phần được hỏi ngược, hỏi một câu về kỳ thực tập rồi lần sau nói không còn câu hỏi.
Chỉ trả về đúng câu trả lời, không giải thích gì thêm.`;

function cvProfile(cvText: string): string {
  return `Bạn đóng vai ứng viên có CV dưới đây, đang phỏng vấn thực tập Java. Trả lời bằng văn nói, 1-3 câu, xưng "em".
Năng lực thật (phải nhất quán): làm được những gì CV ghi nhưng ở mức sinh viên; trả lời tốt câu cơ bản về phần mình đã làm.
Điểm yếu: nhầm lẫn giữa INNER JOIN và LEFT JOIN; với Git chỉ biết commit, push, pull, chưa tự xử lý merge conflict bao giờ;
không biết vì sao HashMap nhanh. Gặp câu quá khó thì nói thật là chưa biết. Ở phần được hỏi ngược, hỏi về trợ cấp hoặc
cơ hội lên chính thức, rồi hỏi tiếp về việc có được làm dự án thật không, lần sau nói không còn câu hỏi.
Chỉ trả về đúng câu trả lời, không giải thích gì thêm.

CV:
${cvText}`;
}

async function parseCv(file: string): Promise<string> {
  const form = new FormData();
  form.append("cv_file", new Blob([fs.readFileSync(file)]), path.basename(file));
  const res = await fetch(BASE.replace("/interviews", "/candidates/parse-cv"), { method: "POST", body: form });
  const data: any = await res.json();
  if (!res.ok) throw new Error(`Không đọc được CV: ${data.error}`);
  return data.text;
}

async function api(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
// Ứng viên giả lập dùng model khác với giám khảo để không chia chung hạn mức
async function candidateReply(transcript: string[], question: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${candidateProfile}\n\nHội thoại đến giờ:\n${transcript.slice(-8).join("\n")}\n\nGiám khảo vừa nói: "${question}"\nCâu trả lời của bạn:`,
        config: { temperature: 0.8 }
      });
      return (r.text || "Dạ em chưa nghĩ ra ạ.").trim().replace(/^"|"$/g, "");
    } catch (err: any) {
      if (err?.status !== 429 && err?.status !== 503) throw err;
      await sleep(20000);
    }
  }
  return "Dạ em chưa nghĩ ra ạ.";
}

const cvText = cvPath ? await parseCv(cvPath) : "";
const jdText = jdPath ? fs.readFileSync(jdPath, "utf8") : "";
const candidateProfile = cvText ? cvProfile(cvText) : DEFAULT_PROFILE;

const session = await api("/start", {
  role_target: jdText ? "Java Backend Intern" : "Java Intern", target_level: "intern", persona: "Alex Chen",
  duration_minutes: minutes, company: jdText ? "ABC Software" : "TalentAI Demo",
  cv_text: cvText, jd_text: jdText
});
console.log(`Phiên ${session.id} (engine ${session.engine}), ${minutes} phút\n`);

let question: string = session.questions[0];
let secondsLeft = minutes * 60;
const transcript: string[] = [];
let stage = "Chào hỏi";

for (let turn = 1; turn <= 40; turn++) {
  const turnStart = Date.now();
  const answer = await candidateReply(transcript, question);
  console.log(`[${String(Math.ceil(secondsLeft / 60)).padStart(2)}' còn lại | ${stage}]`);
  console.log(`  🎙  Giám khảo: ${question}`);
  console.log(`  🙋 Ứng viên : ${answer}`);
  transcript.push(`Giám khảo: ${question}`, `Ứng viên: ${answer}`);

  await api("/turns", { session_id: session.id, turn_number: turn, question_text: question, answer_transcript: answer });
  const t0 = Date.now();
  const r = await api("/next-question", {
    session_id: session.id, candidate_answer: answer, seconds_left: secondsLeft, duration_minutes: minutes
  });
  console.log(`  ⚙️  ${r.action} — ${r.branch_reason} (${Date.now() - t0}ms)\n`);

  question = r.next_question;
  stage = r.stage_name + (r.competency_focus && r.competency_focus !== r.stage_name ? ` · ${r.competency_focus}` : "");
  secondsLeft = Math.max(0, secondsLeft - SECONDS_PER_TURN);
  if (r.is_finished) {
    console.log(`  🎙  Giám khảo (kết thúc): ${question}\n`);
    break;
  }
  await sleep(Math.max(0, MIN_MS_PER_TURN - (Date.now() - turnStart)));
}

const evaluation = await api(`/${session.id}/complete`, {});
console.log(`TỔNG ĐIỂM: ${evaluation.total_score}/100 | Đạt: ${evaluation.is_passed}`);
console.log(`Tóm tắt: ${evaluation.dossier_summary}\n`);
console.log("NĂNG LỰC THEO CHỦ ĐỀ:");
for (const c of evaluation.competencies || []) {
  console.log(`  - ${c.topic_name.padEnd(34)} ${c.status.padEnd(13)} ${c.summary}`);
}

if (!keep) {
  await prisma.interviewSession.delete({ where: { id: session.id } });
  console.log(`\n(Đã xoá phiên mô phỏng ${session.id} khỏi DB)`);
}
await prisma.$disconnect();
