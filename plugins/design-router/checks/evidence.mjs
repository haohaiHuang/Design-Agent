/**
 * checks/evidence.mjs — 快照证据层（纯函数，零依赖）
 *
 * 三件事，全部可无浏览器回归：
 *   1. 校验 tokens.json：每个值必须带 selector 或 source（EVD-1）；
 *   2. 校验 META.json：10 个必填字段齐全、类型正确、slug 与目录名一致（EVD-3）；
 *   3. 批量决策：选谁（quality≥良）、写不写（幂等 / humanEdited）、超没超体积。
 *
 * T6 起再加读取层（EVD-4 / EVD-5）：describeEvidence 是纯函数，readEvidence 是**唯一**
 * 碰磁盘的入口；只有「文件存在且 META 合格」才输出路径，缺失/断链一律 path:null + warning。
 *
 * 真浏览器只负责采集事实（computed styles + CSS 变量），这里负责判是否合格。
 * 缺字段一律显式 error，不静默降级；schema 结论由 scripts/design-evidence.mjs
 * 在写盘前逐条验，验不过就不落文件。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const EVIDENCE_VERSION = 1;
export const META_SOURCE = "design-evidence 1.0";

/** SPEC 6.4：capturedAt 超过 90 天 ⇒ 读取方标 stale（EVD-4） */
export const STALE_DAYS = 90;

export const QUALITY_RANK = Object.freeze({ 优: 4, 良: 3, 中: 2, 差: 1, 未评估: 0 });
export const QUALITY_LEVELS = Object.freeze(Object.keys(QUALITY_RANK));

export const BUCKETS = Object.freeze([
  "minimal",
  "editorial",
  "darktech",
  "bold",
  "warmpaper",
  "liquid",
  "dataviz",
  "retro",
]);

export const SHOT_SIZES = Object.freeze(["desktop", "mobile"]);

/** SPEC 6.4 的 10 个字段；bucket 允许显式为 null（工具/素材类资源没有风格桶） */
export const META_FIELDS = Object.freeze([
  "slug",
  "url",
  "capturedAt",
  "quality",
  "bucket",
  "shots",
  "colors",
  "stale",
  "humanEdited",
  "source",
]);

export const LIMITS = Object.freeze({
  totalBytes: 2 * 1024 * 1024,
  itemBytes: 40 * 1024,
});

export const STATUS = Object.freeze({ SUCCESS: "success", FAILED: "failed", SKIPPED: "skipped" });

// ─────────────────────────── 页面身份（T8） ───────────────────────────
/**
 * 拦截页/迁移页会把整页换掉，提示一定出现在「身份区」：标题 + 正文开头。
 * 只看这一段，正常文章正文里提到 blocked / moved 不会误报（反例见 evidence.test.mjs）。
 */
export const PAGE_IDENTITY_HEAD_CHARS = 200;

/**
 * 按顺序匹配，命中第一个即返回（越具体的措辞越靠前，避免宽泛短语先吃掉具体措辞）。
 */
export const PAGE_IDENTITY_PATTERNS = Object.freeze([
  Object.freeze({ kind: "blocked", label: "Cloudflare 拦截页", rule: /sorry,?\s*you have been blocked/i }),
  Object.freeze({ kind: "blocked", label: "Cloudflare 拦截页", rule: /you have been blocked/i }),
  Object.freeze({ kind: "blocked", label: "Cloudflare 拦截页", rule: /just a moment\.\.\.|just a moment…/i }),
  Object.freeze({ kind: "blocked", label: "Cloudflare 拦截页", rule: /attention required/i }),
  Object.freeze({ kind: "blocked", label: "Cloudflare 拦截页", rule: /checking your browser before accessing|cloudflare ray id/i }),
  Object.freeze({ kind: "moved", label: "站点迁移提示页", rule: /moved to a new home/i }),
  Object.freeze({ kind: "moved", label: "站点迁移提示页", rule: /(?:has|have) moved to/i }),
  Object.freeze({ kind: "moved", label: "站点迁移提示页", rule: /this (?:site|page|domain) has moved/i }),
  Object.freeze({ kind: "moved", label: "站点迁移提示页", rule: /no longer available/i }),
]);

