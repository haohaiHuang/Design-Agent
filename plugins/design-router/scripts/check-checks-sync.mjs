#!/usr/bin/env node
/**
 * check-checks-sync.mjs — 核对 pi 版 checks（TS）与 DSH 版 checks（MJS）的 gate 覆盖一致性
 *
 * 背景：design-router 的 checks/ 由 my-pi-skills/extensions/design-router/checks/ 移植（TS→MJS）。
 * 未来 pi 版更新检查器时，阈值细节无法逐行 diff，容易漏同步。本脚本从两版提取
 * 实际使用的 gate 号（排除类型定义里的字符串），对比覆盖是否一致。
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

const HERE = dirname(fileURLToPath(import.meta.url));
const DSH_CHECKS = join(HERE, "../checks");
const PI_CHECKS = process.argv[2] || join(HERE, "../../../../../../my-pi-skills/extensions/design-router/checks");

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
  process.exit(1);
} else {
  console.log("✅ 全部 checks 与 pi 版 gate 覆盖一致。");
}
