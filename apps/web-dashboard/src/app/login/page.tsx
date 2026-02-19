"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type MqttStatus = "connected" | "not_connected" | "not_configured";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mqttStatus, setMqttStatus] = useState<MqttStatus>("not_configured");
  const [mqttLatency, setMqttLatency] = useState<string>("--");
  const [mqttPackets, setMqttPackets] = useState<string>("--");
  const [mqttUptime, setMqttUptime] = useState<string>("--:--:--");

  const mqttUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL ?? "";

  const statusLabel = useMemo(() => {
    if (mqttStatus === "connected") return "CONNECTED";
    if (mqttStatus === "not_connected") return "NOT CONNECTED";
    return "NOT CONFIGURED";
  }, [mqttStatus]);

  const statusColor = useMemo(() => {
    if (mqttStatus === "connected") return "bg-accent-electric";
    if (mqttStatus === "not_connected") return "bg-critical";
    return "bg-warning";
  }, [mqttStatus]);

  useEffect(() => {
    if (!mqttUrl) {
      setMqttStatus("not_configured");
      setMqttLatency("--");
      setMqttPackets("--");
      setMqttUptime("--:--:--");
      return;
    }

    if (!mqttUrl.startsWith("ws://") && !mqttUrl.startsWith("wss://")) {
      setMqttStatus("not_connected");
      setMqttLatency("--");
      setMqttPackets("--");
      setMqttUptime("--:--:--");
      return;
    }

    let ws: WebSocket | null = null;
    let uptimeTimer: number | null = null;
    const startTime = Date.now();

    const tickUptime = () => {
      const diff = Date.now() - startTime;
      const seconds = Math.floor(diff / 1000);
      const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const secs = String(seconds % 60).padStart(2, "0");
      setMqttUptime(`${hours}:${minutes}:${secs}`);
    };

    ws = new WebSocket(mqttUrl);
    const connectStart = Date.now();

    ws.onopen = () => {
      setMqttStatus("connected");
      setMqttLatency(`${Date.now() - connectStart}ms`);
      setMqttPackets("0");
      tickUptime();
      uptimeTimer = window.setInterval(tickUptime, 1000);
    };

    ws.onerror = () => {
      setMqttStatus("not_connected");
      setMqttLatency("--");
      setMqttPackets("--");
      setMqttUptime("--:--:--");
    };

    ws.onclose = () => {
      setMqttStatus("not_connected");
      setMqttLatency("--");
      setMqttPackets("--");
      setMqttUptime("--:--:--");
    };

    return () => {
      if (uptimeTimer) window.clearInterval(uptimeTimer);
      ws?.close();
    };
  }, [mqttUrl]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="bg-background-light dark:bg-background-dark h-screen flex flex-col overflow-auto relative circuit-bg font-display">
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 1000"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100,500 L300,500 L400,300 L600,300 L700,500 L900,500 L850,700 L150,700 Z"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <circle
            cx="500"
            cy="500"
            r="400"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-white/5 bg-background-dark/80 backdrop-blur-md px-10 py-3 z-20">
        <div className="flex items-center gap-4 text-white">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-widest uppercase">
            Apatte Racing Team
          </h2>
        </div>
        <div className="flex flex-1 justify-end gap-8">
          <div className="flex items-center gap-6">
            <span className="text-white/40 text-[10px] font-mono tracking-tighter uppercase">
              Status: Authentication Required
            </span>
            <span className="text-white/40 text-[10px] font-mono tracking-tighter uppercase">
              Ver: 2026.4.1
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative px-4">
        <div className="w-full max-w-[480px] z-20">
          <div className="mb-8">
            <h1 className="text-white tracking-widest text-3xl font-bold leading-tight text-center mb-2 uppercase">
              Initialize Session
            </h1>
            <p className="text-white/40 text-xs font-mono font-normal leading-normal text-center tracking-widest">
              Enter your credentials to access the Apatte Pitbox Command Center
            </p>
          </div>

          <div className="glass-card rounded-xl overflow-hidden relative">
            <div className="bg-black/40 p-6 border-b border-white/5">
              <div className="flex items-center justify-center">
                <Image
                  src="/logos1.png"
                  alt="Apatte Pitbox"
                  width={360}
                  height={120}
                  priority
                  className="opacity-90 drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                />
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-[10px] font-bold tracking-widest uppercase ml-1">
                    Engineer Identifier (Email)
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-accent-electric transition-colors">
                      person
                    </span>
                    <input
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric/50 transition-all font-mono placeholder:text-white/10"
                      placeholder="Your email address"
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-[10px] font-bold tracking-widest uppercase ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-accent-electric transition-colors">
                      lock
                    </span>
                    <input
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric/50 transition-all font-mono placeholder:text-white/10"
                      placeholder="Your password"
                      type="password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-[10px] font-bold tracking-widest uppercase ml-1">
                    Station Role
                  </label>
                  <select
                    value={role}
                    onChange={event => setRole(event.target.value)}
                    className="w-full pl-4 pr-4 py-4 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric/50 transition-all font-mono"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="ph-h2">PH-H2 Team</option>
                    <option value="uc-be">UC-BE Team</option>
                  </select>
                </div>
              </div>

              {error ? (
                <div className="text-critical text-xs font-mono tracking-widest">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-4 bg-primary hover:bg-blue-700 text-white font-bold tracking-[0.2em] rounded-lg transition-all flex items-center justify-center gap-3 group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="truncate">
                    {loading ? "INITIALIZING..." : "INITIALIZE SESSION"}
                  </span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    bolt
                  </span>
                </button>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-electric animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[10px] text-white/40 font-mono">
                      ENCRYPTED LINK ACTIVE
                    </span>
                  </div>
                  <a
                    className="text-[10px] text-white/40 hover:text-primary transition-colors font-mono"
                    href="/forgot-password"
                  >
                    FORGOT KEY?
                  </a>
                </div>
              </div>
            </div>

            <div className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          </div>

          <p className="text-white/20 text-[9px] text-center mt-6 tracking-[0.3em] font-mono">
            APATTE TELEMETRY SYSTEM | SHELL ECO-MARATHON 2026 | CLASSIFIED
          </p>
        </div>
      </main>

      <footer className="bg-black/60 backdrop-blur-md border-t border-white/5 py-2 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 font-mono tracking-tighter">
              MQTT:
            </span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
              <span className="text-[10px] text-white/80 font-mono uppercase">
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 font-mono tracking-tighter">
              TELEMETRY PACKETS:
            </span>
            <span className="text-[10px] text-white/80 font-mono">
              {mqttStatus === "connected" ? mqttPackets : "--"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 font-mono tracking-tighter">
              LATENCY:
            </span>
            <span className="text-[10px] text-accent-electric font-mono">
              {mqttStatus === "connected" ? mqttLatency : "--"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white/40 text-[14px]">
              schedule
            </span>
            <span className="text-[10px] text-white/60 font-mono tracking-tighter uppercase">
              Uptime: {mqttStatus === "connected" ? mqttUptime : "--:--:--"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
