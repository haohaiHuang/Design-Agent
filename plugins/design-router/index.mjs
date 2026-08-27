/**
 * design-router — design-references 确定性能力 × DSH 插件
 *
 * 定位：把 design-references 的确定性层（registry 查询、机器化检查）从"模型读
 * markdown 后自己 grep"升级为确定性工具。由 my-agent 预设以绝对路径挂载。
 *
 * 移植自 my-pi-skills extensions/design-router（pi extension → DSH Cordis 插件）：
 *   - 去掉 pi 专属的 before_agent_start 注入、/design-router 命令、design_research
 *     （DSH 用 web_search + 台账退化链）、hallmark_study_fetch（DSH 用 dembrandt/defuddle）
 *   - 保留 3 个确定性工具：design_lookup / design_audit / design_contrast
 *   - 不依赖 @deepseek-ai/dsh-tools（工作区模块解析不到 dsh 安装目录），
 *     直接用完整 JSON Schema 构造工具定义（与 dsh-tool 注册的 schema 同构）
 */
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runTypographyChecks } from "./checks/typography.mjs";
import { runLayoutChecks } from "./checks/layout.mjs";
import { runA11yChecks } from "./checks/a11y.mjs";
import { runCopyChecks } from "./checks/copy.mjs";
import { runContrastChecks } from "./checks/contrast.mjs";
import { runCheatChecks } from "./checks/cheat.mjs";

const name = "design-router";
const inject = ["tools"];

// ---------- registry 加载 ----------
function loadRegistry() {
  try {
    const here = fileURLToPath(new URL("./data/registry.json", import.meta.url));
    return JSON.parse(readFileSync(here, "utf8"));
  } catch {
    return { resources: [], routes: {}, logoExtra: {} };
  }
}

// ---------- audit 文件收集 ----------
const AUDIT_EXTS = [".html", ".htm", ".css", ".scss", ".js", ".jsx", ".ts", ".tsx", ".vue"];

function collectFiles(target) {
  const abs = resolve(target);
  const out = [];
  const walk = (p) => {
    let st;
    try {
      st = statSync(p);
    } catch {
      return;
    }
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) {
        if (e === "node_modules" || e.startsWith(".")) continue;
        walk(join(p, e));
      }
    } else if (AUDIT_EXTS.includes(extname(p).toLowerCase())) {
      out.push(p);
    }
  };
  walk(abs);
  return out;
}

function readAuditFiles(paths) {
  return paths
    .map((p) => {
      try {
        const content = readFileSync(p, "utf8");
        const ext = extname(p).toLowerCase();
        const kind = ext === ".html" || ext === ".htm" ? "html" : ext === ".css" || ext === ".scss" ? "css" : "other";
        return { path: p, content, kind };
      } catch {
        return null;
      }
    })
    .filter((f) => f !== null);
}

/** 读目标文件/目录 → { files, paths, error }（两工具共用，错误文案统一） */
function readTargetFiles(target) {
  const abs = resolve(target);
  let paths;
  try {
    paths = collectFiles(abs);
  } catch (e) {
    return { files: [], paths: [], error: `无法读取 ${target}：${e.message}` };
  }
  if (paths.length === 0) return { files: [], paths: [], error: `目标下无前端文件（html/css/js/tsx/vue）：${target}` };
  return { files: readAuditFiles(paths), paths };
}

const VISUAL_GATES_NOTE =
  "以下 gates 需视觉/上下文判定，机器无法覆盖，请模型按 hallmark references/slop-test.md 自查：6（hero 居中）、8（结构指纹）、28/29/31（enrichment）、32（diversification knob）、35/36（装饰/基线）、44/45（hero 折叠/无意义装饰）、52-54（响应式 section-head/radio/eyebrow 列）、56（sticky 重叠）、57（studied-DNA 丢弃）。";

function formatFindings(findings, showVisualNote) {
  if (findings.length === 0) {
    return "✅ 机器化检查通过：未检出文本可判定的 slop 项。\n\n" + (showVisualNote ? VISUAL_GATES_NOTE : "");
  }
  const bySeverity = { error: 0, warn: 0, info: 0 };
  for (const f of findings) bySeverity[f.severity]++;
  const lines = [`检出 ${findings.length} 项（error ${bySeverity.error} / warn ${bySeverity.warn} / info ${bySeverity.info}）：`, ""];
  const SEV_ORDER = { error: -1, warn: 0, info: 1 };
  const sorted = [...findings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.gate.localeCompare(b.gate));
  for (const f of sorted) {
    const icon = f.severity === "error" ? "🔴" : f.severity === "warn" ? "🟡" : "🔵";
    lines.push(`${icon} [gate ${f.gate}] ${f.message}  ${f.location}`);
  }
  lines.push("", "机器只覆盖文本可判定项；视觉/上下文类见下：", VISUAL_GATES_NOTE);
  return lines.join("\n");
}

/** 工具定义构造：完整 JSON Schema 形式（parameters 顶层 required 数组） */
function defineToolDef({ name: toolName, description, parameters, execute }) {
  return {
    name: toolName,
    description,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(parameters).map(([key, spec]) => [
          key,
          { type: spec.type, ...(spec.description ? { description: spec.description } : {}) },
        ]),
      ),
      required: Object.entries(parameters).filter(([, spec]) => spec.required).map(([key]) => key),
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    async execute(args, exec) {
      return execute(args, exec);
    },
  };
}

