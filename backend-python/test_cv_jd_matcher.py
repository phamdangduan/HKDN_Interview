import os
import sys
import io
from pathlib import Path
from dotenv import load_dotenv

# Thiết lập UTF-8 cho Windows Console để in tiếng Việt sắc nét không lỗi charmap
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Load .env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from app.services.ai_engine import analyze_cv_and_jd_matching

def test_scenario_backend():
    print("\n" + "█" * 80)
    print("🚀 [TEST CASE 1] THẨM ĐỊNH HỒ SƠ LẬP TRÌNH VIÊN BACKEND (JAVA / SPRING BOOT)")
    print("█" * 80)

    role_title = "Backend Software Engineer (Java / Spring Boot)"

    jd_text = """
    Vị trí: Backend Software Engineer (Java / Spring Boot) tại FPT Software.
    Yêu cầu công việc:
    - Nắm vững Java Core (Java 17+), OOP, Collection, Concurrency, Stream API.
    - Thành thạo Framework Spring Boot 3, Spring Data JPA, Spring Security, kiến trúc RESTful API.
    - Thiết kế và tối ưu cơ sở dữ liệu MySQL (Đánh Index, Query Execution Plan, Transaction Management).
    - Có kinh nghiệm thực tế với Redis Caching và Message Queue (Kafka hoặc RabbitMQ).
    - Hiểu biết triển khai Docker container và viết Unit Test (JUnit 5, Mockito) đạt coverage tối thiểu 75%.
    - Có tư duy giải quyết vấn đề chịu tải cao (High Concurrency), xử lý nghẽn kết nối và deadlock.
    - Kỹ năng làm việc nhóm Agile/Scrum và đọc hiểu tài liệu tiếng Anh.
    """

    cv_text = """
    Ứng viên: Nguyễn Văn An - Sinh viên năm cuối ĐH Bách Khoa Hà Nội (Ngành CNTT, GPA 3.2/4.0).
    Mục tiêu: Ứng tuyển vị trí Junior/Fresher Java Backend Developer.
    Kỹ năng:
    - Ngôn ngữ: Java Core, OOP, Collection.
    - Framework & CSDL: Spring Boot, Spring Data JPA, MySQL, Hibernate.
    - Công cụ: Git, Postman, Maven, IntelliJ.
    - Khác: HTML, CSS, JavaScript cơ bản.
    Dự án thực tế:
    1. Website Bán Hàng Điện Tử E-Commerce (Đồ án tốt nghiệp cá nhân):
       - Sử dụng Spring Boot 3 + MySQL + Thymeleaf.
       - Xây dựng các API đăng ký/đăng nhập JWT, giỏ hàng, đặt hàng, quản lý sản phẩm CRUD.
       - Sử dụng Postman để test API.
    2. Ứng dụng Quản lý Thư viện (Bài tập lớn nhóm 3 người):
       - Viết bằng Java Swing và kết nối JDBC đến MySQL.
    """

    res = analyze_cv_and_jd_matching(
        cv_text=cv_text,
        jd_text=jd_text,
        role_title=role_title
    )
    return res


def test_scenario_marketing():
    print("\n" + "█" * 80)
    print("🚀 [TEST CASE 2] THẨM ĐỊNH HỒ SƠ MARKETING (DIGITAL MARKETING & PERFORMANCE)")
    print("█" * 80)

    role_title = "Performance Marketing Specialist"

    jd_text = """
    Vị trí: Performance Marketing Specialist tại Tập đoàn Tiêu dùng Nhanh.
    Yêu cầu công việc:
    - 2-3 năm kinh nghiệm chạy quảng cáo Performance (Facebook Ads, Google Ads, TikTok Ads).
    - Quản lý ngân sách quảng cáo từ 100 - 300 triệu VNĐ/tháng, chịu trách nhiệm KPI về ROAS, CPL, CPA.
    - Sử dụng thành thạo Google Analytics 4 (GA4), Google Tag Manager và Looker Studio để đo lường phễu chuyển đổi.
    - Kỹ năng A/B testing mẫu quảng cáo, tối ưu Landing Page và tỷ lệ chuyển đổi (CRO).
    - Tư duy phân tích số liệu sắc bén, khả năng phối hợp chặt chẽ với đội ngũ Sales.
    """

    cv_text = """
    Ứng viên: Trần Thị Mai - Cử nhân Marketing ĐH Kinh Tế Quốc Dân (Tốt nghiệp loại Khá).
    Kinh nghiệm: 2 năm làm Content Creator & Quản trị mạng xã hội tại Agency truyền thông.
    Kỹ năng:
    - Sáng tạo nội dung (Content Writing, Storytelling), viết bài chuẩn SEO website.
    - Quản lý Fanpage Facebook, lên kịch bản và quay video ngắn TikTok.
    - Thiết kế hình ảnh cơ bản với Canva và Photoshop.
    Dự án:
    - Xây dựng kênh TikTok cho nhãn hàng thời trang đạt 60.000 người theo dõi và 1 triệu lượt xem.
    - Lên bài viết chiến dịch ra mắt bộ sưu tập thu hút 15.000 lượt tương tác trên Facebook.
    """

    res = analyze_cv_and_jd_matching(
        cv_text=cv_text,
        jd_text=jd_text,
        role_title=role_title
    )
    return res


if __name__ == "__main__":
    test_scenario_backend()
