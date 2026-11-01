export function configuredApplicationOrigin(
  raw =
    process.env
      .NEXT_PUBLIC_SITE_URL,
) {
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is missing.",
    );
  }

  let url: URL;

  try {
    url =
      new URL(
        raw.trim(),
      );
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an exact secure origin.",
    );
  }

  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (
      url.pathname !== "/" &&
      url.pathname !== ""
    ) ||
    (
      url.protocol !== "https:" &&
      !(
        loopback &&
        url.protocol === "http:"
      )
    )
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an exact secure origin.",
    );
  }

  return url.origin;
}
