const DEFAULT_RUN_BUDGET_MS =
  45_000;

const MIN_RUN_BUDGET_MS =
  5_000;

const MAX_RUN_BUDGET_MS =
  50_000;

const DEFAULT_PROVIDER_TIMEOUT_MS =
  10_000;

const MIN_PROVIDER_TIMEOUT_MS =
  1_000;

const MAX_PROVIDER_TIMEOUT_MS =
  30_000;


function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (!value || !/^\d+$/.test(value)) {
    return fallback;
  }

  const parsed =
    Number(value);

  return Number.isSafeInteger(parsed) &&
    parsed >= minimum &&
    parsed <= maximum
    ? parsed
    : fallback;
}


export function emailWorkerRunBudgetMs() {
  return boundedInteger(
    process.env.EMAIL_WORKER_RUN_BUDGET_MS,
    DEFAULT_RUN_BUDGET_MS,
    MIN_RUN_BUDGET_MS,
    MAX_RUN_BUDGET_MS,
  );
}


export function emailProviderTimeoutMs() {
  return boundedInteger(
    process.env.EMAIL_PROVIDER_TIMEOUT_MS,
    DEFAULT_PROVIDER_TIMEOUT_MS,
    MIN_PROVIDER_TIMEOUT_MS,
    MAX_PROVIDER_TIMEOUT_MS,
  );
}


export function emailWorkerDeadline(
  startedAt = Date.now(),
) {
  return startedAt +
    emailWorkerRunBudgetMs();
}


export function remainingWorkerTimeMs(
  deadline: number,
  now = Date.now(),
) {
  if (
    !Number.isFinite(deadline) ||
    !Number.isFinite(now)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(deadline - now),
  );
}


export function emailProviderAbortSignal(
  remainingRunTimeMs: number,
) {
  const timeout =
    Math.max(
      1,
      Math.min(
        emailProviderTimeoutMs(),
        remainingRunTimeMs,
      ),
    );

  return AbortSignal.timeout(timeout);
}
