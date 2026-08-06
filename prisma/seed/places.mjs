import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DIRECT_URL hoặc DATABASE_URL chưa được cấu hình trong .env.local.",
  );
}

const usesLocalDatabase =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString,
  max: 1,
  ssl: usesLocalDatabase ? undefined : { rejectUnauthorized: false },
});

const dayNames = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const sampleDataNote =
  "Dữ liệu mẫu phục vụ đồ án VTripPlanner; cần kiểm tra lại trước khi sử dụng thực tế.";

function regularHours(openTime, closeTime) {
  return dayNames.map((dayOfWeek) => ({
    dayOfWeek,
    periodOrder: 1,
    openTime,
    closeTime,
    closesNextDay: false,
    isClosed: false,
    isOpen24Hours: false,
    note: sampleDataNote,
  }));
}

function alwaysOpenHours() {
  return dayNames.map((dayOfWeek) => ({
    dayOfWeek,
    periodOrder: 1,
    openTime: null,
    closeTime: null,
    closesNextDay: false,
    isClosed: false,
    isOpen24Hours: true,
    note: sampleDataNote,
  }));
}

const provinces = [
  {
    code: "HCM",
    name: "Thành phố Hồ Chí Minh",
    slug: "thanh-pho-ho-chi-minh",
  },
  {
    code: "LAM_DONG",
    name: "Lâm Đồng",
    slug: "lam-dong",
  },
];

const categories = [
  {
    name: "Lịch sử và bảo tàng",
    slug: "lich-su-va-bao-tang",
    description: "Di tích lịch sử, bảo tàng và không gian trưng bày.",
    iconName: "Landmark",
  },
  {
    name: "Kiến trúc và văn hóa",
    slug: "kien-truc-va-van-hoa",
    description: "Công trình kiến trúc và không gian văn hóa đặc trưng.",
    iconName: "Building2",
  },
  {
    name: "Thiên nhiên và công viên",
    slug: "thien-nhien-va-cong-vien",
    description: "Hồ, công viên, vườn hoa và cảnh quan thiên nhiên.",
    iconName: "Trees",
  },
  {
    name: "Vui chơi và trải nghiệm",
    slug: "vui-choi-va-trai-nghiem",
    description: "Điểm vui chơi, tham quan và trải nghiệm dành cho du khách.",
    iconName: "FerrisWheel",
  },
  {
    name: "Chợ và ẩm thực",
    slug: "cho-va-am-thuc",
    description: "Chợ truyền thống và không gian khám phá ẩm thực địa phương.",
    iconName: "Store",
  },
  {
    name: "Tâm linh",
    slug: "tam-linh",
    description: "Chùa, nhà thờ và địa điểm sinh hoạt tín ngưỡng.",
    iconName: "Church",
  },
];

