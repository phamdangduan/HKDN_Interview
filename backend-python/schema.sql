-- ==============================================================================
-- 🎯 TALENTAI DATABASE INITIALIZATION SCRIPT (MySQL 8.0+)
-- 📌 DATABASE NAME: talentai_db
-- 📌 HƯỚNG DẪN: Mở MySQL Workbench / phpMyAdmin / DBeaver / CLI, copy toàn bộ nội dung
--              này và bấm EXECUTE / RUN để tự động khởi tạo CSDL & dữ liệu mẫu.
-- ==============================================================================

-- 1. TẠO CƠ SỞ DỮ LIỆU CHUẨN UTF8MB4 (Hỗ trợ tiếng Việt đầy đủ & Emoji)
CREATE DATABASE IF NOT EXISTS `talentai_db`
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `talentai_db`;

-- Tắt kiểm tra khóa ngoại tạm thời để tránh xung đột thứ tự nếu reset
SET FOREIGN_KEY_CHECKS = 0;

-- ==============================================================================
-- 2. TẠO CẤU TRÚC CÁC BẢNG (TABLE SCHEMAS)
-- ==============================================================================

-- BẢNG 1: CAMPAIGNS (Chiến dịch tuyển dụng của Doanh nghiệp)
CREATE TABLE IF NOT EXISTS `campaigns` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL COMMENT 'Tên vị trí tuyển dụng (VD: Java Backend Developer)',
    `company` VARCHAR(255) NOT NULL COMMENT 'Tên doanh nghiệp tuyển dụng',
    `location` VARCHAR(255) NULL COMMENT 'Địa điểm làm việc',
    `stipend` VARCHAR(100) NULL COMMENT 'Mức lương / Trợ cấp tuyển dụng',
    `perks` TEXT NULL COMMENT 'Chế độ đãi ngộ, phúc lợi',
    `job_description` TEXT NOT NULL COMMENT 'Mô tả chi tiết công việc (Job Description - JD)',
    `cutoff_score` INT NOT NULL DEFAULT 80 COMMENT 'Điểm sàn AI lọc vòng 1 (thang điểm 100)',
    `target_level` VARCHAR(50) DEFAULT 'fresher' COMMENT 'Cấp bậc yêu cầu: intern, fresher, junior, middle, senior',
    `track` VARCHAR(100) DEFAULT 'backend' COMMENT 'Khối chuyên môn: backend, frontend, fullstack, ai_data, devops',
    `status` VARCHAR(50) NOT NULL DEFAULT 'active' COMMENT 'Trạng thái: active, closed, draft',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- BẢNG 2: CANDIDATES (Hồ sơ ứng viên / Sinh viên nộp đơn)
CREATE TABLE IF NOT EXISTS `candidates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(255) NOT NULL COMMENT 'Họ và tên ứng viên',
    `email` VARCHAR(255) NOT NULL COMMENT 'Email liên hệ',
    `phone` VARCHAR(50) NULL COMMENT 'Số điện thoại',
    `cv_filename` VARCHAR(255) NULL COMMENT 'Tên file CV tải lên (.pdf, .docx)',
    `cv_text` LONGTEXT NULL COMMENT 'Nội dung bóc tách văn bản từ file CV',
    `campaign_id` INT NULL COMMENT 'ID đợt tuyển dụng (nếu ứng tuyển trực tiếp qua link)',
    `target_level` VARCHAR(50) DEFAULT 'fresher' COMMENT 'Cấp bậc hiện tại của ứng viên',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_candidate_campaign` FOREIGN KEY (`campaign_id`) 
        REFERENCES `campaigns`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- BẢNG 3: INTERVIEW_SESSIONS (Phiên phỏng vấn AI giả lập)
