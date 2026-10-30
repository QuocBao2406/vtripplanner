# 📋 AI CONTEXT – DỰ ÁN VTRIPPLANNER (Cập nhật: 2026-10-26)

> **Mục đích file này:** Bất kỳ phiên AI nào mở file này đều hiểu ngay trạng thái dự án,
> đã làm gì, đang làm gì, sắp tới làm gì — không cần hỏi lại người dùng.

---

## 1. TỔNG QUAN DỰ ÁN

| Mục | Chi tiết |
|-----|---------|
| **Tên dự án** | VTripPlanner – Ứng dụng Lập Lịch Trình Du Lịch Việt Nam thông minh |
| **Mô tả** | Nền tảng du lịch Việt Nam tích hợp AI, mạng xã hội cộng đồng phượt, quản lý đối tác và voucher |
| **Workspace** | `c:\Users\nguye\project\vtripplanner` |
| **Web** | Next.js 15 + Tailwind CSS + Prisma + Supabase Auth → chạy `npm run dev` → `http://localhost:3000` |
| **Mobile** | Expo SDK 52 + React Native + NativeWind + expo-router → chạy `cd mobile && npm run web` → `http://localhost:8081` |
| **Database** | PostgreSQL trên Supabase (Prisma ORM) |
| **Auth** | Supabase Auth (email/password) — 3 vai trò: USER, PARTNER, ADMIN |
| **AI** | Google Gemini API (`gemini-2.0-flash`) cho lập lịch trình tự động |

---

## 2. CẤU TRÚC THƯ MỤC CHÍNH

```
vtripplanner/
├── src/                          # ← WEB (Next.js)
│   ├── app/
│   │   ├── (auth)/               # Trang đăng nhập, đăng ký, quên mật khẩu
│   │   ├── api/                  # Backend API Routes
│   │   │   ├── access/me/        # GET  – Lấy thông tin user hiện tại + roles
│   │   │   ├── account/register/ # POST – Đăng ký tài khoản mới (Admin key, bypass email rate limit)
│   │   │   ├── admin/            # API quản trị (duyệt đối tác)
│   │   │   ├── partner/          # API đối tác (đăng ký, quản lý địa điểm, voucher)
│   │   │   ├── social/feed/      # GET  – Lấy bảng tin mạng xã hội
│   │   │   ├── social/posts/     # POST – Đăng bài viết mới (upload ảnh qua FormData)
│   │   │   ├── social/comments/  # GET/POST/DELETE – Bình luận bài viết
│   │   │   ├── trip-planner/     # POST – AI lập lịch trình (Gemini API)
│   │   │   ├── trips/            # CRUD chuyến đi
│   │   │   └── vouchers/         # Voucher & ưu đãi
│   │   ├── lap-lich-trinh/       # Trang lập lịch trình AI
│   │   ├── dia-diem/             # Trang khám phá địa điểm (63 tỉnh thành)
│   │   ├── chuyen-di-cua-toi/    # Trang quản lý chuyến đi
│   │   ├── uu-dai/               # Trang voucher & ưu đãi
│   │   ├── doi-tac/              # Hub đối tác (quản lý địa điểm, voucher)
│   │   ├── quan-tri/             # Bảng điều khiển Admin
│   │   └── tai-khoan/            # Trang cài đặt tài khoản
│   ├── components/
│   │   ├── social/               # Feed, composer, comments, post actions, gallery
│   │   ├── trip-planner/         # Form lập lịch, kết quả AI
│   │   ├── place/                # Card địa điểm, gallery ảnh
│   │   ├── voucher/              # Card voucher, danh sách
│   │   ├── partner/              # Dashboard đối tác
│   │   ├── admin/                # Bảng duyệt đối tác
│   │   └── auth/                 # Form đăng nhập/đăng ký
│   └── lib/
│       ├── auth/                 # getCurrentUser, authorization (auto-provisioning)
│       ├── prisma.ts             # Prisma client singleton
│       └── supabase/             # Supabase client (server & browser)
│
├── mobile/                       # ← MOBILE (Expo + React Native)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.tsx         # Màn hình đăng nhập
│   │   │   └── register.tsx      # Màn hình đăng ký (gọi /api/account/register)
│   │   ├── (tabs)/
│   │   │   ├── index.tsx         # Tab Cộng đồng – Bảng tin Feed + Đăng bài (Facebook-style)
│   │   │   ├── planner.tsx       # Tab Lập lịch AI – Select địa điểm, ngày, ngân sách
│   │   │   ├── vouchers.tsx      # Tab Ưu đãi – Danh sách voucher
│   │   │   ├── my-trips.tsx      # Tab Chuyến đi – Danh sách chuyến đi đã lưu
│   │   │   └── profile.tsx       # Tab Cá nhân – Profile 3 vai trò, settings
│   │   ├── admin/dashboard.tsx   # Admin Console (duyệt đối tác)
│   │   ├── partner/
│   │   │   ├── register.tsx      # Đăng ký làm đối tác (12 loại hình)
│   │   │   └── dashboard.tsx     # Partner Hub (quản lý địa điểm, voucher)
│   │   ├── profile/edit.tsx      # Chỉnh sửa hồ sơ cá nhân
│   │   └── trip/[id].tsx         # Chi tiết chuyến đi
│   ├── src/
│   │   ├── components/
│   │   │   ├── BrandLogo.tsx     # Logo thương hiệu VTripPlanner
│   │   │   ├── CommentsModal.tsx # Modal bình luận bottom-sheet
│   │   │   └── PostComposerModal.tsx  # Modal đăng bài (chọn ảnh, check-in, caption)
│   │   ├── context/auth.tsx      # AuthProvider (roles, isAdmin, isPartner, profile)
│   │   ├── services/api.ts       # API bridge → gọi tất cả endpoints của Next.js backend
│   │   ├── constants/
│   │   │   ├── theme.ts          # COLORS, API_BASE_URL, resolveMediaUrl
│   │   │   └── mockData.ts       # Dữ liệu mock cho feed khi offline
│   │   ├── lib/supabase.ts       # Supabase client cho mobile
│   │   └── utils/haptics.ts      # Wrapper haptics (web-safe)
│   └── package.json
│
├── prisma/
│   └── schema.prisma             # Database schema (User, Role, Partner, Trip, Place, TravelPost, Comment, Voucher...)
│
└── .env.local                    # Biến môi trường (Supabase URL, keys, Gemini API key)
```