const places = [
  {
    provinceCode: "HCM",
    categorySlug: "lich-su-va-bao-tang",
    name: "Dinh Độc Lập",
    slug: "dinh-doc-lap",
    shortDescription: "Di tích lịch sử tiêu biểu tại trung tâm Thành phố Hồ Chí Minh.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Địa điểm phù hợp cho hành trình tìm hiểu lịch sử và kiến trúc đô thị.",
    addressLine: "135 Nam Kỳ Khởi Nghĩa",
    latitude: "10.777000",
    longitude: "106.695300",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Thời tiết thường dễ chịu hơn từ tháng 12 đến tháng 4.",
    hours: regularHours("07:30:00", "17:30:00"),
    price: 65000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "lich-su-va-bao-tang",
    name: "Bảo tàng Chứng tích Chiến tranh",
    slug: "bao-tang-chung-tich-chien-tranh",
    shortDescription: "Không gian trưng bày tư liệu và hiện vật lịch sử.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Nội dung tham quan hướng đến việc tìm hiểu lịch sử qua các khu trưng bày.",
    addressLine: "28 Võ Văn Tần",
    latitude: "10.779500",
    longitude: "106.692100",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Có thể tham quan quanh năm; mùa khô thuận tiện di chuyển hơn.",
    hours: regularHours("07:30:00", "17:30:00"),
    price: 40000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "lich-su-va-bao-tang",
    name: "Bảo tàng Thành phố Hồ Chí Minh",
    slug: "bao-tang-thanh-pho-ho-chi-minh",
    shortDescription: "Bảo tàng giới thiệu lịch sử hình thành và phát triển thành phố.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Điểm tham quan kết hợp nội dung lịch sử với kiến trúc cổ.",
    addressLine: "65 Lý Tự Trọng",
    latitude: "10.775600",
    longitude: "106.699600",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Thích hợp quanh năm; ưu tiên buổi sáng hoặc đầu giờ chiều.",
    hours: regularHours("08:00:00", "17:00:00"),
    price: 30000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Bưu điện Trung tâm Sài Gòn",
    slug: "buu-dien-trung-tam-sai-gon",
    shortDescription: "Công trình kiến trúc nổi bật gần Nhà thờ Đức Bà.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Không gian phù hợp tham quan kiến trúc và chụp ảnh.",
    addressLine: "2 Công xã Paris",
    latitude: "10.779800",
    longitude: "106.699900",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận tiện cho hành trình đi bộ khu trung tâm.",
    hours: regularHours("07:00:00", "19:00:00"),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Nhà thờ Đức Bà Sài Gòn",
    slug: "nha-tho-duc-ba-sai-gon",
    shortDescription: "Công trình tôn giáo và kiến trúc quen thuộc của trung tâm thành phố.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Việc tiếp cận một số khu vực có thể thay đổi theo hoạt động bảo tồn và tôn giáo.",
    addressLine: "1 Công xã Paris",
    latitude: "10.779700",
    longitude: "106.699100",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Nên ghé vào buổi sáng trong mùa khô để thuận tiện tham quan bên ngoài.",
    hours: regularHours("08:00:00", "17:00:00"),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "cho-va-am-thuc",
    name: "Chợ Bến Thành",
    slug: "cho-ben-thanh",
    shortDescription: "Chợ truyền thống nổi tiếng với hàng hóa và ẩm thực địa phương.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp để khám phá không khí chợ và lựa chọn món ăn, quà lưu niệm.",
    addressLine: "Khu vực đường Lê Lợi",
    latitude: "10.772500",
    longitude: "106.698000",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận tiện kết hợp tham quan các điểm trung tâm.",
    hours: regularHours("06:00:00", "22:00:00"),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "vui-choi-va-trai-nghiem",
    name: "Thảo Cầm Viên Sài Gòn",
    slug: "thao-cam-vien-sai-gon",
    shortDescription: "Không gian xanh kết hợp tham quan động vật và thực vật.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp cho gia đình và hành trình thư giãn ngoài trời.",
    addressLine: "2 Nguyễn Bỉnh Khiêm",
    latitude: "10.787100",
    longitude: "106.705200",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Nên đi vào buổi sáng mùa khô để tránh nắng và mưa lớn.",
    hours: regularHours("07:00:00", "17:30:00"),
    price: 60000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "vui-choi-va-trai-nghiem",
    name: "Phố đi bộ Nguyễn Huệ",
    slug: "pho-di-bo-nguyen-hue",
    shortDescription: "Không gian đi bộ và sinh hoạt cộng đồng tại trung tâm thành phố.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Không gian công cộng phù hợp dạo bộ, ngắm cảnh và tham gia hoạt động đô thị.",
    addressLine: "Đường Nguyễn Huệ",
    latitude: "10.774000",
    longitude: "106.703700",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Buổi tối mùa khô thường thuận tiện cho hoạt động ngoài trời.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "lich-su-va-bao-tang",
    name: "Bến Nhà Rồng",
    slug: "ben-nha-rong",
    shortDescription: "Địa điểm lịch sử nằm bên sông Sài Gòn.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Có thể kết hợp tìm hiểu lịch sử với ngắm cảnh khu vực ven sông.",
    addressLine: "1 Nguyễn Tất Thành",
    latitude: "10.768100",
    longitude: "106.707600",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Mùa khô phù hợp kết hợp các điểm tham quan ven sông.",
    hours: regularHours("08:00:00", "17:00:00"),
    price: 20000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "tam-linh",
    name: "Chùa Ngọc Hoàng",
    slug: "chua-ngoc-hoang",
    shortDescription: "Ngôi chùa có không gian tín ngưỡng và kiến trúc đặc trưng.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Du khách cần giữ trật tự, trang phục phù hợp và tôn trọng hoạt động tín ngưỡng.",
    addressLine: "73 Mai Thị Lựu",
    latitude: "10.791600",
    longitude: "106.697900",
    bestVisitMonths: [1, 2, 3, 4, 12],
    seasonNote: "Có thể đông vào dịp lễ; ngày thường thuận tiện tham quan hơn.",
    hours: regularHours("07:00:00", "18:00:00"),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "thien-nhien-va-cong-vien",
    name: "Công viên Bến Bạch Đằng",
    slug: "cong-vien-ben-bach-dang",
    shortDescription: "Không gian công cộng ven sông tại khu vực trung tâm.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp dạo bộ, nghỉ ngơi và ngắm cảnh đô thị ven sông.",
    addressLine: "Đường Tôn Đức Thắng",
    latitude: "10.775700",
    longitude: "106.706900",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Nên ghé vào sáng sớm hoặc chiều tối mùa khô.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Đường sách Thành phố Hồ Chí Minh",
    slug: "duong-sach-thanh-pho-ho-chi-minh",
    shortDescription: "Không gian sách và hoạt động văn hóa giữa trung tâm thành phố.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp nghỉ chân, đọc sách và tham gia hoạt động văn hóa.",
    addressLine: "Đường Nguyễn Văn Bình",
    latitude: "10.780200",
    longitude: "106.699500",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận tiện kết hợp hành trình đi bộ khu trung tâm.",
    hours: regularHours("08:00:00", "21:00:00"),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "thien-nhien-va-cong-vien",
    name: "Hồ Xuân Hương",
    slug: "ho-xuan-huong-da-lat",
    shortDescription: "Hồ nước nằm giữa trung tâm Đà Lạt.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp dạo bộ, ngắm cảnh và kết hợp các điểm trung tâm.",
    addressLine: "Khu vực đường Trần Quốc Toản",
    latitude: "11.941500",
    longitude: "108.441900",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô từ khoảng tháng 11 đến tháng 4 thuận tiện cho hoạt động ngoài trời.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Quảng trường Lâm Viên",
    slug: "quang-truong-lam-vien",
    shortDescription: "Quảng trường trung tâm với các công trình kiến trúc biểu tượng.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp dạo bộ, chụp ảnh và kết hợp Hồ Xuân Hương.",
    addressLine: "Đường Trần Quốc Toản",
    latitude: "11.938600",
    longitude: "108.444500",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Chiều tối mùa khô thường phù hợp tham quan ngoài trời.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "thien-nhien-va-cong-vien",
    name: "Vườn hoa Thành phố Đà Lạt",
    slug: "vuon-hoa-thanh-pho-da-lat",
    shortDescription: "Không gian trưng bày hoa và cảnh quan gần trung tâm.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp du khách yêu thích hoa, cảnh quan và chụp ảnh.",
    addressLine: "Đường Trần Quốc Toản",
    latitude: "11.951800",
    longitude: "108.443300",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận lợi hơn; cảnh quan có thể thay đổi theo đợt trưng bày hoa.",
    hours: regularHours("07:00:00", "18:00:00"),
    price: 100000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Ga Đà Lạt",
    slug: "ga-da-lat",
    shortDescription: "Nhà ga cổ có kiến trúc đặc trưng của Đà Lạt.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Điểm tham quan phù hợp tìm hiểu kiến trúc và chụp ảnh.",
    addressLine: "1 Quang Trung",
    latitude: "11.941700",
    longitude: "108.454200",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận tiện tham quan và kết hợp các điểm phía đông trung tâm.",
    hours: regularHours("07:30:00", "17:30:00"),
    price: 50000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "lich-su-va-bao-tang",
    name: "Dinh Bảo Đại III",
    slug: "dinh-bao-dai-iii",
    shortDescription: "Công trình lịch sử gắn với không gian sống của triều Nguyễn tại Đà Lạt.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp hành trình tìm hiểu lịch sử và kiến trúc biệt thự.",
    addressLine: "1 Triệu Việt Vương",
    latitude: "11.930100",
    longitude: "108.429400",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận tiện di chuyển giữa các khu nhà và vườn.",
    hours: regularHours("07:00:00", "17:30:00"),
    price: 50000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Biệt thự Hằng Nga",
    slug: "biet-thu-hang-nga",
    shortDescription: "Công trình kiến trúc sáng tạo thường được gọi là Crazy House.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Không gian có nhiều lối đi và chi tiết kiến trúc độc đáo.",
    addressLine: "3 Huỳnh Thúc Kháng",
    latitude: "11.934700",
    longitude: "108.431700",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận tiện tham quan các lối đi ngoài trời.",
    hours: regularHours("08:30:00", "18:00:00"),
    price: 80000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "vui-choi-va-trai-nghiem",
    name: "Thác Datanla",
    slug: "thac-datanla",
    shortDescription: "Khu vực thác nước kết hợp tham quan và hoạt động trải nghiệm.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Chi phí thực tế có thể khác nhau theo từng dịch vụ trải nghiệm.",
    addressLine: "Khu vực đèo Prenn, Quốc lộ 20",
    latitude: "11.900900",
    longitude: "108.448700",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thường thuận tiện hơn cho di chuyển và hoạt động ngoài trời.",
    hours: regularHours("07:00:00", "17:00:00"),
    price: 100000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "thien-nhien-va-cong-vien",
    name: "Hồ Tuyền Lâm",
    slug: "ho-tuyen-lam",
    shortDescription: "Hồ nước và cảnh quan rừng thông ở phía nam Đà Lạt.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Phù hợp ngắm cảnh, nghỉ ngơi và kết hợp các điểm lân cận.",
    addressLine: "Khu vực Hồ Tuyền Lâm",
    latitude: "11.903000",
    longitude: "108.422000",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận tiện ngắm cảnh và di chuyển ven hồ.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "tam-linh",
    name: "Thiền viện Trúc Lâm",
    slug: "thien-vien-truc-lam-da-lat",
    shortDescription: "Không gian thiền viện nằm gần Hồ Tuyền Lâm.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Du khách cần giữ yên tĩnh, trang phục phù hợp và tôn trọng sinh hoạt tôn giáo.",
    addressLine: "Đường Trúc Lâm Yên Tử",
    latitude: "11.903800",
    longitude: "108.433000",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Buổi sáng mùa khô thường có thời tiết thuận tiện và không gian yên tĩnh.",
    hours: regularHours("07:00:00", "17:00:00"),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "vui-choi-va-trai-nghiem",
    name: "Thung lũng Tình Yêu",
    slug: "thung-lung-tinh-yeu",
    shortDescription: "Khu tham quan cảnh quan và hoạt động giải trí tại Đà Lạt.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Giá vé và dịch vụ thực tế có thể thay đổi theo thời điểm.",
    addressLine: "7 Mai Anh Đào",
    latitude: "12.000500",
    longitude: "108.449100",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô phù hợp tham quan cảnh quan ngoài trời.",
    hours: regularHours("07:00:00", "17:00:00"),
    price: 250000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "cho-va-am-thuc",
    name: "Chợ Đà Lạt",
    slug: "cho-da-lat",
    shortDescription: "Chợ trung tâm với nông sản, đặc sản và hoạt động ẩm thực.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Có thể kết hợp mua sắm, khám phá ẩm thực và tham quan khu trung tâm.",
    addressLine: "Đường Nguyễn Thị Minh Khai",
    latitude: "11.940300",
    longitude: "108.436200",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Có thể ghé quanh năm; buổi tối thường có nhiều hoạt động ẩm thực.",
    hours: regularHours("06:00:00", "22:00:00"),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "tam-linh",
    name: "Nhà thờ Domaine de Marie",
    slug: "nha-tho-domaine-de-marie",
    shortDescription: "Nhà thờ có kiến trúc nổi bật trong không gian đồi thông Đà Lạt.",
    description:
      "Dữ liệu mô tả mẫu phục vụ đồ án VTripPlanner. Du khách cần tôn trọng giờ lễ và hoạt động tôn giáo tại địa điểm.",
    addressLine: "1 Ngô Quyền",
    latitude: "11.949800",
    longitude: "108.431800",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Mùa khô thuận tiện tham quan khuôn viên và chụp ảnh bên ngoài.",
    hours: regularHours("07:00:00", "17:00:00"),
    price: 0,
  },
];