const collapse = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/**
 * 页面身份判定（纯函数）：输入是浏览器采集的 {title, textHead, textLength}。
 * @returns {{fake: boolean, kind: "blocked"|"moved"|null, label: string|null, matched: string|null,
 *   title: string, textHead: string, reason: string|null}}
 */
export function pageIdentity(snapshot = {}, { headChars = PAGE_IDENTITY_HEAD_CHARS } = {}) {
  const title = collapse(snapshot?.title);
  const textHead = collapse(snapshot?.textHead).slice(0, Math.max(0, headChars));
  // 正文开头先于标题：正文的提示更具体，标题往往只是站名（「Just a moment...」这类除外）
  const scope = `${textHead}\n${title}`;
  for (const pattern of PAGE_IDENTITY_PATTERNS) {
    const hit = pattern.rule.exec(scope);
    if (!hit) continue;
    return {
      fake: true,
      kind: pattern.kind,
      label: pattern.label,
      matched: hit[0],
      title,
      textHead,
      reason: `疑似假页面（${pattern.label}）：标题/正文开头命中「${hit[0]}」`,
    };
  }
  return { fake: false, kind: null, label: null, matched: null, title, textHead, reason: null };
}


const LEVEL_RANK = Object.freeze({ 主: 3, 次: 2, 兜底: 1 });

/** 代码托管/包注册表不算"可渲染的设计页面"；source 里同时有官网时优先官网 */
const CODE_HOST =
  /^(?:github\.com|www\.github\.com|raw\.githubusercontent\.com|gist\.github\.com|unpkg\.com|cdn\.jsdelivr\.net|jsdelivr\.net|npmjs\.com|www\.npmjs\.com)$/i;

/** 只收语义型 CSS 变量，避免把 Tailwind 调色板（--color-*）和内部工具变量（--tw-*）整锅端走 */
const SEMANTIC_VAR =
  /^--(?:background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring|radius|font|spacing|shadow|color-(?:accent|primary|background|foreground|muted|border|surface|text))/i;

const NO_VALUE = /^(?:none|transparent|rgba\(0,\s*0,\s*0,\s*0\)|0px|0s|normal|auto)$/i;

function finding(gate, rule, message, extra = {}) {
  return { gate, rule, severity: "error", message, ...extra };
}

const isPlainObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

export function qualityOf(resource = {}, ledger = {}) {
  const logged = ledger?.entries?.[resource?.slug]?.quality;
  const declared = resource?.quality;
  const candidates = [logged, declared].filter((q) => QUALITY_LEVELS.includes(q));
  if (!candidates.length) return "未评估";
  return candidates.reduce((best, q) => (QUALITY_RANK[q] > QUALITY_RANK[best] ? q : best), "未评估");
}

// ─────────────────────────── tokens.json ───────────────────────────
/**
 * @returns {{ok: boolean, errors: Array<object>}}
 */
