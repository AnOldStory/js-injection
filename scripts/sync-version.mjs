/**
 * Keeps every hardcoded version string in the repo in sync with package.json.
 *
 *   node scripts/sync-version.mjs            # sync all targets to package.json
 *   node scripts/sync-version.mjs 3.4.0      # set that version everywhere
 *   node scripts/sync-version.mjs patch      # patch | minor | major bump
 *   node scripts/sync-version.mjs --check    # exit 1 if anything drifted (CI)
 *   node scripts/sync-version.mjs --stage    # also `git add` the files it touched
 *
 * `npm version <patch|minor|major|x.y.z>` runs this automatically through the
 * "version" lifecycle script, so the bump commit + tag already carry every file.
 */
import { execFileSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER = /^\d+\.\d+\.\d+$/;

// ---- targets ---------------------------------------------------------------
// Each entry finds exactly one version string; `find` must capture the version
// itself in group 1 so we can report drift without rewriting the file.
const TARGETS = [
  {
    file: "package.json",
    find: /("version"\s*:\s*")(\d+\.\d+\.\d+)(")/,
  },
  {
    file: "public/manifest.json",
    find: /("version"\s*:\s*")(\d+\.\d+\.\d+)(")/,
  },
  {
    // Router.updateDB() compares this against the stored version to decide
    // whether to run a migration, so it has to move with the manifest.
    file: "src/_variables.js",
    find: /(version\s*:\s*")(\d+\.\d+\.\d+)(")/,
  },
  // README carries no version string of its own — its badges read the latest
  // GitHub release and the live Chrome Web Store version from shields.io.
  {
    file: "mcp-server.js",
    find: /('js-injection-mcp-server',\s*version:\s*')(\d+\.\d+\.\d+)(')/,
  },
];

// ---- args ------------------------------------------------------------------
const args = process.argv.slice(2);
const check = args.includes("--check");
const stage = args.includes("--stage");
const arg = args.find((a) => !a.startsWith("--"));

const pkgPath = resolve(ROOT, "package.json");
const current = JSON.parse(readFileSync(pkgPath, "utf8")).version;

let version = current;
if (arg && SEMVER.test(arg)) {
  version = arg;
} else if (arg) {
  const i = ["major", "minor", "patch"].indexOf(arg);
  if (i === -1) {
    console.error(`unknown argument "${arg}" — expected x.y.z, major, minor or patch`);
    process.exit(1);
  }
  const parts = current.split(".").map(Number);
  parts[i] += 1;
  for (let j = i + 1; j < 3; j++) parts[j] = 0;
  version = parts.join(".");
}

if (check && arg) {
  console.error("--check cannot be combined with a version argument");
  process.exit(1);
}

// ---- apply -----------------------------------------------------------------
const drift = [];
const written = new Set();

for (const { file, find } of TARGETS) {
  const path = resolve(ROOT, file);
  const before = readFileSync(path, "utf8");
  const match = before.match(find);

  if (!match) {
    // A refactor moved or reworded the version string; failing loudly beats
    // silently shipping a stale one.
    console.error(`✗ ${file}: no version string matched ${find}`);
    process.exit(1);
  }
  if (match[2] === version) continue;

  drift.push(`${file}: ${match[2]} -> ${version}`);
  if (check) continue;

  writeFileSync(path, before.replace(find, `$1${version}$3`));
  written.add(file);
}

if (check) {
  if (drift.length) {
    console.error("version drift against package.json:");
    for (const d of drift) console.error(`  ✗ ${d}`);
    console.error("\nrun `node scripts/sync-version.mjs` to fix");
    process.exit(1);
  }
  console.log(`✓ all version strings match ${version}`);
  process.exit(0);
}

for (const d of drift) console.log(`  ${d}`);
console.log(drift.length ? `✓ synced to ${version}` : `✓ already at ${version}`);

// The release body comes from CHANGELOG.md, so a missing section means the
// release ships with commit-derived notes only. Warn while there is still time
// to write one.
if (!readFileSync(resolve(ROOT, "CHANGELOG.md"), "utf8").includes(`## v${version}`)) {
  console.log(`! CHANGELOG.md has no "## v${version}" section yet — the release will fall back to generated notes`);
}

if (stage && written.size) {
  execFileSync("git", ["add", ...written], { cwd: ROOT, stdio: "inherit" });
}
