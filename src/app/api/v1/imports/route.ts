import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { createAdminClient } from "@/lib/supabase/admin";
import {userCan} from "@/domains/entitlements/service";

export async function GET() {
  const auth = await authenticated();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase.from("imports").select("id,source,status,filename,total_rows,processed_rows,error_rows,mapping,created_at,completed_at").order("created_at", { ascending: false }).limit(50);
  if (error) return failure(error);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    if(!await userCan(auth.userId,"imports"))return NextResponse.json({error:{code:"PRO_REQUIRED",message:"Imports are available with SkillTree Pro."}},{status:403});
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length < 8) return NextResponse.json({ error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "A unique import key is required" } }, { status: 400 });
    const body = await request.json() as { source?: string; filename?: string; rows?: Array<Record<string, unknown>>; mapping?: Record<string, string> };
    if (!body.source || !body.rows?.length) return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Source and at least one row are required" } }, { status: 422 });
    if (body.rows.length > 10000) return NextResponse.json({ error: { code: "IMPORT_TOO_LARGE", message: "Imports are limited to 10,000 rows per file" } }, { status: 413 });
    const { data: existing, error: existingError } = await auth.supabase.from("imports").select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existingError) return failure(existingError);
    if (existing) return NextResponse.json({ data: existing });
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: { code: "SERVICE_NOT_CONFIGURED", message: "Import processing is not configured" } }, { status: 503 });
    const { data: created, error } = await auth.supabase.from("imports").insert({ user_id: auth.userId, source: body.source, filename: body.filename?.slice(0, 255) || null, total_rows: body.rows.length, mapping: body.mapping || null, status: "processing", idempotency_key: idempotencyKey }).select().single();
    if (error) return failure(error);
    const chunks = [];
    for (let index = 0; index < body.rows.length; index += 500) chunks.push(body.rows.slice(index, index + 500).map((raw, offset) => ({ user_id: auth.userId, import_id: created.id, row_number: index + offset + 1, raw_data: raw })));
    for (const chunk of chunks) { const { error: rowError } = await auth.supabase.from("import_rows").insert(chunk); if (rowError) return failure(rowError); }
    await admin.from("background_jobs").insert({ user_id: auth.userId, job_type: "process_import", payload: { importId: created.id }, idempotency_key: `process_import:${created.id}` });
    return NextResponse.json({ data: created }, { status: 202 });
  } catch (error) { return failure(error); }
}
