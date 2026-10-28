import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const res = await client.query(`
    SELECT typname, enumlabel
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE typname IN ('TravelPostReactionType', 'TravelPostCommentStatus', 'VoucherClaimStatus')
    ORDER BY typname, enumsortorder
  `);
  console.log('Enums in DB:');
  console.table(res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
