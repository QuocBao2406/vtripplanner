import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const res = await client.query(`
    SELECT u.id, u.email, up."fullName", up."displayName", r.name as role_name
    FROM users u
    LEFT JOIN user_profiles up ON up."userId" = u.id
    LEFT JOIN user_roles ur ON ur."userId" = u.id
    LEFT JOIN roles r ON r.id = ur."roleId"
    ORDER BY u."createdAt" ASC
  `);
  console.log('Users in DB:');
  console.table(res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
