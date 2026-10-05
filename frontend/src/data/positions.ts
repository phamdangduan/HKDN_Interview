import type { Level, Localized, Position, Round, Specialty } from '@/types'

/* ============================================================
   Bộ dữ liệu mock tĩnh — xem frontend/README.md mục 4
   Toàn bộ nội dung mô phỏng, không phải tin tuyển dụng chính thức.
   ============================================================ */

const l = (vi: string, en: string): Localized => ({ vi, en })

const mkRound = (round: Omit<Round, 'id'>): Round => ({ ...round, id: `round-${round.index}` })

/* ---------- Khuôn vòng phỏng vấn dùng chung ---------- */

const roundProductSense = (index = 1): Round =>
  mkRound({
    index,
    title: 'Product Sense & Analytics',
    type: 'CASE STUDY',
    durationMin: 30,
    passScore: 6.5,
    language: 'Tiếng Việt',
    interviewer: 'James Nguyen',
    skills: ['Product Thinking', 'User Research'],
    focus: l(
      'Vòng này theo định dạng chuẩn theo loại phỏng vấn. Nghe kỹ AI và trả lời từng câu một.',
      'This round follows the standard case-study format. Listen carefully and answer one question at a time.'
    ),
    prep: [
      l(
        "Nghiên cứu hành trình người dùng chính của Z*lo Pay: nạp tiền, chuyển khoản P2P, QR pay, thanh toán hóa đơn",
        "Study Z*lo Pay's main consumer journeys: top-up, P2P transfer, QR pay, bill payment"
      ),
      l(
        'Luyện cách đặt vấn đề người dùng trong 3 câu: ai, đau điểm gì, vì sao điều đó quan trọng',
        'Practice framing a user problem in 3 sentences: who, pain, why it matters'
      ),
      l(
        'Ôn lại RICE / MoSCoW với một ví dụ đơn giản',
        'Refresh RICE/MoSCoW prioritisation with one simple example'
      ),
      l(
        'Nắm các chỉ số phễu cơ bản: activation, conversion, retention',
        'Know basic funnel metrics: activation, conversion, retention'
      ),
      l(
        'Chuẩn bị 2–3 câu chuyện theo khuôn STAR: xung đột nhóm, một lần thất bại, một lần bạn chủ động dẫn dắt',
        'Prepare 2–3 SAR stories: teamwork conflict, a failed attempt, a time you owned a deliverable'
      ),
      l(
        'Nhớ A/B test cần một giả thuyết và một chỉ số thành công chính',
        'Review how A/B tests need a hypothesis and a primary success metric'
      ),
      l(
        'Rà lại kỹ năng spreadsheet và cách diễn giải một biểu đồ đơn giản',
        'Brush up on spreadsheet skills and be ready to interpret a simple chart'
      ),
    ],
    jd: l(
      `Về vị trí
Chúng tôi đang tìm một Product Manager để hỗ trợ đội ngũ tài sản phẩm người tiêu dùng tại một nền tảng ví điện tử hàng đầu Việt Nam. Bạn sẽ làm việc sát với PM cấp cao, từ discovery đến phát hành.

Công việc sẽ gồm
• Hỗ trợ (shadow) PM trong các buổi discovery với nghiên cứu người dùng.
• Giữ backlog luôn sạch và cập nhật ưu tiên theo RICE / MoSCoW.
• Theo dõi các phễu cơ bản: activation, conversion, retention theo tuần.
• Hỗ trợ thiết lập A/B test: giả thuyết, biến số, chỉ số thành công chính.
• Tham gia các buổi sprint ceremony và viết tài liệu quyết định ngắn gọn.
• Phối hợp với đội data để lấy số liệu phân tích và kiểm chứng.

Yêu cầu
• 1–3 năm kinh nghiệm product trong một sản phẩm có người dùng thật.
• Tư duy cấu trúc, viết tốt, thích làm việc với số liệu.
• Tiếng Anh làm việc tốt; tiếng Việt là điểm cộng.`,
      `About the role
We are looking for a Product Manager to support the consumer product team at one of Vietnam's leading e-wallets. You will work closely with a senior PM, from discovery through release.

What you'll do
• Shadow PMs on discovery calls and user research synthesis.
• Help maintain the backlog and keep prioritisation honest with RICE / MoSCoW.
• Track basic funnels weekly: activation, conversion, retention.
• Support A/B test setup hygiene: hypothesis, variants, primary success metric.
• Join sprint ceremonies and write short decision docs.
• Partner with the data team to pull and sanity-check analytics.

Requirements
• 1–3 years of product work on a live consumer product.
• Structured thinking, strong writing, comfortable with numbers.
• Good working English; Vietnamese is a plus.`
    ),
    questions: [
      l(
        'Chào bạn, tôi là James, rất vui được gặp bạn hôm nay cho buổi phỏng vấn kỹ thuật tại Z*lo Pay. Để bắt đầu, bạn có thể giới thiệu đôi chút về bản thân, kinh nghiệm làm việc và những kỹ năng bạn cho là phù hợp nhất với vị trí này không?',
        "Hi, I'm James — great to meet you today for the technical interview at Z*lo Pay. To start, could you tell me a bit about yourself, your work experience, and the skills you think fit this role best?"
      ),
      l(
        'Giả sử tỷ lệ hoàn tất thanh toán QR giảm 8% sau một đợt thay đổi giao diện. Bạn sẽ phân tích vấn đề theo trình tự nào?',
        'Suppose QR payment completion dropped 8% after an interface change. How would you break the problem down?'
      ),
      l(
        'Bạn có 10 ngày và một backlog đầy ý tưởng. Hãy chọn 3 tính năng để triển khai và giải thích cách bạn định đo lường hiệu quả.',
        'You have 10 days and a full backlog of ideas. Pick three to ship and explain how you would measure success.'
      ),
      l(
        'Hãy kể một tình huống bạn phải thuyết phục một bên không đồng ý với quyết định ưu tiên của bạn.',
        'Tell me about a time you had to persuade someone who disagreed with your prioritisation call.'
      ),
      l(
        'Câu cuối cùng: nếu bạn được thêm một chỉ số duy nhất để theo dõi trong 3 tháng tới, bạn chọn gì và vì sao?',
        'Last one: if you could track a single metric for the next three months, what would it be and why?'
      ),
    ],
  })

