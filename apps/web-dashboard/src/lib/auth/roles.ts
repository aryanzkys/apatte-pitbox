import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "engineer" | "pit" | "coach";

export const isRoleAllowed = (userRole: AppRole, allowed: AppRole[]): boolean =>
  allowed.includes(userRole);

export const requiredRolesForPath = (pathname: string): AppRole[] | null => {
  if (pathname.startsWith("/dashboard/engineer")) return ["engineer"];
  if (pathname.startsWith("/dashboard/pit")) return ["pit", "engineer"];
  if (pathname.startsWith("/dashboard/coach")) return ["coach", "engineer"];
  return null;
};

export const getCurrentUserRole = async (): Promise<AppRole | null> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data?.role) return null;

  return data.role as AppRole;
};
