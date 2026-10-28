import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    const provRes = await client.query('SELECT id, name, slug FROM "provinces"');
    console.log("Provinces:", provRes.rows);

    const catRes = await client.query('SELECT id, name, slug FROM "place_categories"');
    console.log("Categories:", catRes.rows);

    const placesRes = await client.query('SELECT count(*) FROM "places"');
    console.log("Total places:", placesRes.rows[0].count);

    const postsRes = await client.query('SELECT count(*) FROM "travel_posts"');
    console.log("Total travel posts:", postsRes.rows[0].count);

    const mediaRes = await client.query('SELECT count(*) FROM "travel_post_media"');
    console.log("Total travel post media:", mediaRes.rows[0].count);

    const promoRes = await client.query('SELECT count(*) FROM "promotions"');
    console.log("Total promotions:", promoRes.rows[0].count);

    const userRoles = await client.query(`
      SELECT ur."userId", u.email, r.code 
      FROM "user_roles" ur 
      JOIN "users" u ON u.id = ur."userId"
      JOIN "roles" r ON r.id = ur."roleId"
    `);
    console.log("User roles:", userRoles.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
