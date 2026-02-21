#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const DEFAULT_SERVICES = ["github", "vercel", "supabase"];
const DEFAULT_VERCEL_TARGETS = ["production", "preview", "development"];
const VALID_SERVICES = new Set(DEFAULT_SERVICES);
const VALID_GITHUB_APPS = new Set(["actions", "codespaces", "dependabot"]);

const HELP_TEXT = `Usage:
  node scripts/sync-env.mjs [options]

Options:
  --env-file <path>             Source .env file (default: .env.local)
  --only <csv>                  Services to sync: github,vercel,supabase
  --keys <csv>                  Only sync these keys
  --skip-keys <csv>             Skip these keys
  --github-repo <owner/repo>    GitHub repository (auto from origin if omitted)
  --github-app <name>           actions | codespaces | dependabot (default: actions)
  --vercel-targets <csv>        Targets for Vercel (default: production,preview,development)
  --vercel-scope <scope>        Team/user scope passed to Vercel CLI
  --supabase-project-ref <ref>  Supabase project ref
  --dry-run                     Print actions without changing remote values
  -h, --help                    Show help

Environment overrides:
  SYNC_ENV_ONLY
  SYNC_ENV_KEYS
  SYNC_ENV_SKIP_KEYS
  SYNC_ENV_GITHUB_REPO
  SYNC_ENV_GITHUB_APP
  SYNC_ENV_VERCEL_TARGETS
  SYNC_ENV_VERCEL_SCOPE
  SYNC_ENV_SUPABASE_PROJECT_REF
`;

function parseCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const options = {
    envFile: ".env.local",
    onlyServices: parseCsv(process.env.SYNC_ENV_ONLY || ""),
    onlyKeys: parseCsv(process.env.SYNC_ENV_KEYS || ""),
    skipKeys: parseCsv(process.env.SYNC_ENV_SKIP_KEYS || ""),
    githubRepo: process.env.SYNC_ENV_GITHUB_REPO || "",
    githubApp: process.env.SYNC_ENV_GITHUB_APP || "actions",
    vercelTargets: parseCsv(
      process.env.SYNC_ENV_VERCEL_TARGETS ||
        DEFAULT_VERCEL_TARGETS.join(",")
    ),
    vercelScope: process.env.SYNC_ENV_VERCEL_SCOPE || "",
    supabaseProjectRef: process.env.SYNC_ENV_SUPABASE_PROJECT_REF || "",
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith("-")) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--env-file") {
      options.envFile = next;
    } else if (arg === "--only") {
      options.onlyServices = parseCsv(next);
    } else if (arg === "--keys") {
      options.onlyKeys = parseCsv(next);
    } else if (arg === "--skip-keys") {
      options.skipKeys = parseCsv(next);
    } else if (arg === "--github-repo") {
      options.githubRepo = next.trim();
    } else if (arg === "--github-app") {
      options.githubApp = next.trim();
    } else if (arg === "--vercel-targets") {
      options.vercelTargets = parseCsv(next);
    } else if (arg === "--vercel-scope") {
      options.vercelScope = next.trim();
    } else if (arg === "--supabase-project-ref") {
      options.supabaseProjectRef = next.trim();
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }

    i += 1;
  }

  if (options.onlyServices.length === 0) {
    options.onlyServices = [...DEFAULT_SERVICES];
  }

  for (const service of options.onlyServices) {
    if (!VALID_SERVICES.has(service)) {
      throw new Error(
        `Invalid service "${service}". Use github,vercel,supabase.`
      );
    }
  }

  if (!VALID_GITHUB_APPS.has(options.githubApp)) {
    throw new Error(
      `Invalid --github-app "${options.githubApp}". Use actions, codespaces, or dependabot.`
    );
  }

  if (options.vercelTargets.length === 0) {
    throw new Error("At least one Vercel target is required.");
  }

  return options;
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const entries = [];

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const withoutExport = line.startsWith("export ")
      ? line.slice(7).trim()
      : line;
    const eqIndex = withoutExport.indexOf("=");

    if (eqIndex <= 0) {
      console.warn(`Skipping invalid line ${index + 1} in ${filePath}`);
      continue;
    }

    const key = withoutExport.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      console.warn(`Skipping invalid key "${key}" on line ${index + 1}`);
      continue;
    }

    let value = withoutExport.slice(eqIndex + 1);
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value });
  }

  return entries;
}

function applyKeyFilters(entries, onlyKeys, skipKeys) {
  const onlySet = new Set(onlyKeys);
  const skipSet = new Set(skipKeys);
  const seen = new Set();
  const filtered = [];

  for (const entry of entries) {
    if (seen.has(entry.key)) {
      continue;
    }
    seen.add(entry.key);

    if (onlySet.size > 0 && !onlySet.has(entry.key)) {
      continue;
    }
    if (skipSet.has(entry.key)) {
      continue;
    }
    if (entry.value.length === 0) {
      console.warn(`Skipping ${entry.key}: empty value`);
      continue;
    }

    filtered.push(entry);
  }

  return filtered;
}

