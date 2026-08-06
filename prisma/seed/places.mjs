import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DIRECT_URL hoáº·c DATABASE_URL chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh trong .env.local.",
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
  "Dá»¯ liá»‡u máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner; cáº§n kiá»ƒm tra láº¡i trÆ°á»›c khi sá»­ dá»¥ng thá»±c táº¿.";

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
    name: "ThÃ nh phá»‘ Há»“ ChÃ­ Minh",
    slug: "thanh-pho-ho-chi-minh",
  },
  {
    code: "LAM_DONG",
    name: "LÃ¢m Äá»“ng",
    slug: "lam-dong",
  },
];

const categories = [
  {
    name: "Lá»‹ch sá»­ vÃ  báº£o tÃ ng",
    slug: "lich-su-va-bao-tang",
    description: "Di tÃ­ch lá»‹ch sá»­, báº£o tÃ ng vÃ  khÃ´ng gian trÆ°ng bÃ y.",
    iconName: "Landmark",
  },
  {
    name: "Kiáº¿n trÃºc vÃ  vÄƒn hÃ³a",
    slug: "kien-truc-va-van-hoa",
    description: "CÃ´ng trÃ¬nh kiáº¿n trÃºc vÃ  khÃ´ng gian vÄƒn hÃ³a Ä‘áº·c trÆ°ng.",
    iconName: "Building2",
  },
  {
    name: "ThiÃªn nhiÃªn vÃ  cÃ´ng viÃªn",
    slug: "thien-nhien-va-cong-vien",
    description: "Há»“, cÃ´ng viÃªn, vÆ°á»n hoa vÃ  cáº£nh quan thiÃªn nhiÃªn.",
    iconName: "Trees",
  },
  {
    name: "Vui chÆ¡i vÃ  tráº£i nghiá»‡m",
    slug: "vui-choi-va-trai-nghiem",
    description: "Äiá»ƒm vui chÆ¡i, tham quan vÃ  tráº£i nghiá»‡m dÃ nh cho du khÃ¡ch.",
    iconName: "FerrisWheel",
  },
  {
    name: "Chá»£ vÃ  áº©m thá»±c",
    slug: "cho-va-am-thuc",
    description: "Chá»£ truyá»n thá»‘ng vÃ  khÃ´ng gian khÃ¡m phÃ¡ áº©m thá»±c Ä‘á»‹a phÆ°Æ¡ng.",
    iconName: "Store",
  },
  {
    name: "TÃ¢m linh",
    slug: "tam-linh",
    description: "ChÃ¹a, nhÃ  thá» vÃ  Ä‘á»‹a Ä‘iá»ƒm sinh hoáº¡t tÃ­n ngÆ°á»¡ng.",
    iconName: "Church",
  },
];

