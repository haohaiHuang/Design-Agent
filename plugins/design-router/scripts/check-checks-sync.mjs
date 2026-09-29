#!/usr/bin/env node
/**
 * check-checks-sync.mjs — 核对 pi 版 checks（TS）与 DSH 版 checks（MJS）的 gate 覆盖一致性
 *
 * 背景：design-router 的 checks/ 由 my-pi-skills/extensions/design-router/checks/ 移植（TS→MJS）。
 * 未来 pi 版更新检查器时，阈值细节无法逐行 diff，容易漏同步。本脚本从两版提取
 * 实际使用的 gate 号（排除类型定义里的字符串），对比覆盖是否一致。
 *
 * 同时做**技能树指纹对账**：`skills/design-references/` 的内容指纹在三处（DSH 仓库 / pi 仓库 /
 * 已安装 ~/.agents/skills）必须相同——这是"资源目录必须一致"的机械保证（manifest.designReferencesHash
 * 就是同一个值）。路由短名单（ROUTES）有意分叉，不参与该项比对。
 *
 * 用法：
 *   node plugins/design-router/scripts/check-checks-sync.mjs
 *   node plugins/design-router/scripts/check-checks-sync.mjs /path/to/my-pi-skills/extensions/design-router/checks
 *
 * 退出码：0 = 全部一致；1 = 存在差异（CI 可挂）
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { skillTreeHash } from "./skill-hash.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DSH_CHECKS = join(HERE, "../checks");
// 默认 ~/my-pi-skills（可用 PI_SKILLS_CHECKS 环境变量或显式路径参数覆盖）
const PI_CHECKS =
  process.env.PI_SKILLS_CHECKS ||
  process.argv[2] ||
  join(homedir(), "my-pi-skills", "extensions", "design-router", "checks");

/** 提取实际使用的 gate 号（排除类型定义、注释里的字符串） */
function extractGates(content) {
  const gates = new Set();
  // 匹配 gate: "N" / gate: N / "gate N" / gate 'N' — 过滤注释行和 interface/type 定义
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
    if (/^\s*(interface|type|export interface|export type)\b/.test(trimmed)) continue;
    const m = trimmed.match(/gate[\s:]*["']?(\d+)[a-z-]*["']?/i) || trimmed.match(/["']gate\s+(\d+)["']/i);
    if (m) gates.add(m[1]);
  }
  return [...gates].sort((a, b) => Number(a) - Number(b));
}

function checkDir(label, dir, base) {
  if (!existsSync(dir)) {
    console.log(`⚠️  ${label} 目录不存在: ${dir}`);
    return null;
  }
  const out = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".ts") && !f.endsWith(".mjs")) continue;
    // 排除测试与运行器：它们扫描的 gate 号取决于测试怎么写（如 kill-slop.test 顺带断言
    // typography 的 gate 1/38），与"检查器覆盖"无关 —— 早先它会报出两条假差异。
    if (/\.test\.(ts|mjs)$/.test(f) || /^run-tests\./.test(f)) continue;
    const content = readFileSync(join(dir, f), "utf8");
    const gates = extractGates(content);
    const name = f.replace(/\.(ts|mjs)$/, "");
    if (gates.length) out[name] = gates;
  }
  return out;
}

const pi = checkDir("pi", PI_CHECKS);
const dsh = checkDir("dsh", DSH_CHECKS);
if (!pi || !dsh) process.exit(1);

const allFiles = new Set([...Object.keys(pi), ...Object.keys(dsh)]);
let fail = 0;
for (const f of [...allFiles].sort()) {
  const p = pi[f] || [];
  const d = dsh[f] || [];
  const same = JSON.stringify(p) === JSON.stringify(d);
  if (same) {
    console.log(`✅ ${f}: ${p.length ? p.join(",") : "(纯类型/工具，无 gate)"}`);
  } else {
    fail++;
    console.log(`⚠️  ${f}: pi=[${p.join(",")}] dsh=[${d.join(",")}] — 需要同步`);
  }
}
console.log("");
if (fail) {
  console.log(`❌ ${fail} 个文件 gate 覆盖不一致——对照 pi 版检查移植是否完整。`);
} else {
  console.log("✅ 全部 checks 与 pi 版 gate 覆盖一致。");
}

// ---------- 技能树指纹对账（所有存在的副本必须相同）----------
// 平台目录约定取自上游 `docs/skill-sync-map.md`（pi 的规范路径是 ~/.pi/agent/skills，不是 ~/.pi/skills）。
const SKILL_COPIES = [
  ["DSH 仓库", join(HERE, "../../../skills/design-references")],              // plugins/design-router/scripts → 仓库根
  ["pi 仓库", join(PI_CHECKS, "../../../skills/design-references")],           // <pi>/extensions/design-router/checks → <pi>
  ["pi", join(homedir(), ".pi", "agent", "skills", "design-references")],
  ["共享层", join(homedir(), ".agents", "skills", "design-references")],
  ["workbuddy", join(homedir(), ".workbuddy", "skills", "design-references")],
  ["codex", join(homedir(), ".codex", "skills", "design-references")],
  ["claude", join(homedir(), ".claude", "skills", "design-references")],
  ["trae-ide", join(homedir(), ".trae-cn", "skills", "design-references")],
  ["trae-work", join(homedir(), ".trae", "skills", "design-references")],
];

console.log("\n技能树指纹（skills/design-references 全树，各副本必须一致）：");
const hashes = [];
const missing = [];
for (const [label, dir] of SKILL_COPIES) {
  if (!existsSync(dir)) {
    missing.push(label);
    continue;
  }
  const h = skillTreeHash(dir);
  hashes.push([label, h]);
  console.log(`  ${label.padEnd(12)} ${h}`);
}
const uniq = new Set(hashes.map(([, h]) => h));
if (hashes.length === 0) {
  fail++;
  console.log("  ❌ 一个技能副本都没找到——检查路径或参数");
} else if (uniq.size === 1) {
  console.log(`✅ ${hashes.length} 处技能副本内容一致${missing.length ? `（未安装：${missing.join(" / ")}）` : ""}。`);
} else {
  fail++;
  console.log(`❌ 技能副本内容不一致（${uniq.size} 种指纹）——资源目录必须一致：改 registry.md 后整文件复制到其余副本。`);
  const byHash = {};
  for (const [label, h] of hashes) (byHash[h] ||= []).push(label);
  for (const [h, labels] of Object.entries(byHash)) console.log(`   ${h}: ${labels.join(", ")}`);
}

console.log("");
if (fail) process.exit(1);
