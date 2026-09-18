import {
  createHmac,
} from "node:crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";


export type DurableRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};


type RateLimitOptions = {
  bucket: string;
  subject: string;
  limit: number;
  windowSeconds: number;
};


function positiveInteger(
  value: unknown,
  maximum: number,
) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= maximum
  );
}


export function configuredRateLimit(
  environmentName: string,
  fallback: number,
  maximum: number,
) {
  const raw =
    process.env[environmentName];

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  if (!positiveInteger(value, maximum)) {
    throw new Error(
      `Invalid ${environmentName} configuration.`,
    );
  }

  return value;
}


export async function consumeDurableRateLimit({
  bucket,
  subject,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<DurableRateLimitResult> {
  if (
    !bucket ||
    bucket !== bucket.trim() ||
    bucket.length > 100 ||
    !subject ||
    !positiveInteger(limit, 100_000) ||
    !positiveInteger(windowSeconds, 86_400)
  ) {
    throw new Error(
      "Invalid durable rate-limit request.",
    );
  }

  const secret =
    process.env
      .DURABLE_RATE_LIMIT_SECRET;

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "Durable rate limiting is not configured.",
    );
  }

  const subjectHash =
    createHmac(
      "sha256",
      secret,
    )
      .update(
        `${bucket}\u0000${subject}`,
        "utf8",
      )
      .digest(
        "hex",
      );

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin.rpc(
    "consume_api_rate_limit",
    {
      target_bucket:
        bucket,
      target_subject_hash:
        subjectHash,
      target_limit:
        limit,
      target_window_seconds:
        windowSeconds,
    },
  );

  if (error) {
    throw new Error(
      "Durable rate-limit persistence failed.",
    );
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    !row ||
    typeof row.allowed !== "boolean" ||
    !Number.isInteger(row.remaining) ||
    !Number.isInteger(row.retry_after_seconds)
  ) {
    throw new Error(
      "Durable rate-limit response was invalid.",
    );
  }

  return {
    allowed:
      row.allowed,
    remaining:
      Math.max(0, row.remaining),
    retryAfterSeconds:
      Math.max(0, row.retry_after_seconds),
  };
}


export function durableRateLimitHeaders(
  result: DurableRateLimitResult,
) {
  return {
    "Retry-After":
      String(
        Math.max(
          1,
          result.retryAfterSeconds,
        ),
      ),
    "X-RateLimit-Remaining":
      String(
        Math.max(
          0,
          result.remaining,
        ),
      ),
  };
}