const roundTechnical = (index = 1): Round =>
  mkRound({
    index,
    title: 'Technical Deep Dive',
    type: 'TECHNICAL',
    durationMin: 45,
    passScore: 7,
    language: 'English',
    interviewer: 'Alex Chen',
    skills: ['System Design', 'Java Core', 'SQL'],
    focus: l(
      'Tập trung vào nền tảng kỹ thuật và tư duy thiết kế hệ thống. Trả lời từng câu một, nói rõ giả định của bạn.',
      'Focus on technical fundamentals and system design thinking. Answer one question at a time and state your assumptions.'
    ),
    prep: [
      l('Chuẩn bị cho câu hỏi về Java core: concurrency, collection, GC', 'Prepare for Java core questions: concurrency, collections, GC'),
      l('Sơ đồ hoá một API đọc user profile với độ trễ p95 dưới 100ms', 'Sketch an API to read a user profile at p95 under 100ms'),
      l('Nhớ rõ khác biệt giữa index B-Tree của MySQL và hash index', 'Recall the difference between MySQL B-Tree and hash indexes'),
      l('Chuẩn bị 2 câu chuyện về sự cố sản xuất (incident) bạn đã xử lý', 'Prepare two production incident stories you handled'),
      l('Rà lại cách thiết kế idempotency cho API thanh toán', 'Revisit idempotency design for payment APIs'),
      l('Nắm cách dùng chỉ số RED/USE để debug hiệu năng', 'Know how to use RED/USE metrics for performance debugging'),
    ],
    jd: l(
      `Về vị trí
Chúng tôi cần một Backend Engineer từ 1.5 năm kinh nghiệm trở lên để làm việc với hệ thống thanh toán và dữ liệu giao dịch quy mô lớn.

Công việc sẽ gồm
• Phát triển và bảo trì service thanh toán (Java / Spring Boot).
• Thiết kế API, tối ưu truy vấn SQL và chỉ mục phù hợp.
• Làm việc với Kafka, Redis và MySQL trong kiến trúc sự kiện.
• Viết unit test và integration test cho các luồng quan trọng.
• Tham gia trực ca sự cố (on-call) cùng postmortem.

Yêu cầu
• Nắm vững Java core và Spring Boot.
• Hiểu thiết kế hệ thống phân tán, idempotency, nhất quán.
• Kỹ năng đọc log, truy vết lỗi và viết báo cáo kỹ thuật rõ ràng.`,
      `About the role
We are looking for a Backend Engineer with 1.5+ years of experience working on large-scale payment and transaction systems.

What you'll do
• Build and maintain payment services (Java / Spring Boot).
• Design APIs, tune SQL queries and pick the right indexes.
• Work with Kafka, Redis and MySQL in an event-driven architecture.
• Write unit and integration tests for critical flows.
• Take part in on-call rotations and write postmortems.

Requirements
• Solid Java fundamentals and Spring Boot.
• Understanding of distributed systems, idempotency and consistency.
• Skills in log reading, tracing and clear technical write-ups.`
    ),
    questions: [
      l(
        'Hello, thanks for joining. Let us start with your background: what have you been building in the last one or two years?',
        'Hello, thanks for joining. Let us start with your background: what have you been building in the last one or two years?'
      ),
      l(
        'Bạn đã từng xử lý race condition khi đồng thời cập nhật cùng một bản ghi chưa? Giải pháp của bạn là gì?',
        'Have you handled a race condition when two requests updated the same record? How did you solve it?'
      ),
      l(
        'Thiết kế một API thanh toán sao cho việc gọi lại (retry) không tạo ra giao dịch trùng.',
        'Design a payment API so that a client retry never creates a duplicate transaction.'
      ),
      l(
        'Một truy vấn chạy 8 giây trên bảng 50 triệu bản ghi. Bạn sẽ chẩn đoán như thế nào?',
        'A query takes 8 seconds on a 50-million-row table. How do you diagnose it?'
      ),
      l(
        'Kể một tình huống bạn phải giao một bản hotfix dưới áp lực. Bạn đã làm gì sau đó để tránh lặp lại?',
        'Tell me about a time you had to ship a hotfix under pressure. What did you change afterwards?'
      ),
    ],
  })