---

## 3. TÀI KHOẢN THỬ NGHIỆM

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| **ADMIN** | `admin.vtripplanner@example.com` | `Password123@` |
| **PARTNER** | `partner.vtripplanner@example.com` | `Password123@` |
| **USER** | `user.vtripplanner@example.com` | `Password123@` |

---

## 4. TIẾN ĐỘ – ĐÃ HOÀN THÀNH ✅

### Hạng mục 1: Chuẩn Hóa Logo & Nhận Diện Thương Hiệu ✅
- `BrandLogo.tsx` component dùng chung cho cả Web và Mobile.
- Logo scenic mark với gradient Emerald → Teal.

### Hạng mục 2: Kết Nối Dữ Liệu Thực (CORS, API Bridge) ✅
- Mobile gọi API Next.js backend qua `api.ts` service layer.
- CORS đã cấu hình trong `next.config.ts` cho phép `localhost:8081`.
- `API_BASE_URL` tự động detect platform (web/android/ios).
- Supabase Auth Token truyền qua `Authorization: Bearer` header.

### Hạng mục 3: Lập Lịch Trình Thông Minh AI ✅
- Select-only location picker (dropdown chọn tỉnh thành, không nhập text tự do).
- Chọn số ngày, phương tiện (xe máy / ô tô / xe khách), ngân sách, nhịp độ.
- Kết quả AI hiển thị lịch trình theo ngày, hoạt động, ETA, chi phí ước tính.
- File: `mobile/app/(tabs)/planner.tsx` → gọi `POST /api/trip-planner`.

### Đăng Ký / Đăng Nhập / Đồng Bộ Tài Khoản ✅
- **Đăng ký:** Gọi `POST /api/account/register` (dùng Supabase Admin key, bypass email rate limit, tự động xác nhận email, tự động đăng nhập sau khi tạo thành công).
- **Đăng nhập:** `supabase.auth.signInWithPassword()` → lấy Bearer token.
- **Auto-provisioning:** Khi user mới chưa có trong PostgreSQL, hệ thống tự tạo record trong `users`, `user_profiles`, `user_roles` (gán vai trò USER mặc định) tại `authorization.ts`.
- Cross-platform Alert (web dùng `window.alert`, native dùng `Alert.alert`).

