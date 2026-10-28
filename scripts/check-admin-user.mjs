import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const r = await client.query(`
    SELECT u.id, u.email, u."isActive", u."deletedAt", ro.name, ro."isActive" as role_active 
    FROM users u
    JOIN user_roles ur ON u.id = ur."userId"
    JOIN roles ro ON ur."roleId" = ro.id
    WHERE u.id = '15d6690f-9d5e-42fc-9e5e-fc6ed35735cc'
  `);
  console.log('Admin check result:', r.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
