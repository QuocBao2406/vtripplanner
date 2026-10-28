import { headers, cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import { createClient } from "../supabase/server";

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const cookieToken =
      cookieStore.get("mock-token")?.value ||
      cookieStore.get("vtrip_mock_role")?.value;

    if (cookieToken === "mock-admin-token" || cookieToken === "admin") {
      return {
        id: "15d6690f-9d5e-42fc-9e5e-fc6ed35735cc",
        email: "admin.vtripplanner@example.com",
        app_metadata: {},
        user_metadata: { full_name: "Quản Trị Viên", display_name: "Admin VTrip" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User;
    }
    if (cookieToken === "mock-partner-token" || cookieToken === "partner") {
      return {
        id: "2e74f85b-fc3d-4ed1-9325-2b06028b2db8",
        email: "partner.vtripplanner@example.com",
        app_metadata: {},
        user_metadata: { full_name: "Đối Tác Du Lịch", display_name: "Đối Tác VTrip" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User;
    }
    if (cookieToken === "mock-user-token" || cookieToken === "user") {
      return {
        id: "49efc996-aa5e-4e97-9fcc-9acfa0199979",
        email: "user.vtripplanner@example.com",
        app_metadata: {},
        user_metadata: { full_name: "Người Dùng Thử Nghiệm", display_name: "Du Khách VTrip" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User;
    }

    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token === "mock-admin-token") {
        return {
          id: "15d6690f-9d5e-42fc-9e5e-fc6ed35735cc",
          email: "admin.vtripplanner@example.com",
          app_metadata: {},
          user_metadata: { full_name: "Quản Trị Viên", display_name: "Admin VTrip" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as User;
      }
      if (token === "mock-partner-token") {
        return {
          id: "2e74f85b-fc3d-4ed1-9325-2b06028b2db8",
          email: "partner.vtripplanner@example.com",
          app_metadata: {},
          user_metadata: { full_name: "Đối Tác Du Lịch", display_name: "Đối Tác VTrip" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as User;
      }
      if (token === "mock-user-token") {
        return {
          id: "49efc996-aa5e-4e97-9fcc-9acfa0199979",
          email: "user.vtripplanner@example.com",
          app_metadata: {},
          user_metadata: { full_name: "Người Dùng Thử Nghiệm", display_name: "Du Khách VTrip" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as User;
      }

      if (token) {
        try {
          const client = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          );
          const {
            data: { user },
            error,
          } = await client.auth.getUser(token);

          if (!error && user) {
            return user;
          }
        } catch {
          // Supabase offline or unreachable
        }
      }
    }
  } catch (err) {
    // Header reading might throw in non-request contexts
  }

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}
