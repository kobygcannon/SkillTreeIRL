import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params,
      key = request.headers.get("idempotency-key"),
      body = (await request.json().catch(() => ({}))) as {
        evidenceType?: string;
        storagePath?: string;
        externalUrl?: string;
        textNote?: string;
      };
    if (!key || key.length < 8)
      return NextResponse.json(
        {
          error: {
            code: "IDEMPOTENCY_KEY_REQUIRED",
            message: "A unique completion key is required",
          },
        },
        { status: 400 },
      );
    if (body.externalUrl) {
      let url: URL;
      try {
        url = new URL(body.externalUrl);
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
      if (url.protocol !== "https:")
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
    const { data, error } = await auth.supabase.rpc(
      "complete_quest_with_evidence",
      {
        p_quest_id: id,
        p_idempotency_key: key,
        p_evidence_type: body.evidenceType || null,
        p_storage_path: body.storagePath || null,
        p_external_url: body.externalUrl || null,
        p_text_note: body.textNote || null,
      },
    );
    if (error) {
      if (error.message.includes("EVIDENCE_REQUIRED"))
        return NextResponse.json(
          {
            error: {
              code: "EVIDENCE_REQUIRED",
              message:
                "This quest requires private evidence before it can be completed",
            },
          },
          { status: 422 },
        );
      return failure(error);
    }
    return NextResponse.json({ data: { completionId: data } });
  } catch (error) {
    return failure(error);
  }
}
