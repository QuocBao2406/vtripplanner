import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DIRECT_URL hoac DATABASE_URL chua duoc cau hinh trong .env.local.",
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

const POSTS = [
  {
    id: "b6b95ac1-eeed-58b8-9975-8d493bd6d93a",
    type: "SEASONAL_GUIDE",
    headline: "Tháng 8 ở Đà Lạt: đi đâu để tận hưởng không khí mát lành?",
    caption:
      "Tháng 8 là lúc Đà Lạt có những ngày se lạnh, nhiều mảng xanh và rất hợp cho một chuyến đi chậm. Bạn có thể bắt đầu buổi sáng quanh Hồ Tuyền Lâm, ghé Ga Đà Lạt rồi dành buổi tối khám phá khu Chợ Đà Lạt. Nếu bạn đang lên lịch cho tháng này, hãy lưu lại những nơi khiến bạn thấy hứng thú.",
    seasonMonths: [8],
    publishedAt: "2026-08-07T02:00:00.000Z",
    placeSlugs: ["ho-tuyen-lam", "ga-da-lat", "cho-da-lat"],
  },
  {
    id: "d3ee1c90-62e4-5614-8c9a-a063bd42ab56",
    type: "SEASONAL_GUIDE",
    headline: "Tháng 8 ở Sài Gòn: một ngày vừa xanh vừa nhộn nhịp",
    caption:
      "Nếu ở TP.HCM trong tháng 8, bạn có thể chọn một lịch trình nhẹ nhàng: đi Thảo Cầm Viên vào buổi sáng, dạo Bến Bạch Đằng khi chiều xuống và kết thúc ngày ở phố đi bộ Nguyễn Huệ. Đây là kiểu chuyến đi ngắn phù hợp khi bạn muốn đổi không khí mà không cần đi quá xa.",
    seasonMonths: [8],
    publishedAt: "2026-08-06T03:30:00.000Z",
    placeSlugs: [
      "thao-cam-vien-sai-gon",
      "cong-vien-ben-bach-dang",
      "pho-di-bo-nguyen-hue",
    ],
  },
  {
    id: "ee78eaad-5244-5e89-b24e-d4920fedcda3",
    type: "EVERGREEN_GUIDE",
    headline: "Chợ Đà Lạt về đêm có gì khiến người ta muốn quay lại?",
    caption:
      "Không nhất thiết phải chờ đúng một mùa nào đó mới ghé Chợ Đà Lạt. Buổi tối ở đây có ánh đèn, đồ ăn nóng, nhịp người qua lại và cảm giác rất riêng của trung tâm thành phố. Đây là một điểm dễ thêm vào lịch trình nếu bạn muốn có một khoảng thời gian tự do để đi bộ, ăn uống và cảm nhận Đà Lạt.",
    seasonMonths: [],
    publishedAt: "2026-08-03T12:00:00.000Z",
    placeSlugs: ["cho-da-lat"],
  },
  {
    id: "01c0ee25-eb9b-57e1-ad7b-b8b47f31a6c9",
    type: "PROMOTED",
    headline: "Một buổi sáng chậm bên Hồ Tuyền Lâm",
    caption:
      "Nếu chuyến đi của bạn cần một khoảng thời gian yên tĩnh, Hồ Tuyền Lâm là gợi ý đáng cân nhắc. Không gian rộng, nhiều góc nhìn ra mặt nước và phù hợp để bắt đầu ngày mới trước khi tiếp tục khám phá Đà Lạt. Bài giới thiệu nổi bật này được VTripPlanner đưa vào feed để giúp bạn có thêm ý tưởng cho lịch trình.",
    seasonMonths: [8, 9],
    publishedAt: "2026-08-05T01:30:00.000Z",
    placeSlugs: ["ho-tuyen-lam"],
  },
];

const allPlaceSlugs = [...new Set(POSTS.flatMap((post) => post.placeSlugs))];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadPlaces(client) {
  const result = await client.query(
    `
      SELECT
        id,
        name,
        slug
      FROM places
      WHERE slug = ANY($1::text[])
        AND "isActive" = TRUE
        AND "deletedAt" IS NULL
        AND "verificationStatus" = 'VERIFIED'
      ORDER BY slug
    `,
    [allPlaceSlugs],
  );

  return new Map(result.rows.map((row) => [row.slug, row]));
}

async function upsertPost(client, post) {
  await client.query(
    `
      INSERT INTO travel_posts (
        id,
        "authorUserId",
        type,
        status,
        headline,
        caption,
        "seasonMonths",
        "publishedAt",
        "createdAt",
        "updatedAt",
        "deletedAt"
      )
      VALUES (
        $1::uuid,
        NULL,
        $2::"TravelPostType",
        'PUBLISHED'::"TravelPostStatus",
        $3,
        $4,
        $5::integer[],
        $6::timestamptz,
        $6::timestamptz,
        NOW(),
        NULL
      )
      ON CONFLICT (id)
      DO UPDATE SET
        "authorUserId" = NULL,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        headline = EXCLUDED.headline,
        caption = EXCLUDED.caption,
        "seasonMonths" = EXCLUDED."seasonMonths",
        "publishedAt" = EXCLUDED."publishedAt",
        "updatedAt" = NOW(),
        "deletedAt" = NULL
    `,
    [
      post.id,
      post.type,
      post.headline,
      post.caption,
      post.seasonMonths,
      post.publishedAt,
    ],
  );
}

