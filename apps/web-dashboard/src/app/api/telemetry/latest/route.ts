import { json401, requireApiUser, UnauthorizedError } from "@/lib/auth/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildVMFromRow, createEmptyVM, type TelemetryRow } from "@/lib/telemetry/view-model";
import { env } from "@/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiUser();
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("telemetry_raw")
      .select("ts, topic, payload, metrics, device_id, session_id")
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: "forbidden", message: error.message }),
        {
          status: 403,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const latest = data as TelemetryRow | null;
    const vm = latest
      ? buildVMFromRow(latest, { staleSeconds: env.NEXT_PUBLIC_DASHBOARD_STALE_S })
      : createEmptyVM();

    return new Response(JSON.stringify({ ok: true, latest, vm }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return json401();
    }
    return new Response(
      JSON.stringify({ ok: false, error: "server_error", message: "Unexpected error" }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
}