async function upsertProvince(client, province) {
  const result = await client.query(
    `
      INSERT INTO public.provinces (
        "code",
        "name",
        "slug",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, true, now(), now())
      ON CONFLICT ("code")
      DO UPDATE SET
        "name" = EXCLUDED."name",
        "slug" = EXCLUDED."slug",
        "isActive" = true,
        "updatedAt" = now()
      RETURNING "id";
    `,
    [province.code, province.name, province.slug],
  );

  return result.rows[0].id;
}

async function upsertCategory(client, category) {
  const result = await client.query(
    `
      INSERT INTO public.place_categories (
        "name",
        "slug",
        "description",
        "iconName",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, true, now(), now())
      ON CONFLICT ("slug")
      DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "iconName" = EXCLUDED."iconName",
        "isActive" = true,
        "updatedAt" = now()
      RETURNING "id";
    `,
    [category.name, category.slug, category.description, category.iconName],
  );

  return result.rows[0].id;
}

async function upsertPlace(client, place, provinceId, categoryId) {
  const result = await client.query(
    `
      INSERT INTO public.places (
        "categoryId",
        "provinceId",
        "districtId",
        "name",
        "slug",
        "shortDescription",
        "description",
        "addressLine",
        "ward",
        "latitude",
        "longitude",
        "phone",
        "email",
        "websiteUrl",
        "bestVisitMonths",
        "seasonNote",
        "verificationStatus",
        "submittedAt",
        "reviewedAt",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $1,
        $2,
        null,
        $3,
        $4,
        $5,
        $6,
        $7,
        null,
        $8,
        $9,
        null,
        null,
        null,
        $10,
        $11,
        'VERIFIED',
        now(),
        now(),
        true,
        now(),
        now()
      )
      ON CONFLICT ("slug")
      DO UPDATE SET
        "categoryId" = EXCLUDED."categoryId",
        "provinceId" = EXCLUDED."provinceId",
        "name" = EXCLUDED."name",
        "shortDescription" = EXCLUDED."shortDescription",
        "description" = EXCLUDED."description",
        "addressLine" = EXCLUDED."addressLine",
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "bestVisitMonths" = EXCLUDED."bestVisitMonths",
        "seasonNote" = EXCLUDED."seasonNote",
        "verificationStatus" = 'VERIFIED',
        "submittedAt" = COALESCE(public.places."submittedAt", now()),
        "reviewedAt" = COALESCE(public.places."reviewedAt", now()),
        "isActive" = true,
        "deletedAt" = null,
        "updatedAt" = now()
      RETURNING "id";
    `,
    [
      categoryId,
      provinceId,
      place.name,
      place.slug,
      place.shortDescription,
      place.description,
      place.addressLine,
      place.latitude,
      place.longitude,
      place.bestVisitMonths,
      place.seasonNote,
    ],
  );

  return result.rows[0].id;
}