export function validateTokensDoc(doc, { slug } = {}) {
  const errors = [];
  const fail = (rule, message) => errors.push(finding("EVD-1", rule, message));

  if (!isPlainObject(doc)) {
    fail("evidence-tokens-shape", "tokens.json 必须是对象（顶层带 tokens 映射）");
    return { ok: false, errors };
  }
  if (doc.version != null && doc.version !== EVIDENCE_VERSION) {
    fail("evidence-tokens-version", `tokens.json version=${doc.version}，期望 ${EVIDENCE_VERSION}`);
  }
  if (slug != null && doc.slug !== slug) {
    errors.push(
      finding("EVD-3", "evidence-slug-mismatch", `tokens.json 的 slug=${JSON.stringify(doc.slug)} 与目录名 ${JSON.stringify(slug)} 不一致`),
    );
  }
  if (doc.url != null && !isHttpUrl(doc.url)) {
    fail("evidence-tokens-url", `tokens.json 的 url 不是 http(s) 地址：${JSON.stringify(doc.url)}`);
  }

  if (!isPlainObject(doc.tokens)) {
    fail("evidence-tokens-map", "tokens 必须是对象（键 = token 名，值 = {value, selector?, source?}）");
    return { ok: errors.length === 0, errors };
  }

  const names = Object.keys(doc.tokens);
  if (!names.length) fail("evidence-tokens-empty", "tokens 为空：拒绝产出空 tokens");

  for (const name of names) {
    const entry = doc.tokens[name];
    if (!nonEmpty(name)) fail("evidence-token-name", "存在空 token 名");
    if (!isPlainObject(entry)) {
      fail("evidence-token-shape", `token ${JSON.stringify(name)} 的值必须是对象（带 value/selector/source）`);
      continue;
    }
    const hasValue =
      (typeof entry.value === "string" && entry.value.trim().length > 0) ||
      (typeof entry.value === "number" && Number.isFinite(entry.value));
    if (!hasValue) fail("evidence-token-value", `token ${JSON.stringify(name)} 缺 value 或 value 为空`);
    if (!nonEmpty(entry.selector) && !nonEmpty(entry.source)) {
      fail("evidence-token-provenance", `token ${JSON.stringify(name)} 既没有 selector 也没有 source（EVD-1：值必须可溯源）`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────── META.json ───────────────────────────
function isHttpUrl(value) {
  if (!nonEmpty(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoDate(value) {
  if (!nonEmpty(value)) return false;
  const t = Date.parse(value);
  return Number.isFinite(t) && /\d{4}-\d{2}-\d{2}T/.test(value);
}

/**
 * @returns {{ok: boolean, errors: Array<object>}}
 */
export function validateMeta(meta, { dirSlug } = {}) {
  const errors = [];
  const fail = (rule, message) => errors.push(finding("EVD-3", rule, message));

  if (!isPlainObject(meta)) {
    fail("evidence-meta-shape", "META.json 必须是对象");
    return { ok: false, errors };
  }

  for (const field of META_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(meta, field)) {
      fail("evidence-meta-missing", `META 缺必填字段 ${field}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(meta, "slug")) {
    if (!nonEmpty(meta.slug)) fail("evidence-meta-slug", "META slug 必须是非空字符串");
    else if (dirSlug != null && meta.slug !== dirSlug) {
      fail("evidence-meta-slug-dir", `META slug=${JSON.stringify(meta.slug)} 与目录名 ${JSON.stringify(dirSlug)} 不一致`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(meta, "url") && !isHttpUrl(meta.url)) {
    fail("evidence-meta-url", `META url 不是 http(s) 地址：${JSON.stringify(meta.url)}`);
  }
  if (Object.prototype.hasOwnProperty.call(meta, "capturedAt") && !isIsoDate(meta.capturedAt)) {
    fail("evidence-meta-captured-at", `META capturedAt 不是 ISO 时间：${JSON.stringify(meta.capturedAt)}`);
  }
  if (Object.prototype.hasOwnProperty.call(meta, "quality") && !QUALITY_LEVELS.includes(meta.quality)) {
    fail("evidence-meta-quality", `META quality=${JSON.stringify(meta.quality)} 不在 ${QUALITY_LEVELS.join("/")}`);
  }
  if (Object.prototype.hasOwnProperty.call(meta, "bucket")) {
    if (meta.bucket !== null && !BUCKETS.includes(meta.bucket)) {
      fail("evidence-meta-bucket", `META bucket=${JSON.stringify(meta.bucket)} 不在 8 桶内（无桶请显式 null）`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(meta, "shots")) {
    const { shots } = meta;
    if (!Array.isArray(shots) || !shots.length) fail("evidence-meta-shots", "META shots 必须是非空数组");
    else {
      const bad = shots.filter((s) => !SHOT_SIZES.includes(s));
      if (bad.length) fail("evidence-meta-shots", `META shots 含未知视口：${bad.join(", ")}（可用 desktop/mobile）`);
      if (new Set(shots).size !== shots.length) fail("evidence-meta-shots", "META shots 有重复项");
    }
  }
  if (Object.prototype.hasOwnProperty.call(meta, "colors")) {
    if (!Number.isInteger(meta.colors) || meta.colors < 1) {
      fail("evidence-meta-colors", `META colors 必须是 ≥1 的整数：${JSON.stringify(meta.colors)}`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(meta, "stale") && typeof meta.stale !== "boolean") {
    fail("evidence-meta-stale", "META stale 必须是布尔值");
  }
  if (Object.prototype.hasOwnProperty.call(meta, "humanEdited") && typeof meta.humanEdited !== "boolean") {
    fail("evidence-meta-human-edited", "META humanEdited 必须是布尔值");
  }
  if (Object.prototype.hasOwnProperty.call(meta, "source") && !nonEmpty(meta.source)) {
    fail("evidence-meta-source", "META source 必须是非空字符串");
  }

  return { ok: errors.length === 0, errors };
}

/** EVD-4 的判定给 T6 读取方复用；这里只提供纯计算，不在写入时改 stale */
export function staleFor(capturedAt, now = new Date(), days = STALE_DAYS) {
  if (!isIsoDate(capturedAt)) return null;
  const age = now.getTime() - Date.parse(capturedAt);
  return age > days * 24 * 60 * 60 * 1000;
}

// ─────────────────────────── 读取层（T6 / EVD-5） ───────────────────────────
/**
 * 快照路径的唯一写法：assets/evidence/<slug>/META.json。
 * 只描述形状，不碰磁盘；绝对路径由 readEvidence 拼。
 */
export function evidenceRelPath(slug) {
  return `assets/evidence/${slug}/META.json`;
}

/**
 * 把一条快照的读取事实转成工具可用的字段（纯函数，调用方负责读盘）。
 *
 * 纪律（EVD-5）：**只有「存在且 META 合格」才给 path**。缺失或断链一律 path:null，
 * 用 warning 说明原因——否则查找结果会指向幽灵文件，调用方 read 时才发现打不开。
 *
 * @returns {{ok: boolean, slug: string, path: string|null, rel: string|null, stale: boolean,
 *   ageDays: number|null, capturedAt: string|null, quality: string|null, bucket: string|null,
 *   warning: string|null}}
 */
export function describeEvidence({
  slug,
  path = null,
  rel = null,
  exists = false,
  meta = null,
  now = new Date(),
  days = STALE_DAYS,
} = {}) {
  const base = {
    ok: false,
    slug,
    path: null,
    rel: null,
    stale: false,
    ageDays: null,
    capturedAt: null,
    quality: null,
    bucket: null,
    warning: null,
  };
  if (!nonEmpty(slug)) return { ...base, warning: "EVD-5 断链：slug 为空，不输出路径" };
  if (!exists) return { ...base, warning: `EVD-5 快照未覆盖：${slug} 未采集，不输出路径` };

  const schema = validateMeta(meta, { dirSlug: slug });
  if (!schema.ok) {
    return {
      ...base,
      warning: `EVD-3 快照断链：${slug} 的 META 不合格（${schema.errors[0]?.message ?? "未知原因"}），不输出路径`,
    };
  }

  const stale = staleFor(meta.capturedAt, now, days) === true;
  const age = now.getTime() - Date.parse(meta.capturedAt);
  return {
    ok: true,
    slug,
    path: path ?? rel,
    rel: rel ?? evidenceRelPath(slug),
    stale,
    ageDays: Number.isFinite(age) ? Math.max(0, Math.floor(age / 86400000)) : null,
    capturedAt: meta.capturedAt,
    quality: meta.quality,
    bucket: meta.bucket,
    warning: null,
  };
}

/** 读 assets/evidence/<slug>/META.json。唯一的 I/O 入口；读不到/读坏了都走 describeEvidence 的断链分支。 */
export function readEvidence(assetsDir, slug, { now = new Date(), days = STALE_DAYS } = {}) {
  const rel = evidenceRelPath(slug);
  const path = join(assetsDir, "evidence", String(slug), "META.json");
  const exists = existsSync(path);
  let meta = null;
  if (exists) {
    try {
      meta = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      meta = null; // 坏 JSON 交给 validateMeta 报断链
    }
  }
  return describeEvidence({ slug, path, rel, exists, meta, now, days });
}

/** 工具输出用的单行文本：stale 显式标出；不可用时只给 warning，绝不给路径。 */
export function formatEvidence(result, { days = STALE_DAYS } = {}) {
  if (!result?.ok) return result?.warning ?? "EVD-5 快照不可用，不输出路径";
  const date = String(result.capturedAt).slice(0, 10);
  const tags = [result.quality, result.bucket ? `桶 ${result.bucket}` : null].filter(Boolean).join(" · ");
  const tagText = tags ? ` · ${tags}` : "";
  if (result.stale) {
    return `${result.path}（⚠️ stale：采集于 ${date}，距今 ${result.ageDays} 天 > ${days} 天${tagText}）`;
  }
  return `${result.path}（采集于 ${date}，距今 ${result.ageDays} 天${tagText}）`;
}

// ─────────────────────────── 选源 ───────────────────────────
/** 取 source 里第一个不是代码托管的 http(s) 地址；只有仓库/CDN 时返回 null（由调用方显式 skip） */
export function extractUrl(source) {
  const text = String(source ?? "");
  const urls = [...text.matchAll(/https?:\/\/[^\s`"'<>）)]+/g)].map((m) => m[0].replace(/[.,;:!?]+$/, ""));
  for (const raw of urls) {
    try {
      const u = new URL(raw);
      if (!CODE_HOST.test(u.host)) return raw;
    } catch {
      /* 非法 URL 跳过 */
    }
  }
  return null;
}

/**
 * quality≥minQuality 的资源，按质量→层级→slug 稳定排序，最多 limit 条。
 * @returns {Array<{slug: string, url: string|null, quality: string, bucket: string|null, level: string}>}
 */
export function selectCandidates(resources = [], ledger = {}, { minQuality = "良", limit = 20, slugs = null } = {}) {
  if (!QUALITY_LEVELS.includes(minQuality)) {
    throw new Error(`未知 minQuality：${minQuality}（可用 ${QUALITY_LEVELS.join(", ")}）`);
  }
  const wanted = slugs ? new Set(slugs) : null;
  return resources
    .filter((r) => r && nonEmpty(r.slug))
    .filter((r) => !wanted || wanted.has(r.slug))
    .map((r) => ({
      slug: r.slug,
      url: extractUrl(r.source),
      quality: qualityOf(r, ledger),
      bucket: r.bucket ?? null,
      level: r.level ?? "兜底",
      source: r.source ?? "",
    }))
    .filter((r) => QUALITY_RANK[r.quality] >= QUALITY_RANK[minQuality])
    .sort(
      (a, b) =>
        QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality] ||
        (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0) ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, Math.max(0, Number(limit) || 0));
}

// ─────────────────────────── 写不写 / 汇总 / 体积 ───────────────────────────
/**
 * 幂等 + humanEdited 保护：
 *   · 不存在 → 写；
 *   · humanEdited:true → 永不覆盖（--force 也不）；
 *   · 已存在且没 --force → 跳过（连跑两次内容不变、不产生第二份）；
 *   · 已存在 + --force + 非人工改过 → 原地刷新。
 */
export function writePlan({ exists = false, humanEdited = false, force = false } = {}) {
  if (!exists) return { action: "write", reason: null };
  if (humanEdited) return { action: "skip", reason: "humanEdited:true，生成器不覆盖（EVD-2）" };
  if (!force) return { action: "skip", reason: "已存在，跳过（幂等；--force 刷新）" };
  return { action: "write", reason: null };
}

/** skipped/failed 必须带原因，否则汇总本身报 EVD-6 */
export function summarizeResults(items = []) {
  const counts = { success: 0, failed: 0, skipped: 0, total: items.length };
  const errors = [];
  for (const item of items) {
    if (item?.status === STATUS.SUCCESS) counts.success++;
    else if (item?.status === STATUS.FAILED) {
      counts.failed++;
      if (!nonEmpty(item.reason)) errors.push(finding("EVD-6", "evidence-missing-reason", `${item.slug ?? "?"} failed 缺原因`));
    } else if (item?.status === STATUS.SKIPPED) {
      counts.skipped++;
      if (!nonEmpty(item.reason)) errors.push(finding("EVD-6", "evidence-missing-reason", `${item.slug ?? "?"} skipped 缺原因`));
    } else {
      errors.push(finding("EVD-6", "evidence-unknown-status", `${item?.slug ?? "?"} 的状态 ${JSON.stringify(item?.status)} 不在 success/failed/skipped`));
    }
  }
  return { ...counts, errors, ok: errors.length === 0 };
}

/** entries: [{path, bytes}] 或 [bytes]；单条 ≤40KB、总量 ≤2MB（EVD-7） */
export function checkBudget(entries = []) {
  const list = entries.map((e) => (typeof e === "number" ? { path: "", bytes: e } : e));
  const totalBytes = list.reduce((sum, e) => sum + (Number(e?.bytes) || 0), 0);
  const maxItem = list.reduce((max, e) => Math.max(max, Number(e?.bytes) || 0), 0);
  const errors = [];
  for (const e of list) {
    if ((Number(e?.bytes) || 0) > LIMITS.itemBytes) {
      errors.push(
        finding(
          "EVD-7",
          "evidence-item-too-large",
          `${e.path || "条目"} ${e.bytes} 字节，超过单条上限 ${LIMITS.itemBytes}（${Math.round(LIMITS.itemBytes / 1024)}KB）`,
        ),
      );
    }
  }
  if (totalBytes > LIMITS.totalBytes) {
    errors.push(
      finding(
        "EVD-7",
        "evidence-total-too-large",
        `evidence 总量 ${totalBytes} 字节，超过上限 ${LIMITS.totalBytes}（${LIMITS.totalBytes / 1024 / 1024}MB）`,
      ),
    );
  }
  return { ok: errors.length === 0, totalBytes, maxItem, errors };
}

// ─────────────────────────── 页面快照 → tokens.json ───────────────────────────
const pick = (samples, selector) => samples.find((s) => s?.selector === selector) ?? null;
const usable = (value) => typeof value === "string" && value.trim().length > 0 && !NO_VALUE.test(value.trim());
const numeric = (value) => {
  const n = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * 输入是浏览器采集的事实（PAGE_SNAPSHOT 的返回），不在这里碰 DOM。
 * 每个产出的 token 都带 selector + source：computed 指到元素与属性，css-var 指到 :root。
 */
export function tokensFromSnapshot(snapshot = {}) {
  const tokens = {};
  const put = (name, value, selector, source) => {
    if (!name || !selector || !source) return;
    if (tokens[name]) return;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return;
      tokens[name] = { value: String(value), selector, source };
      return;
    }
    if (!usable(value)) return;
    tokens[name] = { value: value.trim(), selector, source };
  };

  const samples = Array.isArray(snapshot.samples) ? snapshot.samples.filter(Boolean) : [];
  const html = pick(samples, "html");
  const bodyEl = pick(samples, "body") ?? html;
  const h1 = pick(samples, "h1");
  const h2 = pick(samples, "h2");
  const h3 = pick(samples, "h3");
  const p = pick(samples, "p");
  const link = pick(samples, "a");
  const button = pick(samples, "button") ?? pick(samples, "[role=button]");
  const card = pick(samples, "[class*=card]") ?? pick(samples, "article");
  const input = pick(samples, "input");
  const code = pick(samples, "code") ?? pick(samples, "pre");

  if (bodyEl) {
    put("bg", bodyEl.backgroundColor, bodyEl.selector, "computed:background-color");
    put("fg", bodyEl.color, bodyEl.selector, "computed:color");
    put("border", bodyEl.borderColor, bodyEl.selector, "computed:border-color");
    put("font-body", bodyEl.fontFamily, bodyEl.selector, "computed:font-family");
  }
  if (card) {
    put("surface", card.backgroundColor, card.selector, "computed:background-color");
    put("shadow-1", card.boxShadow, card.selector, "computed:box-shadow");
    put("border", card.borderColor, card.selector, "computed:border-color");
  }
  if (p) {
    put("muted", p.color, p.selector, "computed:color");
    put("step-1", p.fontSize, p.selector, "computed:font-size");
  }
  if (h3) put("step-2", h3.fontSize, h3.selector, "computed:font-size");
  if (h2) put("step-3", h2.fontSize, h2.selector, "computed:font-size");
  if (h1) {
    put("step-4", h1.fontSize, h1.selector, "computed:font-size");
    put("font-display", h1.fontFamily, h1.selector, "computed:font-family");
  }
  if (code) put("font-mono", code.fontFamily, code.selector, "computed:font-family");
  // 有些站把背景/文字色放在 html 上、body 透明；body 采不到时回退 html，不留空 bg
  if (!tokens.bg && html) put("bg", html.backgroundColor, html.selector, "computed:background-color");
  if (!tokens.fg && html) put("fg", html.color, html.selector, "computed:color");

  const accent = [link?.color, button?.backgroundColor].find((v) => usable(v) && v !== bodyEl?.color);
  if (accent) put("accent", accent, link && accent === link.color ? link.selector : button?.selector ?? "a", "computed:accent");

  const radii = [input, button, card]
    .filter(Boolean)
    .map((s) => ({ value: s.borderRadius, selector: s.selector }))
    .filter((r) => usable(r.value) && (numeric(r.value) ?? 0) > 0)
    .sort((a, b) => (numeric(a.value) ?? 0) - (numeric(b.value) ?? 0));
  if (radii.length) {
    put("radius-sm", radii[0].value, radii[0].selector, "computed:border-radius");
    put("radius-md", radii[Math.floor(radii.length / 2)].value, radii[Math.floor(radii.length / 2)].selector, "computed:border-radius");
    put("radius-lg", radii[radii.length - 1].value, radii[radii.length - 1].selector, "computed:border-radius");
  }

  const spaces = [bodyEl, p, card, button]
    .filter(Boolean)
    .map((s) => ({ value: s.paddingTop, selector: s.selector }))
    .filter((s) => usable(s.value) && (numeric(s.value) ?? 0) > 0)
    .sort((a, b) => (numeric(a.value) ?? 0) - (numeric(b.value) ?? 0));
  for (const [i, space] of spaces.slice(0, 4).entries()) {
    put(`space-${i + 1}`, space.value, space.selector, "computed:padding-top");
  }

  const motion = [button, card, link, input]
    .filter(Boolean)
    .map((s) => ({ duration: s.transitionDuration, easing: s.transitionTimingFunction, selector: s.selector }))
    .find((m) => usable(m.duration) && (numeric(m.duration) ?? 0) > 0);
  if (motion) {
    put("dur-fast", motion.duration, motion.selector, "computed:transition-duration");
    if (usable(motion.easing) && !/^(?:ease|linear|ease-in-out|step-start|step-end)$/i.test(motion.easing)) {
      put("ease-out", motion.easing, motion.selector, "computed:transition-timing-function");
    }
  }

  for (const [name, value] of snapshot.vars ?? []) {
    if (!nonEmpty(name) || !name.startsWith("--") || !SEMANTIC_VAR.test(name)) continue;
    if (!usable(value) || value.length > 160) continue;
    put(`css:${name}`, value, ":root", "css-var");
  }

  return tokens;
}

export function parseEvidenceArgs(argv = []) {
  const opts = {
    slugs: null,
    limit: 20,
    minQuality: "良",
    root: null,
    shots: null,
    qualityLog: null,
    force: false,
    dryRun: false,
    json: false,
    allowSkip: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
      continue;
    }
    if (arg === "--force") {
      opts.force = true;
      continue;
    }
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (arg === "--json") {
      opts.json = true;
      continue;
    }
    if (arg === "--allow-skip") {
      opts.allowSkip = true;
      continue;
    }
    if (["--slug", "--limit", "--min-quality", "--root", "--shots", "--quality-log"].includes(arg)) {
      const value = argv[++i];
      if (value == null) throw new Error(`参数 ${arg} 缺少取值`);
      if (arg === "--slug") opts.slugs = value.split(",").map((s) => s.trim()).filter(Boolean);
      else if (arg === "--limit") {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1) throw new Error(`--limit 需要正整数，收到 ${value}`);
        opts.limit = n;
      } else if (arg === "--min-quality") {
        if (!QUALITY_LEVELS.includes(value)) throw new Error(`未知 --min-quality：${value}（可用 ${QUALITY_LEVELS.join(", ")}）`);
        opts.minQuality = value;
      } else if (arg === "--root") opts.root = value;
      else if (arg === "--shots") opts.shots = value;
      else opts.qualityLog = value;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`未知参数：${arg}（可用 --slug / --limit / --min-quality / --root / --shots / --quality-log / --force / --dry-run / --json / --allow-skip / --help）`);
    }
    throw new Error(`不接受位置参数：${arg}`);
  }
  return opts;
}
