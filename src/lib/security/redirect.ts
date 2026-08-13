export function safeReturnPath(
  value: string | null | undefined,
  fallback = "/app",
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    return fallback;
  try {
    const parsed = new URL(value, "https://skilltree.invalid");
    if (parsed.origin !== "https://skilltree.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
