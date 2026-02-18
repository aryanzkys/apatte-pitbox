import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/env";
import { requiredRolesForPath, isRoleAllowed } from "@/lib/auth/roles";

const updateSession = async (request: NextRequest) => {
  const response = NextResponse.next();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: name => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { response, supabase, user };
};

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboardRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (isDashboardRoute && user) {
    const requiredRoles = requiredRolesForPath(request.nextUrl.pathname);
    if (requiredRoles) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile?.role || !isRoleAllowed(profile.role, requiredRoles)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/unauthorized";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  if (isLoginRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/unauthorized"]
};
