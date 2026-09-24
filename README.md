# jpd - Ứng dụng Ôn tập Từ vựng Tiếng Nhật (できる日本語)

Ứng dụng web ôn tập và luyện tập từ vựng tiếng Nhật theo giáo trình **できる日本語 (Dekiru Nihongo)**.

## Tính năng nổi bật
- **Phân loại bài học chi tiết**: Phân chia từ vựng theo từng **Bài (Lesson)** và chia nhỏ theo **3 phần (Parts)** chuẩn theo giáo trình:
  - **Bài 4**: Phần 1 (どこ？), Phần 2 (どんなところ？), Phần 3 (季節・料理)
  - **Bài 5**: Phần 1 (週末), Phần 2 (休みの後で), Phần 3 (今度の休みに)
  - **Bài 6**: Phần 1 (一緒に行きませんか), Phần 2 (どちらがいいですか。), Phần 3 (約束)
  - **Bài 7**: Phần 1 (道がわかりません), Phần 2 (パーティーの準備), Phần 3 (みんなで楽しいパーティー)
- **Chế độ Học (Quiz)**:
  - **3 Chế độ hỏi đáp linh hoạt**:
    - **🇯🇵 ➔ 🇻🇳 Nhật - Việt**: Câu hỏi tiếng Nhật, chọn nghĩa tiếng Việt.
    - **🇻🇳 ➔ 🇯🇵 Việt - Nhật**: Câu hỏi tiếng Việt, chọn từ tiếng Nhật tương ứng.
    - **🔀 Trộn cả hai**: Xáo trộn ngẫu nhiên cả hai chiều câu hỏi để rèn phản xạ toàn diện.
  - **Tùy chọn ẩn Furigana**: Hỗ trợ ẩn cách đọc (chỉ hiện Hán tự) ở cả câu hỏi tiếng Nhật và các lựa chọn đáp án tiếng Nhật.
  - **Phản hồi chi tiết**: Hiển thị rõ cặp từ Hán tự kèm Furigana và nghĩa tiếng Việt sau mỗi lượt trả lời.
  - Trắc nghiệm phản xạ nhanh.
  - Tự động lặp lại các câu trả lời sai cho tới khi nắm vững.
  - Phím tắt (1-9, Mũi tên, Enter) và hỗ trợ phím phụ chuột (mouse side buttons).
- **Màn hình Tất cả câu hỏi (List view)**:
  - Lọc nhanh theo Bài và từng Phần.
  - Đánh dấu câu đã học, lưu trữ tiến độ qua LocalStorage.
  - Nút định vị nhanh đến câu đã học gần nhất.

## Cấu trúc thư mục dự án

```text
quizlet/
├── index.html          # Khung giao diện HTML tinh gọn
├── css/
│   └── style.css       # Tùy chỉnh giao diện, thanh cuộn, hiệu ứng
├── js/
│   ├── database.js     # Kho dữ liệu từ vựng thô (dễ dàng chỉnh sửa, dán thêm bài mới)
│   ├── parser.js       # Bộ phân tích dữ liệu câu hỏi và ánh xạ bài học
│   └── app.js          # Logic điều khiển chính (Quiz, Danh sách, Phím tắt, LocalStorage)
└── README.md           # Tài liệu hướng dẫn
```

## Hướng dẫn cập nhật / thêm từ vựng
- Mở file `js/database.js` và dán hoặc chỉnh sửa các câu hỏi theo mẫu:
  ```text
  Câu X [BÀI Y - PHẦN Z: Tiêu đề]
  Từ_tiếng_Nhật (cách_đọc)
    A. Nghĩa A
    B. Nghĩa B  ✓
    C. Nghĩa C
    D. Nghĩa D
  → Đáp án: B
  ────────────────────────────────────────────────────────────
  ```
- Lưu lại và mở trực tiếp [index.html](file:///c:/Users/TUF%20FX506/Downloads/quizlet/index.html) trên bất kỳ trình duyệt nào để học.
