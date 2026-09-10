/**
 * checks/assets.mjs — 资产层机器检查（源自 Anshu critic-loop 资产注入纪律转译）
 *
 * 覆盖两条 Type A（机器可判定）规则，Define 富化 / Deliver 减法时校验用：
 *   DR-A1  渐变冒充视觉：页面存在大面积背景渐变（body/main/section/hero 级），
 *         却零真实图像资产（<img>/<picture>/background url/data:image）——纯代码
 *         冒充视觉主角是 AI 味强信号。真图/3D > CSS 渐变（Anshu：编码 agent
 *         倾向用渐变/形状/基础图案替代图片，那正是"AI 生成设计"的明显信号）。
 *         纯排印/editorial 的有意无图是合法克制——需约束集或注释背书，否则 warn。
 *   DR-A2  资产引用断链：引用的本地图片/媒体文件（img src / background url）在
 *         磁盘上不存在——agent"生成了图但没保存/没接上"是高频翻车点。
 * 不覆盖：Type B（内容冗余/克制判断，人做）；视频资产内容（无法文本判定）。
 */
import { statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { loc } from "./types.mjs";

const GRADIENT_RE = /(?:linear|radial|conic)-gradient/i;
const REAL_ASSET_RE = /<(?:img|picture|video)\b/i;
const CSS_IMG_RE = /background(-image)?\s*:\s*url\(|data:image\//i;
// 视觉主角级容器上的背景渐变（body/main/section/hero/根容器），排除小元素（按钮/徽标/卡片装饰）
const HERO_GRADIENT_CSS_RE =
  /(body|main|section|\.hero|\.container|\.wrap|#app|#root)\s*\{[^}]{0,250}(linear|radial|conic)-gradient/i;
// 行内 style 的容器级渐变（宽松：整行 style 属性里的背景渐变）
const INLINE_GRADIENT_RE = /<[a-z]+[^>]{0,200}style=["'][^"']{0,200}background[^"']{0,60}(linear|radial|conic)-gradient/i;

const ASSET_EXT_RE = /\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm)(?:[?#].*)?$/i;

/** 磁盘上是否存在该本地资产（在 target 根目录内递归，跳过 node_modules/隐藏目录） */
function assetExistsOnDisk(targetAbs, assetPath) {
  const clean = assetPath.split(/[?#]/)[0];
  if (!clean) return false;
  const direct = resolve(targetAbs, clean);
  try {
    if (statSync(direct).isFile()) return true;
  } catch {
    /* 继续递归找 basename */
  }
  const base = clean.split("/").pop();
  if (!base) return false;
  const stack = [targetAbs];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.startsWith(".") || e === "node_modules") continue;
      const p = join(dir, e);
      try {
        if (statSync(p).isDirectory()) stack.push(p);
        else if (e.toLowerCase() === base.toLowerCase()) return true;
      } catch {
        /* 忽略 */
      }
    }
  }
  return false;
}

export function runAssetChecks(files, targetAbs) {
  const findings = [];

  // ---- DR-A1: 渐变冒充视觉（页面单元级：HTML + 其引用的 CSS 聚合判定）----
  // 单 HTML 内嵌场景与"HTML 引外部 CSS、渐变在 CSS 里"都覆盖。
  const htmlFiles = files.filter((f) => f.kind === "html");
  const cssFiles = new Map(); // basename(小写) → css
  for (const f of files) {
    if (f.kind === "css") {
      const base = f.path.replace(/^.*[\\/]/, "").toLowerCase();
      if (!cssFiles.has(base)) cssFiles.set(base, f);
    }
  }

  for (const html of htmlFiles) {
    const lines = html.content.split("\n");
    // 收集本页引用的 CSS（<link rel="stylesheet" href>，按 basename 匹配收集到的 css 文件）
    const linkedCssFiles = [];
    for (const line of lines) {
      const m = line.match(/<link[^>]*rel=["']?stylesheet["']?[^>]*href=["']?([^"'>]+)["']?/i);
      if (!m) continue;
      const href = m[1].split(/[?#]/)[0];
      if (/^https?:\/\//i.test(href) || /^data:/i.test(href)) continue;
      const base = href.split("/").pop()?.toLowerCase() || "";
      const css = cssFiles.get(base);
      if (css && !linkedCssFiles.some((f) => f.path === css.path)) linkedCssFiles.push(css);
    }

    // 页面单元聚合内容 → 判断：hero 渐变是否存在于页面单元（html 内嵌或链接 css）
    const unitContent = html.content + "\n" + linkedCssFiles.map((f) => f.content).join("\n");
    const hasRealAsset = REAL_ASSET_RE.test(unitContent) || CSS_IMG_RE.test(unitContent);
    const hasHeroGradient = (() => {
      for (const l of unitContent.split("\n")) {
        if ((HERO_GRADIENT_CSS_RE.test(l) || (l.includes("gradient") && INLINE_GRADIENT_RE.test(l))) && GRADIENT_RE.test(l)) {
          return true;
        }
      }
      return false;
    })();

    if (hasHeroGradient && !hasRealAsset) {
      // 精确定位：先 html 内嵌，再链接 css（按引用顺序）
      let hit = null;
      const findIn = (content, path) => {
        const ls = content.split("\n");
        for (let i = 0; i < ls.length; i++) {
          const l = ls[i];
          if ((HERO_GRADIENT_CSS_RE.test(l) || (l.includes("gradient") && INLINE_GRADIENT_RE.test(l))) && GRADIENT_RE.test(l)) {
            return i + 1;
          }
        }
        return -1;
      };
      const htmlLine = findIn(html.content, html.path);
      if (htmlLine > 0) hit = { path: html.path, line: htmlLine };
      else {
        for (const css of linkedCssFiles) {
          const cl = findIn(css.content, css.path);
          if (cl > 0) {
            hit = { path: css.path, line: cl };
            break;
          }
        }
      }
      if (hit) {
        findings.push({
          gate: "DR-A1",
          rule: "gradient-pretending-visual",
          severity: "warn",
          message:
            "页面单元（HTML + 其引用的 CSS）存在视觉主角级背景渐变但零真实图像资产（无 <img>/<picture>/background url/data:image）。纯代码渐变冒充视觉主角是 AI 味强信号。" +
            "若要真图需走资产富化（image gen / shader / 3D）；若为纯排印/editorial 有意无图，需约束集或 deslop-ignore 注释背书后豁免。",
          location: loc(hit.path, hit.line),
        });
      }
    }
  }

  // ---- DR-A2: 本地资产引用断链（HTML/CSS 引用 → 磁盘核对）----
  if (targetAbs) {
    const seen = new Set();
    for (const f of files) {
      const lines = f.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 两种语法分别匹配：HTML 属性 src/href="..."（含 =）与 CSS url(...)
        let m = line.match(/(?:src|href)\s*=\s*["']?([^"')\s>]+\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm)(?:[?#][^"'\s)>]*)?)["']?/i);
        if (!m) m = line.match(/url\(\s*["']?([^"')\s]+\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm)(?:[?#][^"'\s)]*)?)["']?\)/i);
        if (!m?.[1]) continue;
        const asset = m[1];
        if (/^https?:\/\//i.test(asset) || /^data:/i.test(asset)) continue;
        const key = `${f.path}:${asset}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!assetExistsOnDisk(targetAbs, asset)) {
          findings.push({
            gate: "DR-A2",
            rule: "broken-asset-ref",
            severity: "error",
            message: `引用了本地资产 "${asset}" 但磁盘上不存在（target 根目录内递归核对）。可能 agent 生成了图但没保存/没接上，或相对路径基准错误。`,
            location: loc(f.path, i + 1),
          });
        }
      }
    }
  }

  return findings;
}
