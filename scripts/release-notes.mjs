/**
 * Pulls one version's section out of CHANGELOG.md so the release job can use it
 * as the GitHub Release body.
 *
 *   node scripts/release-notes.mjs            # section for package.json's version
 *   node scripts/release-notes.mjs 3.4.0      # a specific version
 *   node scripts/release-notes.mjs --out f.md # write to a file instead of stdout
 *
 * A missing section is not fatal: the release still goes out with the notes
 * GitHub generates from the commits, which the workflow appends either way.
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const out = outIdx === -1 ? null : args[outIdx + 1];
const skip = outIdx === -1 ? -1 : outIdx + 1; // the filename after --out
const arg = args.find((a, i) => !a.startsWith("--") && i !== skip);

const version =
  arg || JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).version;

const changelog = readFileSync(resolve(ROOT, "CHANGELOG.md"), "utf8");

// Everything between this version's "## vX.Y.Z" heading and the next "## ".
const section = changelog.match(
  new RegExp(
    `^## v${version.replace(/\./g, "\\.")}\\s*$([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`,
    "m"
  )
);

if (!section) {
  console.error(`! CHANGELOG.md has no "## v${version}" section — falling back to generated notes`);
}

const body = section ? section[1].trim() : "";

if (out) writeFileSync(resolve(ROOT, out), body ? `${body}\n` : "");
else process.stdout.write(body ? `${body}\n` : "");
