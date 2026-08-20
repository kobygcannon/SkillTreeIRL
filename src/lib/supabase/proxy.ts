import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { reportProductionError } from "@/lib/monitoring";
import { isAuthenticationServiceUnavailable } from "@/lib/supabase/auth-error";

export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error && isAuthenticationServiceUnavailable(error)) {
    void reportProductionError({
      source: "provider",
      message: "Supabase Auth is unavailable at the request boundary",
      severity: "error",
      fingerprint: "provider-degradation-supabase-auth",
    });
    const headers = { "retry-after": "30", "cache-control": "no-store" };
    return request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json(
          {
            error: {
              code: "AUTH_SERVICE_UNAVAILABLE",
              message:
                "Sign-in verification is temporarily unavailable. Please retry shortly.",
            },
          },
          { status: 503, headers },
        )
      : new NextResponse(
          "Sign-in verification is temporarily unavailable. Please retry shortly.",
          { status: 503, headers },
        );
  }
  const signedIn = Boolean(data.user);
  if (
    !signedIn &&
    request.cookies
      .getAll()
      .some(
        ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
      )
  )
    await supabase.auth.signOut({ scope: "local" });
  const pathname = request.nextUrl.pathname,
    protectedPath =
      [
        "/app",
        "/onboarding",
        "/mfa",
        "/settings",
        "/community",
        "/tools",
        "/templates",
        "/referrals",
        "/admin",
        "/workspace",
        "/skills",
        "/activities",
        "/quests",
        "/habits",
        "/journal",
        "/achievements",
      ].some((path) => pathname.startsWith(path)) ||
      /^\/goals\/[^/]+/.test(pathname);
  const redirect = (target: URL) => {
    const redirected = NextResponse.redirect(target);
    response.cookies
      .getAll()
      .forEach((cookie) => redirected.cookies.set(cookie));
    return redirected;
  };
  if (protectedPath && !signedIn) {
    const target = request.nextUrl.clone(),
      next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    target.pathname = "/sign-in";
    target.search = "";
    target.searchParams.set("next", next);
    return redirect(target);
  }
  return response;
}