const roundBehavioral = (index = 1): Round =>
  mkRound({
    index,
    title: 'Behavioral & Values',
    type: 'BEHAVIORAL',
    durationMin: 25,
    passScore: 6,
    language: 'Tiếng Việt',
    interviewer: 'Sarah Jenkins',
    skills: ['Teamwork', 'Ownership', 'Structured Communication'],
    focus: l(
      'Câu trả lời theo khuôn STAR: Tình huống, Nhiệm vụ, Hành động, Kết quả. Nêu số liệu cụ thể.',
      'Answer with STAR: Situation, Task, Action, Result. Quantify wherever you can.'
    ),
    prep: [
      l('Chuẩn bị 3 câu chuyện về xung đột nhóm và cách bạn giải quyết', 'Prepare three stories about team conflict and how you resolved it'),
      l('Chuẩn bị 1 câu chuyện về một thất bại rõ ràng', 'Prepare one clear story about a failure'),
      l('Chuẩn bị 1 câu chuyện bạn tự chủ dẫn dắt đến kết quả', 'Prepare one story where you owned a deliverable end to end'),
      l('Chuẩn bị ví dụ về cách bạn phản hồi góp ý khó nghe', 'Prepare an example of how you handled hard feedback'),
      l('Nghĩ trước một câu hỏi bạn muốn hỏi lại nhà tuyển dụng', 'Think of one question you want to ask the interviewer'),
    ],
    jd: l(
      `Về vị trí
Chúng tôi tìm người cùng đồng hành trong một đội ngũ nhỏ, tốc độ cao, để mở rộng sản phẩm tại thị trường Việt Nam.

Công việc sẽ gồm
• Làm việc trực tiếp với nhóm sản phẩm và nhóm kỹ thuật.
• Chủ động nêu vấn đề và đề xuất giải pháp, không đẩy trách nhiệm.
• Chia sẻ nguyên tắc và tài liệu để đội trưởng đồng hành.
• Tham gia tuyển dụng và đánh giá ứng viên ở các vòng sau.

Yêu cầu
• Kỹ năng giao tiếp rõ ràng bằng cả tiếng Việt và tiếng Anh.
• Tinh thần chủ động và khả năng làm việc dưới áp lực.`,
      `About the role
We are looking for a teammate to join a small, fast-moving team expanding the product in the Vietnamese market.

What you'll do
• Work directly with product and engineering groups.
• Raise problems and propose solutions instead of escalating blame.
• Share principles and documentation so the team can grow.
• Take part in hiring and evaluation for later rounds.

Requirements
• Clear communication in both Vietnamese and English.
• Self-starter mentality and comfort under pressure.`
    ),
    questions: [
      l(
        'Xin chào! Bạn có thể kể một tình huống bạn phải xử lý mâu thuẫn với đồng đội như thế nào?',
        'Hi there! Tell me about a time you handled a disagreement with a teammate.'
      ),
      l(
        'Hãy kể về một lần bạn thất bại. Bạn đã học được gì?',
        'Tell me about a failure. What did you take away from it?'
      ),
      l(
        'Mô tả một dự án bạn tự chủ đến khi hoàn thành từ đầu đến cuối.',
        'Describe a project you owned from start to finish.'
      ),
      l(
        'Bạn đã từng phải giao một thông điệp khó dễ chịu cho đồng nghiệp. Bạn xử lý thế nào?',
        'You had to deliver uncomfortable feedback to a colleague. How did you handle it?'
      ),
      l(
        'Câu cuối: bạn muốn hỏi chúng tôi điều gì?',
        'Last question: what would you like to ask us?'
      ),
    ],
  })

