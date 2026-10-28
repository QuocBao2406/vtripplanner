import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();
  
  const categories = await client.query('SELECT id, name, slug FROM place_categories ORDER BY name');
  console.log('Categories count:', categories.rows.length);
  console.log('Categories:', categories.rows);

  const provinces = await client.query('SELECT id, name, slug, code FROM provinces ORDER BY name');
  console.log('Provinces count:', provinces.rows.length);

  const places = await client.query(`
    SELECT p.id, p.name, p.slug, p."provinceId", count(pi.id)::int as img_count
    FROM places p
    LEFT JOIN place_images pi ON pi."placeId" = p.id
    GROUP BY p.id, p.name, p.slug, p."provinceId"
    ORDER BY p.name
  `);
  console.log('Existing places count:', places.rows.length);
  console.log('Existing places sample (first 10):', places.rows.slice(0, 10));
  
  const placesWithoutImages = places.rows.filter(p => p.img_count === 0);
  console.log('Places with 0 images count:', placesWithoutImages.length);
  if (placesWithoutImages.length > 0) {
    console.log('Places without images:', placesWithoutImages);
  }

  // Check place_images table structure
  const imgCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'place_images'
    ORDER BY ordinal_position
  `);
  console.log('place_images columns:', imgCols.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
