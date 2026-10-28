import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const prov = await client.query('SELECT id, name, code, slug FROM provinces ORDER BY name');
  console.log('Provinces:', prov.rows);

  const cat = await client.query('SELECT id, name, slug FROM place_categories ORDER BY name');
  console.log('Categories:', cat.rows);

  const partner = await client.query('SELECT id, name, "userId", "approvalStatus" FROM partners');
  console.log('Partners:', partner.rows);

  const places = await client.query('SELECT id, name, slug, "provinceId" FROM places ORDER BY name');
  console.log('Current places count:', places.rows.length);

  client.release();
  await pool.end();
}

main().catch(console.error);
