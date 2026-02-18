import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white flex items-center justify-center px-6">
      <div className="glass-card rounded-xl p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase">Unauthorized</h1>
        <p className="text-white/70 text-sm font-mono">
          You do not have access to this area.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-bold tracking-[0.2em] rounded-lg transition-all"
          >
            BACK TO DASHBOARD
          </Link>
          <Link
            href="/login"
            className="w-full py-3 border border-white/10 text-white/80 font-bold tracking-[0.2em] rounded-lg transition-all"
          >
            LOGIN
          </Link>
        </div>
      </div>
    </div>
  );
}
