import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'places'
    ORDER BY ordinal_position
  `);
  console.log('places table columns:');
  console.table(cols.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
