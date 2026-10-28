# VTripPlanner – Project Overview

## 1️⃣ Mục đích dự án (Project Purpose)
Ứng dụng lập kế hoạch du lịch đa nền tảng gồm **Web (Next.js)** và **Mobile (React Native/Expo)**.
- Người dùng có thể: khám phá địa điểm (places), lập lịch trình chuyến đi (trips), đăng bài và tương tác trên bảng tin (social feed).
- Backend sử dụng **Supabase** (PostgreSQL, Supabase Auth, Supabase Storage).

---

## 2️⃣ Local Supabase Stack (Docker)
Hệ thống Supabase local đã được dựng hoàn chỉnh trên Docker máy của bạn:

| Dịch vụ | Tên Container | Port | Địa chỉ truy cập / Kết nối |
| ------- | ------------- | ---- | --------------------------- |
| **Auth & API (Kong)** | `supabase_auth_vtripplanner` | `54321` | `http://127.0.0.1:54321` |
| **PostgreSQL Database** | `supabase_db_vtripplanner` | `54322` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| **Supabase Studio** (Giao diện quản lý DB) | `supabase_studio_vtripplanner` | `54323` | `http://127.0.0.1:54323` |
| **Mailpit** (Bắt email test đăng ký/OTP) | `supabase_mailpit_vtripplanner` | `54324` | `http://127.0.0.1:54324` |

> ⚠️ **Lưu ý**: Project Supabase trên Cloud (`pdagqtaxuientvtwdfql`) hiện đã bị pause/hết hạn. Toàn bộ code đang kết nối trực tiếp vào Supabase Local trên máy bạn để đạt tốc độ phản hồi tức thì (không bị lag 2-3s).

---

## 3️⃣ Cấu hình biến môi trường (`.env.local`)
File `.env.local` ở thư mục gốc web đã được cấu hình trỏ vào local. Lấy hai khóa bằng lệnh `npx supabase status` và không commit khóa vào git:
```dotenv
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<PUBLISHABLE_KEY từ npx supabase status>"
SUPABASE_SECRET_KEY="<SECRET_KEY từ npx supabase status>"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

---

## 4️⃣ Tài khoản Demo đăng nhập sẵn có
Các tài khoản này đã được seed vào Supabase Auth + gán Role trong database:

| Phân quyền (Role) | Email đăng nhập | Mật khẩu | Ghi chú |
| ----------------- | ---------------- | -------- | ------- |
| **ADMIN** | `admin.vtripplanner@example.com` | `Password123@` | Quản trị viên toàn hệ thống |
| **PARTNER** | `partner.vtripplanner@example.com` | `Password123@` | Đối tác / Nhà cung cấp dịch vụ |
| **USER** | `user.vtripplanner@example.com` | `Password123@` | Người dùng du lịch thông thường |

---

## 5️⃣ Cấu trúc Database & Bảng chính
Database schema được quản lý qua Prisma (`prisma/schema.prisma`):
- **`users`**: Tài khoản người dùng (đồng bộ UUID với Supabase Auth `auth.users`).
- **`user_profiles`**: Thông tin cá nhân (`userId`, `fullName`, `displayName`, avatar...).
- **`roles`**: Phân quyền (`ADMIN`, `PARTNER`, `USER` theo enum `AppRole`).
- **`user_roles`**: Bảng liên kết nhiều-nhiều giữa người dùng và quyền.
- **`provinces` / `districts`**: Tỉnh thành và quận huyện (đã fix `id` default `gen_random_uuid()`).
- **`place_categories` / `places`**: Danh mục và thông tin chi tiết địa điểm du lịch.
- **`place_images`**: Danh sách ảnh của từng địa điểm.
- **`social_posts` / `social_post_media`**: Bài viết trên bảng tin cộng đồng kèm hình ảnh/video.

---

## 6️⃣ Dữ liệu mẫu (Seed Data) đã chạy
Tất cả các script seed đã được nạp thành công vào DB local:
1. `npm run seed:places`: Đã nạp 2 tỉnh thành, 6 danh mục và 24 địa điểm du lịch thực tế.
2. `npm run seed:place-images`: Đã tạo bucket `place-images` và upload ảnh địa điểm vào storage.
3. `npm run seed:social-posts`: Đã tạo các bài viết mẫu trên bảng tin du lịch.
4. `npm run seed:social-post-media`: Đã đính kèm ảnh/media vào bucket `travel-post-media`.
5. `node scripts/seed-demo-users.mjs`: Đã tạo 3 tài khoản Admin / Partner / User.

---

## 7️⃣ Storage Buckets (Lưu trữ ảnh)
Trong Supabase Storage local đã có sẵn 2 bucket ở chế độ **Public**:
- **`place-images`**: Lưu trữ ảnh địa điểm, homestay, danh lam thắng cảnh.
- **`travel-post-media`**: Lưu trữ ảnh/video của bài đăng mạng xã hội.

---

## 8️⃣ Lệnh khởi động & vận hành dự án

### Khởi động Supabase Local (Docker)
```bash
# Bật Supabase (Postgres, Auth, Storage, Studio)
npx supabase start

# Dừng Supabase khi không dùng
npx supabase stop
```

### Chạy Web (Next.js)
```bash
# Cài đặt thư viện nếu cần
npm install

# Chạy server dev (port 3000)
npm run dev

# Mở trình duyệt: http://localhost:3000
# Mở DB Studio: http://localhost:54323
```

### Chạy Mobile (React Native / Expo)
```bash
cd mobile
npm install
npm run web   # hoặc npx expo start để quét mã QR trên điện thoại
```

---

## 9️⃣ File & Module quan trọng cần biết
- `src/lib/supabase/client.ts`: Khởi tạo Supabase client cho giao diện web.
- `src/lib/supabase/admin-storage.ts`: Client quyền Admin để thao tác storage.
- `src/lib/place-media/public-url.ts`: Hàm tạo link ảnh công khai `getPublicPlaceImageUrl`.
- `scripts/seed-demo-users.mjs`: Script tạo/cập nhật lại các tài khoản demo.
- `prisma/seed/*.mjs`: Các file nạp dữ liệu mẫu.
- `mobile/src/constants/theme.ts`: Cấu hình theme và URL API kết nối cho mobile.

---

## 🔟 Hướng dẫn tiếp tục công việc
Khi AI hoặc bạn mở lại IDE:
1. Kiểm tra Docker xem các container Supabase có đang chạy không (`docker ps` hoặc `npx supabase status`).
2. Mở terminal gõ `npm run dev` để kiểm tra web.
3. Đăng nhập thử bằng 3 tài khoản demo ở mục 4 để kiểm tra quyền và hiển thị dữ liệu bài đăng/hình ảnh.
