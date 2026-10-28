import { SocialFeedItem } from "../services/api";

export type ProvinceOption = {
  id: string;
  name: string;
  shortName: string;
  region: "Bắc" | "Trung" | "Nam" | "Tây Nguyên";
  isPopular?: boolean;
  tagline?: string;
};

export const ALL_VIETNAM_PROVINCES: ProvinceOption[] = [
  // --- Điểm đến HOT ---
  { id: "lam-dong", name: "Lâm Đồng", shortName: "Đà Lạt (Lâm Đồng)", region: "Tây Nguyên", isPopular: true, tagline: "Thành phố ngàn hoa, săn mây đồi chè" },
  { id: "ha-giang", name: "Hà Giang", shortName: "Hà Giang", region: "Bắc", isPopular: true, tagline: "Mã Pí Lèng, sông Nho Quế, hoa tam giác mạch" },
  { id: "kien-giang", name: "Kiên Giang", shortName: "Phú Quốc (Kiên Giang)", region: "Nam", isPopular: true, tagline: "Đảo ngọc, biển xanh cát trắng, hoàng hôn" },
  { id: "lao-cai", name: "Lào Cai", shortName: "Sa Pa (Lào Cai)", region: "Bắc", isPopular: true, tagline: "Đỉnh Fansipan, ruộng bậc thang Mường Hoa" },
  { id: "ninh-binh", name: "Ninh Bình", shortName: "Ninh Bình", region: "Bắc", isPopular: true, tagline: "Quần thể Tràng An, Hang Múa, Tam Cốc" },
  { id: "da-nang", name: "Đà Nẵng", shortName: "Đà Nẵng", region: "Trung", isPopular: true, tagline: "Bà Nà Hills, Cầu Rồng, biển Mỹ Khê" },
  { id: "quang-nam", name: "Quảng Nam", shortName: "Hội An (Quảng Nam)", region: "Trung", isPopular: true, tagline: "Phố cổ đèn lồng, rừng dừa Bảy Mẫu" },
  { id: "khanh-hoa", name: "Khánh Hòa", shortName: "Nha Trang (Khánh Hòa)", region: "Trung", isPopular: true, tagline: "Thiên đường biển đảo, VinWonders" },
  { id: "binh-thuan", name: "Bình Thuận", shortName: "Mũi Né - Phan Thiết", region: "Trung", isPopular: true, tagline: "Đồi cát bay, cung đường ven biển Bàu Trắng" },
  { id: "thua-thien-hue", name: "Thừa Thiên Huế", shortName: "Huế", region: "Trung", isPopular: true, tagline: "Cố đô di sản, sông Hương, lăng tẩm" },
  { id: "quang-binh", name: "Quảng Bình", shortName: "Quảng Bình (Phong Nha)", region: "Trung", isPopular: true, tagline: "Vương quốc hang động Phong Nha - Kẻ Bàng" },
  { id: "binh-dinh", name: "Bình Định", shortName: "Quy Nhơn (Bình Định)", region: "Trung", isPopular: true, tagline: "Kỳ Co, Eo Gió, biển xanh hoang sơ" },
  { id: "ba-ria-vung-tau", name: "Bà Rịa - Vũng Tàu", shortName: "Vũng Tàu", region: "Nam", isPopular: true, tagline: "Ngọn hải đăng, Bãi Sau, ẩm thực hải sản" },
  { id: "ho-chi-minh", name: "TP. Hồ Chí Minh", shortName: "TP. Hồ Chí Minh", region: "Nam", isPopular: true, tagline: "Đô thị sôi động, ẩm thực đường phố sầm uất" },
  { id: "ha-noi", name: "Hà Nội", shortName: "Hà Nội", region: "Bắc", isPopular: true, tagline: "Thủ đô ngàn năm văn hiến, phố cổ 36 phố phường" },
  { id: "quang-ninh", name: "Quảng Ninh", shortName: "Hạ Long (Quảng Ninh)", region: "Bắc", isPopular: true, tagline: "Vịnh Hạ Long di sản kỳ quan thế giới" },

  // --- Miền Bắc ---
  { id: "cao-bang", name: "Cao Bằng", shortName: "Cao Bằng (Thác Bản Giốc)", region: "Bắc" },
  { id: "bac-kan", name: "Bắc Kạn", shortName: "Bắc Kạn (Hồ Ba Bể)", region: "Bắc" },
  { id: "yen-bai", name: "Yên Bái", shortName: "Yên Bái (Mù Cang Chải)", region: "Bắc" },
  { id: "dien-bien", name: "Điện Biên", shortName: "Điện Biên", region: "Bắc" },
  { id: "son-la", name: "Sơn La", shortName: "Sơn La (Mộc Châu)", region: "Bắc" },
  { id: "hoa-binh", name: "Hòa Bình", shortName: "Hòa Bình (Mai Châu)", region: "Bắc" },
  { id: "lang-son", name: "Lạng Sơn", shortName: "Lạng Sơn", region: "Bắc" },
  { id: "tuyen-quang", name: "Tuyên Quang", shortName: "Tuyên Quang", region: "Bắc" },
  { id: "thai-nguyen", name: "Thái Nguyên", shortName: "Thái Nguyên", region: "Bắc" },
  { id: "phu-tho", name: "Phú Thọ", shortName: "Phú Thọ (Đền Hùng)", region: "Bắc" },
  { id: "bac-giang", name: "Bắc Giang", shortName: "Bắc Giang", region: "Bắc" },
  { id: "bac-ninh", name: "Bắc Ninh", shortName: "Bắc Ninh", region: "Bắc" },
  { id: "hai-phong", name: "Hải Phòng", shortName: "Hải Phòng (Cát Bà)", region: "Bắc" },
  { id: "hai-duong", name: "Hải Dương", shortName: "Hải Dương", region: "Bắc" },
  { id: "hung-yen", name: "Hưng Yên", shortName: "Hưng Yên", region: "Bắc" },
  { id: "thai-binh", name: "Thái Bình", shortName: "Thái Bình", region: "Bắc" },
  { id: "ha-nam", name: "Hà Nam", shortName: "Hà Nam (Tam Chúc)", region: "Bắc" },
  { id: "nam-dinh", name: "Nam Định", shortName: "Nam Định", region: "Bắc" },
  { id: "vinh-phuc", name: "Vĩnh Phúc", shortName: "Vĩnh Phúc (Tam Đảo)", region: "Bắc" },
  { id: "lai-chau", name: "Lai Châu", shortName: "Lai Châu", region: "Bắc" },

  // --- Miền Trung & Tây Nguyên ---
  { id: "thanh-hoa", name: "Thanh Hóa", shortName: "Thanh Hóa (Pù Luông / Sầm Sơn)", region: "Trung" },
  { id: "nghe-an", name: "Nghệ An", shortName: "Nghệ An (Cửa Lò)", region: "Trung" },
  { id: "ha-tinh", name: "Hà Tĩnh", shortName: "Hà Tĩnh", region: "Trung" },
  { id: "quang-tri", name: "Quảng Trị", shortName: "Quảng Trị", region: "Trung" },
  { id: "quang-ngai", name: "Quảng Ngãi", shortName: "Quảng Ngãi (Đảo Lý Sơn)", region: "Trung" },
  { id: "phu-yen", name: "Phú Yên", shortName: "Phú Yên (Gành Đá Đĩa)", region: "Trung" },
  { id: "ninh-thuan", name: "Ninh Thuận", shortName: "Ninh Thuận (Vịnh Vĩnh Hy)", region: "Trung" },
  { id: "kon-tum", name: "Kon Tum", shortName: "Kon Tum (Măng Đen)", region: "Tây Nguyên" },
  { id: "gia-lai", name: "Gia Lai", shortName: "Gia Lai (Pleiku)", region: "Tây Nguyên" },
  { id: "dak-lak", name: "Đắk Lắk", shortName: "Đắk Lắk (Buôn Ma Thuột)", region: "Tây Nguyên" },
  { id: "dak-nong", name: "Đắk Nông", shortName: "Đắk Nông (Tà Đùng)", region: "Tây Nguyên" },

  // --- Miền Nam ---
  { id: "dong-nai", name: "Đồng Nai", shortName: "Đồng Nai", region: "Nam" },
  { id: "binh-duong", name: "Bình Dương", shortName: "Bình Dương", region: "Nam" },
  { id: "tay-ninh", name: "Tây Ninh", shortName: "Tây Ninh (Núi Bà Đen)", region: "Nam" },
  { id: "binh-phuoc", name: "Bình Phước", shortName: "Bình Phước", region: "Nam" },
  { id: "long-an", name: "Long An", shortName: "Long An", region: "Nam" },
  { id: "tien-giang", name: "Tiền Giang", shortName: "Tiền Giang (Mỹ Tho)", region: "Nam" },
  { id: "ben-tre", name: "Bến Tre", shortName: "Bến Tre (Xứ dừa)", region: "Nam" },
  { id: "dong-thap", name: "Đồng Tháp", shortName: "Đồng Tháp (Sa Đéc)", region: "Nam" },
  { id: "vinh-long", name: "Vĩnh Long", shortName: "Vĩnh Long", region: "Nam" },
  { id: "tra-vinh", name: "Trà Vinh", shortName: "Trà Vinh", region: "Nam" },
  { id: "an-giang", name: "An Giang", shortName: "An Giang (Châu Đốc / Rừng Tràm)", region: "Nam" },
  { id: "can-tho", name: "Cần Thơ", shortName: "Cần Thơ (Chợ nổi Cái Răng)", region: "Nam" },
  { id: "hau-giang", name: "Hậu Giang", shortName: "Hậu Giang", region: "Nam" },
  { id: "soc-trang", name: "Sóc Trăng", shortName: "Sóc Trăng", region: "Nam" },
  { id: "bac-lieu", name: "Bạc Liêu", shortName: "Bạc Liêu", region: "Nam" },
  { id: "ca-mau", name: "Cà Mau", shortName: "Cà Mau (Đất Mũi)", region: "Nam" },
];

