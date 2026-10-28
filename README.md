# 🧭 VTripPlanner - Hệ Thống Lập Kế Hoạch Du Lịch Thông Minh & Mạng Xã Hội Du Lịch

> **Đồ án / Dự án**: Nền tảng Web lập lịch trình du lịch thông minh (Smart Trip Planner), gợi ý địa điểm cá nhân hóa theo thời gian thực (ETA), ngân sách, mùa du lịch và mạng xã hội chia sẻ trải nghiệm du lịch tại Việt Nam.

---

## 📌 1. Yêu cầu môi trường (Prerequisites)

Trước khi chạy dự án, máy tính cần được cài đặt sẵn:
- **Node.js**: Phiên bản `>= 18.18.0` hoặc `>= 20.x` (Khuyến nghị Node.js 20 LTS).
- **Trình quản lý gói**: `npm` (đi kèm Node.js) hoặc `pnpm` / `yarn`.
- **Cơ sở dữ liệu**: PostgreSQL (hỗ trợ phiên bản 14+ hoặc Supabase PostgreSQL).

---

## 🚀 2. Hướng dẫn cài đặt & Khởi chạy (Quick Start)

### Bước 1: Cài đặt các gói phụ thuộc (Dependencies)
Mở terminal tại thư mục gốc của dự án và chạy:
```bash
npm install
```

### Bước 2: Cấu hình biến môi trường
Tạo tệp `.env.local` ở thư mục gốc (dựa trên tệp mẫu `.env.example`):
```bash
cp .env.example .env.local
```
Điền các thông tin kết nối Supabase và PostgreSQL của bạn vào `.env.local`:
```env
# Cấu hình Supabase (Auth & Storage)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
SUPABASE_SECRET_KEY="your-supabase-service-role-secret-key"

# Cấu hình Database (PostgreSQL / Supabase Transaction & Session Pooler)
DATABASE_URL="postgresql://postgres:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:password@host:5432/postgres"

# (Tùy chọn) Google Routes API Key để đo khoảng cách và ETA thời gian thực
# Nếu không cấu hình, hệ thống sẽ tự động dùng thuật toán nội bộ Haversine Fallback
# GOOGLE_MAPS_API_KEY=""
```

### Bước 3: Khởi tạo Cơ sở dữ liệu & Sinh Prisma Client
Sinh client tương thích cho Prisma:
```bash
npm run prisma:generate
```

*(Tùy chọn nếu khởi tạo DB mới)* Áp dụng migration và nạp dữ liệu mẫu:
```bash
# Đẩy migration vào database:
npx prisma migrate deploy

# Nạp dữ liệu mẫu các địa điểm du lịch tại Việt Nam:
npm run seed:places
```

### Bước 4: Chạy ứng dụng ở môi trường phát triển (Dev)
```bash
npm run dev
```

