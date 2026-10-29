import { cp, mkdir, readdir, readFile, stat } from "node:fs/promises";
import { resolve, relative, join, sep } from "node:path";

const root = process.cwd();
const build = resolve(root, process.env.CPANEL_BUILD_DIR || ".next");
const target = resolve(root, process.env.CPANEL_STAGE_DIR || "release-payload");
const required = JSON.parse(
  await readFile(join(build, "required-server-files.json"), "utf8"),
);
await readFile(join(build, "BUILD_ID"), "utf8"); // Refuse a dev-only or incomplete build.
if (
  target === root ||
  target.startsWith(build + sep) ||
  build.startsWith(target + sep) ||
  target === build
) {
  throw new Error("Release staging must use a separate, fresh directory.");
}
const omittedRoots = new Set([
  "cache",
  "dev",
  "types",
  "diagnostics",
  "standalone",
  "build",
  "trace",
  "trace-build",
]);
const keep = (path) => {
  const parts = relative(build, path).split(sep);
  return (
    !omittedRoots.has(parts[0]) &&
    !path.endsWith(".map") &&
    !path.endsWith(".tsbuildinfo")
  );
};
// Guard against removing a file that this Next.js version explicitly needs at runtime.
for (const file of required.files ?? []) {
  const source = resolve(root, file);
  if (source.startsWith(build + sep) && !keep(source)) {
    try {
      await stat(source);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    throw new Error(
      "A required runtime file would be omitted: " + relative(build, source),
    );
  }
}
await mkdir(target); // Never merge a new release with stale staging files.
await cp(build, join(target, ".next"), { recursive: true, filter: keep });
await cp(join(root, "public"), join(target, "public"), { recursive: true });
for (const file of [
  "package.json",
  "package-lock.json",
  "server.js",
  "next.config.mjs",
]) {
  await cp(join(root, file), join(target, file));
}
async function measure(directory) {
  let files = 0,
    bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await measure(path);
      files += nested.files;
      bytes += nested.bytes;
    } else {
      files++;
      bytes += (await stat(path)).size;
    }
  }
  return { files, bytes };
}
const before = await measure(build),
  after = await measure(join(target, ".next")),
  total = await measure(target);
console.log(
  `Next.js build: ${before.files} files / ${(before.bytes / 1048576).toFixed(1)} MiB`,
);
console.log(
  `Runtime build: ${after.files} files / ${(after.bytes / 1048576).toFixed(1)} MiB`,
);
console.log(
  `Excluded: ${before.files - after.files} files / ${((before.bytes - after.bytes) / 1048576).toFixed(1)} MiB`,
);
console.log(
  `Release payload: ${total.files} files / ${(total.bytes / 1048576).toFixed(1)} MiB; caches, source maps, dev output, generated types and diagnostics excluded.`,
);
