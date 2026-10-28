import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPublicPlaceCatalog,
  getPublicPlaceFilterOptions,
} from "@/lib/places/public-places";

export const runtime = "nodejs";

const PLACE_IMAGE_BUCKET = "place-images";

function getPublicStorageUrl(storagePath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!supabaseUrl) return null;
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PLACE_IMAGE_BUCKET}/${encodedPath}`;
}

function formatTimeString(timeDate: Date | null): string | null {
  if (!timeDate) return null;
  try {
    const d = new Date(timeDate);
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return null;
  }
}

// Curated Fallback Places Data
const FALLBACK_PLACES = [
  {
    id: "pl-dinh-doc-lap",
    name: "Dinh Độc Lập (Hội trường Thống Nhất)",
    slug: "dinh-doc-lap",
    shortDescription: "Di tích lịch sử văn hóa quốc gia tiêu biểu tại trung tâm TP. Hồ Chí Minh.",
    description:
      "Dinh Độc Lập là một trong những công trình kiến trúc biểu tượng của TP. Hồ Chí Minh, nơi ghi dấu sự kiện kết thúc chiến tranh Việt Nam vào ngày 30/4/1975. Tòa nhà do kiến trúc sư Ngô Viết Thụ thiết kế, kết hợp hài hòa giữa kiến trúc hiện đại phương Tây và triết lý Á Đông.",
    addressLine: "135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành",
    ward: "Phường Bến Thành",
    latitude: 10.777,
    longitude: 106.6953,
    phone: "028 3822 3652",
    email: "dinhdoclap@dinhdoclap.gov.vn",
    websiteUrl: "https://dinhdoclap.gov.vn",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Thời tiết mùa khô mát mẻ, lý tưởng để tham quan và chụp hình khuôn viên.",
    provinceName: "TP. Hồ Chí Minh",
    provinceSlug: "thanh-pho-ho-chi-minh",
    districtName: "Quận 1",
    categoryName: "Lịch sử & Bảo tàng",
    categorySlug: "lich-su-va-bao-tang",
    averageRating: 4.8,
    reviewCount: 342,
    coverImageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1000&auto=format&fit=crop&q=80",
    images: [
      {
        id: "img-1",
        url: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1000&auto=format&fit=crop&q=80",
        caption: "Toàn cảnh mặt tiền Dinh Độc Lập",
        isCover: true,
      },
      {
        id: "img-2",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80",
        caption: "Khuôn viên bãi cỏ và đài phun nước",
        isCover: false,
      },
    ],
    prices: [
      { id: "pr-1", label: "Vé tham quan tiêu chuẩn", audience: "Người lớn", unit: "vé", amount: 65000, currency: "VND" },
      { id: "pr-2", label: "Vé học sinh / sinh viên", audience: "Sinh viên", unit: "vé", amount: 20000, currency: "VND" },
    ],
    openingHours: [
      { id: "oh-1", dayOfWeek: "MONDAY", openTime: "07:30", closeTime: "17:30", isClosed: false, isOpen24Hours: false },
      { id: "oh-2", dayOfWeek: "TUESDAY", openTime: "07:30", closeTime: "17:30", isClosed: false, isOpen24Hours: false },
      { id: "oh-3", dayOfWeek: "WEDNESDAY", openTime: "07:30", closeTime: "17:30", isClosed: false, isOpen24Hours: false },
      { id: "oh-4", dayOfWeek: "THURSDAY", openTime: "07:30", closeTime: "17:30", isClosed: false, isOpen24Hours: false },
      { id: "oh-5", dayOfWeek: "FRIDAY", openTime: "07:30", closeTime: "17:30", isClosed: false, isOpen24Hours: false },
      { id: "oh-6", dayOfWeek: "SATURDAY", openTime: "07:30", closeTime: "17:30", isClosed: false, isOpen24Hours: false },
      { id: "oh-7", dayOfWeek: "SUNDAY", openTime: "07:30", closeTime: "17:30", isClosed: false, isOpen24Hours: false },
    ],
    reviews: [
      {
        id: "rev-1",
        rating: 5,
        content: "Không gian lịch sử trang nghiêm, khuôn viên cây xanh rất rộng rãi và thoáng mát. Rất đáng để ghé thăm khi đến Sài Gòn!",
        createdAt: "2026-08-15T09:30:00Z",
        author: { id: "u-1", fullName: "Trần Văn Hoàng", avatarUrl: null },
      },
      {
        id: "rev-2",
        rating: 5,
        content: "Kiến trúc tuyệt tác thời kỳ hiện đại. Phòng khánh tiết và khu vực tầng hầm giữ nguyên hiện vật rất sống động.",
        createdAt: "2026-08-10T14:20:00Z",
        author: { id: "u-2", fullName: "Nguyễn Mai Linh", avatarUrl: null },
      },
    ],
  },
  {
    id: "pl-nha-tho-duc-ba",
    name: "Nhà thờ Đức Bà Sài Gòn",
    slug: "nha-tho-duc-ba-sai-gon",
    shortDescription: "Kiến trúc Gothic và Roman cổ kính giữa lòng trung tâm thành phố.",
    description:
      "Vương cung thánh đường Chính tòa Đức Mẹ Vô nhiễm Nguyên tội là công trình kiến trúc tôn giáo biểu tượng được hoàn thành vào năm 1880. Toàn bộ vật liệu xây dựng từ gạch ngói, sắt thép đến kính màu đều được vận chuyển từ Pháp sang.",
    addressLine: "01 Công xã Paris, Phường Bến Nghé",
    ward: "Phường Bến Nghé",
    latitude: 10.7798,
    longitude: 106.699,
    phone: "028 3822 0477",
    email: null,
    websiteUrl: null,
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Buổi sáng sớm hoặc chiều tà cho góc chụp ảnh tuyệt đẹp bên đàn bồ câu.",
    provinceName: "TP. Hồ Chí Minh",
    provinceSlug: "thanh-pho-ho-chi-minh",
    districtName: "Quận 1",
    categoryName: "Kiến trúc & Tâm linh",
    categorySlug: "kien-truc-va-van-hoa",
    averageRating: 4.7,
    reviewCount: 289,
    coverImageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1000&auto=format&fit=crop&q=80",
    images: [
      {
        id: "img-3",
        url: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1000&auto=format&fit=crop&q=80",
        caption: "Hai tháp chuông uy nghiêm của Nhà thờ Đức Bà",
        isCover: true,
      },
    ],
    prices: [
      { id: "pr-3", label: "Vào cửa tham quan", audience: "Tất cả", unit: "lượt", amount: 0, currency: "VND" },
    ],
    openingHours: [
      { id: "oh-8", dayOfWeek: "MONDAY", openTime: "08:00", closeTime: "17:00", isClosed: false, isOpen24Hours: false },
      { id: "oh-9", dayOfWeek: "SUNDAY", openTime: "06:00", closeTime: "18:30", isClosed: false, isOpen24Hours: false },
    ],
    reviews: [
      {
        id: "rev-3",
        rating: 5,
        content: "Biểu tượng kinh điển của Sài Gòn. Ngồi cà phê bệt ngắm nhà thờ Đức Bà là trải nghiệm tuyệt vời không thể bỏ lỡ.",
        createdAt: "2026-08-20T10:00:00Z",
        author: { id: "u-3", fullName: "Lê Minh Tuấn", avatarUrl: null },
      },
    ],
  },
  {
    id: "pl-cho-ben-thanh",
    name: "Chợ Bến Thành",
    slug: "cho-ben-thanh",
    shortDescription: "Khu chợ sầm uất với tháp đồng hồ 4 mặt nổi tiếng và ẩm thực phong phú.",
    description:
      "Được xây dựng từ năm 1912, Chợ Bến Thành là một trong những địa điểm du lịch văn hóa lâu đời nhất của Sài Gòn. Nơi đây quy tụ hàng ngàn gian hàng đồ lưu niệm, vải vóc thủ công và khu ẩm thực nức tiếng với chè Nam Bộ, bún riêu, bánh bèo...",
    addressLine: "Đường Lê Lợi, Phường Bến Thành",
    ward: "Phường Bến Thành",
    latitude: 10.7725,
    longitude: 106.698,
    phone: "028 3829 2096",
    email: null,
    websiteUrl: null,
    bestVisitMonths: [1, 2, 3, 4, 10, 11, 12],
    seasonNote: "Chợ đêm hoạt động sôi động từ 18:00 đến khuya.",
    provinceName: "TP. Hồ Chí Minh",
    provinceSlug: "thanh-pho-ho-chi-minh",
    districtName: "Quận 1",
    categoryName: "Chợ & Ẩm thực",
    categorySlug: "cho-va-am-thuc",
    averageRating: 4.6,
    reviewCount: 412,
    coverImageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80",
    images: [
      {
        id: "img-4",
        url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80",
        caption: "Tháp đồng hồ biểu tượng của Chợ Bến Thành",
        isCover: true,
      },
    ],
    prices: [
      { id: "pr-4", label: "Vé vào chợ", audience: "Tất cả", unit: "lượt", amount: 0, currency: "VND" },
    ],
    openingHours: [
      { id: "oh-10", dayOfWeek: "MONDAY", openTime: "06:00", closeTime: "22:00", isClosed: false, isOpen24Hours: false },
    ],
    reviews: [
      {
        id: "rev-4",
        rating: 4,
        content: "Ẩm thực trong chợ rất phong phú, chè sầu riêng và bún suông ngon xuất sắc!",
        createdAt: "2026-08-25T18:30:00Z",
        author: { id: "u-4", fullName: "Đặng Quỳnh Nga", avatarUrl: null },
      },
    ],
  },
  {
    id: "pl-ho-xuan-huong",
    name: "Hồ Xuân Hương Đà Lạt",
    slug: "ho-xuan-huong-da-lat",
    shortDescription: "Trái tim lãng mạn của thành phố ngàn hoa với làn nước trong xanh êm đềm.",
    description:
      "Hồ Xuân Hương là hồ nước nhân tạo hình trăng lưỡi liềm rộng khoảng 32ha tọa lạc ngay trung tâm thành phố Đà Lạt. Xung quanh hồ là rừng thông vi vu, vườn hoa cẩm tú cầu và những quán cà phê ngắm hoàng hôn cực chill.",
    addressLine: "Đường Trần Quốc Toản, Phường 1",
    ward: "Phường 1",
    latitude: 11.9404,
    longitude: 108.4377,
    phone: null,
    email: null,
    websiteUrl: null,
    bestVisitMonths: [10, 11, 12, 1, 2, 3],
    seasonNote: "Mùa hoa mai anh đào nở rộ quanh bờ hồ từ tháng 12 đến tháng 2.",
    provinceName: "Lâm Đồng",
    provinceSlug: "lam-dong",
    districtName: "Đà Lạt",
    categoryName: "Thiên nhiên & Cảnh quan",
    categorySlug: "thien-nhien-va-cong-vien",
    averageRating: 4.9,
    reviewCount: 512,
    coverImageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80",
    images: [
      {
        id: "img-5",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80",
        caption: "Bình minh yên bình trên Hồ Xuân Hương",
        isCover: true,
      },
    ],
    prices: [
      { id: "pr-5", label: "Thuê xe đạp đôi quanh hồ (1 giờ)", audience: "Tất cả", unit: "giờ", amount: 50000, currency: "VND" },
      { id: "pr-6", label: "Đạp vịt ngắm hồ (1 lượt)", audience: "Tất cả", unit: "lượt", amount: 60000, currency: "VND" },
    ],
    openingHours: [
      { id: "oh-11", dayOfWeek: "MONDAY", openTime: null, closeTime: null, isClosed: false, isOpen24Hours: true },
    ],
    reviews: [
      {
        id: "rev-5",
        rating: 5,
        content: "Dậy sớm chạy bộ hoặc đạp xe quanh hồ trong tiết trời 15 độ C là cảm giác tuyệt vời nhất ở Đà Lạt!",
        createdAt: "2026-08-30T06:30:00Z",
        author: { id: "u-5", fullName: "Phan Quốc Bảo", avatarUrl: null },
      },
    ],
  },
  {
    id: "pl-ga-da-lat",
    name: "Ga Xe Lửa Cổ Đà Lạt",
    slug: "ga-xe-lua-co-da-lat",
    shortDescription: "Nhà ga xe lửa cổ nhất Đông Dương mang đậm kiến trúc phong cách Pháp.",
    description:
      "Ga Đà Lạt được xây dựng từ năm 1932 theo phong cách Art Deco kết hợp kiến trúc nhà rông Tây Nguyên đặc sắc với 3 mái chóp nhọn. Tuyến tàu cổ hiện nay phục vụ đưa du khách đi thưởng ngoạn đến Trại Mát và Chùa Linh Phước.",
    addressLine: "Số 1 Quang Trung, Phường 10",
    ward: "Phường 10",
    latitude: 11.9421,
    longitude: 108.4556,
    phone: "0263 3834 409",
    email: null,
    websiteUrl: null,
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Thời tiết khô ráo, đầu tàu hơi nước cổ kính lên ảnh cực đẹp.",
    provinceName: "Lâm Đồng",
    provinceSlug: "lam-dong",
    districtName: "Đà Lạt",
    categoryName: "Kiến trúc & Di sản",
    categorySlug: "kien-truc-va-van-hoa",
    averageRating: 4.7,
    reviewCount: 298,
    coverImageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80",
    images: [
      {
        id: "img-6",
        url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80",
        caption: "Kiến trúc 3 chóp mái đặc trưng của Ga Đà Lạt",
        isCover: true,
      },
    ],
    prices: [
      { id: "pr-7", label: "Vé tham quan chụp ảnh", audience: "Người lớn", unit: "vé", amount: 10000, currency: "VND" },
      { id: "pr-8", label: "Vé tàu khứ hồi Đà Lạt - Trại Mát", audience: "Người lớn", unit: "vé", amount: 150000, currency: "VND" },
    ],
    openingHours: [
      { id: "oh-12", dayOfWeek: "MONDAY", openTime: "07:30", closeTime: "17:00", isClosed: false, isOpen24Hours: false },
    ],
    reviews: [
      {
        id: "rev-6",
        rating: 5,
        content: "Trải nghiệm đi tàu gỗ cổ kính ngắm thung lũng rau hoa rất thú vị. Giá vé lại rất hợp lý.",
        createdAt: "2026-08-28T11:00:00Z",
        author: { id: "u-6", fullName: "Ngô Thanh Thảo", avatarUrl: null },
      },
    ],
  },
  {
    id: "pl-trang-an-ninh-binh",
    name: "Quần Thể Danh Thắng Tràng An",
    slug: "quan-the-danh-thang-trang-an",
    shortDescription: "Di sản thế giới kép UNESCO với non nước hữu tình và hệ thống hang động kỳ vĩ.",
    description:
      "Tràng An là di sản văn hóa và thiên nhiên thế giới được UNESCO công nhận. Du khách sẽ được ngồi thuyền nan xuôi dòng sông Sào Khê, luồn qua những dãy núi đá vôi triệu năm tuổi và các hang động thạch nhũ lung linh.",
    addressLine: "Tràng An, Huyện Hoa Lư",
    ward: "Xã Ninh Xuân",
    latitude: 20.2526,
    longitude: 105.9082,
    phone: "0229 3620 335",
    email: null,
    websiteUrl: "https://disantrangan.vn",
    bestVisitMonths: [1, 2, 3, 5, 6],
    seasonNote: "Mùa xuân trẩy hội và mùa lúa chín tháng 5-6 là thời điểm rực rỡ nhất.",
    provinceName: "Ninh Bình",
    provinceSlug: "ninh-binh",
    districtName: "Hoa Lư",
    categoryName: "Thiên nhiên & Cảnh quan",
    categorySlug: "thien-nhien-va-cong-vien",
    averageRating: 4.9,
    reviewCount: 680,
    coverImageUrl: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1000&auto=format&fit=crop&q=80",
    images: [
      {
        id: "img-7",
        url: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1000&auto=format&fit=crop&q=80",
        caption: "Thuyền nan du ngoạn sông núi Tràng An",
        isCover: true,
      },
    ],
    prices: [
      { id: "pr-9", label: "Vé thuyền tuyến 1/2/3", audience: "Người lớn", unit: "vé", amount: 250000, currency: "VND" },
      { id: "pr-10", label: "Vé trẻ em (dưới 1.3m)", audience: "Trẻ em", unit: "vé", amount: 120000, currency: "VND" },
    ],
    openingHours: [
      { id: "oh-13", dayOfWeek: "MONDAY", openTime: "07:00", closeTime: "17:30", isClosed: false, isOpen24Hours: false },
    ],
    reviews: [
      {
        id: "rev-7",
        rating: 5,
        content: "Cảnh sắc đẹp mê hồn như trong phim ảnh. Nước sông trong vắt nhìn thấy rong rêu bên dưới.",
        createdAt: "2026-08-18T16:00:00Z",
        author: { id: "u-7", fullName: "Vũ Hải Đăng", avatarUrl: null },
      },
    ],
  },
];

const FALLBACK_FILTER_OPTIONS = {
  provinces: [
    { name: "TP. Hồ Chí Minh", slug: "thanh-pho-ho-chi-minh" },
    { name: "Lâm Đồng (Đà Lạt)", slug: "lam-dong" },
    { name: "Ninh Bình", slug: "ninh-binh" },
    { name: "Đà Nẵng", slug: "da-nang" },
    { name: "Kiên Giang (Phú Quốc)", slug: "kien-giang" },
  ],
  categories: [
    { name: "Lịch sử & Bảo tàng", slug: "lich-su-va-bao-tang" },
    { name: "Kiến trúc & Văn hóa", slug: "kien-truc-va-van-hoa" },
    { name: "Thiên nhiên & Cảnh quan", slug: "thien-nhien-va-cong-vien" },
    { name: "Chợ & Ẩm thực", slug: "cho-va-am-thuc" },
  ],
};

function formatFallbackPlaceCard(p: (typeof FALLBACK_PLACES)[0]) {
  const minPrice = p.prices[0];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    addressLine: p.addressLine,
    ward: p.ward,
    provinceName: p.provinceName,
    provinceSlug: p.provinceSlug,
    categoryName: p.categoryName,
    categorySlug: p.categorySlug,
    bestVisitMonths: p.bestVisitMonths,
    seasonNote: p.seasonNote,
    coverImageUrl: p.coverImageUrl,
    coverImageAlt: `Ảnh ${p.name}`,
    minimumPrice: minPrice
      ? {
          label: minPrice.label,
          amount: minPrice.amount,
          currency: minPrice.currency,
          unit: minPrice.unit,
        }
      : null,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const placeId = url.searchParams.get("id");
  const placeSlug = url.searchParams.get("slug");

  try {
    // 1. Single Place Detail
    if (placeId || placeSlug) {
      try {
        const place = await prisma.place.findFirst({
          where: {
            ...(placeId ? { id: placeId } : { slug: placeSlug! }),
            isActive: true,
            deletedAt: null,
            verificationStatus: "VERIFIED",
          },
          include: {
            province: { select: { id: true, name: true, slug: true } },
            district: { select: { id: true, name: true, slug: true } },
            category: { select: { id: true, name: true, slug: true } },
            images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
            prices: { where: { isActive: true }, orderBy: { amount: "asc" } },
            openingHours: { orderBy: [{ dayOfWeek: "asc" }, { periodOrder: "asc" }] },
            reviews: {
              where: { status: "PUBLISHED" },
              orderBy: { createdAt: "desc" },
              take: 20,
              include: {
                author: {
                  select: {
                    id: true,
                    profile: { select: { fullName: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        });

        if (place) {
          const ratings = place.reviews.map((r) => r.rating);
          const averageRating =
            ratings.length > 0
              ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
              : null;

          const images = place.images.map((img) => ({
            id: img.id,
            storagePath: img.storagePath,
            url: getPublicStorageUrl(img.storagePath),
            altText: img.altText ?? `Ảnh ${place.name}`,
            caption: img.caption,
            isCover: img.isCover,
            sortOrder: img.sortOrder,
          }));

          const prices = place.prices.map((p) => ({
            id: p.id,
            label: p.label,
            audience: p.audience,
            unit: p.unit,
            amount: Number(p.amount),
            currency: p.currency,
            validFrom: p.validFrom,
            validUntil: p.validUntil,
          }));

          const openingHours = place.openingHours.map((oh) => ({
            id: oh.id,
            dayOfWeek: oh.dayOfWeek,
            periodOrder: oh.periodOrder,
            openTime: formatTimeString(oh.openTime),
            closeTime: formatTimeString(oh.closeTime),
            isClosed: oh.isClosed,
            isOpen24Hours: oh.isOpen24Hours,
            note: oh.note,
          }));

          const reviews = place.reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            content: r.content,
            createdAt: r.createdAt,
            author: {
              id: r.author.id,
              fullName: r.author.profile?.fullName || "Người dùng ẩn danh",
              avatarUrl: r.author.profile?.avatarUrl || null,
            },
          }));

          return NextResponse.json({
            ok: true,
            place: {
              id: place.id,
              name: place.name,
              slug: place.slug,
              description: place.description,
              shortDescription: place.shortDescription,
              addressLine: place.addressLine,
              ward: place.ward,
              latitude: place.latitude ? Number(place.latitude) : null,
              longitude: place.longitude ? Number(place.longitude) : null,
              phone: place.phone,
              email: place.email,
              websiteUrl: place.websiteUrl,
              bestVisitMonths: place.bestVisitMonths,
              seasonNote: place.seasonNote,
              provinceName: place.province.name,
              provinceSlug: place.province.slug,
              districtName: place.district?.name || null,
              categoryName: place.category.name,
              categorySlug: place.category.slug,
              averageRating,
              reviewCount: ratings.length,
              coverImageUrl: images.find((i) => i.isCover)?.url || images[0]?.url || null,
              images,
              prices,
              openingHours,
              reviews,
            },
          });
        }
      } catch (dbError) {
        console.warn("Prisma place detail query failed, falling back to curated data:", dbError);
      }

      // Check fallback data
      const fallback = FALLBACK_PLACES.find(
        (p) => p.id === placeId || p.slug === placeSlug || p.name.toLowerCase().includes((placeId || "").toLowerCase())
      );
      if (fallback) {
        return NextResponse.json({ ok: true, place: fallback });
      }

      return NextResponse.json(
        { ok: false, error: "PLACE_NOT_FOUND", message: "Không tìm thấy địa điểm." },
        { status: 404 },
      );
    }

    // 2. Catalog & Search List
    const query = url.searchParams.get("q") || undefined;
    const province = url.searchParams.get("province") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const monthParam = url.searchParams.get("month");
    const pageParam = url.searchParams.get("page");
    const pageSizeParam = url.searchParams.get("pageSize");

    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const pageSize = pageSizeParam ? Math.min(50, Math.max(1, parseInt(pageSizeParam, 10))) : 16;

    try {
      const [catalog, filterOptions] = await Promise.all([
        getPublicPlaceCatalog({ query, province, category, month, page, pageSize }),
        getPublicPlaceFilterOptions(),
      ]);

      if (catalog && catalog.places.length > 0) {
        return NextResponse.json({
          ok: true,
          places: catalog.places,
          total: catalog.total,
          totalPages: catalog.totalPages,
          currentPage: catalog.currentPage,
          pageSize: catalog.pageSize,
          filterOptions,
        });
      }
    } catch (dbError) {
      console.warn("Prisma places catalog query failed, using curated dataset:", dbError);
    }

    // Filter fallback data
    let filtered = [...FALLBACK_PLACES];
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.addressLine.toLowerCase().includes(q)
      );
    }
    if (province && province !== "all") {
      filtered = filtered.filter((p) => p.provinceSlug === province);
    }
    if (category && category !== "all") {
      filtered = filtered.filter((p) => p.categorySlug === category);
    }
    if (month) {
      filtered = filtered.filter((p) => p.bestVisitMonths.includes(month));
    }

    const cards = filtered.map(formatFallbackPlaceCard);

    return NextResponse.json({
      ok: true,
      places: cards,
      total: cards.length,
      totalPages: 1,
      currentPage: 1,
      pageSize: cards.length,
      filterOptions: FALLBACK_FILTER_OPTIONS,
    });
  } catch (error) {
    console.error("GET /api/places failed:", error);
    return NextResponse.json(
      { ok: false, error: "FETCH_PLACES_FAILED", message: "Không thể lấy danh sách địa điểm." },
      { status: 500 },
    );
  }
}
