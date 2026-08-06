import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!connectionString) {
  throw new Error(
    "DIRECT_URL hoặc DATABASE_URL chưa được cấu hình trong .env.local.",
  );
}

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL chưa được cấu hình trong .env.local.",
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

const bucketName = "place-images";

const categoryImageBySlug = {
  "lich-su-va-bao-tang": "categories/history-museum.png",
  "kien-truc-va-van-hoa": "categories/architecture-culture.png",
  "thien-nhien-va-cong-vien": "categories/nature-park.png",
  "vui-choi-va-trai-nghiem": "categories/entertainment-experience.png",
  "cho-va-am-thuc": "categories/market-food.png",
  "tam-linh": "categories/spiritual.png",
};

const cityImageByProvinceCode = {
  HCM: "cities/ho-chi-minh-city.png",
  LAM_DONG: "cities/da-lat.png",
};

const placeSlugs = [
  "dinh-doc-lap",
  "bao-tang-chung-tich-chien-tranh",
  "bao-tang-thanh-pho-ho-chi-minh",
  "buu-dien-trung-tam-sai-gon",
  "nha-tho-duc-ba-sai-gon",
  "cho-ben-thanh",
  "thao-cam-vien-sai-gon",
  "pho-di-bo-nguyen-hue",
  "ben-nha-rong",
  "chua-ngoc-hoang",
  "cong-vien-ben-bach-dang",
  "duong-sach-thanh-pho-ho-chi-minh",
  "ho-xuan-huong-da-lat",
  "quang-truong-lam-vien",
  "vuon-hoa-thanh-pho-da-lat",
  "ga-da-lat",
  "dinh-bao-dai-iii",
  "biet-thu-hang-nga",
  "thac-datanla",
  "ho-tuyen-lam",
  "thien-vien-truc-lam-da-lat",
  "thung-lung-tinh-yeu",
  "cho-da-lat",
  "nha-tho-domaine-de-marie",
];

const storagePaths = [
  ...Object.values(categoryImageBySlug),
  ...Object.values(cityImageByProvinceCode),
];