async function upsertOpeningHour(client, placeId, openingHour) {
  await client.query(
    `
      INSERT INTO public.place_opening_hours (
        "placeId",
        "dayOfWeek",
        "periodOrder",
        "openTime",
        "closeTime",
        "closesNextDay",
        "isClosed",
        "isOpen24Hours",
        "note",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $1,
        $2::"DayOfWeek",
        $3,
        $4::time,
        $5::time,
        $6,
        $7,
        $8,
        $9,
        now(),
        now()
      )
      ON CONFLICT ("placeId", "dayOfWeek", "periodOrder")
      DO UPDATE SET
        "openTime" = EXCLUDED."openTime",
        "closeTime" = EXCLUDED."closeTime",
        "closesNextDay" = EXCLUDED."closesNextDay",
        "isClosed" = EXCLUDED."isClosed",
        "isOpen24Hours" = EXCLUDED."isOpen24Hours",
        "note" = EXCLUDED."note",
        "updatedAt" = now();
    `,
    [
      placeId,
      openingHour.dayOfWeek,
      openingHour.periodOrder,
      openingHour.openTime,
      openingHour.closeTime,
      openingHour.closesNextDay,
      openingHour.isClosed,
      openingHour.isOpen24Hours,
      openingHour.note,
    ],
  );
}

