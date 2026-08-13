import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticated();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { data, error } = await auth.supabase.from("friendships").delete().eq("id", id).select("id").single();
  if (error) return failure(error);
  return NextResponse.json({ data: { removed: Boolean(data) } });
}