function getPublicImageUrl(storagePath) {
  const normalizedBaseUrl = supabaseUrl.replace(/\/$/, "");
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBaseUrl}/storage/v1/object/public/${bucketName}/${encodedPath}`;
}

async function verifyStorageObjects() {
  for (const storagePath of storagePaths) {
    const response = await fetch(getPublicImageUrl(storagePath), {
      method: "GET",
      headers: {
        Range: "bytes=0-0",
      },
    });

    try {
      if (!response.ok) {
        throw new Error(
          `Không thể đọc ${storagePath}. HTTP ${response.status}.`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().startsWith("image/png")) {
        throw new Error(
          `${storagePath} không trả về MIME image/png. Nhận được: ${contentType || "không xác định"}.`,
        );
      }
    } finally {
      await response.body?.cancel();
    }
  }
}

async function loadSeedPlaces(client) {
  const result = await client.query(
    `
      SELECT
        places.id,
        places.name,
        places.slug,
        provinces.code AS "provinceCode",
        provinces.name AS "provinceName",
        place_categories.slug AS "categorySlug",
        place_categories.name AS "categoryName"
      FROM public.places AS places
      JOIN public.provinces AS provinces
        ON provinces.id = places."provinceId"
      JOIN public.place_categories AS place_categories
        ON place_categories.id = places."categoryId"
      WHERE places.slug = ANY($1::text[])
      ORDER BY places.slug;
    `,
    [placeSlugs],
  );

  if (result.rows.length !== 24) {
    throw new Error(
      `Cần đúng 24 địa điểm mẫu trước khi liên kết ảnh. Hiện tìm thấy ${result.rows.length}.`,
    );
  }

  const returnedSlugs = new Set(result.rows.map((place) => place.slug));
  const missingSlugs = placeSlugs.filter((slug) => !returnedSlugs.has(slug));

  if (missingSlugs.length > 0) {
    throw new Error(
      `Thiếu địa điểm mẫu: ${missingSlugs.join(", ")}.`,
    );
  }

  return result.rows;
}

async function upsertPlaceImage(client, image) {
  const existing = await client.query(
    `
      SELECT id
      FROM public.place_images
      WHERE "placeId" = $1
        AND "storagePath" = $2
      ORDER BY "createdAt", id;
    `,
    [image.placeId, image.storagePath],
  );

  if (existing.rows.length > 1) {
    throw new Error(
      `Phát hiện dữ liệu ảnh trùng cho placeId=${image.placeId}, storagePath=${image.storagePath}. Không tự động xóa dữ liệu.`,
    );
  }

  if (existing.rows.length === 1) {
    await client.query(
      `
        UPDATE public.place_images
        SET
          "altText" = $2,
          caption = $3,
          "sortOrder" = $4,
          "isCover" = $5,
          "updatedAt" = now()
        WHERE id = $1;
      `,
      [
        existing.rows[0].id,
        image.altText,
        image.caption,
        image.sortOrder,
        image.isCover,
      ],
    );

    return "updated";
  }

  await client.query(
    `
      INSERT INTO public.place_images (
        "placeId",
        "storagePath",
        "altText",
        caption,
        "sortOrder",
        "isCover",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, now(), now());
    `,
    [
      image.placeId,
      image.storagePath,
      image.altText,
      image.caption,
      image.sortOrder,
      image.isCover,
    ],
  );

  return "inserted";
}

async function verifyImageLinks(client) {
  const duplicateResult = await client.query(
    `
      SELECT
        "placeId",
        "storagePath",
        count(*)::integer AS count
      FROM public.place_images
      WHERE "storagePath" = ANY($1::text[])
      GROUP BY "placeId", "storagePath"
      HAVING count(*) > 1;
    `,
    [storagePaths],
  );

  if (duplicateResult.rows.length > 0) {
    throw new Error(
      "Phát hiện liên kết ảnh mẫu bị trùng sau khi seed.",
    );
  }

  const perPlaceResult = await client.query(
    `
      SELECT
        places.slug,
        count(images.id)::integer AS "imageCount",
        count(images.id) FILTER (WHERE images."isCover")::integer AS "coverCount"
      FROM public.places AS places
      LEFT JOIN public.place_images AS images
        ON images."placeId" = places.id
       AND images."storagePath" = ANY($2::text[])
      WHERE places.slug = ANY($1::text[])
      GROUP BY places.slug
      ORDER BY places.slug;
    `,
    [placeSlugs, storagePaths],
  );

  const invalidPlaces = perPlaceResult.rows.filter(
    (row) => row.imageCount !== 2 || row.coverCount !== 1,
  );

  if (perPlaceResult.rows.length !== 24 || invalidPlaces.length > 0) {
    throw new Error(
      `Liên kết ảnh theo địa điểm không đúng: ${JSON.stringify(invalidPlaces)}.`,
    );
  }

  const totalResult = await client.query(
    `
      SELECT count(*)::integer AS count
      FROM public.place_images AS images
      JOIN public.places AS places
        ON places.id = images."placeId"
      WHERE places.slug = ANY($1::text[])
        AND images."storagePath" = ANY($2::text[]);
    `,
    [placeSlugs, storagePaths],
  );

  return totalResult.rows[0].count;
}

async function main() {
  console.log("=== KIEM TRA 8 ANH STORAGE CONG KHAI ===");
  await verifyStorageObjects();
  console.log("Da doc thanh cong 8/8 anh PNG tu bucket place-images.");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('vtripplanner:seed:place-images:v1'));",
    );

    const places = await loadSeedPlaces(client);
    let insertedCount = 0;
    let updatedCount = 0;

    for (const place of places) {
      const categoryStoragePath = categoryImageBySlug[place.categorySlug];
      const cityStoragePath = cityImageByProvinceCode[place.provinceCode];

      if (!categoryStoragePath) {
        throw new Error(
          `Không có ảnh cho danh mục ${place.categorySlug}.`,
        );
      }

      if (!cityStoragePath) {
        throw new Error(
          `Không có ảnh cho tỉnh/thành ${place.provinceCode}.`,
        );
      }

      const images = [
        {
          placeId: place.id,
          storagePath: categoryStoragePath,
          altText: `${place.name} - ảnh minh họa danh mục ${place.categoryName}`,
          caption: `Ảnh minh họa theo danh mục ${place.categoryName}; dữ liệu mẫu phục vụ đồ án VTripPlanner.`,
          sortOrder: 0,
          isCover: true,
        },
        {
          placeId: place.id,
          storagePath: cityStoragePath,
          altText: `${place.name} - ảnh minh họa điểm đến ${place.provinceName}`,
          caption: `Ảnh minh họa điểm đến ${place.provinceName}; dữ liệu mẫu phục vụ đồ án VTripPlanner.`,
          sortOrder: 1,
          isCover: false,
        },
      ];

      for (const image of images) {
        const result = await upsertPlaceImage(client, image);
        if (result === "inserted") {
          insertedCount += 1;
        } else {
          updatedCount += 1;
        }
      }
    }

    const linkedImageCount = await verifyImageLinks(client);
    await client.query("COMMIT");

    console.log("=== KET QUA LIEN KET ANH DIA DIEM ===");
    console.log(`Dia diem mau: ${places.length}`);
    console.log(`Lien ket anh mau: ${linkedImageCount}`);
    console.log(`Lien ket moi: ${insertedCount}`);
    console.log(`Lien ket cap nhat: ${updatedCount}`);
    console.log("Moi dia diem co 2 anh mau va dung 1 anh bia.");
    console.log("Seed co the chay lai an toan bang npm run seed:place-images.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Seed liên kết ảnh địa điểm thất bại.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