function runCommand(command, args, options = {}) {
  const { input, allowFailure = false } = options;
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input,
    stdio: "pipe",
  });

  if (result.status !== 0 && !allowFailure) {
    const detail =
      result.stderr.trim() ||
      result.stdout.trim() ||
      `${command} exited with code ${result.status}`;
    throw new Error(detail);
  }

  return result;
}

function assertCommandAvailable(command, installHint) {
  const check = spawnSync("which", [command], { encoding: "utf8" });
  if (check.status !== 0) {
    throw new Error(
      `${command} command not found. Install it first (${installHint}).`
    );
  }
}

function parseGithubRepo(remoteUrl) {
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) {
    return "";
  }
  return `${match[1]}/${match[2]}`;
}

function inferGithubRepo() {
  const result = runCommand("git", ["config", "--get", "remote.origin.url"], {
    allowFailure: true,
  });
  if (result.status !== 0) {
    return "";
  }

  return parseGithubRepo(result.stdout.trim());
}

function syncGithub(entries, options) {
  const repo = options.githubRepo || inferGithubRepo();
  if (!repo) {
    throw new Error(
      "GitHub repository could not be inferred. Use --github-repo owner/repo."
    );
  }

  if (!options.dryRun) {
    assertCommandAvailable("gh", "https://cli.github.com/");
    runCommand("gh", ["auth", "status"]);
  }

  for (const entry of entries) {
    if (options.dryRun) {
      console.log(`[dry-run] github ${repo} ${entry.key}`);
      continue;
    }

    runCommand("gh", [
      "secret",
      "set",
      entry.key,
      "--repo",
      repo,
      "--app",
      options.githubApp,
      "--body",
      entry.value,
    ]);
    console.log(`[ok] github ${repo} ${entry.key}`);
  }
}

function buildVercelSharedArgs(options) {
  const args = [];
  if (options.vercelScope) {
    args.push("--scope", options.vercelScope);
  }
  if (process.env.VERCEL_TOKEN) {
    args.push("--token", process.env.VERCEL_TOKEN);
  }
  return args;
}

function syncVercel(entries, options) {
  const shared = buildVercelSharedArgs(options);
  if (!options.dryRun) {
    assertCommandAvailable("vercel", "https://vercel.com/docs/cli");
    runCommand("vercel", [...shared, "whoami"]);
  }

  for (const target of options.vercelTargets) {
    for (const entry of entries) {
      if (options.dryRun) {
        console.log(`[dry-run] vercel ${target} ${entry.key}`);
        continue;
      }

      runCommand(
        "vercel",
        [...shared, "env", "rm", entry.key, target, "--yes"],
        { allowFailure: true }
      );
      runCommand("vercel", [...shared, "env", "add", entry.key, target], {
        input: `${entry.value}\n`,
      });
      console.log(`[ok] vercel ${target} ${entry.key}`);
    }
  }
}

function syncSupabase(entries, options) {
  const projectRef = options.supabaseProjectRef || "<project-ref-required>";
  if (!options.supabaseProjectRef && !options.dryRun) {
    throw new Error(
      "Supabase project ref is required. Use --supabase-project-ref or SYNC_ENV_SUPABASE_PROJECT_REF."
    );
  }

  if (!options.dryRun) {
    assertCommandAvailable("supabase", "https://supabase.com/docs/guides/cli");
  }

  for (const entry of entries) {
    if (options.dryRun) {
      console.log(`[dry-run] supabase ${projectRef} ${entry.key}`);
      continue;
    }

    runCommand("supabase", [
      "secrets",
      "set",
      "--project-ref",
      options.supabaseProjectRef,
      `${entry.key}=${entry.value}`,
    ]);
    console.log(`[ok] supabase ${projectRef} ${entry.key}`);
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error("Use --help for usage.");
    process.exit(1);
  }

  const entries = applyKeyFilters(
    parseEnvFile(options.envFile),
    options.onlyKeys,
    options.skipKeys
  );

  if (entries.length === 0) {
    console.error("No env keys selected. Nothing to sync.");
    process.exit(1);
  }

  const results = [];
  for (const service of options.onlyServices) {
    try {
      if (service === "github") {
        syncGithub(entries, options);
      } else if (service === "vercel") {
        syncVercel(entries, options);
      } else if (service === "supabase") {
        syncSupabase(entries, options);
      }
      results.push({ service, ok: true });
    } catch (error) {
      results.push({ service, ok: false, message: error.message });
      console.error(`[error] ${service}: ${error.message}`);
    }
  }

  console.log("\nSummary:");
  for (const result of results) {
    if (result.ok) {
      console.log(`  - ${result.service}: ok`);
    } else {
      console.log(`  - ${result.service}: failed`);
    }
  }

  const hasFailure = results.some((result) => !result.ok);
  process.exit(hasFailure ? 1 : 0);
}

main();
