import "server-only";

import {
  createHash,
  timingSafeEqual,
} from "node:crypto";


function digest(
  value: string,
) {
  return createHash(
    "sha256",
  )
    .update(
      value,
      "utf8",
    )
    .digest();
}


export function matchesSecret(
  received: string | null | undefined,
  expected: string | null | undefined,
) {
  if (
    typeof received !== "string" ||
    typeof expected !== "string" ||
    expected.length === 0
  ) {
    return false;
  }

  return timingSafeEqual(
    digest(received),
    digest(expected),
  );
}
