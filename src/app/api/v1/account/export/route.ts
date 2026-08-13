import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { createAdminClient } from "@/lib/supabase/admin";
const owned = [
  "user_preferences",
  "goals",
  "goal_revisions",
  "goal_dependencies",
  "goal_progress_events",
  "goal_skill_links",
  "goal_milestones",
  "goal_reviews",
  "goal_tags",
  "goal_relationships",
  "skills",
  "skill_merges",
  "activities",
  "activity_goal_links",
  "activity_skill_links",
  "activity_evidence",
  "quests",
  "quest_dependencies",
  "quest_subtasks",
  "quest_suggestions",
  "quest_skill_rewards",
  "quest_completions",
  "habits",
  "habit_occurrences",
  "habit_skill_links",
  "xp_transactions",
  "achievement_unlocks",
  "journal_entries",
  "notifications",
  "notification_preferences",
  "reminders",
  "focus_sessions",
  "imports",
  "integration_events",
  "integrations",
  "entitlements",
  "subscriptions",
  "support_tickets",
  "year_reviews",
  "season_user_stats",
  "challenge_members",
  "push_subscriptions",
  "public_profile_snapshots",
  "webhook_deliveries",
] as const;
export async function POST() {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { data: claims } = await auth.supabase.auth.getClaims();
    const iat = Number(claims?.claims?.iat || 0);
    if (Date.now() / 1000 - iat > 600)
      return NextResponse.json(
        {
          error: {
            code: "RECENT_AUTH_REQUIRED",
            message: "Sign in again before exporting all personal information",
          },
        },
        { status: 403 },
      );
    const admin = createAdminClient();
    if (!admin)
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_NOT_CONFIGURED",
            message: "Account export is not configured",
          },
        },
        { status: 503 },
      );
    const {data:{user}}=await auth.supabase.auth.getUser();
    const exported: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      formatVersion: 2,
      account: {
        id: auth.userId,
        email: user?.email||null,
        createdAt: user?.created_at||null,
      },
    };
    const profile = await admin
      .from("profiles")
      .select("*")
      .eq("id", auth.userId);
    if (profile.error) return failure(profile.error);
    exported.profiles = profile.data;
    for (const table of owned) {
      let select = "*";
      if (table === "push_subscriptions")
        select = "id,user_id,endpoint,user_agent,created_at,updated_at";
      if (table === "integrations")
        select =
          "id,user_id,provider,status,scopes,external_account_id,metadata,last_synced_at,created_at";
      const { data, error } = await admin
        .from(table)
        .select(select)
        .eq("user_id", auth.userId);
      if (error) return failure(error);
      exported[table] = data;
    }
    const imports = exported.imports as Array<{ id: string }>;
    const [
      importRows,
      tags,
      templates,
      reports,
      flags,
      referralCodes,
      referrals,
      friendships,
      challenges,
      apiKeys,
      webhooks,
      events,
    ] = await Promise.all([
      imports.length
        ? admin
            .from("import_rows")
            .select("*")
            .in(
              "import_id",
              imports.map((item) => item.id),
            )
        : Promise.resolve({ data: [], error: null }),
      admin.from("tags").select("*").eq("user_id", auth.userId),
      admin.from("templates").select("*").eq("owner_id", auth.userId),
      admin.from("template_reports").select("*").eq("reporter_id", auth.userId),
      admin
        .from("moderation_flags")
        .select(
          "id,object_type,object_id,reason,status,resolution,created_at,resolved_at",
        )
        .eq("reporter_id", auth.userId),
      admin
        .from("referral_codes")
        .select("code,enabled,created_at")
        .eq("referrer_id", auth.userId),
      admin
        .from("referrals")
        .select("*")
        .or(`referrer_id.eq.${auth.userId},referred_id.eq.${auth.userId}`),
      admin
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${auth.userId},addressee_id.eq.${auth.userId}`),
      admin.from("challenges").select("*").eq("creator_id", auth.userId),
      admin
        .from("api_keys")
        .select("id,name,key_prefix,scopes,last_used_at,revoked_at,created_at")
        .eq("user_id", auth.userId),
      admin
        .from("webhooks")
        .select("id,url,events,enabled,created_at")
        .eq("user_id", auth.userId),
      admin
        .from("product_events")
        .select("event_type,entity_id,occurred_at")
        .eq("user_id", auth.userId),
    ]);
    for (const result of [
      importRows,
      tags,
      templates,
      reports,
      flags,
      referralCodes,
      referrals,
      friendships,
      challenges,
      apiKeys,
      webhooks,
      events,
    ])
      if (result.error) return failure(result.error);
    Object.assign(exported, {
      import_rows: importRows.data,
      tags: tags.data,
      templates: templates.data,
      template_reports: reports.data,
      moderation_flags: flags.data,
      referral_codes: referralCodes.data,
      referrals: referrals.data,
      friendships: friendships.data,
      challenges: challenges.data,
      api_keys: apiKeys.data,
      webhooks: webhooks.data,
      product_events: events.data,
    });
    return new NextResponse(JSON.stringify(exported, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="skilltree-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