// ---------- 工具注册 ----------
function apply(ctx) {
  const registry = loadRegistry();

  // ---- design_lookup ----
  ctx.tools.register(defineToolDef({
    name: "design_lookup",
    description:
      "查询 design-references 资源注册表（R调研源/C约束模板/E执行工具/V校验标准 × 主/次/兜底层级），按分支×环节返回资源+退化链+精确来源。分支 A1/A2/A3/B1/B2/B3/C1/C2/C3，环节 1调研/2约束/3产出/4校验。设计任务流程中需要'这一步该查什么资源'时使用。",
    parameters: {
      branch: { type: "string", required: true, description: "场景分支：A1(APP)/A2(网页)/A3(Mac)/B1(海报)/B2(杂志插图)/B3(PPT)/C1(组件素材)/C2(动效)/C3(文档排版)" },
      stage: { type: "number", required: true, description: "五环节：1 调研 / 2 约束 / 3 产出 / 4 校验（0 意图澄清无资源）" },
    },
    async execute(args) {
      const branch = String(args.branch).toUpperCase();
      const stage = Number(args.stage);
      if (!registry.routes[branch]) {
        return `未知分支 ${branch}。可选：${Object.keys(registry.routes).join(", ")}`;
      }
      if (stage < 1 || stage > 4) {
        return "stage 需为 1-4（0 意图澄清无资源调用）";
      }
      const slugs = [
        ...(registry.routes[branch][stage] || []),
        ...(registry.logoExtra[stage] || []),
        ...(registry.hallmarkExtra?.[stage] || []),
        ...(registry.cheatExtra?.[stage] || []),
      ];
      const hits = slugs
        .map((slug) => registry.resources.find((r) => r.slug === slug))
        .filter((r) => Boolean(r));
      if (hits.length === 0) {
        return `分支 ${branch} × 环节 ${stage}：无注册资源（登记空白区，见 registry.md）。该环节走退化链人工执行。`;
      }
      const lines = [`## ${branch} · 环节 ${stage} 资源`, ""];
      for (const r of hits) {
        lines.push(`### ${r.name}`, `- 角色: ${r.role} · 形态: ${r.form} · 层级: ${r.level}`, `- 适用: ${r.scenarios}`, `- 退化链: ${r.fallback}`, `- 来源: ${r.source}`, "");
      }
      lines.push("铁律：参考必须转译成约束（环节2），不'看一眼'就产出。用户精选资产优先于外部参考。");
      return lines.join("\n");
    },
  }));

  // ---- design_audit ----
  ctx.tools.register(defineToolDef({
    name: "design_audit",
    description:
      "对目标文件/目录跑设计反模式机器检查（只读不改）：Hallmark 可机器化 slop gates（1/2/10/14/19/24/26/27/30/33/34/37/38a/39/40/41/46/47/50/51）+ interfaces CS-* 8 条 + design-references 环节4 扫描（字重/圆角/渐变/emoji）。返回带 gate 号的 punch list。用于环节4 校验。",
    parameters: {
      target: { type: "string", required: true, description: "文件或目录路径（目录会递归收集 html/css/js/tsx/vue 等）" },
    },
    async execute(args) {
      const { files, paths, error } = readTargetFiles(args.target);
      if (error) return error;
      const findings = [
        ...runTypographyChecks(files),
        ...runLayoutChecks(files),
        ...runA11yChecks(files),
        ...runCopyChecks(files),
        ...runContrastChecks(files),
        ...runCheatChecks(files),
      ];
      const isPage = files.some((f) => f.kind === "html");
      const text = formatFindings(findings, isPage);
      return `${text}\n\n扫描 ${paths.length} 个文件：${paths.slice(0, 8).join(", ")}${paths.length > 8 ? " …" : ""}`;
    },
  }));

  // ---- design_contrast ----
  ctx.tools.register(defineToolDef({
    name: "design_contrast",
    description:
      "对目标 CSS/HTML 计算 color/background 配对对比度（WCAG 2.1 为主 + APCA 近似参考），含继承链配对（.card 背景 + .card h2 文字）。检出 <4.5:1 的文本对（大字/图标按 3:1 人工放宽）与 ink-on-ink（文字≈填充）。支持 hex/rgb/hsl/oklch/一层 CSS 变量。",
    parameters: {
      target: { type: "string", required: true, description: "CSS/HTML 文件或目录路径" },
    },
    async execute(args) {
      const { files, paths, error } = readTargetFiles(args.target);
      if (error) return error;
      const findings = runContrastChecks(files);
      if (findings.length === 0) {
        return "✅ 未检出低于 4.5:1 的显式 color/background 配对（或无可配对声明，需人工核对继承链）。";
      }
      const lines = [`检出 ${findings.length} 项对比度问题：`, ""];
      for (const f of findings) lines.push(`${f.severity === "error" ? "🔴" : "🔵"} [gate ${f.gate}] ${f.message}  ${f.location}`);
      return lines.join("\n");
    },
  }));
}

export { name, inject, apply };
