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
| [`skills/hallmark/`](skills/hallmark/) | Anti-AI-slop execution skill (MIT upstream copy from [nutlope/hallmark](https://github.com/nutlope/hallmark)) |

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

# 2. Preset
mkdir -p ~/.dsh/.agent-presets
cp -R presets/my-agent ~/.dsh/.agent-presets/

# 3. Plugin source (keep it in a workspace the preset's absolute path points at)
#    Place plugins/ where you want it, then edit the design-router row in
#    presets/my-agent/agent.cordis.yml to the absolute path of index.mjs

# 4. External deps (soft deps — missing ones degrade gracefully)
npm install -g dembrandt        # URL → design tokens (phase-1 candidate verification)
# defuddle: npm install -g defuddle

# 5. Machine-local assets (ledger + kami/zine/logo-generator reference libs)
#    — personal selections, not in this repo; the fallback chain covers absence
```

**Note**: the preset's plugin row uses an absolute path; on a new machine you **must** change it to your own path or the mount fails.

### Repository structure

```
├── plugins/design-router/     # Deterministic-tool plugin (3 tools, zero runtime deps)
├── presets/my-agent/          # DSH preset (agent.cordis.yml + preset.yml)
├── skills/
│   ├── design-references/     # Routing skill (DSH-adapted)
│   └── hallmark/              # Anti-AI-slop skill (MIT upstream copy)
├── README.md                  # English (primary)
└── README.zh.md               # 中文
```

## Related

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — the harness this runs on (`dsh`, everything is a plugin)
- [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) — upstream skills repo (design-references / skill-router / vision)
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) — curated DSH plugin list
