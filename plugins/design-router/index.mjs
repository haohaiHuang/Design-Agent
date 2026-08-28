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
      const bucketName = (b) => (b && registry.buckets?.[b] ? `[桶 ${b} · ${registry.buckets[b].split("：")[0]}]` : "");
      const lines = [`## ${branch} · 环节 ${stage} 资源`, ""];
      for (const r of hits) {
        lines.push(
          `### ${r.name} ${bucketName(r.bucket)}`,
          `- 角色: ${r.role} · 形态: ${r.form} · 层级: ${r.level}`,
          `- 适用: ${r.scenarios}`,
          `- 退化链: ${r.fallback}`,
          `- 来源: ${r.source}`,
          "",
        );
      }
      if (stage === 1) {
        const buckets = [...new Set(hits.map((r) => r.bucket).filter(Boolean))];
        lines.push(
          "## 环节 1 多样性硬规则（反同质化，必守）",
          "1. **3 个候选必须来自 ≥2 个不同风格桶**（上表 [桶 X] 标注），且来源资源两两不同。",
          `2. 本环节命中的风格桶：${buckets.length ? buckets.join(" / ") : "无（本分支资源未打桶，需用 design_route 按需求特征定位桶组合）"}。`,
          "3. refero 等真实产品库只能贡献 1 个候选；其余候选从其他桶取（zine/kami/hallmark 主题等）。",
          "4. 每个候选标注「来源桶 + 来源资源 + 证据」；候选间色相/字体气质/布局骨架至少两维不同。",
          "5. 拿不准该去哪几个桶 → 调 `design_route <需求特征>` 返回推荐桶组合。",
          "6. 3 候选产出后 → 调 `design_diversity <c1> <c2> <c3>` 机器校验差异度，不达标回炉重选。",
          "",
        );
      }
      lines.push("铁律：参考必须转译成约束（环节2），不'看一眼'就产出。用户精选资产优先于外部参考。");
      return lines.join("\n");
    },
  }));

  // ---- design_route（需求特征 → 推荐风格桶组合）----
  ctx.tools.register(defineToolDef({
    name: "design_route",
    description:
      "按需求特征（品类/气质/内容类型关键词）返回推荐风格桶组合（主桶必查 + 次桶按需）+ 每桶代表资源。环节 1 调研前必调：先把需求特征翻译成 2-4 个关键词，再查该去哪些桶检索。关键词不在路由表时返回全部 8 桶 + 各桶代表，由你按需求挑 2-3 桶。",
    parameters: {
      query: { type: "string", required: true, description: "需求特征关键词（如：SaaS 落地页 / AI 对话界面 / 数据仪表盘 / 品牌海报 / 文档博客）。可逗号分隔多个。" },
    },
    async execute(args) {
      const q = String(args.query || "").toLowerCase();
      const lines = ["## design_route · 需求 → 风格桶组合", ""];
      let matched = null;
      for (const [pattern, route] of Object.entries(registry.routing || {})) {
        if (pattern.split("|").some((k) => q.includes(k.trim()))) {
          matched = { pattern, route };
          break;
        }
      }
      const bucketRep = (b) => {
        const reps = registry.resources.filter((r) => r.bucket === b).map((r) => r.slug);
        const note = registry.bucketNotes?.[b] ? `｜查询指引: ${registry.bucketNotes[b]}` : "";
        return reps.length ? `代表: ${reps.slice(0, 4).join(", ")}${note}` : `查询指引: ${note || "见 registry.md 该桶资源"}`;
      };
      if (matched) {
        const { pattern, route } = matched;
        lines.push(`匹配模式: ${pattern}`, "");
        lines.push("### 主桶（必查，各取 ≥1 候选源）");
        for (const b of route.primary) lines.push(`- **[${b}]** ${registry.buckets?.[b] ?? ""} ${bucketRep(b)}`);
        lines.push("", "### 次桶（按需，增强候选多样性）");
        for (const b of route.secondary) lines.push(`- [${b}] ${registry.buckets?.[b] ?? ""} ${bucketRep(b)}`);
        lines.push("", "铁律：3 候选来自 ≥2 桶；refero 类真实产品库每桶只算 1 个候选。");
      } else {
        lines.push(`未命中路由表（关键词: ${q || "空"}）。返回全部 8 桶：`, "");
        for (const [b, desc] of Object.entries(registry.buckets || {})) {
          lines.push(`- **[${b}]** ${desc} ${bucketRep(b)}`);
        }
        lines.push("", "按需求气质挑 2-3 个桶（主）+ 1-2 个次桶，再回 design_lookup 查各桶资源。");
      }
      return lines.join("\n");
    },
  }));

  // ---- design_diversity（候选差异度机器检查）----
  ctx.tools.register(defineToolDef({
    name: "design_diversity",
    description:
      "对 3 个候选的 token 草稿做机器化差异度检查（反同质化）：色相族（暖/冷/中性/多色）、字体气质（衬线/无衬线/等宽/展示）、布局骨架关键词。返回两两差异报告 + PASS/FAIL。用于环节 1 候选展示前必调——3 个候选色相族、字体气质、布局骨架至少两维不同，且来源桶/来源资源不同，否则 FAIL 回炉。",
    parameters: {
      c1: { type: "string", required: true, description: "候选1 的 token 草稿（色/字/距/质感 + 来源桶 + 来源资源，如：色#4F46E5系/Inter/间距4pt/极简 | 桶minimal/refero）" },
      c2: { type: "string", required: true, description: "候选2 的 token 草稿" },
      c3: { type: "string", required: true, description: "候选3 的 token 草稿" },
    },
    async execute(args) {
      const { c1, c2, c3 } = args;
      const cands = [
        { label: "c1", text: String(c1 || "") },
        { label: "c2", text: String(c2 || "") },
        { label: "c3", text: String(c3 || "") },
      ];
      // 色相族：优先解析 hex 算 HSL 色相，其次关键词兜底
      const WARM = ["橙", "橘", "红", "褐", "暖", "焦糖", "amber", "orange", "red", "brown", "cream", "象牙", "墨蓝"];
      const COOL = ["蓝", "青", "冷", "navy", "blue", "cyan", "teal", "石墨"];
      const NEUTRAL = ["灰", "白", "黑", "米", "neutral", "gray", "white", "black", "beige", "暖纸"];
      const hexToHueFamily = (hex) => {
        const m = /#([0-9a-f]{6})/i.exec(hex);
        if (!m) return null;
        const n = parseInt(m[1], 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2 / 255;
        if (l < 0.15) return "中性(暗)";
        if (l > 0.85) return "中性(亮)";
        const d = max - min;
        if (d === 0) return "中性";
        let h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
        if (h < 20 || h >= 340) return "暖(红)";
        if (h < 60) return "暖(橙黄)";
        if (h < 170) return "冷(绿青)";
        if (h < 260) return "冷(蓝紫)";
        return "暖(紫红)";
      };
      const hueFamily = (t) => {
        const lower = t.toLowerCase();
        const hexMatch = /#[0-9a-f]{6}/i.exec(lower);
        if (hexMatch) return hexToHueFamily(hexMatch[0]);
        const score = { 暖: 0, 冷: 0, 中性: 0 };
        for (const k of WARM) if (lower.includes(k.toLowerCase())) score["暖"]++;
        for (const k of COOL) if (lower.includes(k.toLowerCase())) score["冷"]++;
        for (const k of NEUTRAL) if (lower.includes(k.toLowerCase())) score["中性"]++;
        const max = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
        return max[1] > 0 ? max[0] : "未识别";
      };
      // 字体气质
      const fontTone = (t) => {
        const lower = t.toLowerCase();
        if (/(serif|衬线|宋体|宋体|georgia|times|noto serif)/.test(lower)) return "衬线";
        if (/(mono|等宽|jetbrains|monospace|consolas)/.test(lower)) return "等宽";
        if (/(display|展示|grotesk|黑体|无衬线|sans|inter|roboto|space grotesk|plus jakarta|noto sans)/.test(lower)) return "无衬线/展示";
        return "未识别";
      };
      // 来源桶/资源
      const src = (t) => {
        const m = t.match(/桶\s*([a-z]+)/i) || t.match(/\[桶\s*([a-z]+)\]/i) || t.match(/(minimal|editorial|darktech|bold|warmpaper|liquid|dataviz|retro)/i);
        return m ? m[1].toLowerCase() : "未标注";
      };
      const profiles = cands.map((c) => ({
        ...c,
        hue: hueFamily(c.text),
        font: fontTone(c.text),
        src: src(c.text),
      }));
      const lines = ["## design_diversity · 候选差异度检查", ""];
      lines.push("| 候选 | 色相族 | 字体气质 | 来源桶/资源 |");
      lines.push("| --- | --- | --- | --- |");
      for (const p of profiles) lines.push(`| ${p.label} | ${p.hue} | ${p.font} | ${p.src} |`);
      // 两两对比
      const pairs = [
        [0, 1, "c1↔c2"],
        [0, 2, "c1↔c3"],
        [1, 2, "c2↔c3"],
      ];
      const dims = ["hue", "font"];
      const issues = [];
      lines.push("", "### 两两差异");
      for (const [i, j, label] of pairs) {
        const a = profiles[i], b = profiles[j];
        const diff = dims.filter((d) => a[d] !== b[d]);
        const srcDiff = a.src !== b.src;
        const dimNote = diff.length === 0 ? "⚠️ 色相与字体全部相同" : `色相${diff.includes("hue") ? "异" : "同"} · 字体${diff.includes("font") ? "异" : "同"}`;
        lines.push(`- ${label}: ${dimNote} · 来源${srcDiff ? "异" : "同⚠️"}`);
        if (diff.length === 0 || !srcDiff) {
          issues.push(`${label} ${diff.length === 0 ? "色相/字体全同" : "来源相同"}`);
        }
      }
      const pass = issues.length === 0;
      lines.push("", pass
        ? "✅ PASS：3 候选在色相/字体上互有差异且来源不同，满足反同质化要求。布局骨架差异请人工核对（本工具不覆盖）。"
        : `❌ FAIL：${issues.join("；")}。回炉——换掉同质候选，确保 ≥2 个不同风格桶且色相/字体至少两维不同。`);
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
