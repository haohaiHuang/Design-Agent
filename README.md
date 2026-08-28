# Design-Agent — DSH Design Agent workspace

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-dsh-blue)](https://github.com/deepseek-ai/deepseek-harness)
[![Topics: dsh](https://img.shields.io/badge/plugin-dsh-4B9CD3)](https://github.com/topics/dsh)

A fully reproducible package for a **design agent on [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)**: the `my-agent` preset, the `design-references` routing skill (DSH-adapted), and the `design-router` deterministic-tool plugin. Built by upgrading an existing HTML-based design agent with the [design-references](https://github.com/haohaiHuang/my-pi-skills/tree/main/skills/design-references) methodology.

> 🇨🇳 中文版见 [README.zh.md](README.zh.md)

## What's inside

| Component | Role |
| --- | --- |
| [`plugins/design-router/`](plugins/design-router/) | Deterministic-tool Cordis plugin (3 read-only tools, zero external runtime deps) |
| [`presets/my-agent/`](presets/my-agent/) | DSH agent preset (`agent.cordis.yml` + `preset.yml`): five-phase persona with per-stage confirmation gates |
| [`skills/design-references/`](skills/design-references/) | Scenario-branch routing skill (A product / B content / C general × five phases), DSH-adapted |
| [`skills/hallmark/`](skills/hallmark/) | Anti-AI-slop execution skill (MIT upstream copy from [nutlope/hallmark](https://github.com/nutlope/hallmark); `site/` theme tokens & examples bundled in-skill, self-contained) |

## plugins/design-router — deterministic tools

Ported from [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) `extensions/design-router` (pi extension → DSH Cordis plugin). Mounted by the `my-agent` preset via an absolute-path row in `agent.cordis.yml`:

```yaml
- id: design-router
  name: '/absolute/path/to/plugins/design-router/index.mjs'
```

### Tools

| Tool | Purpose | Phase |
| --- | --- | --- |
| `design_lookup <branch> <stage>` | Query the design-resource registry (R/C/E/V 3-D index + fallback chain + sources) | "What do I consult at this step?" |
| `design_audit <target>` | Machine slop gates (hallmark machine subset) + interfaces CS-* 8 rules + phase-4 scans + inherited-contrast | Phase 4 verification |
| `design_contrast <target>` | WCAG 2.1 + APCA-approx contrast | Phase 4 verification |

### Intentional differences from the pi version

- **Removed** `design_research` (DSH uses the ledger-grep + refero probe + `web_search` fallback chain)
- **Removed** `hallmark_study_fetch` (DSH uses `dembrandt` / `defuddle` instead)
- **Removed** `before_agent_start` injection and the `/design-router` command (DSH's skill-loading mechanism already covers routing)
- **No dependency on `@deepseek-ai/dsh-tools`** (a workspace module cannot resolve the dsh install directory); tool definitions are built with plain JSON Schema — zero external runtime deps

### Layout

```
plugins/design-router/
├── index.mjs          # Plugin entry: registers 3 tools (node:fs reads only, never writes)
├── checks/            # Ported checkers (TS→JS): typography/layout/a11y/copy/contrast/cheat/types
└── data/
    └── registry.json  # Data form of registry.md (56 resources × 9 branch routes)
```

### Maintenance

- `registry.md` is the **source of truth** (`~/.agents/skills/design-references/references/registry.md`); after editing it, sync `data/registry.json` (upstream generates it with `scripts/build-registry.mjs`; this repo syncs manually or with a future script)
- Checker logic follows upstream `extensions/design-router/checks/`; port on upstream updates

## One-shot reproduction (fresh machine)

The repo is a **complete reproducible package**: plugin + preset + DSH-adapted skills included.

```bash
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

# 5. Machine-local assets (ledger + kami/zine/logo-generator reference libs)
#    — personal selections, not in this repo; the fallback chain covers absence
```

**Note**: the preset's plugin row uses a **relative path** (`./plugins/design-router/index.mjs`,
with `presets/my-agent/plugins` as a relative symlink expanded by `cp -RL`), so a fresh
machine just copies the preset directory — **no path edits required**. If you'd rather
avoid symlinks, copy `plugins/design-router/` into `presets/my-agent/plugins/` and use
plain `cp -R` (same result, just a second copy).

### Repository structure

```
├── plugins/design-router/     # Deterministic-tool plugin (3 tools, zero runtime deps)
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

Everything else (`plugins/`, `presets/`, `skills/design-references/`) is original to this repo.

## Related

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — the harness this runs on (`dsh`, everything is a plugin)
- [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) — upstream skills repo (design-references / skill-router / vision)
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) — curated DSH plugin list
