import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminStorageClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "SUPABASE_STORAGE_ADMIN_NOT_CONFIGURED",
    );
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
