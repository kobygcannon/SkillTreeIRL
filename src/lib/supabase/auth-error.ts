type AuthErrorLike = {
  name?: string;
  message?: string;
  status?: number;
};

export function isAuthenticationServiceUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as AuthErrorLike;
  if (value.name === "AuthRetryableFetchError") return true;
  if (value.status === 0 || (value.status !== undefined && value.status >= 500))
    return true;
  return /fetch failed|failed to fetch|network request|timed? out|econnreset|econnrefused/i.test(
    value.message || "",
  );
}
