export async function cancelEvidenceUpload(path: string) {
  if (!path) return;
  await fetch("/api/v1/evidence/upload", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
  }).catch(() => undefined);
}
