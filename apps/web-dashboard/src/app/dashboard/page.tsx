"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark text-white">
      <div className="glass-card rounded-xl p-8 w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase">Dashboard</h1>
        <p className="text-white/70 font-mono text-sm">
          Logged in as {user.email}
        </p>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-bold tracking-[0.2em] rounded-lg transition-all"
        >
          LOGOUT
        </button>
      </div>
    </div>
  );
}
