import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/auth/roles";
import { isRoleAllowed } from "@/lib/auth/roles";

export const requireRole = async (
  allowedRoles: AppRole[]
): Promise<{ email: string; role: AppRole }> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data?.role) {
    redirect("/unauthorized");
  }

  const role = data.role as AppRole;
  if (!isRoleAllowed(role, allowedRoles)) {
    redirect("/unauthorized");
  }

  return { email: user.email, role };
};
