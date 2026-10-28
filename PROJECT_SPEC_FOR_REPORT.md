# TÀI LIỆU ĐẶC TẢ HỆ THỐNG VÀ KIẾN TRÚC DỰ ÁN VTRIPPLANNER
*(Dùng làm ngữ cảnh toàn diện cho Gemini / AI viết Báo cáo Đồ án & Luận văn)*

---

## 1. THÔNG TIN TỔNG QUAN ĐỀ TÀI
- **Tên đề tài**: Hệ thống Lập kế hoạch Du lịch Thông minh và Mạng xã hội Chia sẻ Hành trình (VTripPlanner).
- **Loại hình ứng dụng**: Nền tảng Web hiện đại (Next.js Full-stack, Server-Side Rendering, Server Actions).
- **Mục tiêu đề tài**:
  1. Giải quyết bài toán lập kế hoạch du lịch thực tế: tự động tính thời gian di chuyển (ETA), tối ưu lộ trình theo khung giờ (Sáng/Chiều/Tối), phân bổ ngân sách chi tiết và kiểm tra giờ mở cửa theo ngày.
  2. Kết hợp mạng xã hội du lịch để tạo nguồn dữ liệu cộng đồng phong phú, dùng tương tác thực tế (thả tim, lưu bài) để cá nhân hóa kết quả gợi ý lịch trình.
  3. Xây dựng hệ sinh thái kết nối Doanh nghiệp đối tác (khách sạn, nhà hàng, điểm tham quan, dịch vụ cứu hộ) và phát hành voucher ưu đãi trực tiếp cho du khách.
  4. Cung cấp trung tâm quản trị toàn diện (Admin) để kiểm duyệt nội dung, quản lý người dùng và địa lý hành chính.

---

## 2. KIẾN TRÚC CÔNG NGHỆ (TECH STACK)

### 2.1. Frontend & Backend Layer
- **Framework**: Next.js 16 (App Router) kết hợp React 19 và TypeScript.
- **Styling**: Tailwind CSS v4, PostCSS, Lucide React Icons.
- **UI Feedback & UX**: Sonner (Toast notifications), Infinite Scrolling cho Newsfeed.
- **Form & Validation**: React Hook Form, Zod v4, `@hookform/resolvers`.

### 2.2. Database & Data Access Layer
- **Cơ sở dữ liệu**: PostgreSQL (hỗ trợ JSONB, UUID, DateTime với múi giờ Timestamptz).
- **ORM & Driver**: Prisma ORM (v7.9) với `@prisma/adapter-pg` và `pg` Pool driver.
- **Cấu trúc Schema**: Chia nhỏ theo các domain nghiệp vụ (Users, Roles, Places, Trips, Social, Promotions, Reviews, Safety).

### 2.3. Authentication, Security & Cloud Storage
- **Xác thực (Auth)**: Supabase SSR Client (`@supabase/ssr`), quản lý Token & Session qua Secure Cookies.
- **Lưu trữ đa phương tiện (Storage)**: Supabase Storage Buckets (`place-images`, `social-feed`), hỗ trợ tải ảnh và video bài viết.
- **Phân quyền (RBAC)**: 3 vai trò chính (`USER`, `PARTNER`, `ADMIN`) bảo vệ từ tầng Middleware đến Server-side Authorization Functions.

### 2.4. Third-Party Integrations & Routing Engine
- **Google Routes API**: Tính toán khoảng cách và thời gian di chuyển thời gian thực.
- **Internal Haversine Fallback Engine**: Thuật toán dự phòng tự động tính khoảng cách cung tròn khi không có API key Google.

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

### 3.1. Phân hệ Người dùng & Phân quyền (Users & RBAC)
- `users`: Thông tin tài khoản chính (đồng bộ với Supabase Auth qua UUID).
- `user_profiles`: Hồ sơ chi tiết (Họ tên, ảnh đại diện, số điện thoại, ngày sinh, thành phố).
- `user_preferences`: Định mức sở thích (nhịp độ du lịch, loại phương tiện ưa thích, ngân sách mặc định, ghi chú dị ứng/tiếp cận).
- `roles`, `permissions`, `user_roles`, `role_permissions`: Hệ thống phân quyền nhiều cấp độ.

### 3.2. Phân hệ Địa điểm Du lịch (Places & Locations)
- `provinces`, `districts`: Danh mục hành chính tỉnh thành và quận huyện tại Việt Nam.
- `place_categories`: Phân loại điểm đến (Thiên nhiên, Di tích lịch sử, Ẩm thực, Kiến trúc, Tâm linh,...).
- `places`: Dữ liệu cốt lõi của địa điểm (Tên, tọa độ GPS, địa chỉ, mùa du lịch đẹp nhất `bestVisitMonths`, trạng thái kiểm duyệt `verificationStatus`).
- `place_opening_hours`: Khung giờ mở cửa chi tiết theo từng ngày trong tuần (hỗ trợ mở 24/7 hoặc mở xuyên đêm).
- `place_prices`: Bảng giá vé/dịch vụ theo đối tượng (Người lớn, trẻ em, học sinh) và đơn vị tính.
- `place_images`: Bộ sưu tập hình ảnh địa điểm (ảnh bìa, thứ tự hiển thị).

