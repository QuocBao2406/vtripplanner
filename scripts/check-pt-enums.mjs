import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const pt = await client.query("SELECT enum_range(NULL::\"PartnerType\")");
  console.log('PartnerType enums:', pt.rows[0].enum_range);

  const pas = await client.query("SELECT enum_range(NULL::\"PartnerApprovalStatus\")");
  console.log('PartnerApprovalStatus enums:', pas.rows[0].enum_range);

  client.release();
  await pool.end();
}

main().catch(console.error);
