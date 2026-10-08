import { JAVA_INTERN_TOPICS, Topic } from "./topics/javaIntern.js";

export type PhaseId =
  | "greeting"
  | "intro"
  | "project"
  | "technical"
  | "behavioral"
  | "motivation"
  | "candidate_qa"
  | "closing";

export interface PhaseConfig {
  id: PhaseId;
  name: string;
  // Vị trí trong INTERVIEW_STAGES của mock_room.html để hiển thị huy hiệu giai đoạn
  stageIndex: number;
  // Tỷ lệ thời lượng buổi phỏng vấn dành cho giai đoạn này
  share: number;
  minTurns: number;
  maxTurns: number;
  // Mục tiêu giai đoạn, đưa vào prompt cho các giai đoạn hỏi mở
  goal: string;
}

export interface LevelConfig {
  level: string;
  // Bậc bắt đầu hỏi cho mỗi chủ đề, bậc cần đạt và bậc cao nhất được thử
  startLevel: number;
  passLevel: number;
  maxLevel: number;
  maxTurnsPerTopic: number;
  // Những gì không được hỏi ở cấp này, kể cả trong các câu hỏi mở
  outOfScope: string;
  topics: Topic[];
  phases: PhaseConfig[];
}

export const INTERN_CONFIG: LevelConfig = {
  level: "intern",
  startLevel: 2,
  passLevel: 2,
  maxLevel: 4,
  maxTurnsPerTopic: 4,
  outOfScope: "xử lý đồng thời (race condition, nhiều người cùng thao tác một lúc), khoá dữ liệu, transaction isolation, cache, microservices, hiệu năng hệ thống lớn, triển khai production",
  topics: JAVA_INTERN_TOPICS,
  phases: [
    {
      id: "greeting", name: "Chào hỏi", stageIndex: 0, share: 0.03, minTurns: 1, maxTurns: 1,
      goal: "Làm quen, giúp ứng viên thoải mái."
    },
    {
      id: "intro", name: "Giới thiệu bản thân", stageIndex: 1, share: 0.08, minTurns: 1, maxTurns: 2,
      goal: "Hiểu ứng viên đang học ở đâu, năm mấy, tự học những gì và vì sao chọn Java/backend. Chưa hỏi về đồ án ở giai đoạn này vì sẽ có phần riêng ngay sau."
    },
    {
      id: "project", name: "Đồ án & Bài tập lớn", stageIndex: 2, share: 0.22, minTurns: 2, maxTurns: 4,
      goal: "Đào sâu một đồ án hoặc bài tập lớn tiêu biểu: phần nào ứng viên tự tay code, luồng xử lý chạy ra sao, cách tổ chức class/bảng dữ liệu, khó khăn hoặc lỗi lớn nhất đã gặp và cách sửa, nếu làm lại sẽ cải thiện gì. Mỗi lượt chỉ hỏi một khía cạnh, mỗi khía cạnh chỉ hỏi một lần."
    },
    {
      id: "technical", name: "Kiến thức nền tảng", stageIndex: 3, share: 0.45, minTurns: 4, maxTurns: 20,
      goal: "Kiểm tra kiến thức nền tảng Java theo bậc thang độ khó."
    },
    {
      id: "behavioral", name: "Làm việc nhóm & Tự học", stageIndex: 4, share: 0.08, minTurns: 1, maxTurns: 2,
      goal: "Hỏi một tình huống thật về làm việc nhóm, bị kẹt bug lâu hoặc phải tự học công nghệ mới: em đã làm gì và kết quả ra sao."
    },
    {
      id: "motivation", name: "Động lực & Mục tiêu", stageIndex: 5, share: 0.06, minTurns: 1, maxTurns: 1,
      goal: "Vì sao ứng viên muốn đi thực tập, mong muốn học được gì trong kỳ thực tập."
    },
    {
      id: "candidate_qa", name: "Ứng viên đặt câu hỏi", stageIndex: 8, share: 0.05, minTurns: 1, maxTurns: 2,
      goal: "Mời ứng viên đặt câu hỏi và trả lời trung thực dựa trên thông tin đã có, không bịa thông tin về công ty."
    },
    {
      id: "closing", name: "Kết thúc phỏng vấn", stageIndex: 9, share: 0.03, minTurns: 0, maxTurns: 0,
      goal: "Cảm ơn ứng viên và kết thúc buổi phỏng vấn."
    }
  ]
};

// Hiện chỉ có cấu hình intern; các cấp khác vẫn dùng engine cũ trong aiEngine.ts
export function getLevelConfig(targetLevel?: string | null): LevelConfig | null {
  return (targetLevel || "").toLowerCase() === "intern" ? INTERN_CONFIG : null;
}
