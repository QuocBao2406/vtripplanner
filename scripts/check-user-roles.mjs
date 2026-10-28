import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const r = await client.query(`
    SELECT u.id, u.email, ro.name as role_name 
    FROM users u 
    LEFT JOIN user_roles ur ON u.id = ur."userId" 
    LEFT JOIN roles ro ON ur."roleId" = ro.id
  `);
  console.log('User roles in DB:', r.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
