import Link from "next/link";
import { AuthGate } from "@/components/auth/AuthGate";
import { MLSettingsPanel } from "@/components/ml/MLSettingsPanel";
import { requireRole } from "@/lib/auth/require-role";

export default async function EngineerSettingsPage() {
  await requireRole(["engineer"]);

  return (
    <AuthGate>
      <main className="min-h-screen bg-background-dark text-white px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Engineer Settings</h1>
              <p className="text-sm text-white/60">Map manager + ML training controls (Node API bridged to FastAPI)</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg border border-border-dark bg-surface-dark px-3 py-2 text-sm hover:bg-surface-dark/70"
            >
              Back to Dashboard
            </Link>
          </div>

          <MLSettingsPanel />
        </div>
      </main>
    </AuthGate>
  );
}