### Hệ Thống 3 Vai Trò (USER / PARTNER / ADMIN) ✅
- `AuthProvider` cung cấp: `user`, `roles`, `isAdmin`, `isPartner`, `profile`, `partner`.
- Profile tab hiển thị badge động (Purple = Admin, Amber = Partner, Emerald = User).
- Menu điều hướng theo vai trò (Admin Console, Partner Hub, Profile Edit...).

### Mạng Xã Hội Cộng Đồng – Feed & Bình Luận ✅
- Bảng tin kết nối dữ liệu thực từ `GET /api/social/feed`.
- Hiển thị ảnh, avatar tác giả, caption, ngày đăng.
- Like (tim đỏ), Save (bookmark), Comment counter.
- **CommentsModal:** Bottom-sheet bình luận, gửi comment, xóa comment, hiển thị avatar & tên tác giả.
- **PostComposerModal:** Modal đăng bài phong cách Facebook (soạn caption, chọn ảnh từ thiết bị hoặc ảnh mẫu, gắn thẻ check-in địa điểm, gửi FormData lên `POST /api/social/posts`).

---

## 4.5 TIẾN ĐỘ – ĐÃ HOÀN THÀNH GẦN ĐÂY ✅

### Hạng mục 4: Quản Lý Chuyến Đi Của Tôi ✅
- **Backend APIs:**
  - `GET /api/trips/manage?tripId=`: Hỗ trợ lấy chi tiết toàn diện của chuyến đi (days, activities, places, checklists, expenseEntries, managedBudget).
  - `PATCH /api/trips/manage`: Cập nhật trạng thái (`DRAFT`, `PLANNING`, `READY`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) và đổi tên chuyến đi.
  - `POST /api/trips/manage/checklists`: Bộ checklist theo mùa (`MUA_MUA`, `MUA_LANH`, `BIEN_HE`, `PHUOT_XE_MAY`), toggle TODO/COMPLETED, thêm/xóa đồ dùng cá nhân.
  - `POST / DELETE /api/trips/manage/expenses`: Ghi nhận chi tiêu theo danh mục, quản lý ngân sách dự kiến và tính số dư thời gian thực.
  - `POST /api/trips/manage/share-to-feed`: Chia sẻ chuyến đi trực tiếp lên Feed cộng đồng mạng xã hội (`TravelPost`).
- **Mobile screens:**
  - `mobile/app/(tabs)/my-trips.tsx`: Phân tab trạng thái (Tất cả, Sắp tới, Đang đi, Đã hoàn thành), thanh tiến độ checklist (`x/y món`), thanh theo dõi chi phí (`đã chi / ngân sách`), chuyển hướng mượt mà sang chi tiết.
  - `mobile/app/trip/[id].tsx`: Hub quản lý chuyến đi toàn diện gồm 4 tab (Lịch trình, Checklist, Chi phí, Chia sẻ) kèm modal ghi nhận chi tiêu, đổi tên và đổi trạng thái.

### Hạng mục 5: Khám Phá & Chi Tiết Địa Điểm Du Lịch ✅
- **Backend API:**
  - `GET /api/places`: Hỗ trợ tìm kiếm theo từ khóa (`q`), bộ lọc tỉnh thành (`province`), danh mục (`category`), tháng du lịch lý tưởng (`month`), phân trang (`page`, `pageSize`) và chi tiết địa điểm (`?id=` hoặc `?slug=`).
  - Đi kèm dataset dự phòng tiêu chuẩn (curated fallback data) với ảnh chất lượng cao từ Unsplash, bảng giá vé chi tiết, giờ mở cửa các ngày trong tuần và đánh giá cộng đồng, đảm bảo 100% không gián đoạn ngay cả khi remote Supabase pooler tạm dừng.