const places = [
  {
    provinceCode: "HCM",
    categorySlug: "lich-su-va-bao-tang",
    name: "Dinh Äá»™c Láº­p",
    slug: "dinh-doc-lap",
    shortDescription: "Di tÃ­ch lá»‹ch sá»­ tiÃªu biá»ƒu táº¡i trung tÃ¢m ThÃ nh phá»‘ Há»“ ChÃ­ Minh.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Äá»‹a Ä‘iá»ƒm phÃ¹ há»£p cho hÃ nh trÃ¬nh tÃ¬m hiá»ƒu lá»‹ch sá»­ vÃ  kiáº¿n trÃºc Ä‘Ã´ thá»‹.",
    addressLine: "135 Nam Ká»³ Khá»Ÿi NghÄ©a",
    latitude: "10.777000",
    longitude: "106.695300",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Thá»i tiáº¿t thÆ°á»ng dá»… chá»‹u hÆ¡n tá»« thÃ¡ng 12 Ä‘áº¿n thÃ¡ng 4.",
    hours: regularHours("07:30:00", "17:30:00"),
    price: 65000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "lich-su-va-bao-tang",
    name: "Báº£o tÃ ng Chá»©ng tÃ­ch Chiáº¿n tranh",
    slug: "bao-tang-chung-tich-chien-tranh",
    shortDescription: "KhÃ´ng gian trÆ°ng bÃ y tÆ° liá»‡u vÃ  hiá»‡n váº­t lá»‹ch sá»­.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Ná»™i dung tham quan hÆ°á»›ng Ä‘áº¿n viá»‡c tÃ¬m hiá»ƒu lá»‹ch sá»­ qua cÃ¡c khu trÆ°ng bÃ y.",
    addressLine: "28 VÃµ VÄƒn Táº§n",
    latitude: "10.779500",
    longitude: "106.692100",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "CÃ³ thá»ƒ tham quan quanh nÄƒm; mÃ¹a khÃ´ thuáº­n tiá»‡n di chuyá»ƒn hÆ¡n.",
    hours: regularHours("07:30:00", "17:30:00"),
    price: 40000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "lich-su-va-bao-tang",
    name: "Báº£o tÃ ng ThÃ nh phá»‘ Há»“ ChÃ­ Minh",
    slug: "bao-tang-thanh-pho-ho-chi-minh",
    shortDescription: "Báº£o tÃ ng giá»›i thiá»‡u lá»‹ch sá»­ hÃ¬nh thÃ nh vÃ  phÃ¡t triá»ƒn thÃ nh phá»‘.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Äiá»ƒm tham quan káº¿t há»£p ná»™i dung lá»‹ch sá»­ vá»›i kiáº¿n trÃºc cá»•.",
    addressLine: "65 LÃ½ Tá»± Trá»ng",
    latitude: "10.775600",
    longitude: "106.699600",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "ThÃ­ch há»£p quanh nÄƒm; Æ°u tiÃªn buá»•i sÃ¡ng hoáº·c Ä‘áº§u giá» chiá»u.",
    hours: regularHours("08:00:00", "17:00:00"),
    price: 30000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "kien-truc-va-van-hoa",
    name: "BÆ°u Ä‘iá»‡n Trung tÃ¢m SÃ i GÃ²n",
    slug: "buu-dien-trung-tam-sai-gon",
    shortDescription: "CÃ´ng trÃ¬nh kiáº¿n trÃºc ná»•i báº­t gáº§n NhÃ  thá» Äá»©c BÃ .",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. KhÃ´ng gian phÃ¹ há»£p tham quan kiáº¿n trÃºc vÃ  chá»¥p áº£nh.",
    addressLine: "2 CÃ´ng xÃ£ Paris",
    latitude: "10.779800",
    longitude: "106.699900",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n tiá»‡n cho hÃ nh trÃ¬nh Ä‘i bá»™ khu trung tÃ¢m.",
    hours: regularHours("07:00:00", "19:00:00"),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "kien-truc-va-van-hoa",
    name: "NhÃ  thá» Äá»©c BÃ  SÃ i GÃ²n",
    slug: "nha-tho-duc-ba-sai-gon",
    shortDescription: "CÃ´ng trÃ¬nh tÃ´n giÃ¡o vÃ  kiáº¿n trÃºc quen thuá»™c cá»§a trung tÃ¢m thÃ nh phá»‘.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Viá»‡c tiáº¿p cáº­n má»™t sá»‘ khu vá»±c cÃ³ thá»ƒ thay Ä‘á»•i theo hoáº¡t Ä‘á»™ng báº£o tá»“n vÃ  tÃ´n giÃ¡o.",
    addressLine: "1 CÃ´ng xÃ£ Paris",
    latitude: "10.779700",
    longitude: "106.699100",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "NÃªn ghÃ© vÃ o buá»•i sÃ¡ng trong mÃ¹a khÃ´ Ä‘á»ƒ thuáº­n tiá»‡n tham quan bÃªn ngoÃ i.",
    hours: regularHours("08:00:00", "17:00:00"),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "cho-va-am-thuc",
    name: "Chá»£ Báº¿n ThÃ nh",
    slug: "cho-ben-thanh",
    shortDescription: "Chá»£ truyá»n thá»‘ng ná»•i tiáº¿ng vá»›i hÃ ng hÃ³a vÃ  áº©m thá»±c Ä‘á»‹a phÆ°Æ¡ng.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p Ä‘á»ƒ khÃ¡m phÃ¡ khÃ´ng khÃ­ chá»£ vÃ  lá»±a chá»n mÃ³n Äƒn, quÃ  lÆ°u niá»‡m.",
    addressLine: "Khu vá»±c Ä‘Æ°á»ng LÃª Lá»£i",
    latitude: "10.772500",
    longitude: "106.698000",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n tiá»‡n káº¿t há»£p tham quan cÃ¡c Ä‘iá»ƒm trung tÃ¢m.",
    hours: regularHours("06:00:00", "22:00:00"),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "vui-choi-va-trai-nghiem",
    name: "Tháº£o Cáº§m ViÃªn SÃ i GÃ²n",
    slug: "thao-cam-vien-sai-gon",
    shortDescription: "KhÃ´ng gian xanh káº¿t há»£p tham quan Ä‘á»™ng váº­t vÃ  thá»±c váº­t.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p cho gia Ä‘Ã¬nh vÃ  hÃ nh trÃ¬nh thÆ° giÃ£n ngoÃ i trá»i.",
    addressLine: "2 Nguyá»…n Bá»‰nh KhiÃªm",
    latitude: "10.787100",
    longitude: "106.705200",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "NÃªn Ä‘i vÃ o buá»•i sÃ¡ng mÃ¹a khÃ´ Ä‘á»ƒ trÃ¡nh náº¯ng vÃ  mÆ°a lá»›n.",
    hours: regularHours("07:00:00", "17:30:00"),
    price: 60000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "vui-choi-va-trai-nghiem",
    name: "Phá»‘ Ä‘i bá»™ Nguyá»…n Huá»‡",
    slug: "pho-di-bo-nguyen-hue",
    shortDescription: "KhÃ´ng gian Ä‘i bá»™ vÃ  sinh hoáº¡t cá»™ng Ä‘á»“ng táº¡i trung tÃ¢m thÃ nh phá»‘.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. KhÃ´ng gian cÃ´ng cá»™ng phÃ¹ há»£p dáº¡o bá»™, ngáº¯m cáº£nh vÃ  tham gia hoáº¡t Ä‘á»™ng Ä‘Ã´ thá»‹.",
    addressLine: "ÄÆ°á»ng Nguyá»…n Huá»‡",
    latitude: "10.774000",
    longitude: "106.703700",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "Buá»•i tá»‘i mÃ¹a khÃ´ thÆ°á»ng thuáº­n tiá»‡n cho hoáº¡t Ä‘á»™ng ngoÃ i trá»i.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "lich-su-va-bao-tang",
    name: "Báº¿n NhÃ  Rá»“ng",
    slug: "ben-nha-rong",
    shortDescription: "Äá»‹a Ä‘iá»ƒm lá»‹ch sá»­ náº±m bÃªn sÃ´ng SÃ i GÃ²n.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. CÃ³ thá»ƒ káº¿t há»£p tÃ¬m hiá»ƒu lá»‹ch sá»­ vá»›i ngáº¯m cáº£nh khu vá»±c ven sÃ´ng.",
    addressLine: "1 Nguyá»…n Táº¥t ThÃ nh",
    latitude: "10.768100",
    longitude: "106.707600",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ phÃ¹ há»£p káº¿t há»£p cÃ¡c Ä‘iá»ƒm tham quan ven sÃ´ng.",
    hours: regularHours("08:00:00", "17:00:00"),
    price: 20000,
  },
  {
    provinceCode: "HCM",
    categorySlug: "tam-linh",
    name: "ChÃ¹a Ngá»c HoÃ ng",
    slug: "chua-ngoc-hoang",
    shortDescription: "NgÃ´i chÃ¹a cÃ³ khÃ´ng gian tÃ­n ngÆ°á»¡ng vÃ  kiáº¿n trÃºc Ä‘áº·c trÆ°ng.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Du khÃ¡ch cáº§n giá»¯ tráº­t tá»±, trang phá»¥c phÃ¹ há»£p vÃ  tÃ´n trá»ng hoáº¡t Ä‘á»™ng tÃ­n ngÆ°á»¡ng.",
    addressLine: "73 Mai Thá»‹ Lá»±u",
    latitude: "10.791600",
    longitude: "106.697900",
    bestVisitMonths: [1, 2, 3, 4, 12],
    seasonNote: "CÃ³ thá»ƒ Ä‘Ã´ng vÃ o dá»‹p lá»…; ngÃ y thÆ°á»ng thuáº­n tiá»‡n tham quan hÆ¡n.",
    hours: regularHours("07:00:00", "18:00:00"),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "thien-nhien-va-cong-vien",
    name: "CÃ´ng viÃªn Báº¿n Báº¡ch Äáº±ng",
    slug: "cong-vien-ben-bach-dang",
    shortDescription: "KhÃ´ng gian cÃ´ng cá»™ng ven sÃ´ng táº¡i khu vá»±c trung tÃ¢m.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p dáº¡o bá»™, nghá»‰ ngÆ¡i vÃ  ngáº¯m cáº£nh Ä‘Ã´ thá»‹ ven sÃ´ng.",
    addressLine: "ÄÆ°á»ng TÃ´n Äá»©c Tháº¯ng",
    latitude: "10.775700",
    longitude: "106.706900",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "NÃªn ghÃ© vÃ o sÃ¡ng sá»›m hoáº·c chiá»u tá»‘i mÃ¹a khÃ´.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "HCM",
    categorySlug: "kien-truc-va-van-hoa",
    name: "ÄÆ°á»ng sÃ¡ch ThÃ nh phá»‘ Há»“ ChÃ­ Minh",
    slug: "duong-sach-thanh-pho-ho-chi-minh",
    shortDescription: "KhÃ´ng gian sÃ¡ch vÃ  hoáº¡t Ä‘á»™ng vÄƒn hÃ³a giá»¯a trung tÃ¢m thÃ nh phá»‘.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p nghá»‰ chÃ¢n, Ä‘á»c sÃ¡ch vÃ  tham gia hoáº¡t Ä‘á»™ng vÄƒn hÃ³a.",
    addressLine: "ÄÆ°á»ng Nguyá»…n VÄƒn BÃ¬nh",
    latitude: "10.780200",
    longitude: "106.699500",
    bestVisitMonths: [12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n tiá»‡n káº¿t há»£p hÃ nh trÃ¬nh Ä‘i bá»™ khu trung tÃ¢m.",
    hours: regularHours("08:00:00", "21:00:00"),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "thien-nhien-va-cong-vien",
    name: "Há»“ XuÃ¢n HÆ°Æ¡ng",
    slug: "ho-xuan-huong-da-lat",
    shortDescription: "Há»“ nÆ°á»›c náº±m giá»¯a trung tÃ¢m ÄÃ  Láº¡t.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p dáº¡o bá»™, ngáº¯m cáº£nh vÃ  káº¿t há»£p cÃ¡c Ä‘iá»ƒm trung tÃ¢m.",
    addressLine: "Khu vá»±c Ä‘Æ°á»ng Tráº§n Quá»‘c Toáº£n",
    latitude: "11.941500",
    longitude: "108.441900",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ tá»« khoáº£ng thÃ¡ng 11 Ä‘áº¿n thÃ¡ng 4 thuáº­n tiá»‡n cho hoáº¡t Ä‘á»™ng ngoÃ i trá»i.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Quáº£ng trÆ°á»ng LÃ¢m ViÃªn",
    slug: "quang-truong-lam-vien",
    shortDescription: "Quáº£ng trÆ°á»ng trung tÃ¢m vá»›i cÃ¡c cÃ´ng trÃ¬nh kiáº¿n trÃºc biá»ƒu tÆ°á»£ng.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p dáº¡o bá»™, chá»¥p áº£nh vÃ  káº¿t há»£p Há»“ XuÃ¢n HÆ°Æ¡ng.",
    addressLine: "ÄÆ°á»ng Tráº§n Quá»‘c Toáº£n",
    latitude: "11.938600",
    longitude: "108.444500",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Chiá»u tá»‘i mÃ¹a khÃ´ thÆ°á»ng phÃ¹ há»£p tham quan ngoÃ i trá»i.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "thien-nhien-va-cong-vien",
    name: "VÆ°á»n hoa ThÃ nh phá»‘ ÄÃ  Láº¡t",
    slug: "vuon-hoa-thanh-pho-da-lat",
    shortDescription: "KhÃ´ng gian trÆ°ng bÃ y hoa vÃ  cáº£nh quan gáº§n trung tÃ¢m.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p du khÃ¡ch yÃªu thÃ­ch hoa, cáº£nh quan vÃ  chá»¥p áº£nh.",
    addressLine: "ÄÆ°á»ng Tráº§n Quá»‘c Toáº£n",
    latitude: "11.951800",
    longitude: "108.443300",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n lá»£i hÆ¡n; cáº£nh quan cÃ³ thá»ƒ thay Ä‘á»•i theo Ä‘á»£t trÆ°ng bÃ y hoa.",
    hours: regularHours("07:00:00", "18:00:00"),
    price: 100000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Ga ÄÃ  Láº¡t",
    slug: "ga-da-lat",
    shortDescription: "NhÃ  ga cá»• cÃ³ kiáº¿n trÃºc Ä‘áº·c trÆ°ng cá»§a ÄÃ  Láº¡t.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Äiá»ƒm tham quan phÃ¹ há»£p tÃ¬m hiá»ƒu kiáº¿n trÃºc vÃ  chá»¥p áº£nh.",
    addressLine: "1 Quang Trung",
    latitude: "11.941700",
    longitude: "108.454200",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n tiá»‡n tham quan vÃ  káº¿t há»£p cÃ¡c Ä‘iá»ƒm phÃ­a Ä‘Ã´ng trung tÃ¢m.",
    hours: regularHours("07:30:00", "17:30:00"),
    price: 50000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "lich-su-va-bao-tang",
    name: "Dinh Báº£o Äáº¡i III",
    slug: "dinh-bao-dai-iii",
    shortDescription: "CÃ´ng trÃ¬nh lá»‹ch sá»­ gáº¯n vá»›i khÃ´ng gian sá»‘ng cá»§a triá»u Nguyá»…n táº¡i ÄÃ  Láº¡t.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p hÃ nh trÃ¬nh tÃ¬m hiá»ƒu lá»‹ch sá»­ vÃ  kiáº¿n trÃºc biá»‡t thá»±.",
    addressLine: "1 Triá»‡u Viá»‡t VÆ°Æ¡ng",
    latitude: "11.930100",
    longitude: "108.429400",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n tiá»‡n di chuyá»ƒn giá»¯a cÃ¡c khu nhÃ  vÃ  vÆ°á»n.",
    hours: regularHours("07:00:00", "17:30:00"),
    price: 50000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "kien-truc-va-van-hoa",
    name: "Biá»‡t thá»± Háº±ng Nga",
    slug: "biet-thu-hang-nga",
    shortDescription: "CÃ´ng trÃ¬nh kiáº¿n trÃºc sÃ¡ng táº¡o thÆ°á»ng Ä‘Æ°á»£c gá»i lÃ  Crazy House.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. KhÃ´ng gian cÃ³ nhiá»u lá»‘i Ä‘i vÃ  chi tiáº¿t kiáº¿n trÃºc Ä‘á»™c Ä‘Ã¡o.",
    addressLine: "3 Huá»³nh ThÃºc KhÃ¡ng",
    latitude: "11.934700",
    longitude: "108.431700",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n tiá»‡n tham quan cÃ¡c lá»‘i Ä‘i ngoÃ i trá»i.",
    hours: regularHours("08:30:00", "18:00:00"),
    price: 80000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "vui-choi-va-trai-nghiem",
    name: "ThÃ¡c Datanla",
    slug: "thac-datanla",
    shortDescription: "Khu vá»±c thÃ¡c nÆ°á»›c káº¿t há»£p tham quan vÃ  hoáº¡t Ä‘á»™ng tráº£i nghiá»‡m.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Chi phÃ­ thá»±c táº¿ cÃ³ thá»ƒ khÃ¡c nhau theo tá»«ng dá»‹ch vá»¥ tráº£i nghiá»‡m.",
    addressLine: "Khu vá»±c Ä‘Ã¨o Prenn, Quá»‘c lá»™ 20",
    latitude: "11.900900",
    longitude: "108.448700",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thÆ°á»ng thuáº­n tiá»‡n hÆ¡n cho di chuyá»ƒn vÃ  hoáº¡t Ä‘á»™ng ngoÃ i trá»i.",
    hours: regularHours("07:00:00", "17:00:00"),
    price: 100000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "thien-nhien-va-cong-vien",
    name: "Há»“ Tuyá»n LÃ¢m",
    slug: "ho-tuyen-lam",
    shortDescription: "Há»“ nÆ°á»›c vÃ  cáº£nh quan rá»«ng thÃ´ng á»Ÿ phÃ­a nam ÄÃ  Láº¡t.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. PhÃ¹ há»£p ngáº¯m cáº£nh, nghá»‰ ngÆ¡i vÃ  káº¿t há»£p cÃ¡c Ä‘iá»ƒm lÃ¢n cáº­n.",
    addressLine: "Khu vá»±c Há»“ Tuyá»n LÃ¢m",
    latitude: "11.903000",
    longitude: "108.422000",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n tiá»‡n ngáº¯m cáº£nh vÃ  di chuyá»ƒn ven há»“.",
    hours: alwaysOpenHours(),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "tam-linh",
    name: "Thiá»n viá»‡n TrÃºc LÃ¢m",
    slug: "thien-vien-truc-lam-da-lat",
    shortDescription: "KhÃ´ng gian thiá»n viá»‡n náº±m gáº§n Há»“ Tuyá»n LÃ¢m.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Du khÃ¡ch cáº§n giá»¯ yÃªn tÄ©nh, trang phá»¥c phÃ¹ há»£p vÃ  tÃ´n trá»ng sinh hoáº¡t tÃ´n giÃ¡o.",
    addressLine: "ÄÆ°á»ng TrÃºc LÃ¢m YÃªn Tá»­",
    latitude: "11.903800",
    longitude: "108.433000",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "Buá»•i sÃ¡ng mÃ¹a khÃ´ thÆ°á»ng cÃ³ thá»i tiáº¿t thuáº­n tiá»‡n vÃ  khÃ´ng gian yÃªn tÄ©nh.",
    hours: regularHours("07:00:00", "17:00:00"),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "vui-choi-va-trai-nghiem",
    name: "Thung lÅ©ng TÃ¬nh YÃªu",
    slug: "thung-lung-tinh-yeu",
    shortDescription: "Khu tham quan cáº£nh quan vÃ  hoáº¡t Ä‘á»™ng giáº£i trÃ­ táº¡i ÄÃ  Láº¡t.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. GiÃ¡ vÃ© vÃ  dá»‹ch vá»¥ thá»±c táº¿ cÃ³ thá»ƒ thay Ä‘á»•i theo thá»i Ä‘iá»ƒm.",
    addressLine: "7 Mai Anh ÄÃ o",
    latitude: "12.000500",
    longitude: "108.449100",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ phÃ¹ há»£p tham quan cáº£nh quan ngoÃ i trá»i.",
    hours: regularHours("07:00:00", "17:00:00"),
    price: 250000,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "cho-va-am-thuc",
    name: "Chá»£ ÄÃ  Láº¡t",
    slug: "cho-da-lat",
    shortDescription: "Chá»£ trung tÃ¢m vá»›i nÃ´ng sáº£n, Ä‘áº·c sáº£n vÃ  hoáº¡t Ä‘á»™ng áº©m thá»±c.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. CÃ³ thá»ƒ káº¿t há»£p mua sáº¯m, khÃ¡m phÃ¡ áº©m thá»±c vÃ  tham quan khu trung tÃ¢m.",
    addressLine: "ÄÆ°á»ng Nguyá»…n Thá»‹ Minh Khai",
    latitude: "11.940300",
    longitude: "108.436200",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "CÃ³ thá»ƒ ghÃ© quanh nÄƒm; buá»•i tá»‘i thÆ°á»ng cÃ³ nhiá»u hoáº¡t Ä‘á»™ng áº©m thá»±c.",
    hours: regularHours("06:00:00", "22:00:00"),
    price: 0,
  },
  {
    provinceCode: "LAM_DONG",
    categorySlug: "tam-linh",
    name: "NhÃ  thá» Domaine de Marie",
    slug: "nha-tho-domaine-de-marie",
    shortDescription: "NhÃ  thá» cÃ³ kiáº¿n trÃºc ná»•i báº­t trong khÃ´ng gian Ä‘á»“i thÃ´ng ÄÃ  Láº¡t.",
    description:
      "Dá»¯ liá»‡u mÃ´ táº£ máº«u phá»¥c vá»¥ Ä‘á»“ Ã¡n VTripPlanner. Du khÃ¡ch cáº§n tÃ´n trá»ng giá» lá»… vÃ  hoáº¡t Ä‘á»™ng tÃ´n giÃ¡o táº¡i Ä‘á»‹a Ä‘iá»ƒm.",
    addressLine: "1 NgÃ´ Quyá»n",
    latitude: "11.949800",
    longitude: "108.431800",
    bestVisitMonths: [11, 12, 1, 2, 3, 4],
    seasonNote: "MÃ¹a khÃ´ thuáº­n tiá»‡n tham quan khuÃ´n viÃªn vÃ  chá»¥p áº£nh bÃªn ngoÃ i.",
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
    [placeId, "GiÃ¡ tham kháº£o", "GENERAL", "ENTRY"],
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
      "GiÃ¡ tham kháº£o",
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
        AND prices."label" = 'GiÃ¡ tham kháº£o'
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
    throw new Error(`Káº¿t quáº£ seed khÃ´ng Ä‘Ãºng mong Ä‘á»£i: ${JSON.stringify(counts)}`);
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
        throw new Error(`KhÃ´ng tÃ¬m tháº¥y khÃ³a ngoáº¡i cho Ä‘á»‹a Ä‘iá»ƒm ${place.slug}.`);
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
    console.error("Seed Ä‘á»‹a Ä‘iá»ƒm tháº¥t báº¡i.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
