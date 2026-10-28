import pg from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });

async function check() {
  const users = await pool.query('SELECT id, email FROM users');
  console.log('Users:', users.rows);
  const partners = await pool.query('SELECT id, name, slug, "ownerUserId", "approvalStatus" FROM partners');
  console.log('Partners:', partners.rows);
  const samplePlace = await pool.query('SELECT * FROM places LIMIT 1');
  console.log('Sample place:', samplePlace.rows[0]);
  const placeImages = await pool.query('SELECT "placeId", "storagePath", "isCover" FROM place_images');
  console.log('Total place images in DB:', placeImages.rows.length);
  console.log('Sample place images:', placeImages.rows.slice(0, 5));
  await pool.end();
}

check().catch(console.error);