const roundSystemDesign = (index = 2): Round =>
  mkRound({
    index,
    title: 'System Design',
    type: 'SYSTEM DESIGN',
    durationMin: 45,
    passScore: 7.5,
    language: 'English',
    interviewer: 'Alex Chen',
    skills: ['System Design', 'Scalability', 'Caching'],
    focus: l(
      'Bắt đầu từ yêu cầu và giả định, không nhảy thẳng vào công nghệ. Vẽ luồng dữ liệu chính.',
      'Start from requirements and assumptions before naming any technology. Walk through the main data flow.'
    ),
    prep: [
      l('Chuẩn bị cách làm rõ yêu cầu: functional, non-functional, quy mô', 'Prepare to clarify requirements: functional, non-functional, scale'),
      l('Ôn chiến lược cache: read-through, write-through, invalidation', 'Revisit caching: read-through, write-through, invalidation'),
      l('Nắm cách phân vùng dữ liệu và replica lag', 'Know data partitioning strategies and replica lag trade-offs'),
      l('Chuẩn bị cách xử lý idempotency và message retry', 'Prepare for idempotency and message retry handling'),
    ],
    jd: l(
      `Về vị trí
Vòng này kiểm tra khả năng thiết kế hệ thống cho một sản phẩm fintech quy mô lớn.

Công việc sẽ gồm
• Ước lượng lưu lượng, yêu cầu độ trễ và tính sẵn có.
• Chọn lưu trữ dữ liệu, chiến lược cache và mô hình nhất quán.
• Xác định điểm thắt cổ chai và kế hoạch mở rộng theo chiều ngang.
• Trình bày trade-off giữa độ phức tạp vận hành và hiệu năng.`,
      `About the role
This round evaluates your system design skills for a large-scale fintech product.

What you'll do
• Estimate throughput, latency and availability requirements.
• Choose data stores, caching strategy and consistency model.
• Identify bottlenecks and plan for horizontal scaling.
• Explain the trade-off between operational complexity and performance.`
    ),
    questions: [
      l(
        'Let us design a notification service. Start by telling me how you would scope the problem.',
        'Let us design a notification service. Start by telling me how you would scope the problem.'
      ),
      l(
        'Bạn chọn SQL hay NoSQL cho phần lưu lịch sử giao dịch? Vì sao?',
        'Would you pick SQL or NoSQL for the transaction history? Why?'
      ),
      l(
        'Làm sao để hệ thống chịu được một chiến dịch push gửi cho 5 triệu người dùng cùng lúc?',
        'How do you keep a campaign that pushes to five million users at once from collapsing?'
      ),
      l(
        'Bạn sẽ thêm giám sát và cảnh báo nào vào hệ thống này?',
        'Which metrics and alerts would you add to this system?'
      ),
    ],
  })

const roundAnalytics = (index = 1): Round =>
  mkRound({
    index,
    title: 'Analytics & SQL',
    type: 'TECHNICAL',
    durationMin: 30,
    passScore: 6.5,
    language: 'Tiếng Việt',
    interviewer: 'Minh Tran',
    skills: ['SQL', 'Metric Design', 'Funnel Analysis'],
    focus: l(
      'Vòng này kiểm tra khả năng đặt câu hỏi đúng và viết truy vấn SQL rõ ràng.',
      'This round checks how you frame the right question and write clear SQL.'
    ),
    prep: [
      l('Chuẩn bị các cấu trúc window function: ROW_NUMBER, LAG, cohort', 'Review window functions: ROW_NUMBER, LAG, cohort analysis'),
      l('Luyện viết truy vấn funnel và retention theo tuần', 'Practise writing funnel and weekly retention queries'),
      l('Hiểu cách kiểm soát chất lượng dữ liệu và định nghĩa chỉ số', 'Understand data quality checks and metric definitions'),
      l('Chuẩn bị cách trình bày phát hiện cho đối tượng không chuyên môn', 'Prepare to present findings to a non-technical audience'),
    ],
    jd: l(
      `Về vị trí
Chúng tôi tìm một Data Analyst hỗ trợ đội phân tích sản phẩm.

Công việc sẽ gồm
• Xây dựng và kiểm định truy vấn phân tích sản phẩm.
• Thiết kế định nghĩa chỉ số và theo dõi chất lượng dữ liệu.
• Phân tích phễu, cohort và phân khúc người dùng.
• Trình bày phát hiện và đề xuất hành động cho đội sản phẩm.`,
      `About the role
We are looking for a Data Analyst to support the product analytics team.

What you'll do
• Build and validate product analytics queries.
• Own metric definitions and data quality checks.
• Analyse funnels, cohorts and user segments.
• Present findings and recommended actions to the product team.`
    ),
    questions: [
      l(
        'Chào bạn, hãy giới thiệu phần nào bạn từng dùng SQL nhiều nhất trong công việc thực tế.',
        'Hi there, tell me where you have used SQL most heavily in real work.'
      ),
      l(
        'Tỷ lệ giữ chân giảm mạnh sau tuần thứ hai. Bạn sẽ kiểm tra những gì?',
        'Retention drops sharply after week two. What would you investigate?'
      ),
      l(
        'Hãy viết một truy vấn để lấy 5 sản phẩm có doanh thu cao nhất mỗi tháng trong năm 2025.',
        'Write a query that returns the top five products by revenue per month in 2025.'
      ),
      l(
        'Làm sao phân biệt tăng trưởng thật với hiệu ứng mùa vụ trong dữ liệu của bạn?',
        'How do you separate real growth from seasonality in your data?'
      ),
    ],
  })

/* ---------- Bộ sưu tập vòng theo hướng tuyển dụng ---------- */

