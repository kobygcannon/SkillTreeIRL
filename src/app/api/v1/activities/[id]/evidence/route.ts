import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticated();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { data, error } = await auth.supabase
    .from("activity_evidence")
    .select(
      "id,evidence_type,storage_path,external_url,text_note,is_private,created_at",
    )
    .eq("activity_id", id)
    .order("created_at");
  if (error) return failure(error);
  const resolved = await Promise.all(
    (data || []).map(async (item) => {
      if (!item.storage_path) return item;
      const { data: signed } = await auth.supabase.storage
        .from("evidence")
        .createSignedUrl(item.storage_path, 300);
      return { ...item, signedUrl: signed?.signedUrl || null };
    }),
  );
  return NextResponse.json(
    { data: resolved },
    { headers: { "cache-control": "private, no-store" } },
  );
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const body = (await request.json()) as {
      type?: string;
      storagePath?: string;
      externalUrl?: string;
      textNote?: string;
    };
    const allowed = [
      "photo",
      "image",
      "document",
      "url",
      "text",
      "timer",
      "integration",
    ];
    if (!body.type || !allowed.includes(body.type))
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Choose a valid evidence type",
          },
        },
        { status: 422 },
      );
    if (body.storagePath && !body.storagePath.startsWith(`${auth.userId}/`))
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN_PATH",
            message: "Evidence path is not owned by this account",
          },
        },
        { status: 403 },
      );
    if (body.externalUrl) {
      let parsed: URL;
      try {
        parsed = new URL(body.externalUrl);
      } catch {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_EVIDENCE_URL",
              message: "Use a valid HTTPS evidence link",
            },
          },
          { status: 422 },
        );
      }
      if (parsed.protocol !== "https:")
        return NextResponse.json(
          {
            error: {
              code: "INVALID_EVIDENCE_URL",
              message: "Evidence links must use HTTPS",
            },
          },
          { status: 422 },
        );
    }
    if (body.textNote && body.textNote.length > 2000)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Evidence notes must be 2,000 characters or fewer",
          },
        },
        { status: 422 },
      );
    if (!body.storagePath && !body.externalUrl && !body.textNote)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Provide a file, secure link, or evidence note",
          },
        },
        { status: 422 },
      );
    const { data, error } = await auth.supabase.rpc(
      "attach_activity_evidence",
      {
        p_activity_id: id,
        p_type: body.type,
        p_storage_path: body.storagePath || null,
        p_external_url: body.externalUrl || null,
        p_text_note: body.textNote || null,
      },
    );
    if (error) return failure(error);
    return NextResponse.json({ data: { id: data } }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
