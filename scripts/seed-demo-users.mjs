import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pool = new pg.Pool({ connectionString, max: 1 });

const DEMO_USERS = [
  {
    email: "admin.vtripplanner@example.com",
    password: "Password123@",
    fullName: "VTripPlanner Admin",
    role: "ADMIN",
  },
  {
    email: "partner.vtripplanner@example.com",
    password: "Password123@",
    fullName: "Đối Tác Du Lịch Demo",
    role: "PARTNER",
  },
  {
    email: "user.vtripplanner@example.com",
    password: "Password123@",
    fullName: "Nguyễn Phượt Thủ",
    role: "USER",
  },
];

async function main() {
  console.log("🚀 Bắt đầu tạo 3 tài khoản thử nghiệm trên Supabase Local...");
  const client = await pool.connect();

  try {
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingUsers = listData?.users || [];

    for (const demo of DEMO_USERS) {
      console.log(`\n--- Tạo/Cập nhật ${demo.role}: ${demo.email} ---`);

      let userId;
      const found = existingUsers.find((u) => u.email === demo.email);

      if (found) {
        userId = found.id;
        console.log(`Đã có trong Auth với ID: ${userId}, cập nhật mật khẩu...`);
        await supabase.auth.admin.updateUserById(userId, {
          password: demo.password,
          email_confirm: true,
          user_metadata: { full_name: demo.fullName },
        });
      } else {
        const { data: userData, error: createError } =
          await supabase.auth.admin.createUser({
            email: demo.email,
            password: demo.password,
            email_confirm: true,
            user_metadata: { full_name: demo.fullName },
          });

        if (createError) {
          console.error("Lỗi tạo user:", createError);
          continue;
        }
        userId = userData.user.id;
        console.log(`✅ Đã tạo mới user trong Auth với ID: ${userId}`);
      }

      // 2. Tạo trong public.users
      await client.query(
        `INSERT INTO public.users (id, email, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, true, now(), now())
         ON CONFLICT (id) DO UPDATE SET "updatedAt" = now()`,
        [userId, demo.email]
      );

      // 3. Tạo trong public.user_profiles
      await client.query(
        `INSERT INTO public.user_profiles ("userId", "fullName", "displayName", "createdAt", "updatedAt")
         VALUES ($1, $2, $2, now(), now())
         ON CONFLICT ("userId") DO UPDATE SET "fullName" = $2, "displayName" = $2, "updatedAt" = now()`,
        [userId, demo.fullName]
      );

      // 4. Lấy hoặc tạo role trong public.roles (enum AppRole: USER, PARTNER, ADMIN)
      const roleRes = await client.query(
        `INSERT INTO public.roles (name, "updatedAt")
         VALUES ($1::"AppRole", now())
         ON CONFLICT (name) DO UPDATE SET "updatedAt" = now()
         RETURNING id`,
        [demo.role]
      );
      const roleId = roleRes.rows[0].id;

      // 5. Gán role trong public.user_roles
      await client.query(
        `INSERT INTO public.user_roles ("userId", "roleId")
         VALUES ($1, $2)
         ON CONFLICT ("userId", "roleId") DO NOTHING`,
        [userId, roleId]
      );

      console.log(`✅ Đã kích hoạt quyền ${demo.role} cho ${demo.email}`);
    }

    console.log("\n🎉 HOÀN TẤT TẠO TOÀN BỘ TÀI KHOẢN DEMO THÀNH CÔNG!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
