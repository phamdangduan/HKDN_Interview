# 🎯 TalentAI - Nền Tảng Phỏng Vấn AI Giả Lập & Sàng Lọc Ứng Viên Chuẩn ATS

> **TalentAI** là hệ thống phỏng vấn thử nghiệm thông minh ứng dụng mô hình trí tuệ nhân tạo (Google Gemini 2.5 Flash), tích hợp công nghệ tổng hợp giọng nói AI (Text-to-Speech), nhận diện giọng nói thời gian thực (Speech-to-Text), ma trận đánh giá năng lực 5 chiều chuẩn STAR (Situation, Task, Action, Result) và công cụ so khớp CV - JD tự động dành cho doanh nghiệp.

---

## 📁 1. Cấu Trúc Thư Mục Hệ Thống (Đã Tách Chuẩn Module)

Toàn bộ dự án đã được sắp xếp và phân chia ranh giới rõ ràng giữa **Frontend**, **Backend TypeScript (Chính)**, **Backend Python (Dự phòng)** và **Tài liệu**:

```text
Minh/
├── 🌐 frontend/                      # [FE] Toàn bộ giao diện người dùng
│   ├── candidate/                   # Phân hệ Ứng viên (Candidate Portal)
│   │   ├── setup.html               # Thiết lập cấu hình phòng thi (Mic, Cam, Vị trí)
│   │   ├── mock_room.html           # Phòng phỏng vấn trực tiếp AI thời gian thực
│   │   ├── report_detail.html       # Báo cáo kết quả STAR & Audio Replay
│   │   ├── history.html             # Lịch sử các phiên phỏng vấn
│   │   └── settings.html            # Cài đặt tài khoản ứng viên
│   ├── enterprise/                  # Phân hệ Doanh nghiệp & Tuyển dụng (HR Portal)
│   │   ├── portal.html              # Bảng điều khiển chiến dịch tuyển dụng
│   │   └── candidate_dossier.html   # Hồ sơ thẩm định chi tiết & Audio Audit
│   ├── public/                      # Phân hệ Khách vãng lai & Giới thiệu
│   │   ├── cv_jd_matcher.html       # Bộ công cụ so khớp CV với JD tự động
│   │   ├── live_interviews.html     # Giới thiệu công nghệ phỏng vấn trực tiếp
│   │   ├── interview_reports.html   # Demo báo cáo STAR đa chiều
│   │   ├── about.html, contact.html # Trang thông tin & liên hệ
│   │   └── faq.html, privacy.html   # FAQ & Chính sách bảo mật
│   ├── assets/                      # Thư viện tài nguyên đa phương tiện (Audio mẫu, Media)
│   └── index.html                   # Cổng trung tâm phân loại hệ thống (Master Workspace)
│
├── ⚡ backend-ts/                     # [BE CHÍNH] Backend TypeScript (Khuyên dùng Production)
│   ├── src/
│   │   ├── main.ts                  # Điểm khởi chạy server Express & Static Files
│   │   ├── routers/                 # Bộ định tuyến API (Campaigns, Candidates, Interviews)
│   │   └── services/
│   │       ├── aiEngine.ts          # Bộ não AI Gemini 2.5 (Phễu 4 tầng, Single Question, STAR)
│   │       └── ttsEngine.ts         # Bộ tạo âm thanh phân đoạn dài (Google TTS Base64)
│   ├── prisma/
│   │   └── schema.prisma            # Schema định nghĩa CSDL MySQL (Prisma ORM)
│   ├── package.json                 # Cấu hình thư viện Node.js & Scripts
│   ├── tsconfig.json                # Cấu hình TypeScript compiler
│   └── .env.example                 # File mẫu cấu hình biến môi trường
│
├── 🐍 backend-python/                 # [BE DỰ PHÒNG] Backend Python FastAPI (Legacy Backup)
│   ├── app/
│   │   ├── routers/                 # API Routers FastAPI
│   │   ├── services/                # Dịch vụ AI Engine & Gemini SDK Python
│   │   ├── models.py, database.py   # SQLAlchemy ORM models & kết nối MySQL
│   │   └── schemas.py               # Pydantic schemas xác thực dữ liệu
│   ├── main.py                      # Điểm chạy FastAPI qua Uvicorn
│   ├── schema.sql                   # Mã khởi tạo cơ sở dữ liệu MySQL ban đầu
│   ├── requirements.txt             # Danh sách thư viện Python cần thiết
│   └── .env.example                 # File mẫu cấu hình biến môi trường
│
├── 📚 docs/                          # Tài liệu kiến trúc & thiết kế hệ thống
│   ├── AI_MOCK_INTERVIEW_DESIGN.md
│   ├── LUONG_HOAT_DONG_DU_AN_TALENTAI.md
│   └── KE_HOACH_THIET_KE_GIAO_DIEN_NGUOI_DUNG.md
│
├── Dockerfile                       # [DOCKER] Multi-stage Dockerfile tối ưu cho Production
├── docker-compose.yml               # [DOCKER] File chạy toàn bộ MySQL + App bằng 1 lệnh
├── .dockerignore                    # Cấu hình loại trừ file rác khi build Docker
├── database.sql                    # [DB] Toàn bộ mã tạo CSDL & dữ liệu mẫu (Copy-paste chạy ngay)
├── .gitignore                       # Cấu hình loại bỏ file rác, node_modules, .env khi push Git
├── run_backend.bat                  # [1-CLICK] Chạy hệ thống Backend TypeScript & mở Web
├── run_backend_python.bat           # File khởi chạy riêng cho Python FastAPI
└── README.md                        # Hướng dẫn chi tiết dự án (Tài liệu này)
```

