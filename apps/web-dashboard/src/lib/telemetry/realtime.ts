import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TelemetryRow } from "./view-model";

type SubscribeOptions = {
  onRow: (row: TelemetryRow) => void;
  onStatus?: (status: "subscribed" | "error" | "closed") => void;
  onError?: (message: string) => void;
};

export const subscribeLatestTelemetry = (opts: SubscribeOptions) => {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase.channel("telemetry_latest");

  let closed = false;

  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "telemetry_raw" },
    payload => {
      const row = payload.new as TelemetryRow | undefined;
      if (row?.metrics || row?.payload) {
        opts.onRow(row);
        return;
      }

      fetch("/api/telemetry/latest")
        .then(res => res.json())
        .then(data => {
          if (data?.latest) {
            opts.onRow(data.latest as TelemetryRow);
          }
        })
        .catch(err => {
          opts.onError?.(err instanceof Error ? err.message : String(err));
        });
    }
  );

  channel.subscribe(status => {
    if (status === "SUBSCRIBED") {
      opts.onStatus?.("subscribed");
      return;
    }
    if (status === "CLOSED") {
      if (!closed) opts.onStatus?.("closed");
      return;
    }
    if (status === "CHANNEL_ERROR") {
      opts.onStatus?.("error");
    }
  });

  return {
    unsubscribe: () => {
      closed = true;
      supabase.removeChannel(channel);
    }
  };
};
