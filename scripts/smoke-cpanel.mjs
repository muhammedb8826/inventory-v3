import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";

const target = resolve(process.env.CPANEL_STAGE_DIR || "release-payload");
const port = process.env.CPANEL_SMOKE_PORT || "3124";
const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: port,
  INVENTORY_E2E: "false",
  INVENTORY_BUILD_CHECK: "false",
};
let logs = "",
  exited = false,
  spawnError;
const child = spawn(process.execPath, [resolve(target, "server.js")], {
  cwd: target,
  env,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
child.stdout.on("data", (chunk) => {
  logs += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  logs += chunk.toString();
});
const stopped = new Promise((done) => {
  child.once("close", () => {
    exited = true;
    done();
  });
});
child.once("error", (error) => {
  spawnError = error;
});
try {
  const base = `http://127.0.0.1:${port}`;
  let html;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (spawnError) throw spawnError;
    if (exited) throw new Error("Staged server exited before it became ready.");
    try {
      const response = await fetch(`${base}/login`, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) {
        html = await response.text();
        break;
      }
    } catch {
      /* Wait for startup. */
    }
    await setTimeout(500);
  }
  if (!html?.includes("<html"))
    throw new Error("Staged login page did not return HTTP 200 with HTML.");
  const assets = [
    ...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g),
  ].map((match) => match[1].replaceAll("&amp;", "&"));
  for (const suffix of [".js", ".css"]) {
    const asset = assets.find((value) =>
      new URL(value, base).pathname.endsWith(suffix),
    );
    if (!asset)
      throw new Error(`Staged page did not reference a ${suffix} asset.`);
    const response = await fetch(new URL(asset, base), {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(
        `Staged ${suffix} asset returned HTTP ${response.status}.`,
      );
  }
  console.log(
    "PASS: reduced cPanel payload serves the production login page, JavaScript and CSS.",
  );
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (!exited) child.kill();
  await Promise.race([stopped, setTimeout(3000)]);
}