const roundsFor = (specialty: Specialty, count: number): Round[] => {
  const technical: Round[] = [roundTechnical(1), roundSystemDesign(2), roundBehavioral(3)]
  const bySpecialty: Record<Specialty, Round[]> = {
    Backend: technical,
    Frontend: [roundTechnical(1), roundBehavioral(2)],
    Fullstack: technical,
    Java: technical,
    TypeScript: [roundTechnical(1), roundBehavioral(2)],
    JavaScript: [roundTechnical(1), roundBehavioral(2)],
    Python: [roundTechnical(1), roundSystemDesign(2), roundBehavioral(3)],
    React: [roundTechnical(1), roundBehavioral(2)],
    Angular: [roundTechnical(1), roundBehavioral(2)],
    'Product Manager': [roundProductSense(1), roundBehavioral(2), roundProductSense(3)],
    'Business Analyst': [roundProductSense(1), roundAnalytics(2), roundBehavioral(3)],
    'Product Owner': [roundProductSense(1), roundBehavioral(2)],
    'Data Analyst': [roundAnalytics(1), roundProductSense(2), roundBehavioral(3)],
  }
  return bySpecialty[specialty].slice(0, Math.max(1, count))
}

/* ---------- Các vị trí được viết tay ---------- */

const positions: Position[] = [
  {
    id: '1',
    company: 'M*M*',
    title: 'Software Engineer II',
    summary: l(
      '1.5+ năm kinh nghiệm Backend Engineer với Java nền tảng vững và khả năng thiết kế hệ thống.',
      '1.5+ yoe Backend Engineer with strong Java and system design fundamentals'
    ),
    hot: true,
    specialty: 'Backend',
    group: 'tech',
    level: 'Junior',
    location: 'HCMC, Vietnam',
    applicants: 4,
    languages: ['English', 'Tiếng Việt'],
    skills: ['Java Core', 'Spring Boot', 'MySQL'],
    rounds: roundsFor('Backend', 1),
  },
  {
    id: '2',
    company: 'VN*',
    title: 'Mid Product Manager',
    summary: l(
      "Dẫn dắt kết quả sản phẩm quy mô vừa cho nền tảng người tiêu dùng của Z*lo. Đặt chiến lược vấn đề, điều hành backlog và đo lường phễu.",
      "Drive mid-scoped product outcomes for Z*lo's consumer platform. Set problem strategy, run the backlog and measure funnels."
    ),
    hot: true,
    specialty: 'Product Manager',
    group: 'nontech',
    level: 'Middle',
    location: 'Ho Chi Minh City',
    applicants: 2,
    languages: ['English', 'Tiếng Việt'],
    skills: ['Product Thinking', 'User Research'],
    rounds: roundsFor('Product Manager', 2),
  },
  {
    id: '3',
    company: 'Tik*',
    title: 'Associate Product Manager',
    summary: l(
      'Sở hữu các hạng mục cải tiến marketplace. Biến góc nhìn từ người bán và người mua thành backlog item, rồi đo tác động.',
      'Own scoped marketplace improvements at Tik*. Turn seller and shopper insights into backlog items, then measure impact.'
    ),
    hot: true,
    specialty: 'Product Manager',
    group: 'nontech',
    level: 'Junior',
    location: 'Ho Chi Minh City',
    applicants: 0,
    languages: ['English', 'Tiếng Việt'],
    skills: ['Product Thinking', 'User Research'],
    rounds: roundsFor('Product Manager', 2),
  },
  {
    id: '4',
    company: 'Z*lo Pay',
    title: 'Product Management Intern',
    summary: l(
      "Khởi đầu sự nghiệp sản phẩm tại ví điện tử hàng đầu Việt Nam. Hỗ trợ discovery, giữ backlog sạch và viết tài liệu quyết định.",
      "Kickstart your product career in Vietnam's leading e-wallet. Support discovery, backlog hygiene and decision docs."
    ),
    hot: true,
    specialty: 'Product Manager',
    group: 'nontech',
    level: 'Intern',
    location: 'Ho Chi Minh City',
    applicants: 1,
    languages: ['English', 'Tiếng Việt'],
    skills: ['Product Thinking', 'User Research'],
    rounds: roundsFor('Product Manager', 2),
  },
  {
    id: '5',
    company: 'M*M*',
    title: 'Business Analyst Talent Program',
    summary: l(
      'Chương trình tài năng 2026 🚀',
      'Talent program 2026 🚀'
    ),
    hot: true,
    specialty: 'Business Analyst',
    group: 'nontech',
    level: 'Intern',
    location: 'Ho Chi Minh City',
    applicants: 2,
    languages: ['English', 'Tiếng Việt'],
    skills: [
      'Requirements elicitation',
      'Business process modeling',
      'User stories',
      'Acceptance criteria',
      'BPMN',
    ],
    rounds: roundsFor('Business Analyst', 4),
  },
  {
    id: '6',
    company: 'G*',
    title: 'Backend Engineer (Java/Kotlin)',
    summary: l(
      'Xây dựng dịch vụ xử lý thanh toán quy mô lớn, tối ưu độ trễ và độ tin cậy ở tầng lõi.',
      'Build large-scale payment processing services, optimising latency and reliability at the core layer.'
    ),
    hot: true,
    specialty: 'Backend',
    group: 'tech',
    level: 'Middle',
    location: 'Remote, Vietnam',
    applicants: 7,
    languages: ['English', 'Tiếng Việt'],
    skills: ['Java Core', 'Kafka', 'Redis'],
    rounds: roundsFor('Backend', 3),
  },
  {
    id: '7',
    company: 'V* Bank',
    title: 'Senior Backend Engineer',
    summary: l(
      'Dẫn dắt thiết kế hệ thống ngân hàng số, mentor 3–5 kỹ sư và chịu trách nhiệm SLA cấp cao.',
      'Lead digital banking system design, mentor 3–5 engineers and own high-availability SLAs.'
    ),
    hot: true,
    specialty: 'Backend',
    group: 'tech',
    level: 'Senior',
    location: 'Ho Chi Minh City',
    applicants: 12,
    languages: ['English', 'Tiếng Việt'],
    skills: ['System Design', 'Java Core', 'Kubernetes'],
    rounds: roundsFor('Backend', 3),
  },
  {
    id: '8',
    company: 'S*helf',
    title: 'Frontend Engineer',
    summary: l(
      'Xây dựng trải nghiệm React/TypeScript nhanh, tiếp cận thiết kế và kiểm thử tự động.',
      'Build fast React/TypeScript experiences with an accessibility and automated testing mindset.'
    ),
    hot: false,
    specialty: 'Frontend',
    group: 'tech',
    level: 'Junior',
    location: 'Remote, Vietnam',
    applicants: 9,
    languages: ['English', 'Tiếng Việt'],
    skills: ['React', 'TypeScript', 'Tailwind CSS'],
    rounds: roundsFor('Frontend', 2),
  },
  {
    id: '9',
    company: 'N*omad',
    title: 'Product Owner (Agile/Scrum)',
    summary: l(
      'Quản lý backlog sản phẩm fintech, làm việc trực tiếp với đội kỹ thuật và stakeholder.',
      'Own the backlog of a fintech product, working directly with engineering and stakeholders.'
    ),
    hot: false,
    specialty: 'Product Owner',
    group: 'nontech',
    level: 'Middle',
    location: 'Da Nang, Vietnam',
    applicants: 3,
    languages: ['Tiếng Việt', 'English'],
    skills: ['User stories', 'Acceptance criteria', 'Agile delivery'],
    rounds: roundsFor('Product Owner', 2),
  },
  {
    id: '10',
    company: 'L*gistics',
    title: 'Data Analyst',
    summary: l(
      'Phân tích vận hành và phễu đơn hàng, xây dashboard phục vụ vận hành ngày.',
      'Analyse operations and order funnels, building dashboards that the daily ops team relies on.'
    ),
    hot: false,
    specialty: 'Data Analyst',
    group: 'nontech',
    level: 'Fresher',
    location: 'Ho Chi Minh City',
    applicants: 15,
    languages: ['Tiếng Việt', 'English'],
    skills: ['SQL', 'Power BI', 'Funnel Analysis'],
    rounds: roundsFor('Data Analyst', 3),
  },
  {
    id: '11',
    company: 'H*alth',
    title: 'Business Analyst',
    summary: l(
      'Khảo sát yêu cầu, chuẩn hóa quy trình nghiệp vụ và làm việc với stakeholder nhiều phòng ban.',
      'Elicit requirements, standardise business processes and work with cross-functional stakeholders.'
    ),
    hot: true,
    specialty: 'Business Analyst',
    group: 'nontech',
    level: 'Middle',
    location: 'Hanoi, Vietnam',
    applicants: 6,
    languages: ['Tiếng Việt', 'English', 'Tiếng Nhật'],
    skills: ['Requirements elicitation', 'BPMN', 'User stories'],
    rounds: roundsFor('Business Analyst', 3),
  },
  {
    id: '12',
    company: 'G*amify',
    title: 'Product Manager — Growth',
    summary: l(
      'Tăng trưởng kích hoạt người dùng mới thông qua thử nghiệm phễu và thí nghiệm tăng trưởng.',
      'Grow new-user activation through funnel experimentation and growth experiments.'
    ),
    hot: false,
    specialty: 'Product Manager',
    group: 'nontech',
    level: 'Senior',
    location: 'Remote, Vietnam',
    applicants: 4,
    languages: ['English', 'Tiếng Việt', 'Tiếng Nhật'],
    skills: ['Growth Analytics', 'A/B Testing', 'Product Thinking'],
    rounds: roundsFor('Product Manager', 3),
  },
  {
    id: '13',
    company: 'M*aily',
    title: 'Frontend Engineer (React)',
    summary: l(
      'Sở hữu giao diện sản phẩm SaaS: hiệu năng, accessibility và hệ thống thiết kế.',
      'Own the SaaS product front end: performance, accessibility and the design system.'
    ),
    hot: false,
    specialty: 'Frontend',
    group: 'tech',
    level: 'Middle',
    location: 'Hanoi, Vietnam',
    applicants: 5,
    languages: ['English', 'Tiếng Việt'],
    skills: ['React', 'TypeScript', 'Vite'],
    rounds: roundsFor('Frontend', 2),
  },
  {
    id: '14',
    company: 'E*mart',
    title: 'Product Owner — Marketplace',
    summary: l(
      'Định nghĩa và ưu tiên các yêu cầu marketplace, đảm bảo backlog phản ánh giá trị người dùng.',
      'Define and prioritise marketplace requirements, keeping the backlog tied to user value.'
    ),
    hot: false,
    specialty: 'Product Owner',
    group: 'nontech',
    level: 'Senior',
    location: 'Ho Chi Minh City',
    applicants: 2,
    languages: ['Tiếng Việt', 'English'],
    skills: ['Backlog management', 'Roadmapping', 'Agile delivery'],
    rounds: roundsFor('Product Owner', 2),
  },
]

