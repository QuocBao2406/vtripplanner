import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  const summary = await client.query(`
    SELECT
      (SELECT count(*) FROM places) as total_places,
      (SELECT count(*) FROM place_images) as total_place_images,
      (SELECT count(*) FROM travel_posts) as total_travel_posts,
      (SELECT count(*) FROM travel_post_media) as total_post_media,
      (SELECT count(*) FROM travel_post_places) as total_post_places,
      (SELECT count(*) FROM travel_post_reactions) as total_post_reactions,
      (SELECT count(*) FROM travel_post_comments) as total_post_comments,
      (SELECT count(*) FROM partners) as total_partners,
      (SELECT count(*) FROM promotions) as total_promotions,
      (SELECT count(*) FROM voucher_claims) as total_voucher_claims
  `);
  console.log('--- DATABASE DATA SUMMARY AFTER SEEDING ---');
  console.table(summary.rows);

  const samplePosts = await client.query(`
    SELECT tp.id, tp.headline, tp.status, tp.type, up."fullName" as author,
           (SELECT count(*) FROM travel_post_media tpm WHERE tpm."postId" = tp.id) as media_count
    FROM travel_posts tp
    JOIN users u ON u.id = tp."authorUserId"
    JOIN user_profiles up ON up."userId" = u.id
    ORDER BY tp."createdAt" DESC
    LIMIT 5
  `);
  console.log('Sample Recent Posts:');
  console.table(samplePosts.rows);

  const sampleVouchers = await client.query(`
    SELECT p.id, p.title, p."discountType", p."discountValue", p.status, part.name as partner_name
    FROM promotions p
    JOIN partners part ON part.id = p."partnerId"
    LIMIT 5
  `);
  console.log('Sample Vouchers:');
  console.table(sampleVouchers.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
