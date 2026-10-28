import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const tpCols = await client.query("SELECT column_name, data_type, is_nullable, udt_name FROM information_schema.columns WHERE table_name = 'travel_posts' ORDER BY ordinal_position");
  console.log('travel_posts cols:', tpCols.rows);

  const tpmCols = await client.query("SELECT column_name, data_type, is_nullable, udt_name FROM information_schema.columns WHERE table_name = 'travel_post_media' ORDER BY ordinal_position");
  console.log('travel_post_media cols:', tpmCols.rows);

  const tppCols = await client.query("SELECT column_name, data_type, is_nullable, udt_name FROM information_schema.columns WHERE table_name = 'travel_post_places' ORDER BY ordinal_position");
  console.log('travel_post_places cols:', tppCols.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
