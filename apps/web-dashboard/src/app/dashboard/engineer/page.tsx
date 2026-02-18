import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { AuthGate } from "@/components/auth/AuthGate";

export default async function EngineerPage() {
  const { email, role } = await requireRole(["engineer"]);

  return (
    <AuthGate>
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center px-6">
      <div className="glass-card rounded-xl p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase">Engineer</h1>
        <p className="text-white/70 text-sm font-mono">{email}</p>
        <p className="text-white/50 text-xs font-mono uppercase">Role: {role}</p>
        <p className="text-white/60 text-sm">Coming soon.</p>
        <Link
          href="/dashboard"
          className="w-full inline-block py-3 bg-primary hover:bg-blue-700 text-white font-bold tracking-[0.2em] rounded-lg transition-all"
        >
          BACK TO DASHBOARD
        </Link>
      </div>
      </div>
    </AuthGate>
  );
}
