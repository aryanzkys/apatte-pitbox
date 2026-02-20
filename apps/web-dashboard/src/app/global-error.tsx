"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background-dark text-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full glass-card rounded-xl p-6 border border-border-dark">
          <h1 className="text-xl font-bold uppercase tracking-widest mb-2">System Fault</h1>
          <p className="text-sm text-white/60 mb-4">
            Terjadi kesalahan saat memuat aplikasi. Silakan coba ulang.
          </p>
          <div className="text-xs text-white/40 font-mono mb-4">
            {error?.message ?? "Unexpected error"}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 bg-primary rounded text-xs font-bold uppercase tracking-widest hover:bg-primary/80"
            >
              Retry
            </button>
            <a
              href="/login"
              className="inline-flex px-4 py-2 bg-border-dark rounded text-xs font-bold uppercase tracking-widest hover:bg-primary/40"
            >
              Back to Login
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