/* ---------- Mở rộng danh sách lên 47 vị trí (dữ liệu mô phỏng) ---------- */

const TEMPLATES: Array<{
  company: string
  specialty: Specialty
  group: 'tech' | 'nontech'
  titles: string[]
  skills: string[]
  locations: string[]
  languages: string[]
}> = [
  {
    company: 'N*tech',
    specialty: 'Backend',
    group: 'tech',
    titles: ['Software Engineer Talent', 'Intermediate Backend Engineer', 'Backend Engineer II'],
    skills: ['Java Core', 'Spring Boot', 'REST API', 'PostgreSQL'],
    locations: ['HCMC, Vietnam', 'Remote, Vietnam', 'Hanoi, Vietnam'],
    languages: ['English', 'Tiếng Việt'],
  },
  {
    company: 'F*in',
    specialty: 'Product Manager',
    group: 'nontech',
    titles: ['Senior Product Manager', 'Product Manager — Payments', 'Technical Product Manager'],
    skills: ['Product Thinking', 'User Research', 'Roadmapping'],
    locations: ['Ho Chi Minh City', 'Remote, Vietnam'],
    languages: ['English', 'Tiếng Việt'],
  },
  {
    company: 'B*iz',
    specialty: 'Business Analyst',
    group: 'nontech',
    titles: ['Junior Business Analyst', 'Business Analyst — Payments'],
    skills: ['Requirements elicitation', 'User stories', 'Acceptance criteria'],
    locations: ['Ho Chi Minh City', 'Hanoi, Vietnam'],
    languages: ['Tiếng Việt', 'English'],
  },
  {
    company: 'C*de',
    specialty: 'Frontend',
    group: 'tech',
    titles: ['Junior Frontend Engineer', 'Frontend Engineer — Design System'],
    skills: ['React', 'TypeScript', 'CSS Architecture'],
    locations: ['Remote, Vietnam', 'Da Nang, Vietnam'],
    languages: ['English', 'Tiếng Việt', 'Tiếng Nhật'],
  },
  {
    company: 'D*ta',
    specialty: 'Data Analyst',
    group: 'nontech',
    titles: ['Senior Data Analyst', 'Growth Analyst'],
    skills: ['SQL', 'Python', 'Metric Design'],
    locations: ['Ho Chi Minh City', 'Remote, Vietnam'],
    languages: ['Tiếng Việt', 'English'],
  },
  {
    company: 'P*ple',
    specialty: 'Product Owner',
    group: 'nontech',
    titles: ['Talent Product Owner', 'Product Owner — Growth'],
    skills: ['User stories', 'Scrum', 'Stakeholder management'],
    locations: ['Ho Chi Minh City', 'Hanoi, Vietnam'],
    languages: ['Tiếng Việt', 'English', 'Tiếng Hàn'],
  },
  {
    company: 'F*llstack',
    specialty: 'Fullstack',
    group: 'tech',
    titles: ['Fullstack Engineer', 'Full Stack Developer — Payments'],
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'React'],
    locations: ['Remote, Vietnam', 'Ho Chi Minh City'],
    languages: ['English', 'Tiếng Việt'],
  },
  {
    company: 'J*S',
    specialty: 'JavaScript',
    group: 'tech',
    titles: ['JavaScript Engineer', 'Node.js Developer — Platform'],
    skills: ['JavaScript', 'Node.js', 'REST API', 'MongoDB'],
    locations: ['Hanoi, Vietnam', 'Remote, Vietnam'],
    languages: ['Tiếng Việt', 'English'],
  },
  {
    company: 'A*gular Labs',
    specialty: 'Angular',
    group: 'tech',
    titles: ['Angular Developer', 'Frontend Engineer — Angular Platform'],
    skills: ['Angular', 'TypeScript', 'RxJS', 'NgRx'],
    locations: ['Da Nang, Vietnam', 'Ho Chi Minh City'],
    languages: ['English', 'Tiếng Việt'],
  },
]

