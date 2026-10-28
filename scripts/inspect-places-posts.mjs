import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();

  const countPlaces = await client.query('SELECT count(*) FROM places');
  console.log('Total places:', countPlaces.rows[0].count);

  const placesWithImages = await client.query(`
    SELECT p.id, p.name, p.slug, prov.name as prov_name, cat.name as cat_name, count(pi.id) as img_count
    FROM places p
    JOIN provinces prov ON prov.id = p."provinceId"
    JOIN place_categories cat ON cat.id = p."categoryId"
    LEFT JOIN place_images pi ON pi."placeId" = p.id
    GROUP BY p.id, p.name, p.slug, prov.name, cat.name
    ORDER BY p.name ASC
  `);
  console.log('Places details (first 10):', placesWithImages.rows.slice(0, 10));
  console.log('Places with 0 images:', placesWithImages.rows.filter(r => Number(r.img_count) === 0).length);

  const posts = await client.query(`
    SELECT tp.id, tp.headline, count(tpm.id) as media_count
    FROM travel_posts tp
    LEFT JOIN travel_post_media tpm ON tpm."postId" = tp.id
    GROUP BY tp.id, tp.headline
  `);
  console.log('Total travel posts:', posts.rows.length);
  console.log('Posts details:', posts.rows);

  const cats = await client.query('SELECT id, name, slug FROM place_categories');
  console.log('Categories:', cats.rows);

  const provs = await client.query('SELECT id, name, slug FROM provinces');
  console.log('Provinces:', provs.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
