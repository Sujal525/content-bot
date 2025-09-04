#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { ensureDir, writeFile, formatDate, daysAgoISO } from "./utils.js";
import { loadState, saveState } from "./state.js";
import { fetchCommits, upsertIssue } from "./github.js";
import { sanitize } from "./sanitize.js";
import { buildDraft } from "./generate.js";

const program = new Command();

program
  .name("content-bot")
  .description("Turn recent GitHub commits into a social media draft post")
  .requiredOption("--repo <owner/repo>", "GitHub repository (e.g. user/my-repo)")
  .option("--days <n>", "Days back to look", "3")
  .option("--since <ISO>", "Override since ISO date (prioritized over --days)")
  .option("--dry-run", "Do not create/update a GitHub issue", false)
  .parse(process.argv);

const { repo, days, since, dryRun } = program.opts();

(async () => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.error("Error: GITHUB_TOKEN is required in .env");
    process.exit(1);
  }
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
  const CLIENT_WORDS = (process.env.CLIENT_WORDS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const [owner, name] = (repo || "").split("/");
  if (!owner || !name) {
    console.error("Error: --repo must be in the form owner/repo");
    process.exit(1);
  }

  // use last_run_at if available, else days window
  const state = await loadState();
  const sinceISO = since || state.last_run_at || daysAgoISO(days);

  const commits = await fetchCommits({
    token: GITHUB_TOKEN,
    owner,
    repo: name,
    since: sinceISO
  });

  // bonus filters: ignore chore/tests
  const filtered = commits.filter(c => {
    const msg = (c.message || "").trim().toLowerCase();
    if (msg.startsWith("chore:")) return false;
    if (msg.startsWith("chore(")) return false;
    if (/\btest(s)?\b/.test(msg)) return false;
    return true;
  });

  if (!filtered.length) {
    console.log("No updates this run");
    await saveState();
    process.exit(0);
  }

  const points = filtered.map(c => {
    const firstLine = (c.message || "").split("\n")[0];
    return sanitize(firstLine, CLIENT_WORDS);
  }).filter(Boolean);

  const { bulletList, x, li } = await buildDraft({
    openaiKey: OPENAI_API_KEY,
    commitPoints: points
  });

  const today = formatDate(new Date());
  const title = `Content Bot Draft – ${today}`;
  const md = `# ${title}

**Repo:** ${owner}/${name}  
**Source commits since:** ${sinceISO}

## Bullets
${bulletList}

---

## X (180–260 chars)
${x}

---

## LinkedIn (400–700 chars)
${li}
`;

  await ensureDir("out");
  const outPath = `out/draft_${today}.md`;
  await writeFile(outPath, md);

  let issueUrl = "(dry run)";
  if (!dryRun) {
    issueUrl = await upsertIssue({
      token: GITHUB_TOKEN,
      owner,
      repo: name,
      title,
      body: md
    });
  }

  await saveState();

  console.log("Draft created:");
  console.log(" - File:", outPath);
  console.log(" - Issue:", issueUrl);
})().catch(err => {
  console.error("Fatal error:", err?.response?.data || err?.message || err);
  process.exit(1);
});
