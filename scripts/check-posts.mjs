import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const posts = await client.query('SELECT count(*) FROM travel_posts');
  console.log('Total travel posts:', posts.rows[0].count);

  const media = await client.query('SELECT count(*) FROM travel_post_media');
  console.log('Total travel post media:', media.rows[0].count);

  const sample = await client.query('SELECT id, headline, type, status, "deletedAt" FROM travel_posts LIMIT 5');
  console.log('Sample posts:', sample.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
