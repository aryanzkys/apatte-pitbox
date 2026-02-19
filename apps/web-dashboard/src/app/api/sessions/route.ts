import { json401, requireApiUser, UnauthorizedError } from "@/lib/auth/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiUser();
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("sessions")
      .select("id, name, status, started_at, ended_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return new Response(
        JSON.stringify({ error: "forbidden", message: error.message }),
        {
          status: 403,
          headers: { "content-type": "application/json" }
        }
      );
    }

    return new Response(JSON.stringify({ sessions: data ?? [] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
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