CREATE TABLE IF NOT EXISTS `interview_sessions` (
    `id` VARCHAR(64) PRIMARY KEY COMMENT 'Mã định danh phiên (UUID)',
    `candidate_id` INT NULL COMMENT 'ID ứng viên liên kết (nếu có)',
    `campaign_id` INT NULL COMMENT 'ID chiến dịch tuyển dụng liên kết (nếu có)',
    `mode` VARCHAR(50) NOT NULL DEFAULT 'self_practice' COMMENT 'self_practice (tự luyện) hoặc campaign_screening (ứng tuyển)',
    `role_target` VARCHAR(255) NOT NULL COMMENT 'Vị trí phỏng vấn thử sức',
    `target_level` VARCHAR(50) DEFAULT 'fresher' COMMENT 'Cấp bậc độ khó câu hỏi (intern, fresher, junior, mid)',
    `track` VARCHAR(100) DEFAULT 'backend' COMMENT 'Chuyên ngành kỹ thuật',
    `requirement_text` TEXT NULL COMMENT 'Mô tả yêu cầu kỹ năng cụ thể',
    `persona` VARCHAR(100) NOT NULL DEFAULT 'Alex Chen' COMMENT 'Tên giám khảo AI đại diện',
    `difficulty_level` INT NOT NULL DEFAULT 4 COMMENT 'Mức độ đào sâu câu hỏi (1-5)',
    `duration_minutes` INT NOT NULL DEFAULT 30 COMMENT 'Thời lượng quy định (phút)',
    `status` VARCHAR(50) NOT NULL DEFAULT 'in_progress' COMMENT 'Trạng thái: in_progress, completed, abandoned',
    `interview_state` LONGTEXT NULL COMMENT 'Trạng thái phỏng vấn v2 (JSON): giai đoạn, chủ đề, bậc năng lực đo được',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME NULL COMMENT 'Thời điểm hoàn thành phiên',
    CONSTRAINT `fk_session_candidate` FOREIGN KEY (`candidate_id`) 
        REFERENCES `candidates`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_session_campaign` FOREIGN KEY (`campaign_id`) 
        REFERENCES `campaigns`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- BẢNG 4: INTERVIEW_TURNS (Chi tiết từng lượt tương tác Hỏi - Đáp của phiên)
CREATE TABLE IF NOT EXISTS `interview_turns` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `session_id` VARCHAR(64) NOT NULL COMMENT 'Mã phiên phỏng vấn tương ứng',
    `turn_number` INT NOT NULL COMMENT 'Thứ tự câu hỏi (1, 2, 3...)',
    `question_text` TEXT NOT NULL COMMENT 'Nội dung câu hỏi nguyên tử của Giám khảo AI',
    `answer_transcript` TEXT NULL COMMENT 'Bản ghi âm nhận diện giọng nói / văn bản câu trả lời của ứng viên',
    `audio_url` VARCHAR(500) NULL COMMENT 'Đường dẫn file ghi âm câu trả lời',
    `probed_aspect` VARCHAR(255) NULL COMMENT 'Khía cạnh chuyên môn đang được AI kiểm tra',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_turn_session` FOREIGN KEY (`session_id`) 
        REFERENCES `interview_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- BẢNG 5: STAR_EVALUATIONS (Báo cáo đánh giá năng lực 5 chiều chuẩn STAR)
CREATE TABLE IF NOT EXISTS `star_evaluations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `session_id` VARCHAR(64) NOT NULL UNIQUE COMMENT 'Mã phiên phỏng vấn liên kết',
    `situation_score` FLOAT NOT NULL DEFAULT 0 COMMENT 'Điểm Tình huống / 25',
    `task_score` FLOAT NOT NULL DEFAULT 0 COMMENT 'Điểm Nhiệm vụ / 25',
    `action_score` FLOAT NOT NULL DEFAULT 0 COMMENT 'Điểm Hành động thực tế / 25',
    `result_score` FLOAT NOT NULL DEFAULT 0 COMMENT 'Điểm Kết quả đo lường / 25',
    `total_score` FLOAT NOT NULL DEFAULT 0 COMMENT 'Tổng điểm STAR trung bình / 100',
    `is_passed` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Đạt ngưỡng sàn tuyển dụng hay không (Pass/Fail)',
    `strengths` TEXT NULL COMMENT 'Nhận xét các điểm mạnh nổi trội',
    `weaknesses` TEXT NULL COMMENT 'Các điểm thiếu sót cần cải thiện',
    `ai_recommendations` TEXT NULL COMMENT 'Khuyến nghị chuyên môn & câu trả lời mẫu từ AI',
    `dossier_summary` TEXT NULL COMMENT 'Tóm tắt thẩm định gửi Hội đồng tuyển dụng',
    `turn_evaluations` TEXT NULL COMMENT 'Chi tiết điểm thành phần từng lượt câu hỏi',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_eval_session` FOREIGN KEY (`session_id`) 
        REFERENCES `interview_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bật lại kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 1;


-- ==============================================================================
-- 3. DỮ LIỆU MẪU KHỞI TẠO (SAMPLE SEED DATA)
-- ==============================================================================

-- Chèn dữ liệu mẫu cho Chiến dịch tuyển dụng (Campaigns)
INSERT INTO `campaigns` (`id`, `title`, `company`, `location`, `stipend`, `perks`, `job_description`, `cutoff_score`, `target_level`, `track`, `status`)
VALUES 
(
    1, 
    'Thực tập sinh Lập trình Java Backend', 
    'FPT Software', 
    'F-Ville Hòa Lạc, Hà Nội', 
    '6.000.000 - 9.000.000 VNĐ / tháng', 
    'Cơm trưa Canteen miễn phí, Laptop & 2 màn hình, Xe đưa đón 12 tuyến, Lộ trình lên Fresher/Junior sau 3 tháng', 
    'Mô tả công việc:\n- Tham gia phát triển hệ thống Enterprise bám sát kiến trúc Microservices với Spring Boot 3, Hibernate/JPA và MySQL.\n- Thiết kế và tối ưu các RESTful API, xử lý bài toán cache Redis và message queue RabbitMQ/Kafka.\n- Viết Unit Test với JUnit 5, Mockito đảm bảo độ phủ mã nguồn > 80%.\n\nYêu cầu ứng viên:\n- Nắm vững kiến thức nền tảng Lập trình hướng đối tượng (OOP), Collections, Exception Handling và Concurrency trong Java.\n- Hiểu rõ cơ chế Indexing, Query Optimization và Transaction ACID trong MySQL.\n- Tinh thần học hỏi cao, có tư duy giải quyết vấn đề logic.', 
    80, 
    'fresher', 
    'backend', 
    'active'
),
(
    2, 
    'Kỹ sư Lập trình Frontend React / TypeScript', 
    'Viettel Solutions', 
    'Keangnam Landmark 72, Cầu Giấy, Hà Nội', 
    '15.000.000 - 25.000.000 VNĐ / tháng', 
    'Thưởng dự án theo quý, Bảo hiểm sức khỏe cao cấp, Phụ cấp chứng chỉ quốc tế, Môi trường làm việc Agile', 
    'Mô tả công việc:\n- Phát triển giao diện người dùng các ứng dụng SaaS cho khách hàng Doanh nghiệp bằng React 18, TypeScript và Tailwind CSS.\n- Tích hợp RESTful API & WebSocket thời gian thực, quản lý state hiệu quả với Zustand / Redux Toolkit.\n- Tối ưu hóa Web Vitals, Rendering Performance và SEO-friendly.\n\nYêu cầu ứng viên:\n- Thành thạo JavaScript (ES6+), TypeScript, React Hooks, Component Lifecycle.\n- Có kinh nghiệm với responsive design, UI/UX chuẩn mực và cross-browser testing.\n- Biết viết unit test với Vitest / Jest là điểm cộng lớn.', 
    80, 
    'junior', 
    'frontend', 
    'active'
),
(
    3, 
    'Kỹ sư AI / Data Science Fresher', 
    'VNG Corporation', 
    'VNG Campus, Quận 7, TP. Hồ Chí Minh', 
    '18.000.000 - 28.000.000 VNĐ / tháng', 
    'Hồ bơi tiêu chuẩn Olympic, Phòng Gym miễn phí, Bữa ăn 3 bữa tại công ty, Thưởng tháng lương 13++', 
    'Mô tả công việc:\n- Nghiên cứu, ứng dụng các mô hình ngôn ngữ lớn (LLM như Gemini, Claude, GPT) vào hệ thống gợi ý và tự động hóa quy trình.\n- Xây dựng pipeline xử lý dữ liệu lớn (ETL), vector database (Chroma, Pinecone) phục vụ giải pháp RAG.\n- Tinh chỉnh mô hình (Fine-tuning) và đánh giá độ chính xác benchmark.\n\nYêu cầu ứng viên:\n- Nắm vững ngôn ngữ Python, các thư viện PyTorch, NumPy, Pandas, Scikit-learn.\n- Có kiến thức nền tảng vững vàng về Machine Learning, Deep Learning và Prompt Engineering.\n- Đam mê tìm tòi các kỹ thuật AI tạo sinh (Generative AI) tiên tiến.', 
    85, 
    'fresher', 
    'ai_data', 
    'active'
)
ON DUPLICATE KEY UPDATE 
    `title` = VALUES(`title`),
    `company` = VALUES(`company`),
    `cutoff_score` = VALUES(`cutoff_score`);

-- Chèn dữ liệu mẫu cho Ứng viên (Candidates)
INSERT INTO `candidates` (`id`, `full_name`, `email`, `phone`, `cv_filename`, `cv_text`, `campaign_id`, `target_level`)
VALUES
(
    1,
    'Nguyễn Văn An',
    'nguyenvanan.dev@gmail.com',
    '0987654321',
    'CV_NguyenVanAn_Java.pdf',
    'Tốt nghiệp ĐH Bách Khoa Hà Nội chuyên ngành CNTT. Kinh nghiệm làm đồ án tốt nghiệp xây dựng sàn TMĐT bằng Spring Boot 3, MySQL, Redis. Đạt giải Ba Olympic Tin học sinh viên cấp trường.',
    1,
    'fresher'
),
(
    2,
    'Trần Thị Mai',
    'mai.tran.frontend@gmail.com',
    '0912345678',
    'CV_TranThiMai_React.pdf',
    'Cử nhân ĐH Công Nghệ - ĐHQGHN. Có 1 năm kinh nghiệm làm dự án Freelance thiết kế Dashboard bằng ReactJS, TypeScript và Tailwind CSS. Có chứng chỉ TOEIC 850.',
    2,
    'junior'
)
ON DUPLICATE KEY UPDATE 
    `full_name` = VALUES(`full_name`),
    `email` = VALUES(`email`);

-- ==============================================================================
-- HOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU TALENTAI!
-- ==============================================================================
