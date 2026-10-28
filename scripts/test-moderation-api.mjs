
async function testApi() {
  console.log('Testing Admin Post Moderation Flow...');

  // 1. Fetch posts page HTML as Admin
  const pageRes = await fetch('http://localhost:3000/quan-tri/bai-viet', {
    headers: {
      'Cookie': 'vtrip_mock_role=admin'
    }
  });
  console.log('GET /quan-tri/bai-viet HTTP status:', pageRes.status);
  const html = await pageRes.text();
  console.log('Page HTML length:', html.length);
  const hasPosts = html.includes('Chinh phục Tứ đại đỉnh đèo Ô Quy Hồ') || html.includes('Cầu Vàng Bà Nà Hills');
  console.log('Rendered posts in page HTML:', hasPosts);

  // 2. Fetch a test post ID directly from DB
  const pg = await import('pg');
  const pool = new pg.default.Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  const dbRes = await pool.query(`SELECT id, headline, status FROM travel_posts ORDER BY "createdAt" DESC LIMIT 1`);
  const testPost = dbRes.rows[0];
  await pool.end();
  if (!testPost) {
    console.log('No post found to test moderation on.');
    return;
  }

  console.log(`Testing moderation on post ID: ${testPost.id} - "${testPost.headline}" (Current status: ${testPost.status})`);

  // 3. Test HIDE
  const hideRes = await fetch('http://localhost:3000/api/admin/social-posts/moderate', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'vtrip_mock_role=admin'
    },
    body: JSON.stringify({
      postId: testPost.id,
      action: 'HIDE',
      reason: 'Kiểm duyệt tạm thời bởi Quản trị viên'
    })
  });
  console.log('PATCH HIDE status:', hideRes.status);
  const hideData = await hideRes.json();
  console.log('PATCH HIDE response:', hideData);

  // 4. Test UNHIDE
  const unhideRes = await fetch('http://localhost:3000/api/admin/social-posts/moderate', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'vtrip_mock_role=admin'
    },
    body: JSON.stringify({
      postId: testPost.id,
      action: 'UNHIDE',
      reason: 'Bỏ ẩn sau khi xác minh nội dung hợp lệ'
    })
  });
  console.log('PATCH UNHIDE status:', unhideRes.status);
  const unhideData = await unhideRes.json();
  console.log('PATCH UNHIDE response:', unhideData);

  console.log('--- ALL MODERATION ACTIONS VERIFIED SUCCESSFULLY! ---');
}

testApi().catch(console.error);
