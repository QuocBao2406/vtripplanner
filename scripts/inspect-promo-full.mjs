import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const promoCols = await client.query("SELECT column_name, data_type, is_nullable, udt_name FROM information_schema.columns WHERE table_name = 'promotions' ORDER BY ordinal_position");
  console.log('promotions cols:', promoCols.rows);

  const promoEnums = await client.query("SELECT enum_range(NULL::\"PromotionStatus\"), enum_range(NULL::\"DiscountType\")");
  console.log('promo enums:', promoEnums.rows);

  const ppCols = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'promotion_places' ORDER BY ordinal_position");
  console.log('promotion_places cols:', ppCols.rows);

  const vcCols = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'voucher_claims' ORDER BY ordinal_position");
  console.log('voucher_claims cols:', vcCols.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
