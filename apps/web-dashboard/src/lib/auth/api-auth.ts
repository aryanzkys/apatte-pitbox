import { getSupabaseServerClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export const json401 = (message = "Unauthorized"): Response =>
  new Response(
    JSON.stringify({ error: "unauthorized", message }),
    {
      status: 401,
      headers: { "content-type": "application/json" }
    }
  );

export const requireApiUser = async (): Promise<{
  userId: string;
  email: string | null;
}> => {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return { userId: user.id, email: user.email ?? null };
};