async function upsertPrice(client, placeId, amount) {
  const existing = await client.query(
    `
      SELECT "id"
      FROM public.place_prices
      WHERE "placeId" = $1
        AND "label" = $2
        AND "audience" = $3::"PlacePriceAudience"
        AND "unit" = $4::"PlacePriceUnit"
      ORDER BY "createdAt"
      LIMIT 1;
    `,
    [placeId, "Giá tham khảo", "GENERAL", "ENTRY"],
  );

  if (existing.rowCount > 0) {
    await client.query(
      `
        UPDATE public.place_prices
        SET
          "amount" = $2,
          "currency" = 'VND',
          "note" = $3,
          "isActive" = true,
          "updatedAt" = now()
        WHERE "id" = $1;
      `,
      [existing.rows[0].id, amount, sampleDataNote],
    );

    return;
  }

  await client.query(
    `
      INSERT INTO public.place_prices (
        "placeId",
        "label",
        "audience",
        "unit",
        "amount",
        "currency",
        "note",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $1,
        $2,
        $3::"PlacePriceAudience",
        $4::"PlacePriceUnit",
        $5,
        'VND',
        $6,
        true,
        now(),
        now()
      );
    `,
    [
      placeId,
      "Giá tham khảo",
      "GENERAL",
      "ENTRY",
      amount,
      sampleDataNote,
    ],
  );
}

