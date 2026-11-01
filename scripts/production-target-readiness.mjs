import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { pathToFileURL } from "node:url";

export const PRODUCTION_REGION = "ap-southeast-1";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
export const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";

const PROJECT_REF = /^[a-z0-9]{20}$/;
const ALLOWED_QUERY_PARAMETERS = new Set(["sslmode"]);

function value(environment, name) {
  return typeof environment[name] === "string" ? environment[name].trim() : "";
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function parseHostedOrigin(raw) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port ||
        parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseDatabaseUrl(raw, projectRef) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { error: "must be a valid PostgreSQL connection URL" };
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    return { error: "must use the postgres or postgresql protocol" };
  }
  if (!parsed.username || !parsed.password) {
    return { error: "must contain dedicated database credentials" };
  }
  if (parsed.hash || parsed.pathname !== "/postgres") {
    return { error: "must target the postgres database without a fragment" };
  }
  for (const key of parsed.searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMETERS.has(key)) {
      return { error: `contains unsupported connection option ${key}` };
    }
  }
  if (parsed.searchParams.getAll("sslmode").length !== 1 ||
      parsed.searchParams.get("sslmode") !== "require") {
    return { error: "must explicitly require TLS with sslmode=require" };
  }

  const directHost = `db.${projectRef}.supabase.co`;
  const poolerHost = `aws-0-${PRODUCTION_REGION}.pooler.supabase.com`;
  const port = parsed.port || "5432";
  let mode;
  if (parsed.hostname === directHost && parsed.username === "postgres" && port === "5432") {
    mode = "direct";
  } else if (parsed.hostname === poolerHost &&
      parsed.username === `postgres.${projectRef}` && port === "5432") {
    mode = "session-pooler";
  } else {
    return {
      error: "must be the exact project direct connection or Singapore session pooler on port 5432",
    };
  }

  return {
    connection: {
      mode,
      host: parsed.hostname,
      port,
      database: "postgres",
      tls: "require",
    },
  };
}

export function evaluateProductionTarget(environment) {
  const blockers = [];
  const warnings = [];
  const rawProjectRef = value(environment, "PRODUCTION_PROJECT_REF");
  const projectRef = rawProjectRef.toLowerCase();
  const region = value(environment, "PRODUCTION_REGION").toLowerCase();
  const supabaseUrl = value(environment, "NEXT_PUBLIC_SUPABASE_URL");
  const databaseUrl = value(environment, "PRODUCTION_DB_URL");

  if (!PROJECT_REF.test(rawProjectRef)) {
    add(blockers, "PRODUCTION_PROJECT_REF", "must be the exact 20-character Supabase project reference");
  } else if ([STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(projectRef)) {
    add(blockers, "PRODUCTION_PROJECT_REF", "must not identify staging or the retired project");
  }

  if (region !== PRODUCTION_REGION) {
    add(blockers, "PRODUCTION_REGION", `must equal the approved region ${PRODUCTION_REGION}`);
  }

  const hostedOrigin = parseHostedOrigin(supabaseUrl);
  if (!hostedOrigin) {
    add(blockers, "NEXT_PUBLIC_SUPABASE_URL", "must be an exact HTTPS Supabase project origin");
  } else if (PROJECT_REF.test(projectRef) && hostedOrigin.hostname !== `${projectRef}.supabase.co`) {
    add(blockers, "NEXT_PUBLIC_SUPABASE_URL", "must match PRODUCTION_PROJECT_REF exactly");
  }

  let databaseConnection = null;
  if (!databaseUrl) {
    add(blockers, "PRODUCTION_DB_URL", "is required");
  } else if (PROJECT_REF.test(projectRef)) {
    const result = parseDatabaseUrl(databaseUrl, projectRef);
    if (result.error) add(blockers, "PRODUCTION_DB_URL", result.error);
    else databaseConnection = result.connection;
  }

  warnings.push(
    "This offline check validates target identity and connection shape only; independently verify project ownership and region in the Supabase dashboard.",
  );

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    target: blockers.length === 0 ? {
      projectRef,
      region,
      supabaseOrigin: hostedOrigin.origin,
      databaseConnection,
    } : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/production-target-readiness.mjs [--env-file=<protected-path>]",
    "",
    "Required variables: PRODUCTION_PROJECT_REF, PRODUCTION_REGION, NEXT_PUBLIC_SUPABASE_URL, PRODUCTION_DB_URL.",
    "The check is offline and never prints credentials or the database URL.",
  ].join("\n");
}

export function runCli(argv = process.argv.slice(2), environment = process.env) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }

  const envFile = option(argv, "--env-file");
  if (envFile) {
    if (!existsSync(envFile)) {
      console.error(JSON.stringify({ ready: false, error: "Environment file does not exist." }, null, 2));
      return 2;
    }
    try {
      loadEnvFile(envFile);
    } catch {
      console.error(JSON.stringify({ ready: false, error: "Environment file could not be loaded." }, null, 2));
      return 2;
    }
  }

  const result = evaluateProductionTarget(environment);
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = runCli();
}
