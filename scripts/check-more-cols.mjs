import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const res = await client.query(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_name IN ('travel_post_reactions', 'travel_post_comments', 'voucher_claims', 'promotions')
  `);
  console.table(res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