const LEVELS: Level[] = [
  'Intern',
  'Fresher',
  'Junior',
  'Middle',
  'Senior',
  'Lead',
  'Principal',
  'Manager',
]

const SUMMARY_POOL: Record<string, { vi: string; en: string }> = {
  Backend: {
    vi: 'Gia nhận đội backend, làm việc với microservice, cơ sở dữ liệu quan hệ và yêu cầu độ trễ thấp.',
    en: 'Join the backend team working on microservices, relational databases and low-latency requirements.',
  },
  Frontend: {
    vi: 'Giao diện sản phẩm hiệu năng cao, chú trọng accessibility và chất lượng mã nguồn.',
    en: 'High-performance product UI with a focus on accessibility and code quality.',
  },
  Fullstack: {
    vi: 'Phủ trọn vòng đời sản phẩm: API, giao diện và triển khai trên cùng một codebase.',
    en: 'Own the full product loop: APIs, UI and deployment from a single codebase.',
  },
  Java: {
    vi: 'Backend Java/JVM: hiệu năng cao, kiểm thử tự động và thiết kế hệ thống phân tán.',
    en: 'Java/JVM backend work: high throughput, automated testing and distributed design.',
  },
  TypeScript: {
    vi: 'Mã nguồn TypeScript chặt chẽ, tooling tốt và kiểm thử tự động trên quy mô lớn.',
    en: 'Strict TypeScript code with strong tooling and automated tests at scale.',
  },
  JavaScript: {
    vi: 'Nền tảng Node.js: tối ưu độ trễ, xử lý sự kiện và API cho nhiều kênh.',
    en: 'Node.js platform work: latency tuning, event handling and multi-channel APIs.',
  },
  Python: {
    vi: 'Dữ liệu và dịch vụ Python: pipeline, API và mô hình phân tích trong sản phẩm.',
    en: 'Python data and services: pipelines, APIs and in-product analytics models.',
  },
  React: {
    vi: 'Giao diện React với hiệu năng render tốt, state management rõ ràng và design system.',
    en: 'React UI with fast rendering, clear state management and a shared design system.',
  },
  Angular: {
    vi: 'Nền tảng Angular: kiến trúc module, RxJS và tiêu chuẩn accessibility cao.',
    en: 'Angular platform work: module architecture, RxJS and high accessibility standards.',
  },
  'Product Manager': {
    vi: 'Điều hành một hạng mục sản phẩm end-to-end: discovery, ưu tiên, phát hành và đo lường.',
    en: 'Own a product area end to end: discovery, prioritisation, release and measurement.',
  },
  'Business Analyst': {
    vi: 'Làm việc giữa nghiệp vụ và kỹ thuật để làm rõ yêu cầu và chuẩn hóa quy trình.',
    en: 'Bridge business and engineering to clarify requirements and standardise processes.',
  },
  'Product Owner': {
    vi: 'Quản lý backlog, ưu tiên theo giá trị và điều phối nhịp làm việc của đội Scrum.',
    en: 'Manage the backlog, prioritise by value and keep the Scrum team flowing.',
  },
  'Data Analyst': {
    vi: 'Kể câu chuyện bằng dữ liệu: truy vấn, phân tích phễu và trực quan hoá phát hiện.',
    en: 'Tell stories with data: queries, funnel analysis and visualising findings.',
  },
}