async function verifySeed(client) {
  const provinceCodes = provinces.map((province) => province.code);
  const categorySlugs = categories.map((category) => category.slug);
  const placeSlugs = places.map((place) => place.slug);

  const provinceCount = await client.query(
    `SELECT count(*)::integer AS count FROM public.provinces WHERE "code" = ANY($1::text[]);`,
    [provinceCodes],
  );
  const categoryCount = await client.query(
    `SELECT count(*)::integer AS count FROM public.place_categories WHERE "slug" = ANY($1::text[]);`,
    [categorySlugs],
  );
  const placeCount = await client.query(
    `SELECT count(*)::integer AS count FROM public.places WHERE "slug" = ANY($1::text[]);`,
    [placeSlugs],
  );
  const openingHourCount = await client.query(
    `
      SELECT count(*)::integer AS count
      FROM public.place_opening_hours AS opening_hours
      JOIN public.places AS places
        ON places."id" = opening_hours."placeId"
      WHERE places."slug" = ANY($1::text[])
        AND opening_hours."periodOrder" = 1;
    `,
    [placeSlugs],
  );
  const priceCount = await client.query(
    `
      SELECT count(*)::integer AS count
      FROM public.place_prices AS prices
      JOIN public.places AS places
        ON places."id" = prices."placeId"
      WHERE places."slug" = ANY($1::text[])
        AND prices."label" = 'Giá tham khảo'
        AND prices."audience" = 'GENERAL'
        AND prices."unit" = 'ENTRY';
    `,
    [placeSlugs],
  );
  const imageCount = await client.query(
    `
      SELECT count(*)::integer AS count
      FROM public.place_images AS images
      JOIN public.places AS places
        ON places."id" = images."placeId"
      WHERE places."slug" = ANY($1::text[]);
    `,
    [placeSlugs],
  );

  const counts = {
    provinces: provinceCount.rows[0].count,
    categories: categoryCount.rows[0].count,
    places: placeCount.rows[0].count,
    openingHours: openingHourCount.rows[0].count,
    prices: priceCount.rows[0].count,
    images: imageCount.rows[0].count,
  };

  if (
    counts.provinces !== 2 ||
    counts.categories !== 6 ||
    counts.places !== 24 ||
    counts.openingHours !== 168 ||
    counts.prices !== 24
  ) {
    throw new Error(`Kết quả seed không đúng mong đợi: ${JSON.stringify(counts)}`);
  }

  return counts;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('vtripplanner:seed:places:v1'));",
    );

    const provinceIds = new Map();
    for (const province of provinces) {
      provinceIds.set(
        province.code,
        await upsertProvince(client, province),
      );
    }

    const categoryIds = new Map();
    for (const category of categories) {
      categoryIds.set(
        category.slug,
        await upsertCategory(client, category),
      );
    }

    for (const place of places) {
      const provinceId = provinceIds.get(place.provinceCode);
      const categoryId = categoryIds.get(place.categorySlug);

      if (!provinceId || !categoryId) {
        throw new Error(`Không tìm thấy khóa ngoại cho địa điểm ${place.slug}.`);
      }

      const placeId = await upsertPlace(
        client,
        place,
        provinceId,
        categoryId,
      );

      for (const openingHour of place.hours) {
        await upsertOpeningHour(client, placeId, openingHour);
      }

      await upsertPrice(client, placeId, place.price);
    }

    const counts = await verifySeed(client);
    await client.query("COMMIT");

    console.log("=== KET QUA SEED DIA DIEM ===");
    console.log(`Tinh/thanh mau: ${counts.provinces}`);
    console.log(`Danh muc mau: ${counts.categories}`);
    console.log(`Dia diem mau: ${counts.places}`);
    console.log(`Khung gio mo cua mau: ${counts.openingHours}`);
    console.log(`Muc gia tham khao mau: ${counts.prices}`);
    console.log(`Anh dia diem hien tai: ${counts.images}`);
    console.log("Seed co the chay lai an toan bang npm run seed:places.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Seed địa điểm thất bại.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
