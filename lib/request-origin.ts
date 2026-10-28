/** Use a configured public origin behind TLS-terminating proxies.
 * Forwarded headers are deliberately excluded: clients may be able to spoof them.
 */
export function isAllowedRequestOrigin(
  headers: Headers,
  requestOrigin: string,
  configuredOrigin: string | undefined,
): boolean {
  const origin = headers.get("origin");
  if (!origin || headers.get("sec-fetch-site") === "cross-site") return false;
  const expected = configuredOrigin?.trim() || requestOrigin;
  try {
    const url = new URL(expected);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return false;
    // Browser Origin headers contain only a serialized origin, never paths.
    return origin === url.origin;
  } catch {
    return false;
  }
}
