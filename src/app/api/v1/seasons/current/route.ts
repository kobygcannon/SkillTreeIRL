import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

export async function GET() {
  const auth = await authenticated();
  if ("error" in auth) return auth.error;
  const { error: refreshError } = await auth.supabase.rpc("refresh_season_stats", { p_user_id: auth.userId });
  if (refreshError) return failure(refreshError);
  const { data: season, error: seasonError } = await auth.supabase.from("seasons").select("id,name,starts_at,ends_at,metadata").eq("is_active", true).maybeSingle();
  if (seasonError) return failure(seasonError);
  if (!season) return NextResponse.json({ data: null });
  const { data: stats, error: statsError } = await auth.supabase.from("season_user_stats").select("xp_earned,activities,quests_completed,habits_completed,updated_at").eq("season_id", season.id).single();
  if (statsError) return failure(statsError);
  return NextResponse.json({ data: { ...season, stats, generatedAt: new Date().toISOString() } });
}
