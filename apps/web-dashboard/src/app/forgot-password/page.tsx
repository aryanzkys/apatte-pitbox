"use client";

import { useState } from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess("Link reset telah dikirim. Cek email Anda.");
    setLoading(false);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark h-screen flex flex-col overflow-auto relative circuit-bg font-display">
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M100,500 L300,500 L400,300 L600,300 L700,500 L900,500 L850,700 L150,700 Z"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <circle cx="500" cy="500" r="400" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
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
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative px-4">
        <div className="w-full max-w-120 z-20">
          <div className="mb-8">
            <h1 className="text-white tracking-widest text-3xl font-bold leading-tight text-center mb-2 uppercase">
              Reset Access Key
            </h1>
            <p className="text-white/40 text-xs font-mono font-normal leading-normal text-center tracking-widest">
              Masukkan email untuk menerima link pergantian password
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

              {error ? <div className="text-critical text-xs font-mono tracking-widest">{error}</div> : null}
              {success ? <div className="text-accent-electric text-xs font-mono tracking-widest">{success}</div> : null}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 bg-primary hover:bg-blue-700 text-white font-bold tracking-[0.2em] rounded-lg transition-all flex items-center justify-center gap-3 group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="truncate">{loading ? "SENDING..." : "SEND RESET LINK"}</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  send
                </span>
              </button>

              <div className="text-center">
                <a
                  className="text-[10px] text-white/40 hover:text-primary transition-colors font-mono"
                  href="/login"
                >
                  BACK TO LOGIN
                </a>
              </div>
            </div>

            <div className="h-1 bg-linear-to-r from-transparent via-primary to-transparent opacity-50" />
          </div>

          <p className="text-white/20 text-[9px] text-center mt-6 tracking-[0.3em] font-mono">
            APATTE TELEMETRY SYSTEM | SHELL ECO-MARATHON 2026 | CLASSIFIED
          </p>
        </div>
      </main>
    </div>
  );
}