### 3.3. Phân hệ Lập lịch trình & Quản lý Chuyến đi (Trips & Planner)
- `trips`: Chuyến đi của người dùng (Điểm đi, điểm đến, thời gian xuất phát, số người, tổng ngân sách, dự toán chi phí, trạng thái).
- `trip_days`: Các ngày trong chuyến đi (Ngày 1, Ngày 2,...).
- `trip_activities`: Hoạt động cụ thể trong từng ngày (loại hoạt động: Di chuyển, Tham quan, Ăn uống, Lưu trú; thời gian bắt đầu, liên kết địa điểm).
- `trip_checklists`, `trip_checklist_items`: Danh mục chuẩn bị trước, trong và sau chuyến đi (phân công thành viên).
- `trip_budgets`, `trip_expenses`: Bảng dự toán và theo dõi chi phí thực tế phát sinh.

### 3.4. Phân hệ Mạng xã hội Du lịch (Social Community)
- `travel_posts`: Bài viết chia sẻ (Headline, nội dung, mùa thích hợp, liên kết chuyến đi gốc `sourceTripId`).
- `travel_post_media`: Ảnh / video đính kèm bài viết.
- `travel_post_places`: Gắn thẻ các địa điểm được nhắc đến trong bài viết.
- `travel_post_reactions`: Thả cảm xúc (`LIKE`, `LOVE`, `WOW`).
- `travel_post_comments`: Bình luận trao đổi.
- `travel_post_saves`: Đánh dấu lưu bài viết vào bộ sưu tập cá nhân.
- `travel_notifications`: Thông báo tương tác thời gian thực.

### 3.5. Phân hệ Đối tác & Khuyến mãi (Partners & Promotions)
- `partners`, `partner_branches`: Hồ sơ doanh nghiệp và chuỗi chi nhánh.
- `promotions`, `promotion_places`: Chương trình ưu đãi giảm giá theo % hoặc tiền cố định.
- `voucher_claims`: Quản lý voucher người dùng đã nhận, sinh mã duy nhất kèm mã QR và trạng thái sử dụng (`CLAIMED`, `USED`, `EXPIRED`).

### 3.6. Tiện ích An toàn & Đánh giá
- `roadside_assistance_contacts`: Danh bạ hotline cứu hộ giao thông (xe máy, ô tô) theo từng vùng.
- `place_reviews`, `place_review_reports`: Đánh giá sao địa điểm và báo cáo nội dung xấu.

---

## 4. CÁC THUẬT TOÁN VÀ LOGIC NGHIỆP VỤ CỐT LÕI

### 4.1. Thuật toán Ước tính Lộ trình & ETA (Routing & ETA Engine)
1. Nhận điểm xuất phát (Origin) và điểm đến (Destination) cùng phương tiện di chuyển.
2. Gọi Google Routes API để lấy quãng đường ($km$) và thời gian di chuyển ($phút$).
3. Nếu Google API không khả dụng, kích hoạt **Internal Fallback**:
   - Sử dụng công thức Haversine tính khoảng cách theo tọa độ địa lý:
     $$d = 2R \times \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
   - Áp dụng hệ số quanh co cung đường đèo/núi tại Việt Nam ($\times 1.25 - 1.35$) và vận tốc trung bình theo phương tiện để suy ra thời gian di chuyển.

### 4.2. Mô hình Dự toán & Phân bổ Ngân sách (Budget Allocation Model)
- Tính định mức: $\text{BudgetPerPersonPerDay} = \frac{\text{TotalBudget}}{\text{TravelerCount} \times \text{Duration}}$.
- Phân nhóm hồ sơ ngân sách: `ECONOMY` (Tiết kiệm), `BALANCED` (Cân bằng), `COMFORTABLE` (Nghỉ dưỡng cao cấp).
- Chia tỷ trọng ngân sách chuẩn:
  - Di chuyển: $15\% - 20\%$
  - Lưu trú: $25\% - 35\%$
  - Ăn uống: $25\% - 30\%$
  - Vé tham quan & Trải nghiệm: $15\% - 20\%$
  - Quỹ dự phòng rủi ro: $10\%$