- **Mobile screens & components:**
  - `mobile/app/(tabs)/index.tsx`: Tích hợp bộ chuyển tab kép trên cùng `[ 📍 Khám phá điểm đến | 💬 Bảng tin cộng đồng ]`. Tab khám phá cung cấp ô tìm kiếm thời gian thực, chip lọc danh mục du lịch (Kiến trúc, Thiên nhiên, Biển đảo, Văn hoá...), chip lọc 14+ tỉnh thành trọng điểm, và danh sách thẻ địa điểm kèm huy hiệu xác minh, đánh giá sao, bảng giá và mùa đi đẹp nhất.
  - `mobile/app/places/[id].tsx`: Màn hình Chi tiết Địa điểm hoàn chỉnh với slider gallery ảnh đa kích thước, định vị địa chỉ, liên hệ gọi điện / website, bảng giá vé theo đối tượng, lịch mở cửa 7 ngày trong tuần, đánh giá của du khách và nút kêu gọi hành động "Lập lịch trình với điểm này".
  - `mobile/app/_layout.tsx`: Đăng ký route `places/[id]` vào Stack navigation với header tùy biến mượt mà.

### Hạng mục 6: Mạng Xã Hội Nâng Cao ✅ (2026-10-26)
- **Backend APIs mới:**
  - `GET /api/social/posts/mine`: Danh sách bài USER_TRIP đang hoạt động của user (tái sử dụng `getMyPublishedSocialPosts`).
  - `GET /api/social/saves`: Danh sách bài đã lưu (tái sử dụng `getSavedSocialPosts`).
  - Đã có sẵn và mobile nay dùng: `POST/DELETE /api/social/reactions`, `POST/DELETE /api/social/saves`, `PATCH/DELETE /api/social/posts/manage`.
- **API bridge (`mobile/src/services/api.ts`):** Thay `toggleReaction`/`toggleSavePost` (cũ luôn gửi POST nên không gỡ reaction và không bỏ lưu được) bằng `setReaction(postId, type | null)` và `setSaved(postId, saved)`. Thêm `getMyPosts`, `getSavedPosts`, `updatePostCaption`, `deletePost`. Kiểu `SocialFeedItem` có thêm `media[]`, `viewerCanManage`, `seasonMonths`.
- **Component dùng chung `mobile/src/components/social/`:**
  - `PostCard.tsx`: Thẻ bài viết. Bấm nút Thích để thả/gỡ 👍, nhấn giữ (hoặc bấm nút 😮❤️) để chọn 👍 Thích / ❤️ Yêu thích / 😮 Wow. Lưu/bỏ lưu, chia sẻ (native Share, web dùng navigator.share hoặc copy link `/?focusPost=<id>`), menu ⋯ Sửa/Xóa khi `viewerCanManage`. Cập nhật lạc quan và hoàn tác khi API lỗi. Bài mock (id không phải UUID) chỉ cập nhật cục bộ.
  - `PostMediaGrid.tsx`: Lưới nhiều ảnh kiểu Facebook (1 / 2 / 1+2 / 2x2 kèm "+N"), trình xem toàn màn hình vuốt ngang, ô video mở bằng Linking.
  - `EditPostModal.tsx`: Sửa caption (tối đa 2000 ký tự, chỉ sửa chữ).
  - `PostListScreen.tsx`: Màn hình danh sách dùng chung, tự tải lại khi focus, có trạng thái chưa đăng nhập / rỗng / lỗi.
- **Màn hình mới:** `mobile/app/social/my-posts.tsx`, `mobile/app/social/saved.tsx` (đăng ký trong `app/_layout.tsx`). Lối vào: 2 nút icon trên thanh đầu tab Bảng tin và 2 mục trong tab Cá nhân.
- **Tiện ích:** `mobile/src/utils/dialog.ts` có `showMessage` và `confirmAction` (Promise<boolean>) chạy cả web lẫn native. Dùng thay cho các đoạn `window.alert` / `Alert.alert` rời rạc.
- **Đồng bộ giữa màn hình:** `mobile/src/lib/postEvents.ts`. `PostCard` phát sự kiện patch/remove; mọi màn hình chứa danh sách bài gọi `useSyncedPosts(setPosts)` để Bảng tin, Bài của tôi, Đã lưu luôn khớp nhau.
- **Đã kiểm thử trên Expo web + Supabase local (2026-10-26)** với tài khoản USER thật: đổi/gỡ reaction, lưu/bỏ lưu, lưới 2 ảnh, trình xem ảnh vuốt ngang, sửa caption, xóa bài, đồng bộ giữa màn hình. Tất cả khớp với dữ liệu server.
- **Sửa lỗi đăng bài từ mobile:** `POST /api/social/posts` tải ảnh bằng client dựa trên cookie nên request Bearer từ mobile bị coi là ẩn danh. Nay dùng `createRequestSupabaseClient()` (`src/lib/supabase/request-client.ts`) để chuyển tiếp token.
- **Đồng bộ feed web ↔ mobile (2026-10-30):** `GET /api/social/feed` thiếu `month` thì dùng tháng hiện tại theo giờ Việt Nam (`src/lib/social-feed/current-month.ts`), trước đây mặc định tháng 1 nên mobile xếp hạng khác web. API trả thêm `snapshotAt`. Mobile gửi `month` khi phân trang, dò `/api/social/feed/updates` mỗi 60 giây và khi quay lại tab, hiện nút "Có bài viết mới". Mobile không còn hiện `MOCK_FEED_POSTS` khi API lỗi mà hiện trạng thái lỗi kèm nút Thử lại.
- **Giới hạn:** DB chỉ hỗ trợ 3 reaction LIKE/LOVE/WOW (enum `TravelPostReactionType`); muốn thêm Haha cần migration. Sửa bài chỉ đổi caption, không đổi ảnh.

