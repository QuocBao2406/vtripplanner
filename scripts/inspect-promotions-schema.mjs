import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const enums = await client.query(`
    SELECT t.typname, e.enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname IN ('PromotionStatus', 'PromotionDiscountType', 'PartnerApprovalStatus', 'PartnerType') 
    ORDER BY t.typname, e.enumsortorder
  `);
  console.log(enums.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
