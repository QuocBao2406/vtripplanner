import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const partnerCols = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'partners' ORDER BY ordinal_position");
  console.log('partners columns:', partnerCols.rows);

  const partners = await client.query("SELECT * FROM partners");
  console.log('partners rows:', partners.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
