// Only public connection settings are passed to the build process.
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
const config = parseEnv(await readFile(process.argv[2], "utf8"));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/SUPABASE|SECURITY_TEST|PASSWORD|SECRET|TOKEN|GOOGLE|YOUTUBE/i.test(key)));
env.JS_UPLOADER_PUBLIC_URL = config.NEXT_PUBLIC_SUPABASE_URL;
env.JS_UPLOADER_PUBLIC_KEY = config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || config.NEXT_PUBLIC_SUPABASE_ANON_KEY;
env.JS_UPLOADER_ENVIRONMENT = "Staging";
env.JS_UPLOADER_SITE_URL = config.NEXT_PUBLIC_SITE_URL;
env.JS_UPLOADER_GOOGLE_CLIENT_ID = config.JS_UPLOADER_GOOGLE_CLIENT_ID || config.GOOGLE_OAUTH_CLIENT_ID || "";
env.JS_UPLOADER_YOUTUBE_CHANNEL_ID = config.JS_UPLOADER_YOUTUBE_CHANNEL_ID || config.YOUTUBE_CHANNEL_ID || "";
const result = spawnSync(process.execPath, ["scripts/build.mjs"], { env, stdio: "inherit" });
process.exit(result.status ?? 1);