/** PRNG tất định để danh sách sinh ra luôn giống nhau giữa các lần render. */
const makeRandom = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const expandPositions = (): Position[] => {
  const random = makeRandom(68_2026)
  const pool: Position[] = []
  const total = 47

  for (let i = 0; pool.length < total; i += 1) {
    const tpl = TEMPLATES[i % TEMPLATES.length]
    const level = LEVELS[Math.floor(random() * LEVELS.length)]
    const title = tpl.titles[Math.floor(random() * tpl.titles.length)]
    const roundCount = 1 + Math.floor(random() * 3)
    const index = pool.length + 1

    pool.push({
      id: String(index),
      company: tpl.company,
      title: `${level} ${title}`,
      summary: SUMMARY_POOL[tpl.specialty],
      hot: random() > 0.72,
      specialty: tpl.specialty,
      group: tpl.group,
      level,
      location: tpl.locations[Math.floor(random() * tpl.locations.length)],
      applicants: Math.floor(random() * 20),
      languages: tpl.languages,
      skills: tpl.skills,
      rounds: roundsFor(tpl.specialty, roundCount),
    })
  }

  return pool
}

export const allPositions: Position[] = [...positions, ...expandPositions()]

export const getPosition = (id: string | undefined): Position | undefined =>
  allPositions.find((p) => p.id === id)

export const getRound = (
  position: Position | undefined,
  roundId: string | undefined
): Round | undefined => position?.rounds.find((r) => r.id === roundId)