import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";

type CookieOptions = Record<string, unknown>;

export const getSupabaseServerClient = async (): Promise<SupabaseClient> => {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          cookieStore.set({ name, value, ...(options ?? {}) });
        },
        remove: (name: string, options: CookieOptions) => {
          cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
        }
      }
    }
  );
};

export const getServerUser = async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user ?? null;
};
