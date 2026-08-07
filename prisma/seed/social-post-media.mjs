import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
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

const MEDIA = [
  {
    id: "9b80f73e-6b8e-5c7f-8be1-98f52c746301",
    postId: "b6b95ac1-eeed-58b8-9975-8d493bd6d93a",
    storagePath: "/images/social-feed/da-lat-august.jpg",
    localPath: "public/images/social-feed/da-lat-august.jpg",
    altText: "Phong cảnh hồ và đồi núi xanh ở Đà Lạt",
  },
  {
    id: "9b80f73e-6b8e-5c7f-8be1-98f52c746302",
    postId: "d3ee1c90-62e4-5614-8c9a-a063bd42ab56",
    storagePath: "/images/social-feed/saigon-nguyen-hue.jpg",
    localPath: "public/images/social-feed/saigon-nguyen-hue.jpg",
    altText: "Không gian đô thị và vỉa hè trung tâm Thành phố Hồ Chí Minh",
  },
  {
    id: "9b80f73e-6b8e-5c7f-8be1-98f52c746303",
    postId: "ee78eaad-5244-5e89-b24e-d4920fedcda3",
    storagePath: "/images/social-feed/cho-da-lat-night.jpg",
    localPath: "public/images/social-feed/cho-da-lat-night.jpg",
    altText: "Quầy hàng buổi tối tại Chợ Đà Lạt",
  },
  {
    id: "9b80f73e-6b8e-5c7f-8be1-98f52c746304",
    postId: "01c0ee25-eb9b-57e1-ad7b-b8b47f31a6c9",
    storagePath: "/images/vtripplanner-hero-tuyen-lam.jpg",
    localPath: "public/images/vtripplanner-hero-tuyen-lam.jpg",
    altText: "Phong cảnh Hồ Tuyền Lâm tại Đà Lạt",
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function resolveFileSize(localPath) {
  const absolutePath = path.resolve(process.cwd(), localPath);
  const stats = await fs.stat(absolutePath);

  assert(stats.isFile(), `Media path is not a file: ${localPath}`);
  assert(stats.size > 100_000, `Media file is too small: ${localPath}`);

  return stats.size;
}

async function verifyPosts(client) {
  const postIds = MEDIA.map((item) => item.postId);

  const result = await client.query(
    `
      SELECT id
      FROM travel_posts
      WHERE id = ANY($1::uuid[])
        AND status = 'PUBLISHED'
        AND "deletedAt" IS NULL
    `,
    [postIds],
  );

  assert(
    result.rows.length === postIds.length,
    `Expected ${postIds.length} published posts, found ${result.rows.length}.`,
  );
}

async function upsertMedia(client, item, fileSizeBytes) {
  await client.query(
    `
      INSERT INTO travel_post_media (
        id,
        "postId",
        type,
        "storagePath",
        "mimeType",
        "fileSizeBytes",
        "durationSeconds",
        "altText",
        "sortOrder",
        "createdAt"
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        'IMAGE'::"TravelPostMediaType",
        $3,
        'image/jpeg',
        $4,
        NULL,
        $5,
        0,
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        "postId" = EXCLUDED."postId",
        type = EXCLUDED.type,
        "storagePath" = EXCLUDED."storagePath",
        "mimeType" = EXCLUDED."mimeType",
        "fileSizeBytes" = EXCLUDED."fileSizeBytes",
        "durationSeconds" = NULL,
        "altText" = EXCLUDED."altText",
        "sortOrder" = EXCLUDED."sortOrder"
    `,
    [
      item.id,
      item.postId,
      item.storagePath,
      fileSizeBytes,
      item.altText,
    ],
  );
}

async function verifyMedia(client) {
  const mediaIds = MEDIA.map((item) => item.id);

  const result = await client.query(
    `
      SELECT
        id,
        "postId",
        type::text AS type,
        "storagePath",
        "mimeType",
        "fileSizeBytes",
        "altText",
        "sortOrder"
      FROM travel_post_media
      WHERE id = ANY($1::uuid[])
      ORDER BY id
    `,
    [mediaIds],
  );

  assert(
    result.rows.length === MEDIA.length,
    `Expected ${MEDIA.length} media rows, found ${result.rows.length}.`,
  );

  for (const row of result.rows) {
    assert(row.type === "IMAGE", `Media ${row.id} is not IMAGE.`);
    assert(row.mimeType === "image/jpeg", `Media ${row.id} mime type is wrong.`);
    assert(row.fileSizeBytes > 100_000, `Media ${row.id} file size is too small.`);
    assert(row.sortOrder === 0, `Media ${row.id} sort order is not 0.`);
  }

  console.log("");
  console.log("=== SOCIAL POST MEDIA VERIFICATION ===");

  for (const row of result.rows) {
    console.log(
      `- ${row.postId} | ${row.type} | ${row.storagePath} | ${row.fileSizeBytes} bytes`,
    );
  }

  console.log("");
  console.log("System posts with seeded TravelPostMedia: 4");
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await verifyPosts(client);

    for (const item of MEDIA) {
      const fileSizeBytes = await resolveFileSize(item.localPath);
      await upsertMedia(client, item, fileSizeBytes);
    }

    await verifyMedia(client);

    await client.query("COMMIT");

    console.log("");
    console.log("Social post media seed completed.");
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
  console.error("Social post media seed failed.");
  console.error(error);
  process.exitCode = 1;
});
