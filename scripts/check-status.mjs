import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    const userCount = await client.query("SELECT id, email FROM users;");
    console.log("Users:", userCount.rows);

    const partnerCount = await client.query("SELECT id, name, slug, \"approvalStatus\", \"ownerUserId\" FROM partners;");
    console.log("Partners:", partnerCount.rows);

    const placeCount = await client.query("SELECT count(*)::int as count FROM places;");
    console.log("Total Places:", placeCount.rows[0].count);

    const postCount = await client.query("SELECT count(*)::int as count FROM travel_posts;");
    console.log("Total Posts:", postCount.rows[0].count);

    const promoCount = await client.query("SELECT count(*)::int as count FROM promotions;");
    console.log("Total Promotions:", promoCount.rows[0].count);

    const provinces = await client.query("SELECT id, code, name, slug FROM provinces ORDER BY name;");
    console.log("Provinces:", provinces.rows);

    const categories = await client.query("SELECT id, name, slug FROM place_categories ORDER BY name;");
    console.log("Categories:", categories.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