async function upsertPostPlace(client, postId, placeId, sortOrder) {
  await client.query(
    `
      INSERT INTO travel_post_places (
        "postId",
        "placeId",
        "isPrimary",
        "sortOrder",
        "createdAt"
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        NOW()
      )
      ON CONFLICT ("postId", "placeId")
      DO UPDATE SET
        "isPrimary" = EXCLUDED."isPrimary",
        "sortOrder" = EXCLUDED."sortOrder"
    `,
    [postId, placeId, sortOrder === 0, sortOrder],
  );
}

async function verifySeed(client) {
  const postIds = POSTS.map((post) => post.id);

  const postResult = await client.query(
    `
      SELECT
        id,
        type::text AS type,
        status::text AS status,
        headline,
        "seasonMonths"
      FROM travel_posts
      WHERE id = ANY($1::uuid[])
      ORDER BY "publishedAt" DESC, id
    `,
    [postIds],
  );

  const linkResult = await client.query(
    `
      SELECT
        "postId",
        COUNT(*)::int AS "placeCount"
      FROM travel_post_places
      WHERE "postId" = ANY($1::uuid[])
      GROUP BY "postId"
      ORDER BY "postId"
    `,
    [postIds],
  );

  const augustResult = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM travel_posts
      WHERE id = ANY($1::uuid[])
        AND status = 'PUBLISHED'
        AND type = 'SEASONAL_GUIDE'
        AND 8 = ANY("seasonMonths")
    `,
    [postIds],
  );

  const evergreenResult = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM travel_posts
      WHERE id = ANY($1::uuid[])
        AND status = 'PUBLISHED'
        AND type = 'EVERGREEN_GUIDE'
        AND COALESCE(array_length("seasonMonths", 1), 0) = 0
    `,
    [postIds],
  );

  const promotedResult = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM travel_posts
      WHERE id = ANY($1::uuid[])
        AND status = 'PUBLISHED'
        AND type = 'PROMOTED'
    `,
    [postIds],
  );

  assert(
    postResult.rows.length === POSTS.length,
    `Expected ${POSTS.length} seeded posts, found ${postResult.rows.length}.`,
  );

  const linkCountByPostId = new Map(
    linkResult.rows.map((row) => [row.postId, row.placeCount]),
  );

  for (const post of POSTS) {
    const actualPlaceCount = linkCountByPostId.get(post.id) ?? 0;

    assert(
      actualPlaceCount === post.placeSlugs.length,
      `Post ${post.id} expected ${post.placeSlugs.length} place links, found ${actualPlaceCount}.`,
    );
  }

  assert(
    augustResult.rows[0]?.count === 2,
    "Expected exactly 2 August seasonal guide posts.",
  );

  assert(
    evergreenResult.rows[0]?.count === 1,
    "Expected exactly 1 evergreen guide post.",
  );

  assert(
    promotedResult.rows[0]?.count === 1,
    "Expected exactly 1 promoted post.",
  );

  console.log("");
  console.log("=== SOCIAL FEED SEED VERIFICATION ===");

  for (const row of postResult.rows) {
    const months =
      row.seasonMonths.length > 0 ? row.seasonMonths.join(",") : "all-year";

    console.log(
      `- ${row.type} | ${row.status} | months=${months} | ${row.headline}`,
    );
  }

  console.log("");
  console.log("August seasonal posts: 2");
  console.log("Evergreen posts: 1");
  console.log("Promoted posts: 1");
  console.log("User reactions seeded: 0");
  console.log("User comments seeded: 0");
  console.log("Fake user posts seeded: 0");
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const placeBySlug = await loadPlaces(client);

    const missingPlaceSlugs = allPlaceSlugs.filter(
      (slug) => !placeBySlug.has(slug),
    );

    if (missingPlaceSlugs.length > 0) {
      throw new Error(
        `Missing VERIFIED active places: ${missingPlaceSlugs.join(", ")}`,
      );
    }

    console.log("=== RESOLVED PLACE LINKS ===");

    for (const slug of allPlaceSlugs) {
      const place = placeBySlug.get(slug);
      console.log(`- ${slug}: ${place.name}`);
    }

    for (const post of POSTS) {
      await upsertPost(client, post);

      for (const [index, slug] of post.placeSlugs.entries()) {
        const place = placeBySlug.get(slug);

        await upsertPostPlace(client, post.id, place.id, index);
      }
    }

    await verifySeed(client);

    await client.query("COMMIT");

    console.log("");
    console.log("Social feed system seed completed.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("");
  console.error("Social feed seed failed.");
  console.error(error);
  process.exitCode = 1;
});
