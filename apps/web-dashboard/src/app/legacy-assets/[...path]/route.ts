import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT_CANDIDATES = [
  process.cwd(),
  path.resolve(process.cwd(), ".."),
  path.resolve(process.cwd(), "../.."),
  path.resolve(process.cwd(), "../../..")
];

const resolveRootStaticDir = async () => {
  for (const candidate of ROOT_CANDIDATES) {
    try {
      await fs.access(path.join(candidate, "index.html"));
      return candidate;
    } catch {
      // continue
    }
  }

  return process.cwd();
};

const MIME_BY_EXT: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const ALLOWED_TOP_LEVEL = new Set(["css", "js", "logos"]);

export async function GET(
  _: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const rootStaticDir = await resolveRootStaticDir();

  if (!segments?.length || !ALLOWED_TOP_LEVEL.has(segments[0])) {
    return new Response("Not Found", { status: 404 });
  }

  const requestedPath = path.resolve(rootStaticDir, ...segments);
  if (!requestedPath.startsWith(rootStaticDir)) {
    return new Response("Forbidden", { status: 403 });
  }

  const ext = path.extname(requestedPath).toLowerCase();
  const contentType = MIME_BY_EXT[ext];
  if (!contentType) {
    return new Response("Unsupported file type", { status: 415 });
  }

  try {
    const data = await fs.readFile(requestedPath);
    return new Response(data, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=300"
      }
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