### Bước 5: Mở ứng dụng
Truy cập trình duyệt tại địa chỉ: **[http://localhost:3000](http://localhost:3000)**

---

## 🗺️ 3. Sơ đồ các Phân hệ & Đường dẫn chính (Routes Map)

| Đường dẫn | Tên phân hệ / Chức năng | Mô tả |
| :--- | :--- | :--- |
| `/` | **Trang chủ & Bảng tin** | Giới thiệu hệ thống, bảng tin cộng đồng (Infinite Feed), tương tác bài viết. |
| `/lap-lich-trinh` | **Lập lịch trình thông minh** | Nhập điểm đi/đến, ngày giờ, số người, ngân sách; tính ETA và gợi ý lịch trình. |
| `/lap-lich-trinh/tuy-chinh`| **Biên tập Draft Lịch trình**| Thay đổi giờ, hoán đổi thứ tự (`↑/↓`), thêm/xóa địa điểm trước khi lưu. |
| `/chuyen-di-cua-toi` | **Chuyến đi của tôi** | Quản lý danh sách chuyến đi đã lưu, checklist hành trang và theo dõi chi tiêu. |
| `/uu-dai` | **Săn ưu đãi du lịch** | Danh sách voucher/khuyến mãi từ đối tác đã được kiểm duyệt. |
| `/voucher-cua-toi` | **Kho voucher của tôi** | Xem danh sách voucher đã nhận kèm mã QR sử dụng tại điểm dịch vụ. |
| `/bai-viet-cua-toi` | **Bài viết của tôi** | Quản lý các bài viết chia sẻ kinh nghiệm du lịch của người dùng. |
| `/bai-viet-da-luu` | **Bài viết đã lưu** | Bộ sưu tập bài viết đã bookmark. |
| `/dang-ky-doi-tac` | **Đăng ký Đối tác** | Form nộp hồ sơ doanh nghiệp (khách sạn, nhà hàng, điểm tham quan,...). |
| `/doi-tac` | **Trung tâm Đối tác (Partner)**| Quản lý chi nhánh, địa điểm và các chương trình ưu đãi giảm giá. |
| `/quan-tri` | **Trung tâm Quản trị (Admin)** | Phê duyệt đối tác, duyệt địa điểm, duyệt ưu đãi, kiểm duyệt bài viết và người dùng. |

---

## 👥 4. Phân quyền Người dùng (Role-Based Access Control)

Hệ thống hỗ trợ 3 nhóm vai trò:
1. **Khách du lịch (`USER`)**:
   - Sử dụng đầy đủ tính năng cá nhân: lập lịch trình, lưu chuyến đi, đăng bài viết, tương tác (Like/Love/Wow, bình luận), nhận voucher.
2. **Doanh nghiệp Đối tác (`PARTNER`)**:
   - Truy cập khu vực `/doi-tac` sau khi hồ sơ đăng ký được Admin phê duyệt.
   - Thêm địa điểm, chi nhánh và phát hành voucher khuyến mãi.
3. **Quản trị viên (`ADMIN`)**:
   - Truy cập khu vực `/quan-tri`.
   - Kiểm duyệt đơn đăng ký đối tác, địa điểm, khuyến mãi, bài viết vi phạm, quản lý danh mục địa phương và tài khoản người dùng.

---

## 📂 5. Cấu trúc Thư mục Dự án

```
vtripplanner/
├── prisma/                        # Định nghĩa Database Schema & Script Seeds
│   ├── schema.prisma              # Prisma Schema 20+ bảng dữ liệu
│   ├── migrations/                # Lịch sử các bản migration SQL
│   └── seed/                      # Script seed địa điểm mẫu & hình ảnh
├── public/                        # Static Assets (Hình ảnh, logo thương hiệu, icons)
├── src/
│   ├── app/                       # Next.js App Router (Giao diện & API Endpoints)
│   ├── components/                # React Components theo từng phân hệ
│   ├── generated/prisma/          # Prisma Generated Client
│   ├── lib/                       # Logic thuật toán & Thư viện dùng chung
│   │   ├── auth/                  # RBAC, phân quyền và xác thực
│   │   ├── prisma.ts              # Kết nối Database qua Postgres Adapter
│   │   ├── social-feed/           # Logic truy vấn và tương tác bài viết
│   │   ├── supabase/              # Supabase Auth & Storage Clients
│   │   └── trip-planner/          # Thuật toán cốt lõi: ETA, Budget, Slot Scoring
│   └── proxy.ts                   # Middleware proxy xử lý session Supabase SSR
├── PROJECT_SPEC_FOR_REPORT.md     # Tài liệu đặc tả kiến trúc & giải thuật phục vụ viết báo cáo
├── .env.example                   # Tệp mẫu hướng dẫn cấu hình biến môi trường
├── package.json                   # Khai báo các gói thư viện
└── tsconfig.json                  # Cấu hình TypeScript
```

---

## 🛠️ 6. Các lệnh Script hữu ích trong dự án

- `npm run dev`: Chạy server phát triển (Development mode).
- `npm run build`: Build dự án thành bản sản phẩm (Production build).
- `npm run start`: Chạy bản build sản phẩm.
- `npm run lint`: Kiểm tra chất lượng mã nguồn bằng ESLint.
- `npm run prisma:generate`: Tạo mã Prisma Client tương thích.
- `npm run seed:places`: Chạy script nạp dữ liệu địa điểm du lịch mẫu.
