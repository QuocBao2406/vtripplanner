import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const partners = await client.query(`
    SELECT p.id, p."ownerUserId", p.name, p.slug, p."approvalStatus", u.email
    FROM partners p
    LEFT JOIN users u ON u.id = p."ownerUserId"
  `);
  console.log('Partners count:', partners.rows.length);
  console.log('Partners:', partners.rows);

  const promos = await client.query(`
    SELECT pr.id, pr."partnerId", pr.title, pr.status, pr."isActive", pr."discountType", pr."discountValue", p.name as partner_name
    FROM promotions pr
    LEFT JOIN partners p ON p.id = pr."partnerId"
  `);
  console.log('Promotions count:', promos.rows.length);
  console.log('Promotions:', promos.rows);

  const users = await client.query(`
    SELECT u.id, u.email, r.name as role_name
    FROM users u
    LEFT JOIN user_roles ur ON ur."userId" = u.id
    LEFT JOIN roles r ON r.id = ur."roleId"
    WHERE r.name = 'PARTNER'
  `);
  console.log('Partner users:', users.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
