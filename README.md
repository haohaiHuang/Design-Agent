# Design-Agent — DSH Design Agent workspace

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-dsh-blue)](https://github.com/deepseek-ai/deepseek-harness)
[![Topics: dsh](https://img.shields.io/badge/plugin-dsh-4B9CD3)](https://github.com/topics/dsh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A fully reproducible package for a **design agent on [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)**: the `my-agent` preset, the `design-references` routing skill (DSH-adapted), and the `design-router` deterministic-tool plugin. Built by upgrading an existing HTML-based design agent with the [design-references](https://github.com/haohaiHuang/my-pi-skills/tree/main/skills/design-references) methodology.

> ⚠️ **What this package reproduces: the machinery, not the content.** The routing, discipline, and tools are fully self-contained (clone → `cp -RL` → run). But the *reference library* is personal — several primary-level resources point at `~/Desktop/Design/...` and `~/resources/design-references.md`, private assets that do not ship with the repo. On a fresh machine those degrade to the fallback chain (`web_search` + `dembrandt` + the bundled hallmark discipline). If you want the full personal reference set, copy those directories yourself; without them the package still works, as a "hallmark discipline + web research" design agent. See [One-shot reproduction](#one-shot-reproduction-fresh-machine) for what ships vs. what you bring.

> 🇨🇳 中文版见 [README.zh.md](README.zh.md)

## What's inside

| Component | Role |
| --- | --- |
| [`plugins/design-router/`](plugins/design-router/) | Deterministic-tool Cordis plugin (6 read-only tools + 1 local-log writer, zero external runtime deps) |
| [`presets/my-agent/`](presets/my-agent/) | DSH agent preset (`agent.cordis.yml` + `preset.yml`): three-layer routing persona (stage → branch → phase) with per-phase confirmation gates |
| [`skills/design-references/`](skills/design-references/) | Stage/branch routing skill (stage triage → A product / B content / C general → five phases), DSH-adapted |
| [`skills/hallmark/`](skills/hallmark/) | Anti-AI-slop execution skill (MIT upstream copy from [nutlope/hallmark](https://github.com/nutlope/hallmark); `site/` theme tokens & examples bundled in-skill, self-contained) |

> **DSH version requirement: `0.1.5-rc.1` or later.** The persona plugin schema changed in
> 0.1.5 (`text` → `prefix` + `suffix`); a preset still using `text:` fails to mount with
> `$.prefix missing required value`. This repo's preset is on the 0.1.5 schema and also uses
> two rows introduced in 0.1.5: `present` (`dsh-tool-present`, deliverable declaration) and
> `command-goal` (`/goal` command).

## ⚠️ DSH 0.2.0+ (desktop app): presets are no longer scanned from a directory

**0.2.0 replaced the preset mechanism.** In 0.1.x a preset was a directory
(`~/.dsh/.agent-presets/<id>/agent.cordis.yml`) that `@deepseek-ai/dsh-agent-presets` **scanned and discovered**.
In 0.2.0 there is `@deepseek-ai/dsh-agent-preset-registry` whose config accepts **only** `default` /
`selectedDefault` — **no roots, no directory discovery** — and every preset is now **one row in the profile
composition**: `@deepseek-ai/dsh-agent-preset` with an inline `plugins:` list (`id` + `plugins` are required).

Consequence: after upgrading to the desktop app (0.2.0-rc.2), a custom preset sitting in
`~/.dsh/.agent-presets/` **silently disappears from the picker** — nothing is broken, the directory is simply
no longer read.

### Migrating a preset to 0.2.0

`docs/migrate-preset-0.2.0.mjs` converts the directory format into a root-level `insert` patch:

```bash
# 1. 只生成 patch（检查用）
node docs/migrate-preset-0.2.0.mjs \
  --src presets/my-agent/agent.cordis.yml \
  --id design-agent --name "设计 Agent" \
  --plugin "$PWD/plugins/design-router/index.mjs" \
  --out /tmp/design-agent-patch.yml

# 2. 写入某个 profile 的 patch 层（自动备份为 .bak.<时间戳>）
node docs/migrate-preset-0.2.0.mjs --src presets/my-agent/agent.cordis.yml \
  --plugin "$PWD/plugins/design-router/index.mjs" \
  --append ~/.dsh/profiles/desktop/cordis.patch.yml
```

Then **fully quit and reopen** the app; the preset appears in the new-session preset list.

Two things that change with the inline format:

1. **The plugin row must use an absolute path.** An inline preset has no "preset directory", so
   `./plugins/design-router/index.mjs` would resolve against the *profile* directory. The migration script
   rewrites it to the absolute repo path (override with `--plugin`).
2. **The desktop profile is Electron-managed.** `~/.dsh/profiles/desktop/cordis.patch.yml` also receives
   app-written settings; if a settings change ever rewrites that file, re-run the `--append` command
   (it is idempotent-safe in the sense that it appends — remove the previous block first if duplicated).

> The legacy directory `~/.dsh/.agent-presets/my-agent/` can be kept as a reference; 0.2.0 ignores it.

## plugins/design-router — deterministic tools

Ported from [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) `extensions/design-router` (pi extension → DSH Cordis plugin). Mounted by the `my-agent` preset via a **relative-path row** in `agent.cordis.yml` (the preset's `plugins/` is a relative symlink to the repo-root `plugins/`, expanded by `cp -RL` on install — no absolute paths needed):

```yaml
- id: design-router
  name: './plugins/design-router/index.mjs'
```

### Tools

| Tool | Purpose | Phase |
| --- | --- | --- |
| `design_lookup <branch> <stage>` | Query the design-resource registry (R/C/E/V 3-D index + fallback chain + sources; output tags style buckets) | "What do I consult at this step?" |
| `design_route <need>` | Map need keywords to recommended style-bucket combos (primary must-check + secondary on-demand) + per-bucket representative resources | Phase 1 research (anti-homogeneity routing) |
| `design_diversity <c1> <c2> <c3>` | Machine check of 3 candidates' difference (hue family / font tone / source bucket), PASS/FAIL | Before presenting candidates in Phase 1 (anti-homogeneity check) |
| `design_quality <report\|query>` | Record/query source-quality signals (extraction success / rework rate / reachability — objective, not taste-based); local log, not in git | Record after Phase 4 / consume for downranking in Phase 1 |
| `design_audit <target>` | Machine slop gates (hallmark machine subset) + interfaces CS-* 8 rules + phase-4 scans (incl. `DR-4` weight/radius, `DR-5` comment self-destruct & undefined vars, `DR-6` non-text contrast per WCAG 1.4.11) + inherited-contrast. Strips comments before scanning, resolves one level of `var()`, reads same-dir linked stylesheets, honours inline `slop-ignore: <reason>` waivers | Phase 4 verification |
| `design_contrast <target>` | WCAG 2.1 + APCA-approx contrast | Phase 4 verification |

### Intentional differences from the pi version

- **Removed** `design_research` (DSH uses the ledger-grep + refero probe + `web_search` fallback chain)
- **Removed** `hallmark_study_fetch` (DSH uses `dembrandt` / `defuddle` instead)
- **Removed** `before_agent_start` injection and the `/design-router` command (DSH's skill-loading mechanism already covers routing)
- **No dependency on `@deepseek-ai/dsh-tools`** (a workspace module cannot resolve the dsh install directory); tool definitions are built with plain JSON Schema — zero external runtime deps

### Layout

```
plugins/design-router/
├── index.mjs          # Plugin entry: registers 6 tools (5 read-only + 1 local-log writer)
├── checks/            # Ported checkers (TS→JS): typography/layout/a11y/copy/contrast/cheat/kill-slop/assets/types
│   └── kill-slop.test.mjs  # KS-* regression test (node checks/kill-slop.test.mjs)
└── data/
    └── registry.json  # Data form of registry.md (91 resources × 9 branch routes)
```

### Machine-gate coverage

`design_audit` runs seven checker modules and returns a gate-numbered punch list:

| Family | Gates | Source |
| --- | --- | --- |
| Hallmark slop | 1/2/10/14/19/24/26/27/30/33/34/37/38a/39/40/41/46/47/50/51 | hallmark `slop-test.md` (machine subset) |
| interfaces CS-* | CS-1…CS-8 | interfaces.dev cheat-sheet |
| Motion EM-* | EM-2/3/5 (EM-1/7/8 map to gates 10/14/27) | emilkowalski/skills |
| kill-ai-slop KS-* | KS-03/04/05/08/14 | kill-ai-slop transcription |
| Asset layer DR-A* | DR-A1/DR-A2 | Anshu asset-layer gates (brand logo/image presence) |
| design-references phase 4 | DR-4 (font-weight / radius off-scale) | design-references workflow.md |

### Maintenance

- `registry.md` is the **source of truth** (`~/.agents/skills/design-references/references/registry.md`); after editing it, run `node plugins/design-router/scripts/build-registry.mjs` to regenerate `data/registry.json` (+ `data/manifest.json` version metadata). **Never hand-edit registry.json.**
- Checker logic follows upstream `extensions/design-router/checks/` (TS→MJS port); after upstream updates, run `node plugins/design-router/scripts/check-checks-sync.mjs /path/to/my-pi-skills/extensions/design-router/checks` to verify gate coverage — **then diff the checker constants by hand**: gate-number parity does not catch detail drift (e.g. an expanded default-font list). The KS regression test catches that class of drift.
- After any checker change: `node index.test.mjs` and `node checks/kill-slop.test.mjs`.

## One-shot reproduction (fresh machine)

The repo reproduces the **machinery**: plugin + preset + DSH-adapted skills are all in-repo (reference-library *content* is personal — see the warning at the top).

```bash
# ── Ships with the repo (clone → run) ──
# 1. Skills (design-references is DSH-adapted; hallmark is an MIT upstream copy)
cp -R skills/design-references ~/.agents/skills/
cp -R skills/hallmark ~/.agents/skills/

# 2. Preset (cp -RL expands the relative plugins symlink in presets/my-agent/
#    into a self-contained copy — after install the preset no longer depends on
#    the repo path, so it can be copied around or migrated freely)
mkdir -p ~/.dsh/.agent-presets
cp -RL presets/my-agent ~/.dsh/.agent-presets/

# 3. Plugin source (keep it under the repo-root plugins/ for git management)
#    The preset references it via the RELATIVE path './plugins/design-router/index.mjs':
#    presets/my-agent/plugins is a relative symlink to the repo-root plugins/,
#    which cp -RL expands to a real directory — no path edits needed on any machine.

# 4. External deps (soft deps — missing ones degrade gracefully)
npm install -g dembrandt        # URL → design tokens (phase-1 candidate verification)
# defuddle: npm install -g defuddle
# npm install -g @open-pencil/cli   # Optional: read/convert/verify .fig/.pen design files (falls back to Figma-family skills / manual review)

# ── Bring your own (personal picks; absence degrades to the fallback chain) ──
# 5. Machine-local assets (ledger + kami/zine/logo-generator reference libs)
#    Without them the package still runs — as a "hallmark discipline + web_search/dembrandt"
#    design agent — but the candidate pool loses your personal picks.
```

**Note**: the preset's plugin row uses a **relative path** (`./plugins/design-router/index.mjs`,
with `presets/my-agent/plugins` as a relative symlink expanded by `cp -RL`), so a fresh
machine just copies the preset directory — **no path edits required**. If you'd rather
avoid symlinks, copy `plugins/design-router/` into `presets/my-agent/plugins/` and use
plain `cp -R` (same result, just a second copy).

> ⚠️ **When plugin changes take effect**: the preset's **persona text is read per session** — create a new session after saving,
> no restart needed. But `plugins/design-router/` is a Cordis plugin **mounted once per process** (ESM imports once),
> so after changing the plugin you must **restart the `dsh web` process** for it to be reloaded. Re-install with
> `cp -RL presets/my-agent ~/.dsh/.agent-presets/` and then restart; re-installing without restarting keeps running the old checkers.

## Prerequisites (from real-machine testing)

The audit checks and the skill's rendering discipline lean on a few local tools. Missing ones only degrade output, but degrade it a lot:

```bash
# 1) Visual review (vision skill + the critic sub-agent's direct image reading)
#    vision-cli / ego-browser usually live in ~/.local/bin — if that dir is not on PATH the tools report "not found"
ln -sf ~/.local/bin/vision-cli   /opt/homebrew/bin/vision-cli
ln -sf ~/.local/bin/ego-browser  /opt/homebrew/bin/ego-browser   # any dir already on PATH

# 2) Reference-site token extraction
npm install -g dembrandt            # real-browser render → exact tokens + DESIGN.md

# 3) Screenshot channel (measured on this machine; try in order)
#    chrome-headless-shell (Playwright cache) → iframe preview shell →
#    ego-browser Page.printToPDF + pdftoppm
#    Note: headless Google Chrome enforces a minimum window width (`--window-size=375` yields
#    innerWidth 500), so narrow-viewport shots come out as a wider layout cropped to 375.
```

## Verified (re-runnable verification entry points)

Full verdicts and evidence for 18 real-machine cases, 8 post-fix re-runs and 3 back-port samples live in
[`docs/test-results.md`](docs/test-results.md); fixtures and the case list in [`docs/test-plan.md`](docs/test-plan.md)
and [`docs/test-fixtures/`](docs/test-fixtures/).

Cross-repo protocols (what must match upstream, what is intentionally divergent) and past work slices are archived in
[`docs/cross-repo/`](docs/cross-repo/); one command reconciles gate coverage plus **every** skill-copy fingerprint:
`node plugins/design-router/scripts/check-checks-sync.mjs <upstream>/extensions/design-router/checks`.

```bash
node plugins/design-router/index.test.mjs                                  # plugin unit tests (incl. 8 false-positive regressions)
node plugins/design-router/scripts/check-checks-sync.mjs <pi-checks-dir>   # gate-coverage parity with the pi version
cd <my-pi-skills>/extensions/design-router/checks && node run-tests.mjs    # upstream checker suite (runs under Node)
```

### Repository structure

```
├── plugins/design-router/     # Deterministic-tool plugin (6 tools, zero runtime deps)
├── presets/my-agent/          # DSH preset (agent.cordis.yml + preset.yml)
├── skills/
│   ├── design-references/     # Routing skill (DSH-adapted)
│   └── hallmark/              # Anti-AI-slop skill (MIT upstream copy, incl. site/ theme assets)
├── README.md                  # English (primary)
└── README.zh.md               # 中文
```

## Third-party content & license attribution

This repo bundles the following third-party content (upstream licenses/attribution preserved):

| Content | Source | License | Location |
| --- | --- | --- | --- |
| hallmark skill + `site/` theme tokens & examples | [nutlope/hallmark](https://github.com/nutlope/hallmark) | MIT (full text in [`skills/hallmark/LICENSE`](skills/hallmark/LICENSE)) | `skills/hallmark/` |
| External design resources referenced by the registry (kami/zine/logo-generator, etc.) | respective upstream repos | link-only references (not vendored; source URLs in [`registry.md`](skills/design-references/references/registry.md)) | — |

Everything else (`plugins/`, `presets/`, `skills/design-references/`) is original to this repo and licensed under the [MIT License](LICENSE) (Copyright © 2026 haohaiHuang).

## Related

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — the harness this runs on (`dsh`, everything is a plugin)
- [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) — upstream skills repo (design-references / skill-router / vision)
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) — curated DSH plugin list
