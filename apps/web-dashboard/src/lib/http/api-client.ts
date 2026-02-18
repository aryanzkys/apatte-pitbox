"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const response = await fetch(input, init);

  if (response.status !== 401) {
    return response;
  }

  const supabase = getSupabaseBrowserClient();
  await supabase.auth.refreshSession();

  const retryResponse = await fetch(input, init);
  if (retryResponse.status !== 401) {
    return retryResponse;
  }

  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }

  return retryResponse;
};
