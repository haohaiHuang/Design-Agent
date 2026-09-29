#!/usr/bin/env node
/**
 * migrate-preset-0.2.0.mjs — 把 0.1.x 的「预设目录」格式迁移成 0.2.0 的「内联预设」格式
 *
 * 背景：DSH 0.2.0 移除了目录扫描。0.1.x 里预设是 `~/.dsh/.agent-presets/<id>/agent.cordis.yml`
 * （一个顶层行列表），由 `dsh-agent-presets` 扫描发现；0.2.0 改为 `dsh-agent-preset-registry`
 * + 每个预设是 profile 组合里的一行 `@deepseek-ai/dsh-agent-preset`（config 内联 plugins 列表）。
 * registry 的 config 只有 `default`/`selectedDefault`——**没有 roots，不再扫描目录**。
 *
 * 因此自定义预设必须作为一条 insert patch 写进 profile 的 `cordis.patch.yml`。
 *
 * 用法：
 *   node docs/migrate-preset-0.2.0.mjs \
 *     --src presets/my-agent/agent.cordis.yml \
 *     --id design-agent --name "设计 Agent" \
 *     --plugin /abs/path/to/plugins/design-router/index.mjs \
 *     --out /tmp/design-agent-patch.yml          # 只生成
 *   # 或直接写进某个 profile 的 patch 层（会先备份）：
 *   node docs/migrate-preset-0.2.0.mjs ... --append ~/.dsh/profiles/desktop/cordis.patch.yml
 *
 * 说明：
 * - 预设内容整体缩进后挂到 `config.plugins:` 下，**注释一并保留**。
 * - 相对插件路径（如 `./plugins/design-router/index.mjs`）会被替换为 `--plugin` 给的绝对路径：
 *   0.2.0 预设是内联的、没有"预设目录"可作相对基准，相对路径会落到 profile 目录去。
 * - 用 `--append` 写入前会备份为 `<file>.bak.<时间戳>`。
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};
const SRC = opt('src');
const OUT = opt('out');
const APPEND = opt('append');
const ID = opt('id', 'design-agent');
const NAME = opt('name', '设计 Agent');
const DESC = opt('desc', '自定义 Agent 预设');
const ORDER = opt('order', '10');
const PLUGIN = opt('plugin');
const REL_PLUGIN = opt('rel-plugin', './plugins/design-router/index.mjs');

if (!SRC || (!OUT && !APPEND)) {
  console.error('用法: node migrate-preset-0.2.0.mjs --src <agent.cordis.yml> (--out <file> | --append <profile/cordis.patch.yml>) [--id --name --desc --order --plugin --rel-plugin]');
  process.exit(1);
}
if (!existsSync(SRC)) {
  console.error(`源文件不存在: ${SRC}`);
  process.exit(1);
}

let body = readFileSync(SRC, 'utf8');
// 相对插件路径 → 绝对路径（内联预设没有目录基准）
if (PLUGIN) {
  const re = new RegExp(`['"]${REL_PLUGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  if (re.test(body)) {
    body = body.replace(re, `'${PLUGIN}'`);
    console.error(`ℹ️  插件路径已改为绝对路径: ${PLUGIN}`);
  } else {
    console.error(`⚠️  未找到相对插件路径 ${REL_PLUGIN}（预设里可能没有本地插件行）`);
  }
}

const inner = body.split('\n').map((l) => (l.trim() === '' ? '' : '      ' + l)).join('\n');
const presetRow = `- id: preset-${ID}
  name: '@deepseek-ai/dsh-agent-preset'
  config:
    id: ${ID}
    name: ${NAME}
    description: ${DESC}
    order: ${ORDER}
    plugins:
${inner}`;

const header = `# ── ${NAME}（0.2.0 内联预设格式，根层 insert）─────────────────────────
# DSH 0.2.0 起预设不再从 ~/.dsh/.agent-presets/ 扫描；自定义预设必须作为 insert patch 写进 profile。
# 生成器: docs/migrate-preset-0.2.0.mjs（源: ${SRC}）
`;
const patch = header + '- insert:\n' +
  presetRow.split('\n').map((l) => (l.trim() === '' ? '' : '  ' + l)).join('\n') + '\n';

if (OUT) {
  writeFileSync(OUT, patch);
  console.log(`✅ 已生成 patch: ${OUT}（${patch.split('\n').length} 行）`);
}

if (APPEND) {
  const stamp = Date.now();
  const bak = `${APPEND}.bak.${stamp}`;
  copyFileSync(APPEND, bak);
  const base = readFileSync(APPEND, 'utf8');
  writeFileSync(APPEND, base.replace(/\n*$/, '\n') + '\n' + patch);
  console.log(`✅ 已追加到 ${APPEND}（备份: ${bak}）`);
  console.log('   ⟳ 重启 DSH（桌面端请完全退出再打开）后，在新会话的预设列表里应能看到「' + NAME + '」');
}
