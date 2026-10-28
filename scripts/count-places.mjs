import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const places = await client.query('SELECT count(*) FROM places');
  console.log('Total places:', places.rows[0].count);

  const images = await client.query('SELECT count(*) FROM place_images');
  console.log('Total place images:', images.rows[0].count);

  const sample = await client.query('SELECT p.name, pi."storagePath", pi."isCover" FROM places p LEFT JOIN place_images pi ON p.id = pi."placeId" LIMIT 10');
  console.log('Sample images:', sample.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
