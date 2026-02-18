import { json401, requireApiUser, UnauthorizedError } from "@/lib/auth/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId, email } = await requireApiUser();
    const supabase = getSupabaseServerClient();

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    return new Response(
      JSON.stringify({
        user: {
          id: userId,
          email,
          role: data?.role ?? null
        }
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return json401();
    }
    return new Response(
      JSON.stringify({ error: "server_error", message: "Unexpected error" }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
}
