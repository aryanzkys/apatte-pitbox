import { proxyToFastApi } from "@/lib/ml/fastapi-proxy";

export const runtime = "nodejs";

export async function GET() {
  return proxyToFastApi("/api/ml/training/status", { method: "GET" });
}
