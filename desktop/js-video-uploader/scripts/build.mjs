import { build } from "esbuild";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
const validator = await build({ entryPoints: ["src/config.ts"], bundle: true, platform: "node", format: "esm", write: false });
const { publicConfig } = await import(`data:text/javascript;base64,${Buffer.from(validator.outputFiles[0].text).toString("base64")}`);
const requested = {
  url: process.env.JS_UPLOADER_PUBLIC_URL,
  key: process.env.JS_UPLOADER_PUBLIC_KEY,
  environment: process.env.JS_UPLOADER_ENVIRONMENT,
  siteUrl: process.env.JS_UPLOADER_SITE_URL,
  googleClientId: process.env.JS_UPLOADER_GOOGLE_CLIENT_ID,
  youtubeChannelId: process.env.JS_UPLOADER_YOUTUBE_CHANNEL_ID,
};
const config = publicConfig(requested);
if (Object.values(requested).some(Boolean) && !config) throw new Error("Only approved staging URL, Staging label and public anonymous key are allowed.");
await mkdir("dist/renderer", { recursive: true });
await writeFile("dist/public-config.json", JSON.stringify(config));
await build({ entryPoints: ["src/main.ts"], outfile: "dist/main.cjs", bundle: true, platform: "node", format: "cjs", external: ["electron"], target: "node22" });
await build({ entryPoints: ["src/preload.ts"], outfile: "dist/preload.cjs", bundle: true, platform: "node", format: "cjs", external: ["electron"], target: "node22" });
await build({ entryPoints: ["src/renderer/app.tsx"], outfile: "dist/renderer/app.js", bundle: true, platform: "browser", format: "iife", minify: true, target: "chrome140", define: { "process.env.NODE_ENV": '"production"' } });
await copyFile("src/renderer/index.html", "dist/renderer/index.html");
