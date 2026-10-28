# 📋 HƯỚNG DẪN CÀI ĐẶT VÀ SỬ DỤNG DỰ ÁN VTRIPPLANNER

Tài liệu này dành cho giảng viên, người chấm bài hoặc lập trình viên cần thiết lập và chạy đồ án **VTripPlanner** trên máy cá nhân.

---

## 1. Yêu cầu môi trường
- **Node.js**: Phiên bản 18.18+ hoặc 20.x LTS (Khuyến nghị).
- **npm** (đi kèm Node.js).
- **Trình duyệt**: Google Chrome, Microsoft Edge, Firefox, Safari.
- **Cơ sở dữ liệu**: PostgreSQL hoặc Supabase (đã có schema và migration sẵn trong thư mục `prisma/`).

---

## 2. Các bước khởi chạy nhanh

### Bước 1: Mở terminal tại thư mục dự án và cài thư viện
```bash
npm install
```

### Bước 2: Tạo tệp `.env.local`
Tạo tệp `.env.local` tại thư mục gốc và sao chép nội dung từ `.env.example`:
```bash
# Windows PowerShell
Copy-Item .env.example .env.local

# Hoặc Linux/MacOS/Git Bash
cp .env.example .env.local
```
Điền các giá trị kết nối Supabase và Database URL vào `.env.local`.

### Bước 3: Sinh Prisma Client
```bash
npm run prisma:generate
```

### Bước 4: Chạy dự án
```bash
npm run dev
```

### Bước 5: Trải nghiệm ứng dụng
Mở trình duyệt và truy cập: **http://localhost:3000**

---

## 3. Các chức năng chính để nghiệm thu / chấm đồ án

1. **Trang chủ & Bảng tin du lịch (`http://localhost:3000`)**:
   - Khám phá bài viết chia sẻ lịch trình du lịch theo mùa.
   - Thả cảm xúc (Like / Love / Wow), bình luận bài viết, bookmark bài viết.
   - Đăng bài viết chia sẻ kèm hình ảnh/video đa phương tiện.
2. **Lập lịch trình thông minh (`http://localhost:3000/lap-lich-trinh`)**:
   - Chọn điểm xuất phát, điểm đến, ngày giờ, số người, tổng ngân sách và sở thích.
   - Hệ thống tự động tính ETA, phân bổ ngân sách và xếp lịch địa điểm theo khung giờ (Sáng/Chiều/Tối).
   - Bấm **Tùy chỉnh lịch trình** (`/lap-lich-trinh/tuy-chinh`) để đổi giờ, hoán đổi thứ tự địa điểm, thêm/xóa hoạt động trước khi lưu.
3. **Quản lý chuyến đi (`http://localhost:3000/chuyen-di-cua-toi`)**:
   - Xem chi tiết hành trình các ngày, danh sách chuẩn bị hành trang (Checklist) và ghi chép chi tiêu thực tế.
4. **Săn ưu đãi & Kho voucher (`http://localhost:3000/uu-dai`, `http://localhost:3000/voucher-cua-toi`)**:
   - Xem các chương trình giảm giá từ đối tác du lịch.
   - Bấm nhận voucher để sinh mã nhận diện duy nhất và mã QR sử dụng tại cơ sở dịch vụ.
5. **Cổng Đối tác (`http://localhost:3000/doi-tac`)**:
   - Đăng ký đối tác doanh nghiệp du lịch (`/dang-ky-doi-tac`).
   - Quản lý địa điểm chi nhánh và phát hành chương trình khuyến mãi.
6. **Cổng Quản trị viên (`http://localhost:3000/quan-tri`)**:
   - Phê duyệt hồ sơ đối tác, địa điểm mới, chương trình khuyến mãi.
   - Kiểm duyệt bài viết cộng đồng và quản lý tài khoản người dùng.
