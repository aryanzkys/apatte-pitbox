import { UnauthorizedError, json401, requireApiUser } from "@/lib/auth/api-auth";

const BASE_URL = process.env.ML_FASTAPI_BASE_URL?.trim() || "http://127.0.0.1:8000";

const buildUrl = (path: string) => `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

type ProxyOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

export const proxyToFastApi = async (path: string, options: ProxyOptions = {}) => {
  try {
    await requireApiUser();

    const response = await fetch(buildUrl(path), {
      method: options.method ?? "GET",
      headers: {
        "content-type": "application/json"
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });

    const text = await response.text();

    return new Response(text, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" }
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return json401();
    }

    return new Response(
      JSON.stringify({
        error: "proxy_error",
        message: "Failed to reach FastAPI backend",
        details: String(error)
      }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
};
