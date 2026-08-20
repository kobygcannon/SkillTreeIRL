"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/security/redirect";
import { publicRegistrationReady } from "@/lib/registration";
function callbackUrl(next: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    url = new URL("/auth/callback", base);
  url.searchParams.set("next", next);
  return url.toString();
}
export async function signIn(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in?error=not_configured");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = safeReturnPath(String(formData.get("next") || ""));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error)
    redirect(
      `/sign-in?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  redirect(next);
}
export async function signUp(formData: FormData) {
  if (!publicRegistrationReady())
    redirect("/sign-in?mode=signup&error=registration_closed");
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in?error=not_configured");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: callbackUrl("/onboarding"),
    },
  });
  if (error)
    redirect(`/sign-in?mode=signup&error=${encodeURIComponent(error.message)}`);
  if (data.session) redirect("/onboarding");
  redirect("/sign-in?message=check_email");
}
export async function magicLink(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in?error=not_configured");
  const email = String(formData.get("email") || "");
  const next = safeReturnPath(String(formData.get("next") || ""));
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl(next),
      shouldCreateUser: false,
    },
  });
  if (error)
    redirect(
      `/sign-in?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  redirect("/sign-in?message=check_email");
}
export async function oauth(formData: FormData) {
  const provider = String(formData.get("provider"));
  const next = safeReturnPath(String(formData.get("next") || ""));
  if (provider !== "google" && provider !== "apple")
    redirect("/sign-in?error=unsupported_provider");
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in?error=not_configured");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl(next),
    },
  });
  if (error || !data.url)
    redirect(
      `/sign-in?error=${encodeURIComponent(error?.message || "OAuth could not start")}&next=${encodeURIComponent(next)}`,
    );
  redirect(data.url);
}
export async function requestRecovery(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/sign-in?error=not_configured");
  const email = String(formData.get("email") || "");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback?next=/update-password`,
  });
  if (error) redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  redirect("/sign-in?message=check_email");
}