> ⚠️ **Lệch tài liệu:** Mục Hạng mục 5 ghi `(tabs)/index.tsx` có bộ chuyển tab `Khám phá điểm đến | Bảng tin cộng đồng`, nhưng file hiện tại (2026-10-26) không còn phần Khám phá. `api.getPlaces` và `app/places/[id].tsx` vẫn còn. Cần làm lại tab/màn hình Khám phá nếu muốn.

---

## 5. TIẾN ĐỘ – CHƯA LÀM ❌ (DANH SÁCH CÁC HẠNG MỤC TIẾP THEO)

### Hạng mục 7: Ví Voucher & Mã QR Quét Offline ❌
- **Web đã có:** `src/app/uu-dai/`, `src/app/voucher-cua-toi/`.
- **Cần làm trên Mobile:**
  - Kết nối `GET /api/vouchers` lấy danh sách voucher thực.
  - Claim voucher → lưu vào "Ví của tôi".
  - Sinh mã QR từ voucher code để quét tại cửa hàng đối tác.
  - Hiển thị hạn sử dụng, điều kiện áp dụng.

### Hạng mục 8: Hồ Sơ Cá Nhân & Trung Tâm Cứu Hộ An Toàn ❌
- **Đã có:** Profile edit cơ bản (tên, SĐT, thành phố, ngày sinh, bio).
- **Cần làm thêm:**
  - Upload avatar (chọn ảnh → upload Supabase Storage).
  - Trung tâm cứu hộ: Số điện thoại khẩn cấp theo tỉnh thành (Cảnh sát, Cứu hỏa, Cứu thương, Cứu hộ đường bộ).
  - SOS button gọi nhanh.
  - Đổi mật khẩu.

### Hạng mục 9: Kênh Đăng Ký & Quản Lý Đối Tác ❌
- **Đã có:** Đăng ký đối tác 12 loại hình, Partner Hub cơ bản, Admin Console duyệt đơn.
- **Cần làm thêm:**
  - Quản lý địa điểm của đối tác (CRUD places).
  - Tạo & quản lý khuyến mãi/voucher riêng.
  - Thống kê lượt xem, lượt claim voucher.
  - Admin: Thống kê tổng quan hệ thống.

---

## 5.5 GHI CHÚ MÔI TRƯỜNG LOCAL

- **Storage policy:** DB Supabase local không được dựng qua Prisma migrate (không có bảng `_prisma_migrations`), nên migration `20260807150500_add_travel_post_upload_storage` ban đầu chưa chạy và mọi lượt tải ảnh bài viết bị RLS chặn. Ngày 2026-10-26 đã áp tay file đó vào DB local. Nếu chạy `supabase db reset` hoặc dựng lại DB thì phải áp lại:
  `docker exec -i supabase_db_vtripplanner psql -U postgres -d postgres < prisma/migrations/20260807150500_add_travel_post_upload_storage/migration.sql`
- **`mobile/.env.local`:** Trỏ API về `http://localhost:3000` và Supabase về local, dùng khi chạy Expo web trên cùng máy. Expo ưu tiên file này hơn `mobile/.env`. Xóa nó khi test trên điện thoại qua LAN (IP LAN trong `.env` có thể đã đổi, máy hiện là 172.27.37.159).
- **`.claude/launch.json`:** cấu hình `web` (cổng 3000) và `mobile-web` (cổng 8081).
- **Lỗi có sẵn chưa sửa:** NativeWind báo "Cannot manually set color scheme" khi tải trang web; mở thẳng `/login` rồi đăng nhập thì app gọi `router.back()` không có trang trước nên đứng yên.

