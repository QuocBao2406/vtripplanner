import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const res = await client.query(`
    SELECT enumlabel
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE typname = 'PlaceVerificationStatus'
    ORDER BY enumsortorder
  `);
  console.log('PlaceVerificationStatus values:', res.rows);

  const existingPlaces = await client.query(`SELECT DISTINCT "verificationStatus" FROM places`);
  console.log('Distinct verificationStatus in places:', existingPlaces.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