export const MOCK_PROVINCES = ALL_VIETNAM_PROVINCES.map((p) => ({
  id: p.id,
  name: p.shortName,
  slug: p.id,
}));

export const MOCK_FEED_POSTS: SocialFeedItem[] = [
  {
    id: "post-1",
    headline: "Cẩm nang du lịch Đà Lạt: Lịch trình thư thái giữa rừng thông & sương mờ",
    caption:
      "VTripPlanner giới thiệu lịch trình chi tiết khám phá Đà Lạt mùa đẹp nhất trong năm. Dành buổi sáng thong dong quanh Hồ Xuân Hương trong lành và ghé thăm Ga xe lửa cổ kính bậc nhất Đông Dương.",
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    type: "SEASONAL_GUIDE",
    isSystemPost: true,
    sourceName: "Ban Biên Tập VTrip (Admin)",
    sourceAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80",
    places: [
      { id: "pl-ho-xuan-huong", name: "Hồ Xuân Hương", provinceName: "Lâm Đồng" },
      { id: "pl-ga-da-lat", name: "Ga Xe Lửa Cổ Đà Lạt", provinceName: "Lâm Đồng" },
    ],
    reactionCount: 248,
    commentCount: 35,
    viewerReaction: "LOVE",
    viewerSaved: true,
  },
  {
    id: "post-2",
    headline: "Trải nghiệm phượt xe máy Sài Gòn - Đà Lạt 3N2Đ cùng hội bạn thân",
    caption:
      "Vừa hoàn thành chuyến đi thực tế cùng nhóm bạn 4 người. Tổng chi phí ăn ở di chuyển chỉ 1tr5/người. Cung đường đèo buổi sớm sương mờ ảo diệu. Mình ghé Hồ Xuân Hương nhâm nhi cà phê sáng ngắm cảnh cực chill!",
    publishedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    type: "USER_TRIP",
    isSystemPost: false,
    sourceName: "Hoàng Long (Du khách)",
    sourceAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80",
    places: [
      { id: "pl-ho-xuan-huong", name: "Hồ Xuân Hương", provinceName: "Lâm Đồng" },
    ],
    reactionCount: 182,
    commentCount: 24,
    viewerReaction: null,
    viewerSaved: false,
  },
  {
    id: "post-3",
    headline: "Giới thiệu Quần thể Danh thắng Tràng An - Di sản thế giới kép Ninh Bình",
    caption:
      "Tràng An là viên ngọc quý của du lịch Việt Nam với hệ sinh thái núi đá vôi ngập nước hàng triệu năm. Bài viết tổng hợp kinh nghiệm chọn tuyến đò, giá vé và các điểm check-in lịch sử linh thiêng.",
    publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    type: "EVERGREEN_GUIDE",
    isSystemPost: true,
    sourceName: "Ban Quản Trị Du Lịch (Admin)",
    sourceAvatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1000&auto=format&fit=crop&q=80",
    places: [
      { id: "pl-trang-an-ninh-binh", name: "Quần Thể Danh Thắng Tràng An", provinceName: "Ninh Bình" },
    ],
    reactionCount: 312,
    commentCount: 42,
    viewerReaction: null,
    viewerSaved: true,
  },
  {
    id: "post-4",
    headline: "Một ngày làm du khách tại Sài Gòn: Check-in Dinh Độc Lập & Chợ Bến Thành",
    caption:
      "Cuối tuần rủ nhau đi khám phá lại chính nơi mình sinh sống! Dinh Độc Lập kiến trúc rất ấn tượng, khuôn viên rợp bóng mát. Chiều tà ghé chợ Bến Thành ăn vặt no nê. Lịch trình 1 ngày nhẹ nhàng cho cuối tuần.",
    publishedAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    type: "USER_TRIP",
    isSystemPost: false,
    sourceName: "Minh Trang (Thành viên)",
    sourceAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1000&auto=format&fit=crop&q=80",
    places: [
      { id: "pl-dinh-doc-lap", name: "Dinh Độc Lập", provinceName: "TP. Hồ Chí Minh" },
      { id: "pl-cho-ben-thanh", name: "Chợ Bến Thành", provinceName: "TP. Hồ Chí Minh" },
    ],
    reactionCount: 295,
    commentCount: 38,
    viewerReaction: "LOVE",
    viewerSaved: false,
  },
];
