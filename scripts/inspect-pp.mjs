import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const pp = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'promotion_places' ORDER BY ordinal_position");
  console.log('promotion_places cols:', pp.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