## 6. QUY TẮC KỸ THUẬT QUAN TRỌNG

### Mobile ↔ Web Communication
```
Mobile (Expo)  →  fetch(API_BASE_URL + "/api/...")  →  Next.js Backend  →  Prisma  →  PostgreSQL
                  Header: Authorization: Bearer <supabase_token>
```

### Khi tạo API mới trên backend
1. Tạo file `src/app/api/<tên>/route.ts`.
2. Nếu cần xác thực: Gọi `getCurrentUser()` từ `@/lib/auth/get-current-user`.
3. Nếu cần kiểm tra vai trò: Dùng `getCurrentAuthorization()` từ `@/lib/auth/authorization`.
4. **Auto-provisioning:** Nếu user chưa có trong DB, hệ thống tự tạo (đã cài ở `authorization.ts`).

### Khi thêm endpoint mới cho Mobile
1. Thêm method vào `mobile/src/services/api.ts`.
2. Gọi `getAuthHeader()` để đính kèm Bearer token.
3. Mobile không bao giờ gọi Prisma trực tiếp — luôn qua API.

### Cross-platform Alert
```typescript
if (Platform.OS === "web") window.alert(msg);
else Alert.alert("Tiêu đề", msg);
```

### Haptics (web-safe)
```typescript
import Haptics from "../../src/utils/haptics"; // wrapper đã xử lý web fallback
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

### Supabase Auth (mobile)
```typescript
import { supabase } from "../../src/lib/supabase";
const { data } = await supabase.auth.getSession();
// token: data.session.access_token
```

---

## 7. LỆNH CHẠY DỰ ÁN

```bash
# Terminal 1: Web Backend (Next.js) — port 3000
cd c:\Users\nguye\project\vtripplanner
npm run dev

# Terminal 2: Mobile (Expo Web) — port 8081
cd c:\Users\nguye\project\vtripplanner\mobile
npm run web

# Kiểm tra TypeScript mobile
cd mobile && npx tsc --noEmit

# Build web bundle mobile
cd mobile && npx expo export --platform web
```

---

## 8. BIẾN MÔI TRƯỜNG QUAN TRỌNG (.env.local)

| Biến | Mô tả |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL dự án Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon/Public key Supabase |
| `SUPABASE_SECRET_KEY` | Service Role key (dùng cho Admin API, đăng ký user) |
| `DATABASE_URL` | PostgreSQL connection string (pooler) |
| `DIRECT_URL` | PostgreSQL direct connection (cho migrations) |
| `GEMINI_API_KEY` | Google Gemini API key cho AI lập lịch trình |

---

## 9. LƯU Ý ĐẶC BIỆT CHO AI TIẾP THEO

1. **Luôn chạy `npx tsc --noEmit` trong `mobile/` sau khi sửa code** để đảm bảo không có lỗi TypeScript.
2. **Không dùng `supabase.auth.signUp()` trực tiếp từ client nữa** — dùng `POST /api/account/register` để tránh email rate limit.
3. **Ảnh trên mobile PHẢI có explicit width/height** trong `style={{ }}` — React Native Yoga engine sẽ collapse về 0×0 nếu thiếu.
4. **Đã cài auto-provisioning** ở `authorization.ts`, `social/comments/route.ts`, `social/posts/route.ts` — user mới đăng ký sẽ tự có record trong PostgreSQL khi gọi API lần đầu.
5. **CORS đã mở cho `localhost:8081`** trong `next.config.ts` — nếu thêm domain mới cần cập nhật.
6. **File `mobile/src/utils/haptics.ts`** là wrapper an toàn cho web — không import trực tiếp từ `expo-haptics`.
7. **Thứ tự ưu tiên tiếp theo:** Hạng mục 7 → 8 → 9 (theo danh sách mục 5 bên trên). Hạng mục 7 trên mobile đã có một phần: `vouchers.tsx` đã gọi `getVouchers`/`claimVoucher` thật và có modal QR.
8. **Bài viết trên mobile:** Luôn render bằng `PostCard` (`mobile/src/components/social/PostCard.tsx`), không viết lại thẻ bài riêng.
