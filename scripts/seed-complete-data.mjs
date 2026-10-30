import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('--- 1. ENSURING PARTNER RECORD FOR partner.vtripplanner@example.com ---');
    const partnerUserId = '2e74f85b-fc3d-4ed1-9325-2b06028b2db8';
    const adminUserId = '15d6690f-9d5e-42fc-9e5e-fc6ed35735cc';

    const existingPartner = await client.query(
      'SELECT id FROM partners WHERE "ownerUserId" = $1',
      [partnerUserId]
    );

    let partnerId;
    if (existingPartner.rows.length === 0) {
      const insPartner = await client.query(`
        INSERT INTO partners (
          id, "ownerUserId", "reviewedByUserId", name, slug, type,
          description, "logoUrl", phone, email, "websiteUrl", "taxCode",
          "approvalStatus", "submittedAt", "reviewedAt", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2,
          'Tập Đoàn Du Lịch & Nghỉ Dưỡng VTrip Partner',
          'vtrip-partner-group',
          'TRAVEL_SERVICE',
          'Đối tác du lịch và lữ hành chiến lược của hệ thống VTripPlanner, chuyên cung cấp voucher phòng khách sạn, tour tham quan di sản và ẩm thực đặc sản cao cấp trên khắp Việt Nam.',
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
          '0909123456',
          'partner.vtripplanner@example.com',
          'https://vtripplanner.vn',
          '0312345678',
          'APPROVED',
          NOW() - INTERVAL '30 days',
          NOW() - INTERVAL '29 days',
          NOW() - INTERVAL '30 days',
          NOW()
        ) RETURNING id
      `, [partnerUserId, adminUserId]);
      partnerId = insPartner.rows[0].id;
      console.log('Created partner record with ID:', partnerId);
    } else {
      partnerId = existingPartner.rows[0].id;
      await client.query(
        'UPDATE partners SET "approvalStatus" = \'APPROVED\', "reviewedByUserId" = $1, "updatedAt" = NOW() WHERE id = $2',
        [adminUserId, partnerId]
      );
      console.log('Updated existing partner ID:', partnerId);
    }

    console.log('--- 2. ENSURING TRAVELER COMMUNITY USERS ---');
    const extraUsers = [
      {
        id: '5a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
        email: 'hoangyen.travel@example.com',
        fullName: 'Lê Hoàng Yến',
        displayName: 'Hoàng Yến Travel',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        bio: 'Blogger du lịch thích khám phá những góc ảnh bình yên khắp mọi miền Việt Nam.',
        city: 'Đà Nẵng'
      },
      {
        id: '6b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
        email: 'minhkhoa.photo@example.com',
        fullName: 'Trần Minh Khoa',
        displayName: 'Minh Khoa Photo',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        bio: 'Nhiếp ảnh gia phong cảnh và văn hóa di sản Việt Nam.',
        city: 'Hà Nội'
      },
      {
        id: '7c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
        email: 'maianh.foodie@example.com',
        fullName: 'Phạm Mai Anh',
        displayName: 'Mai Anh Foodie',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        bio: 'Mê ẩm thực đường phố và những quán cà phê view đẹp ngắm mây trời.',
        city: 'TP. Hồ Chí Minh'
      }
    ];

    const userRoleRecord = await client.query("SELECT id FROM roles WHERE name = 'USER' LIMIT 1");
    const userRoleId = userRoleRecord.rows[0].id;

    for (const u of extraUsers) {
      await client.query(`
        INSERT INTO users (id, email, "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, true, NOW() - INTERVAL '60 days', NOW())
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
      `, [u.id, u.email]);

      await client.query(`
        INSERT INTO user_profiles ("userId", "fullName", "displayName", "avatarUrl", bio, city, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '60 days', NOW())
        ON CONFLICT ("userId") DO UPDATE SET
          "fullName" = EXCLUDED."fullName",
          "displayName" = EXCLUDED."displayName",
          "avatarUrl" = EXCLUDED."avatarUrl",
          bio = EXCLUDED.bio,
          city = EXCLUDED.city
      `, [u.id, u.fullName, u.displayName, u.avatarUrl, u.bio, u.city]);

      await client.query(`
        INSERT INTO user_roles ("userId", "roleId", "assignedAt")
        VALUES ($1, $2, NOW() - INTERVAL '60 days')
        ON CONFLICT ("userId", "roleId") DO NOTHING
      `, [u.id, userRoleId]);
    }
    console.log('Traveler community users ready.');

    console.log('--- 3. ENSURING VIETNAM PROVINCES ---');
    const provincesData = [
      { code: 'HAN', name: 'Hà Nội', slug: 'ha-noi' },
      { code: 'DAN', name: 'Đà Nẵng', slug: 'da-nang' },
      { code: 'QNA', name: 'Quảng Nam', slug: 'quang-nam' },
      { code: 'TTH', name: 'Thừa Thiên Huế', slug: 'thua-thien-hue' },
      { code: 'NBI', name: 'Ninh Bình', slug: 'ninh-binh' },
      { code: 'LCA', name: 'Lào Cai', slug: 'lao-cai' },
      { code: 'KGI', name: 'Kiên Giang', slug: 'kien-giang' },
      { code: 'KHA', name: 'Khánh Hòa', slug: 'khanh-hoa' },
      { code: 'QNI', name: 'Quảng Ninh', slug: 'quang-ninh' }
    ];

    const provinceMap = new Map();
    // Fetch existing provinces first
    const curProv = await client.query('SELECT id, slug FROM provinces');
    for (const p of curProv.rows) {
      provinceMap.set(p.slug, p.id);
    }

    for (const p of provincesData) {
      if (!provinceMap.has(p.slug)) {
        const ins = await client.query(`
          INSERT INTO provinces (id, code, name, slug, "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
          RETURNING id
        `, [p.code, p.name, p.slug]);
        provinceMap.set(p.slug, ins.rows[0].id);
        console.log('Inserted province:', p.name, ins.rows[0].id);
      }
    }

    // Get categories map
    const catRows = await client.query('SELECT id, slug FROM place_categories');
    const categoryMap = new Map();
    for (const c of catRows.rows) {
      categoryMap.set(c.slug, c.id);
    }

    console.log('--- 4. SUPPLEMENTING HIGH-QUALITY IMAGES FOR EXISTING PLACES ---');
    // Real photos of Vietnam attractions for places that currently have placeholder images
    const existingPlaceImageUpdates = {
      'cho-ben-thanh': [
        { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80', alt: 'Cửa Nam chợ Bến Thành nhộn nhịp biểu tượng Sài Gòn' },
        { url: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80', alt: 'Khu ẩm thực đêm đặc sắc chợ Bến Thành' }
      ],
      'buu-dien-trung-tam-sai-gon': [
        { url: 'https://images.unsplash.com/photo-1574950578143-858c6fc58922?auto=format&fit=crop&w=1200&q=80', alt: 'Kiến trúc Gothic cổ điển Bưu điện Trung tâm Sài Gòn' },
        { url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80', alt: 'Không gian vòm cuốn độc đáo bên trong Bưu điện' }
      ],
      'bao-tang-chung-tich-chien-tranh': [
        { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80', alt: 'Bảo tàng Chứng tích Chiến tranh - Không gian trưng bày lịch sử' },
        { url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80', alt: 'Khu vực hiện vật ngoài trời Bảo tàng Chứng tích Chiến tranh' }
      ],
      'bao-tang-thanh-pho-ho-chi-minh': [
        { url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80', alt: 'Bảo tàng Thành phố Hồ Chí Minh - Dinh Gia Long cổ kính' },
        { url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80', alt: 'Cầu thang hoa văn nghệ thuật bên trong bảo tàng' }
      ],
      'ben-nha-rong': [
        { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Bến Nhà Rồng soi bóng bên sông Sài Gòn' },
        { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Khu lưu niệm Chủ tịch Hồ Chí Minh Bến Nhà Rồng' }
      ],
      'chua-ngoc-hoang': [
        { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Chùa Ngọc Hoàng - Điện Phước Hải cổ kính linh thiêng' },
        { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', alt: 'Nhang trầm tỏa khói an yên tại Chùa Ngọc Hoàng' }
      ],
      'cong-vien-ben-bach-dang': [
        { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Công viên Bến Bạch Đằng view Landmark 81 lung linh' },
        { url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=1200&q=80', alt: 'Không gian tản bộ ngắm sông Sài Gòn lộng gió' }
      ],
      'cho-da-lat': [
        { url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80', alt: 'Chợ Đà Lạt và góc check-in Hong Kong bên hông chợ' },
        { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', alt: 'Chợ đêm Đà Lạt ấm áp hương sữa đậu nành và bánh tráng nướng' }
      ],
      'biet-thu-hang-nga': [
        { url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', alt: 'Biệt thự Hằng Nga Crazy House kiến trúc kỳ vĩ Đà Lạt' },
        { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', alt: 'Góc cầu thang uốn lượn huyền bí tại Crazy House' }
      ],
      'dinh-bao-dai-iii': [
        { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', alt: 'Dinh Bảo Đại III giữa rừng thông ngút ngàn Đà Lạt' },
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', alt: 'Khuôn viên hoa rực rỡ trước Dinh III Đà Lạt' }
      ]
    };

    for (const [slug, imgs] of Object.entries(existingPlaceImageUpdates)) {
      const pRes = await client.query('SELECT id, name FROM places WHERE slug = $1', [slug]);
      if (pRes.rows.length > 0) {
        const pId = pRes.rows[0].id;
        const pName = pRes.rows[0].name;
        // Delete existing placeholder images for this place to replace with realistic photos
        await client.query('DELETE FROM place_images WHERE "placeId" = $1', [pId]);
        for (let i = 0; i < imgs.length; i++) {
          await client.query(`
            INSERT INTO place_images (
              id, "placeId", "storagePath", "altText", caption, "sortOrder", "isCover", "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
            )
          `, [
            pId,
            imgs[i].url,
            imgs[i].alt,
            `Ảnh thực tế sắc nét tại ${pName}`,
            i,
            i === 0
          ]);
        }
      }
    }
    console.log('Supplemented high-res photos for existing places.');

    console.log('--- 5. ADDING 30 NEW ICONIC TOURISM PLACES ACROSS VIETNAM ---');
    const newPlacesData = [
      // 1-6: Hà Nội
      {
        name: 'Hồ Hoàn Kiếm & Đền Ngọc Sơn',
        slug: 'ho-hoan-kiem-den-ngoc-son',
        provinceSlug: 'ha-noi',
        categorySlug: 'tam-linh',
        addressLine: 'Phố Đinh Tiên Hoàng, Phường Hàng Trống, Quận Hoàn Kiếm, Hà Nội',
        latitude: 21.0307,
        longitude: 105.8524,
        shortDescription: 'Trái tim của thủ đô Hà Nội với Tháp Rùa cổ kính, Cầu Thê Húc đỏ son và Đền Ngọc Sơn uy nghiêm.',
        description: 'Hồ Hoàn Kiếm (Hồ Gươm) gắn liền với truyền thuyết vua Lê Lợi trả gươm báu cho Rùa Thần. Nơi đây là trung tâm văn hóa lịch sử ngàn năm văn hiến, với không gian phố đi bộ cuối tuần rực rỡ và lộng gió.',
        bestVisitMonths: [1, 2, 3, 9, 10, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80', alt: 'Tháp Rùa và Hồ Hoàn Kiếm Hà Nội trong sớm mai' },
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Cầu Thê Húc màu đỏ dẫn lối vào Đền Ngọc Sơn' }
        ]
      },
      {
        name: 'Văn Miếu - Quốc Tử Giám',
        slug: 'van-mieu-quoc-tu-giam',
        provinceSlug: 'ha-noi',
        categorySlug: 'lich-su-va-bao-tang',
        addressLine: '58 Phố Quốc Tử Giám, Phường Văn Miếu, Quận Đống Đa, Hà Nội',
        latitude: 21.0293,
        longitude: 105.8355,
        shortDescription: 'Trường đại học đầu tiên của Việt Nam, biểu tượng truyền thống hiếu học và Nho học Thăng Long.',
        description: 'Được xây dựng từ năm 1070 dưới triều vua Lý Thánh Tông, Văn Miếu thờ Khổng Tử và Quốc Tử Giám là nơi đào tạo hàng ngàn nhân tài đất nước. Quần thể 82 Bia Tiến sĩ được UNESCO công nhận là Di sản tư liệu thế giới.',
        bestVisitMonths: [1, 2, 3, 10, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80', alt: 'Khuê Văn Các tại Văn Miếu Quốc Tử Giám Hà Nội' },
          { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80', alt: 'Vườn bia tiến sĩ Văn Miếu Quốc Tử Giám' }
        ]
      },
      {
        name: 'Phố Cổ Hà Nội',
        slug: 'pho-co-ha-noi',
        provinceSlug: 'ha-noi',
        categorySlug: 'cho-va-am-thuc',
        addressLine: 'Khu phố cổ, Quận Hoàn Kiếm, Hà Nội',
        latitude: 21.0345,
        longitude: 105.8505,
        shortDescription: 'Khu 36 phố phường sầm uất với các ngành nghề truyền thống và thiên đường ẩm thực Bắc Bộ.',
        description: 'Phố cổ Hà Nội lưu giữ nét kiến trúc nhà ống rêu phong và nhịp sống đặc trưng của người Tràng An. Nổi tiếng với cà phê trứng Giảng, bún chả Hàng Quạt, chả cá Lã Vọng và phố bia Tạ Hiện.',
        bestVisitMonths: [1, 2, 3, 4, 9, 10, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80', alt: 'Những con phố rêu phong đặc trưng phố cổ Hà Nội' },
          { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', alt: 'Ẩm thực đường phố thơm phức tại khu phố cổ Hà Nội' }
        ]
      },
      {
        name: 'Lăng Chủ tịch Hồ Chí Minh',
        slug: 'lang-chu-tich-ho-chi-minh',
        provinceSlug: 'ha-noi',
        categorySlug: 'lich-su-va-bao-tang',
        addressLine: 'Số 2 Hùng Vương, Phường Điện Bàn, Quận Ba Đình, Hà Nội',
        latitude: 21.0368,
        longitude: 105.8347,
        shortDescription: 'Nơi yên nghỉ vĩnh hằng của Chủ tịch Hồ Chí Minh vĩ đại, tọa lạc tại Quảng trường Ba Đình lịch sử.',
        description: 'Lăng Bác là công trình mang ý nghĩa chính trị, lịch sử sâu sắc của dân tộc Việt Nam. Khuôn viên bao gồm Quảng trường Ba Đình, Nhà sàn Bác Hồ, Ao cá và Chùa Một Cột cổ kính.',
        bestVisitMonths: [1, 2, 3, 4, 5, 9, 10, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80', alt: 'Quảng trường Ba Đình và Lăng Chủ tịch Hồ Chí Minh' },
          { url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80', alt: 'Chùa Một Cột gần Lăng Bác Ba Đình' }
        ]
      },
      {
        name: 'Chùa Trấn Quốc',
        slug: 'chua-tran-quoc',
        provinceSlug: 'ha-noi',
        categorySlug: 'tam-linh',
        addressLine: 'Đường Thanh Niên, Phường Yên Phụ, Quận Tây Hồ, Hà Nội',
        latitude: 21.0478,
        longitude: 105.8370,
        shortDescription: 'Ngôi chùa cổ nhất thủ đô với hơn 1.500 năm tuổi, nằm trên bán đảo xanh ngắt giữa Hồ Tây.',
        description: 'Chùa Trấn Quốc là trung tâm Phật giáo của kinh thành Thăng Long thời Lý - Trần. Ngôi bảo tháp lục độ đài sen cao 15m cùng cây bồ đề do Tổng thống Ấn Độ trao tặng tạo nên cảnh sắc thanh tịnh tuyệt mỹ.',
        bestVisitMonths: [1, 2, 3, 10, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Bảo tháp Chùa Trấn Quốc lung linh soi bóng Hồ Tây' },
          { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', alt: 'Hoàng hôn thanh tịnh bên Chùa Trấn Quốc' }
        ]
      },
      {
        name: 'Hoàng Thành Thăng Long',
        slug: 'hoang-thanh-thang-long',
        provinceSlug: 'ha-noi',
        categorySlug: 'lich-su-va-bao-tang',
        addressLine: '19C Hoàng Diệu, Phường Điện Bàn, Quận Ba Đình, Hà Nội',
        latitude: 21.0334,
        longitude: 105.8406,
        shortDescription: 'Di sản văn hóa thế giới minh chứng cho hơn 13 thế kỷ lịch sử các triều đại phong kiến Việt Nam.',
        description: 'Quần thể di tích Hoàng Thành gồm Đoan Môn, Điện Kính Thiên, Hậu Lâu, Cột cờ Hà Nội và khu khảo cổ học 18 Hoàng Diệu với hàng triệu hiện vật quý giá.',
        bestVisitMonths: [1, 2, 3, 9, 10, 11],
        images: [
          { url: 'https://images.unsplash.com/photo-1574950578143-858c6fc58922?auto=format&fit=crop&w=1200&q=80', alt: 'Đoan Môn cổng thành Hoàng Thành Thăng Long' },
          { url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80', alt: 'Thềm rồng Điện Kính Thiên Hoàng Thành Thăng Long' }
        ]
      },

      // 7-11: Đà Nẵng
      {
        name: 'Cầu Vàng Bà Nà Hills',
        slug: 'cau-vang-ba-na-hills',
        provinceSlug: 'da-nang',
        categorySlug: 'vui-choi-va-trai-nghiem',
        addressLine: 'Thôn An Sơn, Xã Hòa Ninh, Huyện Hòa Vang, Đà Nẵng',
        latitude: 15.9950,
        longitude: 107.9967,
        shortDescription: 'Kỳ quan kiến trúc đương đại nổi tiếng toàn cầu được nâng đỡ bởi hai bàn tay khổng lồ giữa mây ngàn.',
        description: 'Nằm ở độ cao 1.414m so với mực nước biển trên đỉnh núi Chúa Bà Nà, Cầu Vàng dài 150m uốn lượn như dải lụa vàng giữa đại ngàn. Khu du lịch Sun World Bà Nà Hills còn sở hữu Làng Pháp, Fantasy Park và tuyến cáp treo đạt nhiều kỷ lục thế giới.',
        bestVisitMonths: [3, 4, 5, 6, 7, 8, 9],
        images: [
          { url: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80', alt: 'Cầu Vàng Bà Nà Hills nâng đỡ bởi đôi bàn tay khổng lồ' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Lâu đài Làng Pháp nguy nga trên đỉnh Bà Nà Hills' }
        ]
      },
      {
        name: 'Bán Đảo Sơn Trà & Chùa Linh Ứng',
        slug: 'ban-dao-son-tra-chua-linh-ung',
        provinceSlug: 'da-nang',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: 'Bán đảo Sơn Trà, Phường Thọ Quang, Quận Sơn Trà, Đà Nẵng',
        latitude: 16.1005,
        longitude: 108.2764,
        shortDescription: 'Lá phổi xanh của Đà Nẵng với tượng Phật Bà Quan Âm cao 67m hướng mắt ra biển Đông bao la.',
        description: 'Bán đảo Sơn Trà sở hữu hệ sinh thái rừng nguyên sinh độc đáo nơi cư trú của loài Voọc chà vá chân nâu quý hiếm. Chùa Linh Ứng Bãi Bụt là điểm du lịch tâm linh nổi tiếng với phong cảnh sơn thủy hữu tình.',
        bestVisitMonths: [2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Tượng Phật Bà Quan Âm Chùa Linh Ứng Sơn Trà hướng biển' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Khung cảnh đại dương xanh thẳm từ đỉnh Sơn Trà' }
        ]
      },
      {
        name: 'Ngũ Hành Sơn',
        slug: 'ngu-hanh-son',
        provinceSlug: 'da-nang',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: '81 Huyền Trân Công Chúa, Phường Hòa Hải, Quận Ngũ Hành Sơn, Đà Nẵng',
        latitude: 16.0048,
        longitude: 108.2638,
        shortDescription: 'Quần thể 5 ngọn núi đá vôi Kim, Mộc, Thủy, Hỏa, Thổ với hệ thống hang động và chùa chiền kỳ thú.',
        description: 'Ngũ Hành Sơn nổi tiếng với Động Huyền Không ánh nắng chiếu rọi huyền ảo, Động Âm Phủ, Chùa Tam Thai và làng nghề điêu khắc đá mỹ nghệ Non Nước truyền thống.',
        bestVisitMonths: [2, 3, 4, 5, 6, 7, 8, 9],
        images: [
          { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', alt: 'Động Huyền Không ánh sáng huyền ảo Ngũ Hành Sơn' },
          { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', alt: 'Chùa Tam Thai trên đỉnh Thủy Sơn Ngũ Hành Sơn' }
        ]
      },
      {
        name: 'Bãi Biển Mỹ Khê',
        slug: 'bai-bien-my-khe',
        provinceSlug: 'da-nang',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: 'Đường Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, Đà Nẵng',
        latitude: 16.0592,
        longitude: 108.2464,
        shortDescription: 'Một trong sáu bãi biển quyến rũ nhất hành tinh do tạp chí Forbes bình chọn với cát trắng mịn màng.',
        description: 'Bãi biển Mỹ Khê trải dài thoai thoải, sóng êm ả quanh năm, nước biển trong xanh ấm áp và hàng dừa đung đưa trong gió. Nơi đây lý tưởng để tắm biển, lướt ván ca nô và ngắm bình minh tuyệt đẹp.',
        bestVisitMonths: [3, 4, 5, 6, 7, 8, 9],
        images: [
          { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', alt: 'Bãi biển Mỹ Khê nước trong xanh bãi cát thoai thoải' },
          { url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80', alt: 'Hoàng hôn lãng mạn trên biển Mỹ Khê Đà Nẵng' }
        ]
      },
      {
        name: 'Cầu Rồng Đà Nẵng',
        slug: 'cau-rong-da-nang',
        provinceSlug: 'da-nang',
        categorySlug: 'kien-truc-va-van-hoa',
        addressLine: 'Đường Nguyễn Văn Linh, Phường Phước Ninh, Quận Hải Châu, Đà Nẵng',
        latitude: 16.0612,
        longitude: 108.2274,
        shortDescription: 'Cây cầu thép hình rồng dài 666m vươn mình ra biển Đông, nổi tiếng với màn phun lửa và phun nước độc đáo.',
        description: 'Cầu Rồng bắc qua sông Hàn là biểu tượng cho sự phát triển thịnh vượng của thành phố Đà Nẵng. Vào mỗi 21h thứ Bảy và Chủ nhật hàng tuần, Cầu Rồng trình diễn màn phun lửa và nước thu hút hàng vạn du khách.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=1200&q=80', alt: 'Cầu Rồng Đà Nẵng rực sáng soi bóng dòng sông Hàn về đêm' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Màn trình diễn phun lửa ngoạn mục tại Cầu Rồng' }
        ]
      },

      // 12-15: Quảng Nam / Hội An
      {
        name: 'Phố Cổ Hội An',
        slug: 'pho-co-hoi-an',
        provinceSlug: 'quang-nam',
        categorySlug: 'kien-truc-va-van-hoa',
        addressLine: 'Phường Minh An, Thành phố Hội An, Quảng Nam',
        latitude: 15.8778,
        longitude: 108.3276,
        shortDescription: 'Đô thị cổ thương cảng thế kỷ 16-17 được bảo tồn vẹn nguyên, Di sản văn hóa thế giới UNESCO.',
        description: 'Hội An mê hoặc du khách bởi những bức tường vàng hoa giấy, đèn lồng rực rỡ và những ngôi nhà cổ hàng trăm năm tuổi. Ẩm thực Hội An trứ danh với cao lầu, mì Quảng, bánh mì Phượng và cơm gà Bà Buội.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80', alt: 'Đèn lồng lung linh sắc màu trong phố cổ Hội An về đêm' },
          { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80', alt: 'Góc phố cổ Hội An với giàn hoa giấy rực rỡ' }
        ]
      },
      {
        name: 'Chùa Cầu Hội An',
        slug: 'chua-cau-hoi-an',
        provinceSlug: 'quang-nam',
        categorySlug: 'lich-su-va-bao-tang',
        addressLine: 'Đường Nguyễn Thị Minh Khai, Phường Cẩm Phô, Hội An, Quảng Nam',
        latitude: 15.8771,
        longitude: 108.3260,
        shortDescription: 'Cầu ngói Nhật Bản được xây dựng từ thế kỷ 17, linh hồn và biểu tượng in trên tờ tiền polymer 20.000đ.',
        description: 'Chùa Cầu (Lai Viễn Kiều) vắt qua lạch nước nhỏ thông ra sông Thu Bồn, được các thương nhân Nhật Bản dựng nên. Kiến trúc mái ngói âm dương bằng gỗ chạm khắc tinh xảo kết hợp thờ Bắc Đế Trấn Võ.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80', alt: 'Chùa Cầu cổ kính soi bóng dòng nước êm đềm Hội An' },
          { url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80', alt: 'Kiến trúc gỗ điêu khắc tinh xảo bên trong Chùa Cầu' }
        ]
      },
      {
        name: 'Rừng Dừa Bảy Mẫu',
        slug: 'rung-dua-bay-mau',
        provinceSlug: 'quang-nam',
        categorySlug: 'vui-choi-va-trai-nghiem',
        addressLine: 'Thôn Cần Nhân, Xã Cẩm Thanh, Thành phố Hội An, Quảng Nam',
        latitude: 15.8722,
        longitude: 108.3711,
        shortDescription: 'Miền Tây thu nhỏ giữa lòng Hội An với trải nghiệm chèo thuyền thúng xoay điêu luyện trên sông.',
        description: 'Rừng dừa nước Cẩm Thanh từng là căn cứ cách mạng kiên cường thời kháng chiến. Ngày nay, du khách được trải nghiệm ngồi thuyền thúng len lỏi rặng dừa xanh mướt, xem múa thúng giật gân và câu cua đá.',
        bestVisitMonths: [2, 3, 4, 5, 6, 7, 8, 9],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Trải nghiệm chèo thuyền thúng len lỏi Rừng Dừa Bảy Mẫu' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Màn xoay thuyền thúng điêu luyện của ngư dân Cẩm Thanh' }
        ]
      },
      {
        name: 'Làng Gốm Thanh Hà',
        slug: 'lang-gom-thanh-ha',
        provinceSlug: 'quang-nam',
        categorySlug: 'kien-truc-va-van-hoa',
        addressLine: 'Phạm Thận Duật, Khối phố Nam Diêu, Phường Thanh Hà, Hội An, Quảng Nam',
        latitude: 15.8812,
        longitude: 108.3056,
        shortDescription: 'Làng nghề gốm đất nung truyền thống hơn 500 năm tuổi ven dòng sông Thu Bồn.',
        description: 'Đến với làng gốm Thanh Hà, du khách được tận mắt chứng kiến bàn tay tài hoa của các nghệ nhân vuốt gốm thủ công bằng chân xoay và tự tay nặn những sản phẩm gốm kỷ niệm độc đáo.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80', alt: 'Nghệ nhân tạo hình sản phẩm gốm đất nung Thanh Hà' },
          { url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', alt: 'Công viên Đất Nung Thanh Hà kiến trúc gạch đỏ độc đáo' }
        ]
      },

      // 16-18: Thừa Thiên Huế
      {
        name: 'Đại Nội Huế - Hoàng Thành Cố Đô',
        slug: 'dai-noi-hue-hoang-thanh',
        provinceSlug: 'thua-thien-hue',
        categorySlug: 'lich-su-va-bao-tang',
        addressLine: 'Đường 23 Tháng 8, Phường Thuận Thành, Thành phố Huế, Thừa Thiên Huế',
        latitude: 16.4697,
        longitude: 107.5794,
        shortDescription: 'Kinh đô triều Nguyễn với Ngọ Môn uy phong, Điện Thái Hòa tráng lệ và Tử Cấm Thành uy nghiêm.',
        description: 'Quần thể Di tích Cố đô Huế là Di sản văn hóa thế giới đầu tiên của Việt Nam được UNESCO vinh danh (1993). Nơi đây lưu giữ nguyên vẹn dấu ấn quyền lực và nét tinh hoa nghệ thuật kiến trúc cung đình phong kiến phương Đông.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80', alt: 'Cổng Ngọ Môn sừng sững tráng lệ trước Hoàng Thành Huế' },
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Hồ sen và cầu đá bên trong Tử Cấm Thành Huế' }
        ]
      },
      {
        name: 'Chùa Thiên Mụ',
        slug: 'chua-thien-mu',
        provinceSlug: 'thua-thien-hue',
        categorySlug: 'tam-linh',
        addressLine: 'Đồi Hà Khê, Đường Nguyễn Phúc Nguyên, Phường Hương Long, Thành phố Huế',
        latitude: 16.4527,
        longitude: 107.5450,
        shortDescription: 'Đệ nhất cổ tự xứ Huế bên dòng sông Hương thơ mộng, nổi bật với Tháp Phước Duyên 7 tầng.',
        description: 'Được xây dựng từ năm 1601 thời Chúa Tiên Nguyễn Hoàng, Chùa Thiên Mụ (Linh Mụ) gắn liền với tiếng chuông sớm chiều ngân vang khắp dòng Hương Giang. Ngôi chùa là biểu tượng bất biến cho vẻ đẹp trầm mặc của xứ Huế.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Tháp Phước Duyên Chùa Thiên Mụ soi bóng dòng sông Hương' },
          { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', alt: 'Hoàng hôn đỏ ửng trên bến thuyền Chùa Thiên Mụ' }
        ]
      },
      {
        name: 'Lăng Khải Định',
        slug: 'lang-khai-dinh',
        provinceSlug: 'thua-thien-hue',
        categorySlug: 'kien-truc-va-van-hoa',
        addressLine: 'Xã Thủy Bằng, Thị xã Hương Thủy, Thừa Thiên Huế',
        latitude: 16.3989,
        longitude: 107.5904,
        shortDescription: 'Đỉnh cao nghệ thuật ghép sành sứ và pha trộn kiến trúc Á - Âu độc nhất vô nhị thời nhà Nguyễn.',
        description: 'Lăng Khải Định (Ứng Lăng) xây dựng trên sườn núi Châu Chữ trong suốt 11 năm. Cung Thiên Định lộng lẫy với những bức phù điêu khảm sành sứ, thủy tinh tinh xảo và bức tranh Cửu Long Ẩn Vân trên trần nhà.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1574950578143-858c6fc58922?auto=format&fit=crop&w=1200&q=80', alt: 'Kiến trúc đen xám uy nghiêm bậc thang Lăng Khải Định' },
          { url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80', alt: 'Điện thờ khảm sành sứ rực rỡ lộng lẫy bên trong Lăng' }
        ]
      },

      // 19-21: Ninh Bình
      {
        name: 'Quần Thể Danh Thắng Tràng An',
        slug: 'quan-the-danh-thang-trang-an',
        provinceSlug: 'ninh-binh',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: 'Xã Ninh Xuân, Huyện Hoa Lư, Ninh Bình',
        latitude: 20.2536,
        longitude: 105.9189,
        shortDescription: 'Di sản hỗn hợp Văn hóa và Thiên nhiên thế giới UNESCO đầu tiên tại Đông Nam Á.',
        description: 'Tràng An được mệnh danh là "Vịnh Hạ Long trên cạn" với những dãy núi đá vôi triệu năm tuổi bao quanh dòng sông Sào Khê xanh trong biếc, xuyên qua hàng chục hang động tự nhiên huyền bí.',
        bestVisitMonths: [1, 2, 3, 4, 5, 9, 10, 11],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Thuyền nan lướt nhẹ giữa non nước Tràng An Ninh Bình' },
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Dãy núi đá vôi hùng vĩ soi bóng mặt nước ngọc bích Tràng An' }
        ]
      },
      {
        name: 'Tam Cốc - Bích Động',
        slug: 'tam-coc-bich-dong',
        provinceSlug: 'ninh-binh',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: 'Xã Ninh Hải, Huyện Hoa Lư, Ninh Bình',
        latitude: 20.2185,
        longitude: 105.9328,
        shortDescription: '"Nam thiên đệ nhị động" với dòng sông Ngô Đồng uốn lượn giữa những cánh đồng lúa chín vàng ươm.',
        description: 'Tam Cốc gồm ba hang: Hang Cả, Hang Hai và Hang Ba được tạo thành do dòng sông Ngô Đồng đâm xuyên qua núi. Vào tháng 5-6 hàng năm, cả thung lũng Tam Cốc rực rỡ sắc vàng mùa lúa chín tạo nên bức tranh thiên nhiên tuyệt mỹ.',
        bestVisitMonths: [1, 2, 3, 5, 6, 9, 10],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Cánh đồng lúa chín vàng Tam Cốc bên dòng sông Ngô Đồng' },
          { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', alt: 'Chùa Bích Động mái ngói rêu phong tựa lưng vào vách núi' }
        ]
      },
      {
        name: 'Hang Múa Ninh Bình',
        slug: 'hang-mua-ninh-binh',
        provinceSlug: 'ninh-binh',
        categorySlug: 'vui-choi-va-trai-nghiem',
        addressLine: 'Thôn Khê Đầu Hạ, Xã Ninh Xuân, Huyện Hoa Lư, Ninh Bình',
        latitude: 20.2312,
        longitude: 105.9324,
        shortDescription: '"Vạn Lý Trường Thành thu nhỏ" của Việt Nam với 486 bậc thang đá dẫn lên đỉnh ngắm toàn cảnh Tam Cốc.',
        description: 'Đứng trên đỉnh núi Múa bên tượng rồng đá khổng lồ uốn lượn, du khách có thể phóng tầm mắt bao trọn cảnh sắc núi non trùng điệp, thung lũng sông uốn khúc và đầm sen nở rộ vào mùa hè.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 9, 10],
        images: [
          { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', alt: 'Tượng rồng đá kiêu hãnh trên đỉnh Hang Múa Ninh Bình' },
          { url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80', alt: 'Tầm nhìn ngoạn mục bao trọn Tam Cốc từ đỉnh núi Múa' }
        ]
      },

      // 22-24: Lào Cai / Sa Pa
      {
        name: 'Đỉnh Fansipan - Nóc Nhà Đông Dương',
        slug: 'dinh-fansipan-noc-nha-dong-duong',
        provinceSlug: 'lao-cai',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: 'Dãy núi Hoàng Liên Sơn, Thị xã Sa Pa, Lào Cai',
        latitude: 22.3033,
        longitude: 103.7753,
        shortDescription: 'Đỉnh núi cao nhất Đông Dương với độ cao 3.143m, biển mây bồng bềnh và quần thể tâm linh kỳ vĩ.',
        description: 'Fansipan là điểm đến mơ ước của những người đam mê chinh phục. Tuyến cáp treo ba dây hiện đại đưa du khách lướt qua thung lũng Mường Hoa kỳ vĩ lên đỉnh chóp tam giác ghi dấu độ cao 3.143m.',
        bestVisitMonths: [9, 10, 11, 12, 1, 2, 3, 4],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Biển mây trắng cuồn cuộn dưới cột mốc Đỉnh Fansipan 3.143m' },
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Đại tượng Phật A Di Đà bằng đồng giữa mây ngàn Fansipan' }
        ]
      },
      {
        name: 'Bản Cát Cát Sa Pa',
        slug: 'ban-cat-cat-sa-pa',
        provinceSlug: 'lao-cai',
        categorySlug: 'kien-truc-va-van-hoa',
        addressLine: 'Xã Hoàng Liên, Thị xã Sa Pa, Lào Cai',
        latitude: 22.3303,
        longitude: 103.8340,
        shortDescription: 'Bản làng cổ đẹp như tranh vẽ của người H’Mông nép mình dưới chân dãy núi Hoàng Liên Sơn.',
        description: 'Bản Cát Cát quyến rũ với những thửa ruộng bậc thang thoai thoải, dòng suối Hoa róc rách, bánh xe nước khổng lồ và nghề dệt thổ cẩm, chế tác trang sức bạc tinh xảo truyền thống.',
        bestVisitMonths: [1, 2, 3, 4, 8, 9, 10, 11],
        images: [
          { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80', alt: 'Những mái nhà gỗ pơ mu mộc mạc tại bản Cát Cát Sa Pa' },
          { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80', alt: 'Bánh xe nước và suối hoa thơ mộng giữa lòng bản làng' }
        ]
      },
      {
        name: 'Đèo Ô Quy Hồ - Cổng Trời Sa Pa',
        slug: 'deo-o-quy-ho-cong-troi',
        provinceSlug: 'lao-cai',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: 'Quốc lộ 4D, Xã Sơn Bình, Huyện Tam Đường giáp Sa Pa, Lào Cai',
        latitude: 22.3551,
        longitude: 103.7745,
        shortDescription: 'Vua của "Tứ đại đỉnh đèo" Tây Bắc dài gần 50km, thiên đường ngắm hoàng hôn đỏ rực tuyệt đỉnh.',
        description: 'Đèo Ô Quy Hồ vắt ngang dãy Hoàng Liên Sơn nối liền Lào Cai và Lai Châu. Tại điểm Cổng Trời ở độ cao hơn 2.000m, du khách được ngắm nhìn bức tranh thiên nhiên hùng vĩ với mây trôi bồng bềnh và ánh hoàng hôn buông xuống thung lũng.',
        bestVisitMonths: [9, 10, 11, 12, 1, 2, 3],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Cung đường đèo Ô Quy Hồ uốn lượn ngoạn mục giữa mây núi' },
          { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', alt: 'Hoàng hôn rực lửa trên đỉnh Cổng Trời Ô Quy Hồ' }
        ]
      },

      // 25-26: Quảng Ninh
      {
        name: 'Vịnh Hạ Long',
        slug: 'vinh-ha-long',
        provinceSlug: 'quang-ninh',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: 'Thành phố Hạ Long, Quảng Ninh',
        latitude: 20.9101,
        longitude: 107.1839,
        shortDescription: 'Kỳ quan thiên nhiên thế giới mới với hàng ngàn đảo đá vôi nhấp nhô trên mặt nước ngọc bích.',
        description: 'Vịnh Hạ Long sở hữu gần 2.000 hòn đảo lớn nhỏ mang hình thù sống động như Hòn Trống Mái, Đỉnh Hương cùng hệ thống hang động thạch nhũ lung linh như Động Thiên Cung, Hang Sửng Sốt.',
        bestVisitMonths: [3, 4, 5, 9, 10, 11],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Những hòn đảo đá vôi kỳ vĩ trên vịnh Hạ Long xanh ngọc' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Du thuyền rẽ sóng lướt giữa lòng vịnh Hạ Long trong ánh chiều' }
        ]
      },
      {
        name: 'Đảo Ti Tốp Vịnh Hạ Long',
        slug: 'dao-ti-top-ha-long',
        provinceSlug: 'quang-ninh',
        categorySlug: 'vui-choi-va-trai-nghiem',
        addressLine: 'Khu vực trung tâm Vịnh Hạ Long, Thành phố Hạ Long, Quảng Ninh',
        latitude: 20.8597,
        longitude: 107.0811,
        shortDescription: 'Hòn đảo có bãi tắm vầng trăng khuyết tuyệt đẹp và đỉnh núi phóng tầm mắt ngắm trọn cảnh Vịnh.',
        description: 'Đảo Ti Tốp được Bác Hồ đặt tên theo nhà du hành vũ trụ Gherman Titov trong chuyến thăm năm 1962. Bãi tắm cát trắng thoai thoải cùng cung đường 400 bậc đá lên lầu ngắm cảnh đỉnh đảo là điểm check-in không thể bỏ lỡ.',
        bestVisitMonths: [4, 5, 6, 7, 8, 9, 10],
        images: [
          { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', alt: 'Bãi biển hình vầng trăng khuyết cát trắng mịn tại Đảo Ti Tốp' },
          { url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80', alt: 'Toàn cảnh vịnh Hạ Long nhìn từ đỉnh lầu ngắm cảnh Ti Tốp' }
        ]
      },

      // 27-29: Kiên Giang / Phú Quốc
      {
        name: 'Bãi Sao Phú Quốc',
        slug: 'bai-sao-phu-quoc',
        provinceSlug: 'kien-giang',
        categorySlug: 'thien-nhien-va-cong-vien',
        addressLine: 'Ấp Bãi Sao, Phường An Thới, Thành phố Phú Quốc, Kiên Giang',
        latitude: 10.0528,
        longitude: 104.0322,
        shortDescription: 'Bãi biển đẹp nhất Phú Quốc với bãi cát trắng mịn như kem và hàng dừa nghiêng soi bóng.',
        description: 'Bãi Sao sở hữu bãi cát trắng phau mịn màng trải dài hơn 7km, nước biển trong vắt nhìn thấy đáy và sóng êm đềm an toàn tuyệt đối. Khung cảnh xích đu gỗ dưới hàng dừa là điểm check-in thiên đường.',
        bestVisitMonths: [11, 12, 1, 2, 3, 4, 5],
        images: [
          { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', alt: 'Bãi Sao Phú Quốc cát trắng mịn màng và nước biển xanh ngọc' },
          { url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80', alt: 'Hàng dừa nghiêng duyên dáng bên bãi biển Bãi Sao' }
        ]
      },
      {
        name: 'Grand World Phú Quốc - Thành Phố Không Ngủ',
        slug: 'grand-world-phu-quoc',
        provinceSlug: 'kien-giang',
        categorySlug: 'vui-choi-va-trai-nghiem',
        addressLine: 'Khu Bãi Dài, Xã Gành Dầu, Thành phố Phú Quốc, Kiên Giang',
        latitude: 10.3340,
        longitude: 103.8569,
        shortDescription: 'Trung tâm giải trí, mua sắm lễ hội 24/7 với kênh đào Venice thu nhỏ và show diễn thực cảnh hoành tráng.',
        description: 'Grand World Phú Quốc tái hiện thành phố Venice lãng mạn của nước Ý với những dãy nhà rực rỡ sắc màu, thuyền Gondola du ngoạn trên kênh đào, bảo tàng Gấu Teddy và các công trình tre khổng lồ.',
        bestVisitMonths: [10, 11, 12, 1, 2, 3, 4, 5],
        images: [
          { url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', alt: 'Kênh đào Venice và những ngôi nhà rực rỡ sắc màu Grand World' },
          { url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=1200&q=80', alt: 'Show diễn nhạc nước thực cảnh lung linh về đêm tại Grand World' }
        ]
      },
      {
        name: 'Cáp Treo Hòn Thơm Phú Quốc',
        slug: 'cap-treo-hon-thom-phu-quoc',
        provinceSlug: 'kien-giang',
        categorySlug: 'vui-choi-va-trai-nghiem',
        addressLine: 'Bãi Đất Đỏ, Phường An Thới, Thành phố Phú Quốc, Kiên Giang',
        latitude: 10.0275,
        longitude: 104.0135,
        shortDescription: 'Tuyến cáp treo ba dây vượt biển dài nhất thế giới (7.899,9m) ngắm trọn quần đảo An Thới từ trên cao.',
        description: 'Cáp treo Hòn Thơm đưa du khách bay bổng giữa tầng không ngắm nhìn 360 độ vẻ đẹp kiều diễm của biển trời Tây Nam, những làng chài nhấp nhô thuyền bè trước khi đáp xuống tổ hợp công viên nước Aquatopia.',
        bestVisitMonths: [11, 12, 1, 2, 3, 4, 5],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Cabin cáp treo Hòn Thơm bay qua đại dương xanh biếc' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Toàn cảnh quần đảo An Thới nhìn từ cáp treo Hòn Thơm' }
        ]
      },

      // 30: Khánh Hòa / Nha Trang
      {
        name: 'Tháp Bà Ponagar Nha Trang',
        slug: 'thap-ba-ponagar-nha-trang',
        provinceSlug: 'khanh-hoa',
        categorySlug: 'kien-truc-va-van-hoa',
        addressLine: 'Đường 2 Tháng 4, Phường Vĩnh Phước, Thành phố Nha Trang, Khánh Hòa',
        latitude: 12.2655,
        longitude: 109.1958,
        shortDescription: 'Quần thể đền tháp Chăm Pa cổ kính thế kỷ 8-13 thờ Nữ thần Ponagar (Thiên Y A Na).',
        description: 'Tháp Bà Ponagar tọa lạc trên đồi Cù Lao nhìn ra dòng sông Cái Nha Trang hiền hòa. Quần thể là di tích tôn giáo lớn nhất còn tồn tại của vương quốc Chăm Pa cổ đại với kỹ thuật xây gạch không mạch nối kỳ diệu.',
        bestVisitMonths: [1, 2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Quần thể đền tháp Chăm Pa cổ kính Ponagar Nha Trang' },
          { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', alt: 'Điệu múa Chăm truyền thống bên chân Tháp Bà Ponagar' }
        ]
      }
    ];

    const createdPlaceMap = new Map();

    for (const p of newPlacesData) {
      const provId = provinceMap.get(p.provinceSlug);
      const catId = categoryMap.get(p.categorySlug);

      if (!provId || !catId) {
        console.error('Missing province or category for:', p.name);
        continue;
      }

      // Check if place already exists by slug
      const pExist = await client.query('SELECT id FROM places WHERE slug = $1', [p.slug]);
      let placeId;

      if (pExist.rows.length === 0) {
        const ins = await client.query(`
          INSERT INTO places (
            id, "categoryId", "provinceId", "createdByUserId", "reviewedByUserId",
            name, slug, "shortDescription", description, "addressLine",
            latitude, longitude, "bestVisitMonths", "verificationStatus",
            "isActive", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4,
            $5, $6, $7, $8, $9,
            $10, $11, $12, 'VERIFIED',
            true, NOW() - INTERVAL '10 days', NOW()
          ) RETURNING id
        `, [
          catId,
          provId,
          adminUserId,
          adminUserId,
          p.name,
          p.slug,
          p.shortDescription,
          p.description,
          p.addressLine,
          p.latitude,
          p.longitude,
          p.bestVisitMonths
        ]);
        placeId = ins.rows[0].id;
        console.log('Inserted new place:', p.name, placeId);
      } else {
        placeId = pExist.rows[0].id;
        console.log('Place already exists:', p.name, placeId);
      }

      createdPlaceMap.set(p.slug, placeId);

      // Insert images for new place
      await client.query('DELETE FROM place_images WHERE "placeId" = $1', [placeId]);
      for (let i = 0; i < p.images.length; i++) {
        await client.query(`
          INSERT INTO place_images (
            id, "placeId", "storagePath", "altText", caption, "sortOrder", "isCover", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
          )
        `, [
          placeId,
          p.images[i].url,
          p.images[i].alt,
          `Ảnh thực tế trải nghiệm tại ${p.name}`,
          i,
          i === 0
        ]);
      }
    }
    console.log('Finished adding 30 iconic tourism places with real photography.');

    console.log('--- 6. PUSHING 20 RICH TRAVEL POSTS WITH REAL MEDIA ---');
    const postsData = [
      {
        headline: 'Bình minh trên Cầu Vàng Bà Nà Hills - Cảm giác như chạm vào mây trời Đà Nẵng',
        caption: 'Có những khoảnh khắc khiến ta lặng đi trước vẻ đẹp của bàn tay con người và thiên nhiên. Sáng sớm ở Bà Nà, sương mây còn bảng lảng trôi dưới chân, Cầu Vàng hiện ra như một dải lụa phát sáng giữa hai bàn tay khổng lồ rêu phong.\n\nTip nhỏ cho các bạn thích chụp ảnh: Hãy chọn chuyến cáp treo sớm nhất lúc 7h30 sáng để đến cầu khi chưa có đông khách. Không khí lúc này se lạnh khoảng 18 độ C, cực kỳ trong lành và tĩnh lặng. Đừng quên mang theo một chiếc áo khoác mỏng nhé!',
        type: 'USER_TRIP',
        authorUserId: '5a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', // Hoàng Yến
        placeSlug: 'cau-vang-ba-na-hills',
        seasonMonths: [3, 4, 5, 6, 7],
        images: [
          { url: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80', alt: 'Cầu Vàng Bà Nà Hills ngập tràn trong ánh bình minh' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Sương sớm bảng lảng vờn quanh đỉnh núi Chúa Bà Nà' }
        ]
      },
      {
        headline: 'Hành trình khám phá 36 phố phường Hà Nội: Ăn sập ẩm thực phố cổ chỉ với 200k',
        caption: 'Hà Nội mùa thu đẹp nhất khi tản bộ qua những con ngõ nhỏ ngửi mùi hoa sữa thoang thoảng và thưởng thức những món ăn đường phố đậm đà phong vị Bắc Bộ.\n\nLịch trình food tour gợi ý:\n1. 8h00: Phở Bát Đàn - nước dùng trong vắt, ngọt thanh từ xương hầm (55k)\n2. 10h00: Cà phê trứng Giảng số 39 Nguyễn Hữu Huân (35k)\n3. 12h30: Bún chả Hàng Quạt thơm lừng than hoa (45k)\n4. 16h00: Nộm bò khô Bờ Hồ và bánh gối giòn rụm (40k)\n5. 20h00: Trà chanh chém gió Nhà Thờ Lớn (25k)\n\nChỉ vỏn vẹn 200k mà bụng no căng và tâm hồn ngập tràn niềm vui!',
        type: 'EVERGREEN_GUIDE',
        authorUserId: '6b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', // Minh Khoa
        placeSlug: 'pho-co-ha-noi',
        seasonMonths: [9, 10, 11],
        images: [
          { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', alt: 'Bát phở bò gia truyền thơm nức mũi phố cổ Hà Nội' },
          { url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80', alt: 'Con ngõ rêu phong nhuộm nắng vàng mùa thu phố cổ' }
        ]
      },
      {
        headline: 'Một chiều hoàng hôn tuyệt đẹp bên Chùa Cầu và dòng sông Hoài thơ mộng ở Hội An',
        caption: 'Hội An đẹp nhất vào khoảnh khắc chập tối, khi những tia nắng cuối ngày nhuộm vàng những bức tường cổ rêu phong và hàng ngàn chiếc đèn lồng bắt đầu thắp sáng rực rỡ.\n\nĐến Chùa Cầu vào giờ này, bạn sẽ cảm nhận được sự giao thoa văn hóa hàng trăm năm của người Nhật, người Hoa và người Việt. Ngồi trên chiếc thuyền gỗ nhỏ dọc sông Hoài, tự tay thả ngọn đèn hoa đăng mang theo lời ước nguyện là trải nghiệm mà bất cứ ai ghé phố Hội cũng nên thử một lần trong đời.',
        type: 'SEASONAL_GUIDE',
        authorUserId: '7c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f', // Mai Anh
        placeSlug: 'chua-cau-hoi-an',
        seasonMonths: [2, 3, 4, 5, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80', alt: 'Đèn lồng Hội An soi bóng lung linh dòng sông Hoài' },
          { url: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80', alt: 'Chùa Cầu cổ kính trong ánh hoàng hôn tím thẫm' }
        ]
      },
      {
        headline: 'Kinh nghiệm săn mây đỉnh Fansipan 3.143m - Nóc nhà Đông Dương vào mùa thu',
        caption: 'Chạm tay vào cột mốc 3.143m trên đỉnh Fansipan là cảm xúc tự hào không lời nào tả xiết. Mùa thu từ tháng 9 đến tháng 11 là thời điểm lý tưởng nhất để săn mây vì thời tiết Sa Pa khô ráo, trời xanh ngắt và biển mây cuồn cuộn như thác đổ.\n\nTuyến cáp treo Sun World đi xuyên qua tầng mây ngắm thung lũng Mường Hoa vào mùa lúa chín vàng ươm là cảnh tượng đẹp tựa thiên đường. Bạn nhớ bước chậm khi lên bậc đá ở độ cao 3.000m để cơ thể làm quen với áp suất nhé.',
        type: 'USER_TRIP',
        authorUserId: '49efc996-aa5e-4e97-9fcc-9acfa0199979', // Nguyễn Phượt Thủ
        placeSlug: 'dinh-fansipan-noc-nha-dong-duong',
        seasonMonths: [9, 10, 11],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Biển mây bồng bềnh ôm trọn đỉnh Fansipan hùng vĩ' },
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Đại tượng Phật giữa ngàn mây trên đỉnh núi' }
        ]
      },
      {
        headline: 'Chèo thuyền khám phá quần thể danh thắng Tràng An Ninh Bình - Non nước hữu tình',
        caption: 'Ngồi trên chiếc thuyền nan do các cô chèo đò bản địa đưa đi, thả hồn trôi theo dòng sông Sào Khê xanh màu ngọc bích, hai bên là những vách núi đá vôi sừng sững cao vút.\n\nTuyến thuyền số 2 đi qua Hang Lấm, Hang Vạng, Hang Thánh Trượt và phim trường King Kong là tuyến yêu thích nhất của mình. Tiếng mái chèo khua nước nhịp nhàng, tiếng chim rừng líu lo giữa thung lũng mang lại cảm giác bình yên đến lạ kỳ.',
        type: 'SEASONAL_GUIDE',
        authorUserId: '5a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', // Hoàng Yến
        placeSlug: 'quan-the-danh-thang-trang-an',
        seasonMonths: [1, 2, 3, 4, 5],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Đoàn thuyền nan rẽ nước giữa non nước Tràng An Ninh Bình' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Hồ nước trong vắt nhìn thấu rong rêu ở Tràng An' }
        ]
      },
      {
        headline: 'Phú Quốc 3 ngày 2 đêm: Check-in Bãi Sao cát trắng mịn và hoàng hôn Sunset Sanato',
        caption: 'Đảo ngọc Phú Quốc mùa khô (từ tháng 11 đến tháng 4 năm sau) xứng đáng là thiên đường nghỉ dưỡng biển số một Việt Nam. Biển êm như mặt hồ, nước trong vắt phản chiếu nền trời xanh ngắt.\n\nBãi Sao nằm ở phía nam đảo, cát ở đây không có màu vàng như biển Nha Trang hay Mỹ Khê mà mang màu trắng ngà mịn màng như hạt kem. Đi dạo chân trần trên cát, ngắm hàng dừa nghiêng và thưởng thức một quả dừa tươi ngọt lịm thì mọi âu lo đời thường đều tan biến.',
        type: 'USER_TRIP',
        authorUserId: '7c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f', // Mai Anh
        placeSlug: 'bai-sao-phu-quoc',
        seasonMonths: [11, 12, 1, 2, 3, 4],
        images: [
          { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', alt: 'Cát trắng mịn màng và hàng dừa thơ mộng tại Bãi Sao Phú Quốc' },
          { url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80', alt: 'Hoàng hôn rực rỡ buông xuống bờ biển ngọc Phú Quốc' }
        ]
      },
      {
        headline: 'Trầm mặc nét cổ kính Đại Nội Huế - Hành trình trở về dấu ấn kinh đô vàng son',
        caption: 'Đến Huế mà không ghé thăm Hoàng Thành Đại Nội thì coi như chưa biết trọn vẹn nét tao nhã của mảnh đất cố đô. Đi qua cổng Ngọ Môn lộng lẫy, bước vào Điện Thái Hòa với những hàng cột gỗ sơn son thếp vàng chạm khắc rồng phượng uy nghiêm.\n\nMột gợi ý hay là thuê một bộ cổ phục áo Nhật Bình hoặc áo tấc để chụp ảnh kỷ niệm. Dưới những mái ngói lưu ly và hành lang đỏ thắm, mỗi góc ảnh đều như đưa bạn ngược dòng thời gian về thế kỷ 19.',
        type: 'EVERGREEN_GUIDE',
        authorUserId: '6b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', // Minh Khoa
        placeSlug: 'dai-noi-hue-hoang-thanh',
        seasonMonths: [1, 2, 3, 4, 5, 6],
        images: [
          { url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80', alt: 'Cửa Ngọ Môn Hoàng Thành Huế trong nắng sớm bình yên' },
          { url: 'https://images.unsplash.com/photo-1574950578143-858c6fc58922?auto=format&fit=crop&w=1200&q=80', alt: 'Mái ngói âm dương rêu phong cổ kính Đại Nội Huế' }
        ]
      },
      {
        headline: 'Kinh nghiệm đi du thuyền ngắm hoàng hôn Vịnh Hạ Long - Tuyệt tác di sản thế giới',
        caption: 'Trải nghiệm ngủ đêm trên du thuyền 5 sao tại Vịnh Hạ Long là một trong những hành trình đáng giá nhất đời. Khi du thuyền rẽ sóng lướt qua những đảo đá vôi kỳ vĩ triệu năm tuổi, bạn sẽ ngỡ như đang lạc vào chốn bồng lai tiên cảnh.\n\nBuổi chiều bạn có thể chèo kayak vào Hang Luồn hoặc tắm biển ở đảo Ti Tốp, sau đó thưởng thức bữa tiệc hoàng hôn Sunset Party trên boong tàu và tập Thái Cực Quyền đón bình minh ngày hôm sau.',
        type: 'PROMOTED',
        authorUserId: partnerUserId, // Partner V-Trip
        placeSlug: 'vinh-ha-long',
        seasonMonths: [3, 4, 5, 9, 10, 11],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Du thuyền sang trọng trên mặt nước ngọc bích Vịnh Hạ Long' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Hàng ngàn hòn đảo đá vôi nhấp nhô tuyệt mỹ tại Hạ Long' }
        ]
      },
      {
        headline: 'Một ngày lạc giữa Bản Cát Cát Sa Pa: Mặc trang phục H’Mông chụp ảnh bên suối hoa',
        caption: 'Cát Cát chỉ cách trung tâm thị xã Sa Pa khoảng 2km, đi bộ xuống bản là một cung đường bậc đá quanh co rất đẹp. Bạn có thể thuê một bộ trang phục dân tộc thổ cẩm rực rỡ với giá chỉ 50k - 100k ngay đầu bản.\n\nĐiểm check-in đẹp nhất là khu vực guồng nước khổng lồ bên suối Hoa và cầu mây. Tiếng nước chảy róc rách hòa cùng tiếng khèn Mông ngân vang mang lại cảm giác vui tươi, mộc mạc đậm đà bản sắc vùng cao Tây Bắc.',
        type: 'USER_TRIP',
        authorUserId: '49efc996-aa5e-4e97-9fcc-9acfa0199979', // Nguyễn Phượt Thủ
        placeSlug: 'ban-cat-cat-sa-pa',
        seasonMonths: [2, 3, 4, 9, 10, 11],
        images: [
          { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80', alt: 'Nét mộc mạc yên bình bên dòng suối nhỏ bản Cát Cát Sa Pa' },
          { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80', alt: 'Guồng nước gỗ khổng lồ quay đều giữa bản làng Tây Bắc' }
        ]
      },
      {
        headline: 'Review chi tiết khu phố không ngủ Grand World Phú Quốc: Show diễn Tinh hoa Việt Nam',
        caption: 'Được mệnh danh là thành phố không ngủ, Grand World Phú Quốc sôi động náo nhiệt 24/7 với hàng trăm góc check-in mang phong cách châu Âu kết hợp văn hóa truyền thống Việt Nam.\n\nĐiểm nhấn không thể bỏ qua:\n1. Đi thuyền Gondola dạo sông Venice với những chàng ca sĩ hát opera lãng mạn\n2. Show Tinh hoa Việt Nam đạo diễn Việt Tú với sân khấu ngập nước và hàng trăm diễn viên tái hiện văn hóa ngàn năm\n3. Show nhạc nước Sắc màu Venice tại hồ Tình Yêu hoàn toàn miễn phí vào 21h30 mỗi tối.',
        type: 'EVERGREEN_GUIDE',
        authorUserId: '5a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', // Hoàng Yến
        placeSlug: 'grand-world-phu-quoc',
        seasonMonths: [10, 11, 12, 1, 2, 3, 4, 5],
        images: [
          { url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', alt: 'Dòng kênh Venice thơ mộng giữa lòng Grand World Phú Quốc' },
          { url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=1200&q=80', alt: 'Show biểu diễn ánh sáng rực rỡ bên hồ nước Grand World' }
        ]
      },
      {
        headline: 'Đà Lạt sáng sớm: Cà phê ngắm bình minh trên đồi chè Cầu Đất bảng lảng sương mù',
        caption: 'Nếu bạn muốn thấy một Đà Lạt mộng mơ đúng nghĩa, hãy thức dậy thật sớm lúc 5h sáng và di chuyển về phía đồi chè Cầu Đất. Lúc này, cả thung lũng chìm trong biển mây bồng bềnh và những tia nắng đầu ngày bắt đầu xuyên qua làn sương mỏng.\n\nCầm trên tay ly cà phê Arabica nóng hổi nghi ngút khói, hít hà bầu không khí trong trẻo đượm mùi lá chè tươi non là trải nghiệm chữa lành tâm hồn tuyệt vời nhất.',
        type: 'SEASONAL_GUIDE',
        authorUserId: '6b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', // Minh Khoa
        placeSlug: 'cho-da-lat',
        seasonMonths: [10, 11, 12, 1, 2],
        images: [
          { url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80', alt: 'Sương sớm và đồi chè xanh ngát bảng lảng mây Đà Lạt' },
          { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', alt: 'Ly cà phê nóng ấm ngắm nhìn bình minh phố núi' }
        ]
      },
      {
        headline: 'Chinh phục đỉnh Hang Múa Ninh Bình - Toàn cảnh Tam Cốc mùa lúa chín vàng ươm',
        caption: '486 bậc thang đá dẫn lên đỉnh ngọa long Hang Múa tuy có làm đôi chân mỏi mệt nhưng phần thưởng đón đợi bạn ở đỉnh núi là hoàn toàn xứng đáng.\n\nTừ đỉnh núi Múa, bạn thu vào tầm mắt toàn bộ dòng sông Ngô Đồng lượn quanh những dải lúa chín vàng óng ả và các vách núi đá vôi triệu năm tuổi. Khoảnh khắc hoàng hôn buông xuống làm bầu trời ngả sang sắc tím hồng huyền ảo chính là góc máy triệu like của các nhiếp ảnh gia.',
        type: 'USER_TRIP',
        authorUserId: '7c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f', // Mai Anh
        placeSlug: 'hang-mua-ninh-binh',
        seasonMonths: [5, 6],
        images: [
          { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', alt: 'Đường thang đá uốn lượn lên đỉnh núi Ngọa Long Hang Múa' },
          { url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80', alt: 'Bức tranh mùa lúa vàng rực rỡ nhìn từ đỉnh Hang Múa' }
        ]
      },
      {
        headline: 'Khám phá Tháp Bà Ponagar Nha Trang - Kiệt tác kiến trúc Chăm Pa độc đáo',
        caption: 'Nằm trên ngọn đồi Cù Lao nhỏ lộng gió bên cửa sông Cái Nha Trang, Tháp Bà Ponagar là một trong những quần thể kiến trúc đền tháp Chăm Pa cổ xưa và quy mô nhất còn lại tại miền Trung.\n\nKỹ thuật nung gạch và kết dính gạch không hề lộ vữa của người Chăm cổ cho đến nay vẫn là một ẩn số kỳ diệu. Hàng ngày tại sân tháp đều có biểu diễn múa Chăm với tiếng trống Paranưng và tiếng kèn Saranai rộn rã làm say đắm lòng người.',
        type: 'EVERGREEN_GUIDE',
        authorUserId: '49efc996-aa5e-4e97-9fcc-9acfa0199979', // Nguyễn Phượt Thủ
        placeSlug: 'thap-ba-ponagar-nha-trang',
        seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Tháp Bà Ponagar sừng sững uy nghi trong nắng vàng Nha Trang' },
          { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', alt: 'Điệu múa duyên dáng của các thiếu nữ Chăm bên tháp cổ' }
        ]
      },
      {
        headline: 'Đi dạo Bến Bạch Đằng và ngắm du thuyền sông Sài Gòn lung linh về đêm',
        caption: 'Công viên Bến Bạch Đằng sau khi được cải tạo đã trở thành không gian công cộng tuyệt vời nhất của người dân TP.HCM và du khách. Nằm ngay trung tâm Quận 1 bên dòng sông Sài Gòn lộng gió, nơi đây mang vẻ đẹp hiện đại văn minh.\n\nBuổi tối đi dạo dọc bờ kè, ngắm nhìn những tòa nhà chọc trời rực rỡ ánh đèn led phản chiếu xuống mặt nước và những chuyến Waterbus tấp nập mang lại một cảm giác rất trẻ trung, căng tràn nhựa sống của đô thị phương Nam.',
        type: 'USER_TRIP',
        authorUserId: '5a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', // Hoàng Yến
        placeSlug: 'cong-vien-ben-bach-dang',
        seasonMonths: [1, 2, 3, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Bến Bạch Đằng và skyline lung linh ánh đèn TP.HCM về đêm' },
          { url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=1200&q=80', alt: 'Du thuyền sông Sài Gòn rẽ sóng lướt đi trong đêm' }
        ]
      },
      {
        headline: 'Thưởng thức ẩm thực chợ đêm Bến Thành: 10 món ngon không thể bỏ lỡ tại TP.HCM',
        caption: 'Khi các sạp hàng trong nhà lồng chợ Bến Thành đóng cửa vào 18h, các con phố Phan Chu Trinh và Phan Bội Châu bên hông chợ lập tức biến thành khu chợ đêm sầm uất ngập tràn hương vị hấp dẫn.\n\nTop những món phải thử:\n- Bún riêu cua Gánh Bến Thành nước dùng ngọt thanh vị cà chua\n- Bánh bèo, bánh bột lọc xứ Huế chan nước mắm ớt cay xè\n- Cơm tấm sườn bì chả mỡ hành thơm phức\n- Chè sương sa hạt lựu cốt dừa béo ngậy mát lạnh\n\nKhông khí giao lưu náo nhiệt giữa người dân địa phương và bạn bè quốc tế khiến bữa ăn càng thêm phần thi vị!',
        type: 'EVERGREEN_GUIDE',
        authorUserId: '7c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f', // Mai Anh
        placeSlug: 'cho-ben-thanh',
        seasonMonths: [1, 2, 3, 4, 10, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', alt: 'Món ngon đường phố thơm lừng tại khu ẩm thực chợ đêm' },
          { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80', alt: 'Chợ Bến Thành rực sáng ánh đèn trong đêm phương Nam' }
        ]
      },
      {
        headline: 'Ngắm Cầu Rồng Đà Nẵng phun lửa và nước vào tối cuối tuần - Không khí siêu sôi động',
        caption: 'Mỗi tối thứ Bảy và Chủ nhật lúc 21h00, giao thông qua Cầu Rồng sẽ tạm ngừng để nhường chỗ cho màn trình diễn ngoạn mục: Rồng thép khổng lồ phun lửa 2 lượt (mỗi lượt 9 lần) và phun nước 3 lượt (mỗi lượt 1 lần).\n\nKinh nghiệm chọn chỗ xem đẹp nhất:\n- Đứng dưới chân cầu phía đường Trần Hưng Đạo: chụp ảnh trọn vẹn đầu rồng mà không lo bị ướt\n- Đi du thuyền sông Hàn: góc nhìn từ mặt nước bao quát cả cây cầu và các màn pháo sáng phản chiếu sông Hàn lộng lẫy.',
        type: 'USER_TRIP',
        authorUserId: '6b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', // Minh Khoa
        placeSlug: 'cau-rong-da-nang',
        seasonMonths: [4, 5, 6, 7, 8, 9],
        images: [
          { url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=1200&q=80', alt: 'Cầu Rồng Đà Nẵng rực lửa trên nền trời đêm sông Hàn' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Màn phun nước mát lạnh thu hút đông đảo du khách' }
        ]
      },
      {
        headline: 'Hội An về đêm rực rỡ sắc màu đèn lồng và đi thuyền thả hoa đăng ước nguyện',
        caption: 'Nếu ban ngày Hội An mang vẻ đẹp hoài cổ nhuốm màu thời gian thì khi màn đêm buông xuống, phố cổ lột xác thành một thế giới thần tiên huyền ảo lung linh.\n\nTiếng hát bài chòi rộn rã bên bờ sông, mùi bánh xoài, bánh tráng nướng thơm ngậy và ánh nến le lói từ hàng ngàn bông hoa đăng trôi dạt trên dòng sông Hoài tạo nên một bầu không khí lãng mạn vô bờ bến. Đây là trải nghiệm mà bất cứ ai đang yêu cũng nên một lần cùng người thương chia sẻ.',
        type: 'SEASONAL_GUIDE',
        authorUserId: '5a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', // Hoàng Yến
        placeSlug: 'pho-co-hoi-an',
        seasonMonths: [2, 3, 4, 5, 8],
        images: [
          { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80', alt: 'Những chiếc đèn lồng Hội An lung linh muôn sắc màu' },
          { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80', alt: 'Hoa đăng bập bềnh trôi trên dòng sông Hoài yên ả' }
        ]
      },
      {
        headline: 'Ghé thăm Chùa Trấn Quốc - Ngôi chùa cổ nhất thủ đô bên bờ Hồ Tây lộng gió',
        caption: 'Với lịch sử hơn 1.500 năm, Chùa Trấn Quốc từng là trung tâm Phật giáo của kinh thành Thăng Long thời Lý - Trần. Tọa lạc trên một gò đảo xanh tươi nằm ở phía đông Hồ Tây, ngôi chùa mang vẻ đẹp thanh tao thoát tục.\n\nBảo tháp lục độ đài sen cao 11 tầng, mỗi tầng gồm 6 ô cửa vòm có tượng Phật A Di Đà bằng đá trắng quý giá. Buổi chiều tà khi hoàng hôn nhuộm đỏ mặt hồ Tây mênh mông, tiếng chuông chùa ngân nga đem lại sự bình an tuyệt đối cho tâm hồn.',
        type: 'EVERGREEN_GUIDE',
        authorUserId: '6b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', // Minh Khoa
        placeSlug: 'chua-tran-quoc',
        seasonMonths: [1, 2, 3, 10, 11, 12],
        images: [
          { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', alt: 'Bảo tháp Chùa Trấn Quốc soi bóng nước mênh mông Hồ Tây' },
          { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', alt: 'Cảnh sắc thanh tịnh an yên tại ngôi chùa cổ nghìn năm' }
        ]
      },
      {
        headline: 'Trải nghiệm cáp treo Hòn Thơm vượt biển dài nhất thế giới ngắm toàn cảnh Phú Quốc',
        caption: 'Chuyến hành trình dài gần 8km trên cáp treo Hòn Thơm là một trải nghiệm thị giác ngoạn mục không thể nào quên. Ngồi trong cabin kính nhìn xuống, toàn bộ bức tranh biển trời Nam Đảo Phú Quốc hiện ra ngoạn mục với làn nước trong vắt 3 màu nước biển.\n\nNhững làng chài truyền thống rực rỡ sắc màu ghe thuyền nhấp nhô, những hòn đảo nhỏ phủ màu xanh mướt mát mắt. Khi sang đến Hòn Thơm, bạn còn được thỏa sức vui chơi tại công viên nước Aquatopia hiện đại hàng đầu Đông Nam Á.',
        type: 'PROMOTED',
        authorUserId: partnerUserId, // Partner V-Trip
        placeSlug: 'cap-treo-hon-thom-phu-quoc',
        seasonMonths: [11, 12, 1, 2, 3, 4],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Cabin cáp treo lướt qua bầu trời ngắm đại dương xanh biếc' },
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Quần đảo An Thới nhìn từ trên cao đẹp như tranh vẽ' }
        ]
      },
      {
        headline: 'Chinh phục Tứ đại đỉnh đèo Ô Quy Hồ - Hoàng hôn rực rỡ nhất miền Tây Bắc',
        caption: 'Đèo Ô Quy Hồ nối liền Lào Cai và Lai Châu, được mệnh danh là vua của các con đèo Tây Bắc bởi độ dài gần 50km cùng sự hùng vĩ tráng lệ của dãy Hoàng Liên Sơn bao quanh.\n\nĐến Cổng Trời lúc 16h30 chiều, bạn sẽ được chứng kiến khoảnh khắc mặt trời đỏ ửng như quả cầu lửa từ từ chìm xuống biển mây trắng muốt. Gió lộng buốt lạnh trên đỉnh đèo được xua tan bởi tách trà gừng nóng và ống cơm lam nướng thơm lừng bên bếp than hồng của người dân địa phương.',
        type: 'USER_TRIP',
        authorUserId: '49efc996-aa5e-4e97-9fcc-9acfa0199979', // Nguyễn Phượt Thủ
        placeSlug: 'deo-o-quy-ho-cong-troi',
        seasonMonths: [9, 10, 11, 12, 1, 2],
        images: [
          { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', alt: 'Cung đường đèo Ô Quy Hồ ngoằn ngoèo hùng vĩ giữa mây trời' },
          { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', alt: 'Hoàng hôn nhuộm vàng rực rỡ đỉnh Cổng Trời Ô Quy Hồ' }
        ]
      }
    ];

    for (let i = 0; i < postsData.length; i++) {
      const pData = postsData[i];
      const pId = createdPlaceMap.get(pData.placeSlug);

      const insPost = await client.query(`
        INSERT INTO travel_posts (
          id, "authorUserId", type, status, headline, caption, "seasonMonths",
          "publishedAt", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, 'PUBLISHED', $3, $4, $5,
          NOW() - ($6 || ' days')::interval,
          NOW() - ($6 || ' days')::interval,
          NOW()
        ) RETURNING id
      `, [
        pData.authorUserId,
        pData.type,
        pData.headline,
        pData.caption,
        pData.seasonMonths,
        (20 - i) * 2
      ]);

      const postId = insPost.rows[0].id;

      // Insert media for post (at least 1-2 images)
      for (let mIdx = 0; mIdx < pData.images.length; mIdx++) {
        await client.query(`
          INSERT INTO travel_post_media (
            id, "postId", type, "storagePath", "mimeType", "altText", "sortOrder", "createdAt"
          ) VALUES (
            gen_random_uuid(), $1, 'IMAGE', $2, 'image/jpeg', $3, $4, NOW() - ($5 || ' days')::interval
          )
        `, [
          postId,
          pData.images[mIdx].url,
          pData.images[mIdx].alt,
          mIdx,
          (20 - i) * 2
        ]);
      }

      // Link post to place if place was found
      if (pId) {
        await client.query(`
          INSERT INTO travel_post_places ("postId", "placeId", "isPrimary", "sortOrder", "createdAt")
          VALUES ($1, $2, true, 0, NOW() - ($3 || ' days')::interval)
          ON CONFLICT DO NOTHING
        `, [postId, pId, (20 - i) * 2]);
      }

      // Seed reactions
      const reactors = [adminUserId, '49efc996-aa5e-4e97-9fcc-9acfa0199979', '5a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d'];
      for (const rUser of reactors) {
        if (rUser !== pData.authorUserId) {
          await client.query(`
            INSERT INTO travel_post_reactions (id, "postId", "userId", type, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), $1, $2, 'LIKE', NOW() - ($3 || ' days')::interval, NOW())
            ON CONFLICT DO NOTHING
          `, [postId, rUser, (20 - i) * 2]);
        }
      }

      // Seed a friendly comment
      const commenterId = pData.authorUserId === adminUserId ? '5a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d' : adminUserId;
      await client.query(`
        INSERT INTO travel_post_comments (id, "postId", "userId", content, status, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, 'Bài viết chia sẻ rất chi tiết và ảnh đẹp tuyệt vời! Cảm ơn bạn nhiều!', 'PUBLISHED', NOW() - ($3 || ' days')::interval, NOW())
      `, [postId, commenterId, (20 - i) * 2]);
    }
    console.log('Finished pushing 20 rich travel posts with photos and engagement.');

    console.log('--- 7. INSERTING 14 EXCLUSIVE VOUCHERS UNDER PARTNER ACCOUNT ---');
    const vouchersData = [
      {
        title: 'Voucher Giảm 30% Đặt Phòng Khách Sạn & Resort Nghỉ Dưỡng Toàn Quốc',
        description: 'Áp dụng giảm trực tiếp 30% tổng hóa đơn phòng cho toàn bộ hệ thống khách sạn và resort đối tác của VTrip trên toàn quốc. Đầy đủ tiện ích bữa sáng buffet và hồ bơi vô cực.',
        terms: 'Mỗi tài khoản được áp dụng 01 voucher. Không áp dụng đồng thời với các chương trình khuyến mãi khác. Hạn sử dụng đến hết ngày 31/12/2026.',
        discountType: 'PERCENT',
        discountValue: 30,
        maxDiscountAmount: 500000,
        minimumSpend: 1200000,
        totalQuantity: 300,
        claimCode: 'VTRIP-HOTEL-SUMMER30',
        placeSlug: 'bai-sao-phu-quoc'
      },
      {
        title: 'Voucher Giảm 100.000đ Vé Cáp Treo & Tham Quan Bà Nà Hills',
        description: 'Giảm ngay 100.000đ khi đặt combo vé cáp treo Sun World Bà Nà Hills và buffet trưa ẩm thực quốc tế trên đỉnh núi Chúa Đà Nẵng.',
        terms: 'Áp dụng cho hóa đơn từ 800.000đ trở lên. Vui lòng xuất trình mã voucher tại quầy vé hoặc quầy check-in online.',
        discountType: 'FIXED_AMOUNT',
        discountValue: 100000,
        maxDiscountAmount: 100000,
        minimumSpend: 800000,
        totalQuantity: 500,
        claimCode: 'VTRIP-BANA-100K',
        placeSlug: 'cau-vang-ba-na-hills'
      },
      {
        title: 'Combo Tour Ẩm Thực Phố Cổ Hội An & Trải Nghiệm Thả Đèn Hoa Đăng',
        description: 'Ưu đãi giảm 20% gói Food Tour khám phá 5 món đặc sản phố Hội kèm vé đi thuyền gỗ sông Hoài thả đèn hoa đăng lung linh.',
        terms: 'Áp dụng cho đoàn từ 2 khách trở lên. Đặt trước tối thiểu 24 giờ để được chuẩn bị chu đáo nhất.',
        discountType: 'PERCENT',
        discountValue: 20,
        maxDiscountAmount: 150000,
        minimumSpend: 400000,
        totalQuantity: 250,
        claimCode: 'VTRIP-HOIAN-EATS20',
        placeSlug: 'pho-co-hoi-an'
      },
      {
        title: 'Voucher Giảm 50.000đ Cà Phê & Trà Chiều Ngắm Hoàng Hôn Đà Lạt',
        description: 'Thưởng thức set trà hoa thơm ngát và cà phê Arabica đậm đà tại quán cà phê view thung lũng đồi thông lãng mạn.',
        terms: 'Áp dụng cho hóa đơn đồ uống từ 150.000đ tại các quán cà phê liên kết với VTrip tại Đà Lạt.',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50000,
        maxDiscountAmount: 50000,
        minimumSpend: 150000,
        totalQuantity: 400,
        claimCode: 'VTRIP-DALAT-COFFEE50',
        placeSlug: 'cho-da-lat'
      },
      {
        title: 'Ưu Đãi 15% Đặt Tour Du Thuyền Khám Phá Vịnh Hạ Long 5 Sao',
        description: 'Giảm trực tiếp 15% gói tour du thuyền ngủ đêm 2 ngày 1 đêm trên vịnh Hạ Long bao gồm trọn gói các bữa ăn hải sản và chèo kayak Hang Luồn.',
        terms: 'Áp dụng giảm tối đa 800.000đ cho mỗi phòng cabin du thuyền. Không áp dụng vào các ngày lễ Tết.',
        discountType: 'PERCENT',
        discountValue: 15,
        maxDiscountAmount: 800000,
        minimumSpend: 2500000,
        totalQuantity: 150,
        claimCode: 'VTRIP-HALONG-VIP15',
        placeSlug: 'vinh-ha-long'
      },
      {
        title: 'Voucher Giảm 80.000đ Vé Cáp Treo Sun World Fansipan Legend',
        description: 'Tận hưởng chuyến du hành vượt mây chạm tay vào đỉnh Fansipan 3.143m với ưu đãi giảm 80.000đ vé cáp treo khứ hồi.',
        terms: 'Áp dụng khi mua vé qua ứng dụng VTripPlanner. Mã voucher có giá trị sử dụng trong ngày đã chọn.',
        discountType: 'FIXED_AMOUNT',
        discountValue: 80000,
        maxDiscountAmount: 80000,
        minimumSpend: 700000,
        totalQuantity: 350,
        claimCode: 'VTRIP-FANSIPAN-80K',
        placeSlug: 'dinh-fansipan-noc-nha-dong-duong'
      },
      {
        title: 'Giảm 25% Vé Tham Quan Trọn Gói Grand World Phú Quốc & Tinh Hoa Việt Nam',
        description: 'Khám phá thành phố không ngủ Grand World, vé xem show thực cảnh Tinh hoa Việt Nam và du ngoạn thuyền Gondola kênh đào Venice.',
        terms: 'Giảm tối đa 300.000đ cho đơn hàng từ 600.000đ. Mã áp dụng cho cả vé người lớn và trẻ em.',
        discountType: 'PERCENT',
        discountValue: 25,
        maxDiscountAmount: 300000,
        minimumSpend: 600000,
        totalQuantity: 200,
        claimCode: 'VTRIP-GRANDWORLD-25',
        placeSlug: 'grand-world-phu-quoc'
      },
      {
        title: 'Voucher Trải Nghiệm Ẩm Thực Chợ Bến Thành & Food Tour Sài Gòn',
        description: 'Thưởng thức bữa tối đậm vị Nam Bộ với bún riêu, bánh xèo, gỏi cuốn và cơm tấm sườn nướng tại khu ẩm thực Bến Thành.',
        terms: 'Giảm ngay 50.000đ cho hóa đơn thanh toán từ 200.000đ tại các gian hàng có logo đối tác VTrip.',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50000,
        maxDiscountAmount: 50000,
        minimumSpend: 200000,
        totalQuantity: 500,
        claimCode: 'VTRIP-SAIGON-FOOD50',
        placeSlug: 'cho-ben-thanh'
      },
      {
        title: 'Ưu Đãi Giảm 20% Vé Đi Thuyền Khám Phá Danh Thắng Tràng An Ninh Bình',
        description: 'Ngồi thuyền nan ngắm nhìn cảnh sắc non nước Tràng An huyền ảo, đi xuyên qua các hang động triệu năm tuổi và thung lũng phim trường.',
        terms: 'Áp dụng cho hóa đơn từ 500.000đ (tương đương đoàn 2-3 người). Giảm tối đa 120.000đ.',
        discountType: 'PERCENT',
        discountValue: 20,
        maxDiscountAmount: 120000,
        minimumSpend: 500000,
        totalQuantity: 300,
        claimCode: 'VTRIP-TRANGAN-20',
        placeSlug: 'quan-the-danh-thang-trang-an'
      },
      {
        title: 'Voucher Giảm 150.000đ Gói Nghỉ Dưỡng Biển Vinpearl Resort Nha Trang',
        description: 'Tận hưởng kỳ nghỉ dưỡng thiên đường tại vịnh biển Nha Trang với dịch vụ 5 sao, bãi biển riêng tư và công viên giải trí VinWonders.',
        terms: 'Áp dụng giảm ngay 150.000đ cho đơn đặt phòng từ 1.500.000đ. Đặt phòng trước tối thiểu 3 ngày.',
        discountType: 'FIXED_AMOUNT',
        discountValue: 150000,
        maxDiscountAmount: 150000,
        minimumSpend: 1500000,
        totalQuantity: 200,
        claimCode: 'VTRIP-NHA-TRANG-150K',
        placeSlug: 'thap-ba-ponagar-nha-trang'
      },
      {
        title: 'Giảm 15% Tour Tham Quan Quần Thể Di Tích Cố Đô Huế & Nghe Ca Huế Sông Hương',
        description: 'Trải nghiệm du thuyền rồng nghe ca Huế truyền thống và tham quan Đại Nội, Chùa Thiên Mụ, Lăng Khải Định trọn gói.',
        terms: 'Áp dụng cho đơn đặt tour từ 600.000đ. Giảm tối đa 180.000đ.',
        discountType: 'PERCENT',
        discountValue: 15,
        maxDiscountAmount: 180000,
        minimumSpend: 600000,
        totalQuantity: 250,
        claimCode: 'VTRIP-HUE-HERITAGE15',
        placeSlug: 'dai-noi-hue-hoang-thanh'
      },
      {
        title: 'Voucher Giảm 70.000đ Trải Nghiệm Lặn Ngắm San Hô Bãi Sao Phú Quốc',
        description: 'Lặn ngắm rạn san hô rực rỡ sắc màu và câu cá giải trí trên cano cao tốc tại vùng biển phía nam đảo Phú Quốc.',
        terms: 'Áp dụng cho hóa đơn từ 400.000đ. Bao gồm đầy đủ trang thiết bị áo phao, kính lặn và ống thở chuyên dụng.',
        discountType: 'FIXED_AMOUNT',
        discountValue: 70000,
        maxDiscountAmount: 70000,
        minimumSpend: 400000,
        totalQuantity: 300,
        claimCode: 'VTRIP-CORAL-REEF70',
        placeSlug: 'bai-sao-phu-quoc'
      },
      {
        title: 'Ưu Đãi Check-in Đồi Chè Cầu Đất & Trải Nghiệm Hái Dâu Tây Đà Lạt',
        description: 'Giảm 15% gói combo tham quan vườn dâu tây công nghệ cao, đồi chè Cầu Đất và thưởng thức ly sữa dâu tây nguyên chất.',
        terms: 'Áp dụng cho hóa đơn từ 300.000đ. Giảm tối đa 100.000đ. Sử dụng bất kỳ ngày nào trong tuần.',
        discountType: 'PERCENT',
        discountValue: 15,
        maxDiscountAmount: 100000,
        minimumSpend: 300000,
        totalQuantity: 350,
        claimCode: 'VTRIP-DALAT-BERRY15',
        placeSlug: 'cho-da-lat'
      },
      {
        title: 'Voucher Giảm 50.000đ Vé Du Thuyền Ngắm Pháo Hoa & Cầu Rồng Đà Nẵng',
        description: 'Chiêm ngưỡng toàn cảnh vẻ đẹp lung linh của thành phố Đà Nẵng từ du thuyền trên dòng sông Hàn và ngắm Cầu Rồng phun lửa.',
        terms: 'Áp dụng cho vé du thuyền từ 250.000đ. Vui lòng có mặt tại bến du thuyền trước 20h30.',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50000,
        maxDiscountAmount: 50000,
        minimumSpend: 250000,
        totalQuantity: 400,
        claimCode: 'VTRIP-DANANG-RIVER50',
        placeSlug: 'cau-rong-da-nang'
      }
    ];

    for (const v of vouchersData) {
      const pId = createdPlaceMap.get(v.placeSlug);

      const insPromo = await client.query(`
        INSERT INTO promotions (
          id, "partnerId", "createdByUserId", "reviewedByUserId",
          title, description, terms, "discountType", "discountValue",
          "maxDiscountAmount", "minimumSpend", "startAt", "endAt",
          "totalQuantity", status, "isActive", "submittedAt", "reviewedAt",
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3,
          $4, $5, $6, $7, $8,
          $9, $10, NOW() - INTERVAL '10 days', NOW() + INTERVAL '300 days',
          $11, 'APPROVED', true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days',
          NOW() - INTERVAL '10 days', NOW()
        ) RETURNING id
      `, [
        partnerId,
        partnerUserId,
        adminUserId,
        v.title,
        v.description,
        v.terms,
        v.discountType,
        v.discountValue,
        v.maxDiscountAmount,
        v.minimumSpend,
        v.totalQuantity
      ]);

      const promoId = insPromo.rows[0].id;

      // Link voucher to place if place found
      if (pId) {
        await client.query(`
          INSERT INTO promotion_places ("promotionId", "placeId", "createdAt")
          VALUES ($1, $2, NOW())
          ON CONFLICT DO NOTHING
        `, [promoId, pId]);
      }

      // Create a sample voucher claim for user
      await client.query(`
        INSERT INTO voucher_claims (
          id, "promotionId", "userId", code, status, "claimedAt", "expiresAt", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'CLAIMED', NOW() - INTERVAL '2 days', NOW() + INTERVAL '90 days', NOW(), NOW()
        )
        ON CONFLICT (code) DO NOTHING
      `, [
        promoId,
        '49efc996-aa5e-4e97-9fcc-9acfa0199979', // Nguyễn Phượt Thủ
        v.claimCode
      ]);
    }
    console.log('Finished inserting 14 rich vouchers under partner account with claim codes.');

    await client.query('COMMIT');
    console.log('=== ALL DATABASE SEEDING COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed, rolled back transaction:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
