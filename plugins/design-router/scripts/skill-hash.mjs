/**
 * skill-hash.mjs —— 技能树指纹（生成器与一致性脚本共用，零依赖）
 *
 * 为什么需要：manifest 原先用 `skills/design-references @ <git rev>` 记录来源，属**自指字段**
 * ——内容提交后它必然变旧，得再补一个 chore 提交刷新，且两侧仓库无法用它互相对账。
 * 改用内容派生的树指纹后：无自指、纯重跑零 diff、且**三处副本（上游 / DSH 仓库 / ~/.agents）
 * 可用同一个值机械比对**。
 *
 * 覆盖整棵技能树（含 SKILL.md 与 references/*），不是只算 registry.md —— 回灌轮改的常常是
 * workflow.md / SKILL.md，只算 registry.md 看不见那些改动。
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** 技能树指纹：排序后的「相对路径\0文件 sha256」逐行拼接，再 sha256，取前 16 位 */
export function skillTreeHash(skillDir) {
  const walk = (d, acc = []) => {
    for (const e of readdirSync(d).sort()) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p, acc);
      else acc.push(p);
    }
    return acc;
  };
  const lines = walk(skillDir)
    .map((p) => relative(skillDir, p).split(sep).join("/"))
    .sort()
    .map((rel) => `${rel}\0${createHash("sha256").update(readFileSync(join(skillDir, rel))).digest("hex")}`);
  // 空树必须响亮报错：sha256("") 会静默产出合法值，空壳目录会被当成"指纹一致"通过
  if (lines.length === 0) throw new Error(`技能树为空，拒绝生成指纹：${skillDir}`);
  return "sha256:" + createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 16);
}