---

## 📢 2. Báo Cáo Phân Tách Backend

| Phân hệ Backend | Trạng thái | Ngôn ngữ / Công nghệ | Vai trò trong hệ thống |
| :--- | :---: | :--- | :--- |
| **`backend-ts/`** | **ĐANG SỬ DỤNG CHÍNH (Active)** | TypeScript, Node.js (Express), Prisma ORM, `@google/genai` | Cung cấp toàn bộ REST API, xử lý thuật toán phỏng vấn đơn câu (Single Atomic Question), tự động phân đoạn TTS chất lượng cao không giới hạn độ dài ký tự, và **tự động serve toàn bộ Frontend**. |
| **`backend-python/`** | **DỰ PHÒNG / BACKUP (Archived)** | Python 3.10+, FastAPI, SQLAlchemy, PyMySQL, Uvicorn | Đã được cô lập hoàn toàn từ thư mục `backend/` cũ sang `backend-python/`. Dùng làm bản sao lưu quy chuẩn hoặc tham chiếu mã nguồn. |

---

## 🚀 3. Hướng Dẫn Cài Đặt & Chạy Dự Án

### Bước 1: Khởi tạo Cơ sở dữ liệu (MySQL)
Chỉ cần mở MySQL Workbench / phpMyAdmin / DBeaver / Navicat hoặc MySQL CLI, copy toàn bộ nội dung trong file [database.sql](file:///e:/Minh/database.sql) và bấm **Execute (Run)**.
*File script đã viết sẵn lệnh tự động tạo Database `talentai_db` chuẩn utf8mb4, 5 bảng dữ liệu hoàn chỉnh và sẵn sàng dữ liệu mẫu (Seed Data).*

---

### Bước 2: Chạy Backend TypeScript (Lựa chọn khuyến nghị)

#### Cách A: Chạy 1-Click bằng file Batch (Nhanh nhất)
Chỉ cần nhấp đúp chuột vào file:
👉 **`run_backend.bat`**

#### Cách B: Chạy thủ công qua dòng lệnh (Terminal / PowerShell)
1. Di chuyển vào thư mục `backend-ts`:
   ```powershell
   cd backend-ts
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```powershell
   npm install
   ```
3. Tạo file `.env` từ mẫu:
   ```powershell
   copy .env.example .env
   ```
   *(Điền mật khẩu MySQL và `GEMINI_API_KEY` của bạn vào file `.env`)*
4. Đồng bộ Prisma với CSDL:
   ```powershell
   npx prisma generate
   ```
5. Chạy server ở chế độ phát triển (Tự reload khi sửa code):
   ```powershell
   npm run dev
   ```
   *Server sẽ lắng nghe tại: `http://localhost:8000`.*

---

### Bước 2.1: Chạy bằng Docker Compose (Khuyên dùng nếu đã cài Docker Desktop)
Nếu máy bạn đã cài sẵn **Docker Desktop**, bạn **KHÔNG CẦN** cài đặt MySQL hay Node.js lên máy thật. Chỉ cần mở Terminal tại thư mục gốc và gõ:

```powershell
docker compose up -d
```

*Docker sẽ tự động:*
1. Kéo image MySQL 8.0 về, tạo volume và **tự nạp toàn bộ `database.sql`** (bao gồm dữ liệu mẫu).
2. Tự build image Backend TypeScript (Node 20 Slim) và kết nối với MySQL trong mạng nội bộ.
3. Bật toàn bộ hệ thống tại cổng `http://localhost:8000`.

*Để dừng Docker:*
```powershell
docker compose down
```

---

### Bước 3: Chạy Backend Python (Nếu muốn kiểm tra bản Backup)
1. Di chuyển vào thư mục `backend-python`:
   ```powershell
   cd backend-python
   ```
2. Cài đặt các thư viện Python:
   ```powershell
   pip install -r requirements.txt
   ```
3. Cấu hình file `.env` (tạo từ `.env.example`).
4. Khởi chạy Uvicorn:
   ```powershell
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Hoặc nhấp đúp file: `run_backend_python.bat`.*

---

## 🖥️ 4. Danh Sách Địa Chỉ Truy Cập Giao Diện (Frontend)

Sau khi server chạy (port `8000`), bạn có thể mở trình duyệt và truy cập trực tiếp các đường dẫn sau:

- **🏠 Cổng trung tâm (Master Workspace Portal):**
  [http://localhost:8000/](http://localhost:8000/) hoặc [http://localhost:8000/index.html](http://localhost:8000/index.html)
- **🎙️ Phòng Phỏng Vấn Trực Tiếp AI (Candidate Mock Room):**
  [http://localhost:8000/candidate/setup.html](http://localhost:8000/candidate/setup.html)
- **📊 Báo Cáo Đánh Giá Năng Lực STAR & Audio Replay:**
  [http://localhost:8000/candidate/report_detail.html](http://localhost:8000/candidate/report_detail.html)
- **⚡ So Khớp CV với JD Tự Động (ATS Matcher):**
  [http://localhost:8000/public/cv_jd_matcher.html](http://localhost:8000/public/cv_jd_matcher.html)
- **🏢 Cổng Quản Trị Tuyển Dụng Doanh Nghiệp (Enterprise HR):**
  [http://localhost:8000/enterprise/portal.html](http://localhost:8000/enterprise/portal.html)

---

## 📤 5. Hướng Dẫn Đẩy Mã Nguồn Lên Git (Git Push)

Do đã có sẵn file `.gitignore` chuẩn, các thư mục nặng như `node_modules`, `dist`, và các file chứa khóa bí mật `.env` sẽ **không** bị đẩy lên GitHub, bảo đảm an toàn 100%.

Các bước thực hiện trong PowerShell tại thư mục gốc `e:\Minh`:

```powershell
# 1. Khởi tạo repository Git (nếu chưa có)
git init

# 2. Kiểm tra các file sẽ được thêm vào
git status

# 3. Đánh dấu lưu toàn bộ mã nguồn
git add .

# 4. Tạo commit đầu tiên
git commit -m "feat: restructure project into dedicated frontend, backend-ts and backend-python modules"

# 5. Đổi tên nhánh chính thành main
git branch -M main

# 6. Liên kết với kho lưu trữ từ xa trên GitHub / GitLab (thay link của anh)
git remote add origin https://github.com/<tai-khoan-cua-anh>/<ten-repository>.git

# 7. Đẩy mã nguồn lên Git
git push -u origin main
```

---

## 🛠️ Công Nghệ Nổi Bật Được Tích Hợp
- **AI Questioning Funnel Strategy:** AI hỏi tuần tự từng câu hỏi nguyên tử (Single Atomic Question), không hỏi gộp nhiều câu, thích ứng độ khó 3 mức (Dễ -> Vừa -> Nâng cao).
- **Audio Synthesizer Engine:** Tự động cắt câu và ghép nối MP3 qua Google TTS API Base64, không bị giới hạn 200 ký tự.
- **Web Speech API:** Nhận diện giọng nói tiếng Việt thời gian thực (STT) kết hợp phím tắt `Enter` gửi câu trả lời nhanh chóng.
