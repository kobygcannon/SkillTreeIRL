import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticated();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const mergeResult=await auth.supabase.from("skill_merges").select("source_skill_id").eq("retained_skill_id",id);
  if(mergeResult.error)return failure(mergeResult.error);
  const ledgerSkillIds=[id,...(mergeResult.data||[]).map(row=>row.source_skill_id)];
  const [skillResult, lifetimeXpResult, xpResult, activityResult, goalResult] = await Promise.all([
    auth.supabase.from("skills").select("id,name,category,parent_id,discovered_at,archived_at,metadata").eq("id", id).single(),
    auth.supabase.rpc("skill_total_xp", { p_skill_id: id }),
    auth.supabase.from("xp_transactions").select("id,amount,source_type,reason,confidence_level,created_at").in("skill_id",ledgerSkillIds).order("created_at", { ascending: false }).limit(200),
    auth.supabase.from("activity_skill_links").select("xp_awarded,activities(id,description,occurred_at,duration_minutes,confidence)").eq("skill_id", id).order("activity_id", { ascending: false }).limit(50),
    auth.supabase.from("goal_skill_links").select("weight,goals(id,title,status,current_value,target_value,unit,currency)").eq("skill_id", id).limit(50),
  ]);
  if (skillResult.error) return NextResponse.json({ error: { code: "SKILL_NOT_FOUND", message: "Skill was not found" } }, { status: 404 });
  const relatedError = lifetimeXpResult.error || xpResult.error || activityResult.error || goalResult.error;
  if (relatedError) return failure(relatedError);
  const transactions = xpResult.data || [];
  const lifetimeXp = Number(lifetimeXpResult.data || 0);
  const last30Days = transactions.filter((transaction) => Date.now() - new Date(transaction.created_at).getTime() <= 30 * 86400000).reduce((total, transaction) => total + transaction.amount, 0);
  const sourceTotals = transactions.reduce<Record<string, number>>((totals, transaction) => { totals[transaction.source_type] = (totals[transaction.source_type] || 0) + transaction.amount; return totals; }, {});
  return NextResponse.json({ data: { ...skillResult.data, lifetimeXp, last30Days, sourceTotals, transactions, activities: activityResult.data || [], goals: goalResult.data || [] } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) { const name = String(body.name).trim(); if (!name || name.length > 100) return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Skill name must be between 1 and 100 characters" } }, { status: 422 }); update.name = name; }
    if (body.category !== undefined) update.category = String(body.category).trim() || "Other";
    if (body.parentId !== undefined) update.parent_id = body.parentId || null;
    if (body.archived !== undefined) update.archived_at = body.archived ? new Date().toISOString() : null;
    if (!Object.keys(update).length) return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "No supported changes were supplied" } }, { status: 422 });
    const { data, error } = await auth.supabase.from("skills").update(update).eq("id", id).select("id,name,category,parent_id,archived_at").single();
    if (error) return failure(error);
    return NextResponse.json({ data });
  } catch (error) { return failure(error); }
}