### 4.3. Thuật toán Xếp lịch & Cá nhân hóa Địa điểm (Smart Scoring & Slot Scheduler)
- **Cơ chế Slot**: Chia mỗi ngày thành 3 khung giờ chính: Sáng ($08:30$), Chiều ($14:00$), Tối ($19:00$).
- **Hàm tính điểm tổng hợp ($Score$)**:
  $$Score = S_{base} + S_{interest} + S_{season} + S_{reaction} + S_{saved} + S_{budget} - D_{geo\_penalty}$$
  - $S_{base} = 10$: Điểm cơ sở của địa điểm đã xác thực.
  - $S_{interest}$: Điểm cộng nếu danh mục khớp với sở thích người dùng ($+4$ điểm/sở thích).
  - $S_{season}$: Điểm cộng nếu tháng đi nằm trong danh sách `bestVisitMonths` của địa điểm ($+4$ điểm).
  - $S_{reaction}$: Điểm cộng cá nhân hóa nếu người dùng từng thả Like/Love/Wow bài viết về địa điểm này ($+2$ đến $+9$ điểm).
  - $S_{saved}$: Điểm cộng ưu tiên nếu người dùng đã lưu bài viết liên quan ($+3$ đến $+6$ điểm).
  - $S_{budget}$: Điểm đánh giá giá vé có phù hợp với ngân sách dự kiến không.
  - $D_{geo\_penalty}$: Trừ điểm nếu địa điểm quá xa so với địa điểm trước đó trong cùng ngày.
- **Ràng buộc giờ mở cửa**: Lọc bỏ hoặc dời địa điểm nếu bị đóng cửa vào thứ tương ứng trong tuần hoặc khung giờ tham quan.

### 4.4. Quy trình Trình biên tập Bản nháp (Draft Itinerary Customization)
- Lưu bản nháp vào Local Session/Storage trước khi ghi vào Database.
- Cho phép người dùng tùy chỉnh từng hoạt động: đổi giờ, đổi vị trí ($\uparrow/\downarrow$), thay thế hoặc xóa địa điểm.
- Khi người dùng xác nhận "Lưu chuyến đi", hệ thống ghi nhận bản ghi `Trip` chính thức sang trạng thái `READY` và khởi tạo tự động bảng Checklist hành trang và Dự toán ngân sách.

---

## 5. PHÂN HỆ VAI TRÒ NGƯỜI DÙNG (USER ROLES & WORKFLOWS)

### 5.1. Khách du lịch (User)
1. Đăng ký / Đăng nhập tài khoản qua Email hoặc Google.
2. Thiết lập sở thích cá nhân, tìm kiếm địa điểm, lướt bảng tin cộng đồng.
3. Lập lịch trình tự động -> Xem trước -> Tùy chỉnh chi tiết -> Lưu chuyến đi.
4. Quản lý chuyến đi: Check-in danh mục hành trang, ghi chép chi tiêu thực tế.
5. Đăng bài viết chia sẻ, thả tim, bình luận, nhận voucher ưu đãi.

### 5.2. Doanh nghiệp Đối tác (Partner)
1. Đăng ký thông tin doanh nghiệp (`/dang-ky-doi-tac`) kèm giấy phép kinh doanh.
2. Sau khi Admin duyệt, truy cập Dashboard Đối tác (`/doi-tac`).
3. Khởi tạo danh sách địa điểm/chi nhánh, nộp kiểm duyệt.
4. Tạo chương trình khuyến mãi, cài đặt số lượng voucher và địa điểm áp dụng.

### 5.3. Quản trị viên (Admin)
1. Giám sát toàn bộ chỉ số hoạt động hệ thống tại `/quan-tri`.
2. Xét duyệt hồ sơ Đối tác mới (`/quan-tri/doi-tac`).
3. Kiểm duyệt địa điểm và chương trình khuyến mãi (`/quan-tri/dia-diem`, `/quan-tri/uu-dai`).
4. Kiểm duyệt bài viết cộng đồng, xử lý báo cáo vi phạm (`/quan-tri/bai-viet`).
5. Quản lý dữ liệu địa lý hành chính tỉnh/huyện (`/quan-tri/khu-vuc`).
6. Quản lý trạng thái khóa/mở khóa người dùng (`/quan-tri/nguoi-dung`).

---

## 6. ĐIỂM NỔI BẬT & ĐÓNG GÓP KHOA HỌC CỦA ĐỀ TÀI
1. **Tính Thực tế Cao**: Không tạo lịch trình ngẫu nhiên, mà gắn liền với thời gian di chuyển thực tế (ETA), giờ mở cửa của từng ngày và khả năng tài chính của du khách.
2. **Cầu nối Mạng xã hội và AI/Heuristic**: Biến hành vi lướt mạng xã hội (thả tim, lưu bài) thành dữ liệu cá nhân hóa (Personalization Signals) giúp lịch trình gợi ý sát nhất với gu du lịch của từng người.
3. **Mô hình Kinh doanh Hai chiều (B2C & B2B)**: Kết hợp nhu cầu du lịch của người dùng cá nhân với nhu cầu quảng bá, phát hành voucher của doanh nghiệp đối tác địa phương.
4. **Kiến trúc Hiện đại**: Áp dụng Next.js 16 App Router, React Server Components và PostgreSQL Prisma cho tốc độ phản hồi nhanh, bảo mật cao và dễ dàng mở rộng.
