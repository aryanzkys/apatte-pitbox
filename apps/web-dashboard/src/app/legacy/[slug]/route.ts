import { promises as fs } from "node:fs";
import path from "node:path";

const LEGACY_PAGE_MAP: Record<string, string> = {
  index: "index.html",
  overview: "overview.html",
  "ph-h2": "ph-h2.html",
  "uc-be": "uc-be.html",
  setting: "setting.html"
};

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

const rewriteLinksAndAssets = (html: string): string => {
  const rewrittenLinks = html.replace(
    /\b(index|overview|ph-h2|uc-be|setting)\.html\b/g,
    "/legacy/$1"
  );

  return rewrittenLinks.replace(
    /(["'(])(?:\.\/)?(css|js|logos)\//g,
    "$1/legacy-assets/$2/"
  );
};

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const fileName = LEGACY_PAGE_MAP[slug];

  if (!fileName) {
    return new Response("Not Found", { status: 404 });
  }

  const rootStaticDir = await resolveRootStaticDir();
  const filePath = path.join(rootStaticDir, fileName);

  try {
    const html = await fs.readFile(filePath, "utf8");
    const rewritten = rewriteLinksAndAssets(html);

    return new Response(rewritten, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  } catch {
    return new Response("Legacy page unavailable", { status: 500 });
  }
}
