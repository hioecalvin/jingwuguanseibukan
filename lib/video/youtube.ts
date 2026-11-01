const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

function validVideoId(value: string | null | undefined) {
  return value && YOUTUBE_VIDEO_ID.test(value) ? value : null;
}

export function extractYouTubeVideoId(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const directId = validVideoId(trimmed);
  if (directId) {
    return directId;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())
  ) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    const [candidate, extra] = url.pathname.split("/").filter(Boolean);
    return extra ? null : validVideoId(candidate);
  }

  if (url.pathname === "/watch") {
    return validVideoId(url.searchParams.get("v"));
  }

  const [kind, candidate, extra] = url.pathname.split("/").filter(Boolean);
  if (!extra && (kind === "embed" || kind === "shorts" || kind === "live")) {
    return validVideoId(candidate);
  }

  return null;
}

export function getYouTubeEmbedUrl(videoId: string | null | undefined) {
  const validId = validVideoId(videoId);
  return validId
    ? `https://www.youtube-nocookie.com/embed/${validId}?rel=0`
    : null;
}
