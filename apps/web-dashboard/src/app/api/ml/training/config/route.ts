import { proxyToFastApi } from "@/lib/ml/fastapi-proxy";

export const runtime = "nodejs";

export async function GET() {
  return proxyToFastApi("/api/ml/training/config", { method: "GET" });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyToFastApi("/api/ml/training/config", { method: "POST", body });
}
