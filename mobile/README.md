# 📱 VTripPlanner Mobile App (Native React Native Expo SDK 52)

> Ứng dụng Di động Native thực thụ (**100% Zero-WebView**) dành cho hệ điều hành iOS và Android.

---

## 🚀 Hướng Dẫn Khởi Chạy Mobile App

### 1. Cài đặt các gói thư viện
Mở terminal tại thư mục `mobile/`:
```bash
cd mobile
npm install
```

### 2. Cấu hình biến môi trường
Tạo tệp `.env` trong thư mục `mobile/` (hoặc dùng cấu hình mặc định trong `src/constants/theme.ts`):
```env
EXPO_PUBLIC_API_URL="https://vtripplanner.vn"
EXPO_PUBLIC_SUPABASE_URL="https://pdagqtaxuientvtwdfql.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_cajW5YV3ifkiAD9jBmwVQA_1tMsy6Mp"
```

### 3. Chạy ứng dụng trên Thiết bị thật hoặc Trình giả lập
```bash
# Khởi động Expo Development Server
npm start

# Hoặc mở trực tiếp trên máy ảo Android:
npm run android

# Hoặc mở trực tiếp trên máy ảo iOS (trên máy Mac):
npm run ios
```

- **Trên điện thoại thật**: Cài app **Expo Go** từ App Store hoặc Google Play $\rightarrow$ Quét mã QR hiện trên terminal để mở app ngay lập tức!

---

## 🗺️ Cấu trúc Màn hình & Tính năng (Tabs & Screens)

1. **🏠 Khám phá (`/`)**: Bảng tin mạng xã hội du lịch (Infinite Feed), thả tim (Haptic), bình luận, bookmark bài viết.
2. **✈️ Lập lịch (`/planner`)**: Trình lập lịch trình AI thông minh (tính ETA, phân bổ ngân sách, gợi ý địa điểm).
3. **🎁 Ưu đãi (`/vouchers`)**: Ví voucher khuyến mãi, hiển thị mã QR sử dụng Offline tại quầy dịch vụ.
4. **🧭 Chuyến đi (`/my-trips`)**: Quản lý lịch trình, checklist hành trang tương tác và **nút Chia sẻ chuyến đi 1 chạm**.
5. **👤 Cá nhân (`/profile`)**: Hồ sơ thành viên, quản lý bài đã lưu, cài đặt sở thích du lịch.
6. **🔗 Chia sẻ qua Link (`/trip/share/[token]`)**: Bắt Deep Link từ Zalo/Messenger/SMS và lưu chuyến đi vào tài khoản.
7. **🛠️ Tùy chỉnh lịch trình (`/trip/customize`)**: Hoán đổi thứ tự `↑/↓` và đổi giờ hoạt động.
