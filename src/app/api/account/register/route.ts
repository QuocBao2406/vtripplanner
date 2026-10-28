import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppRole } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ."),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
  fullName: z.string().trim().min(2, "Họ và tên cần ít nhất 2 ký tự.").max(150, "Họ và tên tối đa 150 ký tự."),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Dữ liệu đăng ký không hợp lệ." },
      { status: 400 }
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message || "Thông tin đăng ký không hợp lệ." },
      { status: 400 }
    );
  }

  const { email, password, fullName } = parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json(
      { ok: false, message: "Cấu hình xác thực hệ thống chưa sẵn sàng." },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Create or get user in Supabase Auth bypassing email rate limit
    let authUserId: string;

    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (existingAuth) {
      return NextResponse.json(
        { ok: false, message: "Email này đã được đăng ký tài khoản. Vui lòng đăng nhập." },
        { status: 400 }
      );
    }

    const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        display_name: fullName,
      },
    });

    if (createError || !newAuth?.user) {
      return NextResponse.json(
        { ok: false, message: createError?.message || "Không thể khởi tạo tài khoản trên hệ thống." },
        { status: 400 }
      );
    }

    authUserId = newAuth.user.id;

    // 2. Synchronize to PostgreSQL Database
    const userRole = await prisma.role.findUnique({
      where: { name: AppRole.USER },
      select: { id: true },
    });

    await prisma.user.upsert({
      where: { id: authUserId },
      create: {
        id: authUserId,
        email,
        isActive: true,
        profile: {
          create: {
            fullName,
            displayName: fullName,
          },
        },
        ...(userRole
          ? {
              userRoles: {
                create: {
                  roleId: userRole.id,
                },
              },
            }
          : {}),
      },
      update: {
        email,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Tạo tài khoản thành công!",
        user: {
          id: authUserId,
          email,
          fullName,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Đã xảy ra lỗi khi tạo tài khoản." },
      { status: 500 }
    );
  }
}
