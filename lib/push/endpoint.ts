const MAX_ENDPOINT_LENGTH = 4096;

const PUSH_SERVICE_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);


export function trustedPushEndpoint(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const candidate =
    value.trim();

  if (
    !candidate ||
    candidate.length >
      MAX_ENDPOINT_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(
      candidate,
    )
  ) {
    return null;
  }

  try {
    const endpoint =
      new URL(candidate);

    if (
      endpoint.protocol !==
        "https:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.port ||
      endpoint.hash ||
      !PUSH_SERVICE_HOSTS.has(
        endpoint.hostname,
      ) ||
      endpoint.pathname === "/" ||
      endpoint.pathname.includes(
        "//",
      )
    ) {
      return null;
    }

    return endpoint.toString();
  } catch {
    return null;
  }
}
