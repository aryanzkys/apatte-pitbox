import { proxyToFastApi } from "@/lib/ml/fastapi-proxy";

export const runtime = "nodejs";

export async function GET() {
  return proxyToFastApi("/api/ml/maps/active");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyToFastApi("/api/ml/maps/active", { method: "POST", body });
}
