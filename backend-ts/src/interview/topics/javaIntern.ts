// Ngân hàng chủ đề kỹ thuật Java cho cấp INTERN.
// Mỗi chủ đề là một bậc thang L1 (dễ) -> L4 (khó với intern). Mỗi bậc có:
//  - question: câu hỏi viết sẵn theo văn nói (dùng nguyên văn khi AI không phản hồi)
//  - expected: các ý chính cần có để tính là trả lời đủ
//  - hint: gợi ý đời thường, không lộ đáp án

export interface TopicLevel {
  level: number;
  question: string;
  expected: string[];
  hint: string;
}

export interface Topic {
  id: string;
  name: string;
  // Từ khoá để nhận ra khi ứng viên xin chuyển sang chủ đề này
  aliases: string[];
  levels: TopicLevel[];
}

export const JAVA_INTERN_TOPICS: Topic[] = [
  {
    id: "oop",
    name: "Lập trình hướng đối tượng (OOP)",
    aliases: ["oop", "hướng đối tượng", "class", "kế thừa", "đa hình", "đóng gói"],
    levels: [
      {
        level: 1,
        question: "Em phân biệt giúp anh class với object, lấy một ví dụ đời thường cho dễ hình dung nhé?",
        expected: ["Class là bản thiết kế/khuôn mẫu", "Object là thực thể cụ thể được tạo ra từ class", "Có ví dụ minh hoạ"],
        hint: "Thử nghĩ tới bản vẽ một ngôi nhà và những ngôi nhà được xây từ bản vẽ đó."
      },
      {
        level: 2,
        question: "Vì sao trong Java người ta hay để thuộc tính của class là private rồi mới viết getter, setter?",
        expected: ["Tính đóng gói, che giấu dữ liệu bên trong", "Kiểm soát việc đọc/ghi, có thể kiểm tra dữ liệu trước khi gán", "Thay đổi bên trong không ảnh hưởng code bên ngoài"],
        hint: "Nếu ai cũng sửa trực tiếp được số dư của một tài khoản ngân hàng thì chuyện gì xảy ra?"
      },
      {
        level: 3,
        question: "Đa hình là gì, em lấy ví dụ một chỗ mà đa hình giúp code gọn hơn được không?",
        expected: ["Cùng một lời gọi phương thức nhưng hành vi khác nhau tuỳ đối tượng thực tế", "Thông qua override ở lớp con", "Biến kiểu lớp cha/interface trỏ tới đối tượng lớp con"],
        hint: "Tưởng tượng em có một danh sách hình tròn, hình vuông, tam giác và muốn tính diện tích tất cả."
      },
      {
        level: 4,
        question: "Khi nào em chọn dùng interface, còn khi nào em dùng abstract class?",
        expected: ["Interface định nghĩa hợp đồng/khả năng, một class implement được nhiều interface", "Abstract class dùng để chia sẻ code và trạng thái chung, chỉ kế thừa được một", "Phân biệt quan hệ 'là một' với 'có khả năng'"],
        hint: "Một class trong Java kế thừa được bao nhiêu class cha, còn implement interface thì sao?"
      }
    ]
  },
  {
    id: "java_basics",
    name: "Java cơ bản",
    aliases: ["java core", "java cơ bản", "string", "equals", "kiểu dữ liệu"],
    levels: [
      {
        level: 1,
        question: "Trong Java, kiểu int với kiểu String khác nhau cơ bản ở điểm nào?",
        expected: ["int là kiểu nguyên thuỷ, lưu giá trị trực tiếp", "String là kiểu tham chiếu, là một đối tượng", "String có các phương thức đi kèm"],
        hint: "Em có gọi được phương thức nào trên một biến int giống như gọi length() trên String không?"
      },
      {
        level: 2,
        question: "Khi so sánh hai chuỗi trong Java, em dùng dấu bằng bằng hay dùng equals, vì sao?",
        expected: ["Dấu == so sánh tham chiếu, tức có phải cùng một đối tượng không", "equals so sánh nội dung chuỗi", "Nên dùng equals để so sánh String"],
        hint: "Hai tờ giấy cùng ghi chữ Java thì có phải là cùng một tờ giấy không?"
      },
      {
        level: 3,
        question: "Người ta nói String trong Java là bất biến, điều đó nghĩa là gì?",
        expected: ["Tạo ra rồi thì không sửa được nội dung", "Các thao tác như nối chuỗi sẽ tạo ra đối tượng mới", "Nối chuỗi nhiều lần trong vòng lặp nên dùng StringBuilder"],
        hint: "Khi em viết s bằng s cộng thêm chữ a, đối tượng cũ bị sửa hay một đối tượng mới được tạo ra?"
      },
      {
        level: 4,
        question: "Nếu em tự viết class Student và muốn hai sinh viên trùng mã số được coi là bằng nhau, em cần làm gì?",
        expected: ["Override equals để so sánh theo mã số", "Override hashCode đi kèm cho nhất quán", "Để dùng đúng trong HashMap/HashSet"],
        hint: "Mặc định phương thức equals của lớp Object so sánh cái gì?"
      }
    ]
  },
  {
    id: "collections",
    name: "Mảng và Collection",
    aliases: ["collection", "arraylist", "hashmap", "mảng", "list", "map"],
    levels: [
      {
        level: 1,
        question: "Mảng thường trong Java với ArrayList khác nhau ở điểm nào dễ thấy nhất?",
        expected: ["Mảng có kích thước cố định khi tạo", "ArrayList tự tăng kích thước khi thêm phần tử", "ArrayList có sẵn các phương thức như add, remove"],
        hint: "Khi tạo một mảng, em bắt buộc phải khai báo trước điều gì?"
      },
      {
        level: 2,
        question: "Trong trường hợp nào em sẽ dùng HashMap thay vì ArrayList?",
        expected: ["Khi cần lưu theo cặp key và value", "Khi cần tra cứu nhanh theo key", "Có ví dụ cụ thể như tìm sinh viên theo mã"],
        hint: "Nếu cần tìm đúng một sinh viên theo mã số trong mười nghìn sinh viên thì sao?"
      },
      {
        level: 3,
        question: "Tìm một phần tử trong ArrayList và lấy theo key trong HashMap, cách nào nhanh hơn và vì sao?",
        expected: ["ArrayList phải duyệt lần lượt, độ phức tạp O(n)", "HashMap dùng hàm băm để tới thẳng vị trí, gần O(1)"],
        hint: "ArrayList phải xem từng phần tử một, còn HashMap dựa vào đâu để biết ngay vị trí?"
      },
      {
        level: 4,
        question: "Hai key khác nhau mà ra cùng một giá trị hash thì HashMap xử lý thế nào?",
        expected: ["Gọi là va chạm (collision)", "Nhiều phần tử được lưu chung một bucket dạng danh sách hoặc cây", "Dùng equals để tìm đúng key"],
        hint: "Cùng một ngăn tủ mà có hai món đồ thì em tìm đúng món mình cần bằng cách nào?"
      }
    ]
  },
  {
    id: "sql_basic",
    name: "Cơ sở dữ liệu SQL",
    aliases: ["sql", "database", "cơ sở dữ liệu", "mysql", "join", "khoá chính", "khóa chính"],
    levels: [
      {
        level: 1,
        question: "Khoá chính trong một bảng database dùng để làm gì?",
        expected: ["Định danh duy nhất cho mỗi dòng", "Không được trùng và không được rỗng"],
        hint: "Lớp có hai bạn trùng cả họ lẫn tên thì nhà trường phân biệt bằng gì?"
      },
      {
        level: 2,
        question: "Khoá ngoại là gì, trong đồ án của em có chỗ nào dùng khoá ngoại không?",
        expected: ["Cột tham chiếu tới khoá chính của bảng khác", "Tạo quan hệ giữa các bảng", "Giữ dữ liệu nhất quán, không trỏ tới bản ghi không tồn tại"],
        hint: "Bảng đơn hàng muốn biết đơn đó là của khách hàng nào thì cần lưu thêm thông tin gì?"
      },
      {
        level: 3,
        question: "INNER JOIN với LEFT JOIN khác nhau như thế nào?",
        expected: ["INNER JOIN chỉ lấy các dòng khớp ở cả hai bảng", "LEFT JOIN lấy hết bảng bên trái, không khớp thì cột bên phải là null", "Có ví dụ như liệt kê cả khách chưa có đơn"],
        hint: "Muốn liệt kê tất cả khách hàng, kể cả những người chưa mua đơn nào, thì em dùng loại JOIN nào?"
      },
      {
        level: 4,
        question: "Đánh index cho một cột thì vì sao truy vấn theo cột đó lại nhanh hơn?",
        expected: ["Không phải quét toàn bộ bảng", "Index là cấu trúc đã sắp xếp sẵn, thường là B-tree, nên tìm rất nhanh", "Đánh đổi: ghi dữ liệu chậm hơn và tốn thêm dung lượng"],
        hint: "Nghĩ tới phần mục lục ở cuối một cuốn sách thật dày."
      }
    ]
  },
  {
    id: "exception",
    name: "Xử lý ngoại lệ",
    aliases: ["exception", "ngoại lệ", "try catch", "bắt lỗi", "nullpointer"],
    levels: [
      {
        level: 1,
        question: "Em gặp lỗi NullPointerException bao giờ chưa, nó thường xảy ra khi nào?",
        expected: ["Gọi phương thức hoặc truy cập thuộc tính trên một biến đang là null", "Có ví dụ cụ thể"],
        hint: "Nếu biến student chưa được gán đối tượng nào mà em gọi student.getName() thì sao?"
      },
      {
        level: 2,
        question: "Khối try catch finally dùng để làm gì, và finally thì chạy vào lúc nào?",
        expected: ["try chứa đoạn code có thể phát sinh lỗi", "catch bắt và xử lý lỗi", "finally luôn chạy dù có lỗi hay không, thường để giải phóng tài nguyên"],
        hint: "Em mở một file ra đọc mà giữa chừng bị lỗi thì file đó có cần được đóng lại không?"
      },
      {
        level: 3,
        question: "Checked exception với unchecked exception khác nhau thế nào?",
        expected: ["Checked bắt buộc phải xử lý hoặc khai báo throws, trình biên dịch kiểm tra", "Unchecked kế thừa RuntimeException, không bắt buộc xử lý", "Có ví dụ như IOException và NullPointerException"],
        hint: "Có loại lỗi nào mà nếu em không try catch thì code không biên dịch được không?"
      },
      {
        level: 4,
        question: "Bắt lỗi xong mà để khối catch trống không làm gì thì có vấn đề gì?",
        expected: ["Lỗi bị nuốt mất, không ai biết", "Rất khó debug vì mất dấu vết", "Nên ghi log, xử lý phù hợp hoặc ném tiếp lỗi"],
        hint: "Nếu có lỗi xảy ra mà không ai được báo, lúc sửa em lần ra nguyên nhân kiểu gì?"
      }
    ]
  },
  {
    id: "algorithm",
    name: "Tư duy thuật toán",
    aliases: ["thuật toán", "giải thuật", "algorithm", "cấu trúc dữ liệu", "big o", "độ phức tạp"],
    levels: [
      {
        level: 1,
        question: "Để tìm số lớn nhất trong một mảng số nguyên, em sẽ làm thế nào?",
        expected: ["Duyệt qua từng phần tử", "Giữ một biến max, so sánh và cập nhật khi gặp số lớn hơn"],
        hint: "Nếu em đứng xem từng bạn đi qua và chỉ được nhớ một con số, em sẽ nhớ số nào?"
      },
      {
        level: 2,
        question: "Tìm kiếm tuần tự với tìm kiếm nhị phân khác nhau ra sao?",
        expected: ["Tuần tự duyệt lần lượt, không cần dữ liệu sắp xếp", "Nhị phân cần dữ liệu đã sắp xếp, mỗi bước loại đi một nửa", "Nhị phân nhanh hơn nhiều với dữ liệu lớn"],
        hint: "Khi tra từ điển giấy, em có lật từng trang từ đầu không?"
      },
      {
        level: 3,
        question: "Hai vòng for lồng nhau cùng duyệt một mảng n phần tử thì độ phức tạp là bao nhiêu?",
        expected: ["O(n bình phương)", "n tăng gấp đôi thì thời gian tăng khoảng bốn lần"],
        hint: "Với mỗi phần tử ở vòng ngoài, vòng trong chạy bao nhiêu lần?"
      },
      {
        level: 4,
        question: "Để kiểm tra trong mảng có hai số trùng nhau không, có cách nào nhanh hơn hai vòng for lồng nhau không?",
        expected: ["Dùng HashSet, duyệt một lần, gặp số đã có là trùng, O(n)", "Hoặc sắp xếp rồi so sánh các phần tử kề nhau, O(n log n)"],
        hint: "Nếu có một cuốn sổ ghi lại những số đã gặp và tra rất nhanh thì sao?"
      }
    ]
  },
  {
    id: "git_debug",
    name: "Git và Debug",
    aliases: ["git", "github", "debug", "gỡ lỗi", "merge conflict"],
    levels: [
      {
        level: 1,
        question: "Khi làm bài tập nhóm, em thường dùng Git để làm những việc gì?",
        expected: ["Lưu lại lịch sử thay đổi của code", "Làm việc nhóm, đồng bộ code giữa các thành viên", "Có thể quay lại phiên bản cũ khi cần"],
        hint: "Nếu lỡ xoá mất một đoạn code chạy tốt từ hôm qua thì em lấy lại bằng cách nào?"
      },
      {
        level: 2,
        question: "Lệnh git commit với git push khác nhau thế nào?",
        expected: ["commit lưu thay đổi vào kho ở máy mình", "push đẩy các commit lên kho chung trên server như GitHub"],
        hint: "Sau khi em commit xong thì các bạn cùng nhóm đã thấy code mới của em chưa?"
      },
      {
        level: 3,
        question: "Khi bị merge conflict, em xử lý từng bước như thế nào?",
        expected: ["Mở file, xem các đoạn bị đánh dấu xung đột", "Hiểu hai phiên bản, chọn hoặc kết hợp, trao đổi với người viết nếu cần", "Xoá dấu đánh dấu, chạy thử rồi commit"],
        hint: "Hai người cùng sửa một dòng code thì Git có tự biết nên giữ bản của ai không?"
      },
      {
        level: 4,
        question: "Code chạy ra kết quả sai mà không báo lỗi gì, em tìm nguyên nhân bằng cách nào?",
        expected: ["Tái hiện lại lỗi với dữ liệu cụ thể", "Dùng debugger đặt breakpoint hoặc in log để xem giá trị biến", "Khoanh vùng dần đoạn code gây sai"],
        hint: "Nếu được dừng chương trình ở giữa chừng và nhìn giá trị từng biến thì em sẽ dừng ở đâu?"
      }
    ]
  }
];
