import "server-only";

import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createClient as createCookieClient } from "./server";

/**
 * Tạo Supabase client mang danh tính của người gọi API.
 *
 * - Request từ mobile gửi `Authorization: Bearer <access_token>` và không có
 *   cookie, nên client dựa trên cookie sẽ chạy như người dùng ẩn danh và bị
 *   chính sách RLS của Storage chặn. Khi có Bearer token thật, client này
 *   chuyển tiếp token để Storage nhận đúng `auth.uid()`.
 * - Request từ web (cookie) giữ nguyên hành vi cũ.
 */
export async function createRequestSupabaseClient() {
  const authorization = (await headers()).get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  // Token giả (mock-*) chỉ dùng khi Supabase offline, không phải JWT hợp lệ.
  if (token && !token.startsWith("mock-")) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return createCookieClient();
}
