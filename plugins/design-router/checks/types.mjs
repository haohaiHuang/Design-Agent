/**
 * checks/types.mjs — 共享工具函数（由 design-router 的 checks/*.ts 移植）
 */

/** 组装定位串 file[:line] */
export function loc(file, line) {
  return line ? `${file}:${line}` : file;
}

/** 按行扫内容，返回匹配行号（1-based） */
export function grepLines(content, re) {
  const out = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) out.push(i + 1);
  }
  return out;
}

/**
 * 页面级检查用的文本 = 本文件 + 它外链的样式表内容。
 *
 * 为什么需要：页面级"缺失类"检查（gate 26 :focus-visible、gate 34 overflow-x: clip、
 * gate 51 overflow-wrap、CS-3 font-smoothing、CS-7 text-wrap）都是"在页面里找不到就报"，
 * 而现代项目把这些规则写在外链 CSS 里 —— 只看单个 HTML 会系统性误报。
 * 外链样式表由 index.mjs 的 readAuditFiles 解析 <link rel="stylesheet"> 得到，挂在 f.linkedCss。
 */
export function pageText(f) {
  return f.linkedCss ? `${f.content}\n${f.linkedCss}` : f.content;
}

/**
 * 收集 CSS 自定义属性表（--name → 值），用于解析 var(--name)。
 *
 * 为什么需要：约束集通常要求"一律通过 var(--radius-*) 引用、禁止裸值"，
 * 而检查器原先把 var(--radius-md) 本身当"档位异常"——照约束集写反而必然命中，
 * 是设计上自相矛盾的误报。这里解析一层（足够覆盖 token 直接引用；
 * 链式 var 再套一层按未解析处理，不报）。
 */
export function collectCssVars(files) {
  const vars = new Map();
  for (const f of files) {
    const text = pageText(f);
    for (const m of text.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)) {
      const name = m[1].toLowerCase();
      const value = m[2].trim();
      if (!vars.has(name)) vars.set(name, value);
    }
  }
  return vars;
}

/** 把值里的 var(--x[, fallback]) 解析一层；解析不出返回 null（= 不判定，不误报） */
export function resolveVar(value, vars) {
  const m = String(value).match(/var\(\s*--([a-z0-9-]+)\s*(?:,\s*([^)]+))?\)/i);
  if (!m) return String(value).trim();
  const name = m[1].toLowerCase();
  const fallback = m[2] ? m[2].trim() : null;
  if (vars.has(name)) return vars.get(name);
  return fallback; // 无 fallback → null，调用方跳过判定
}

/**
 * 取某条声明的"值片段"（到 ; 或 } 或行尾为止），用于只对这条属性的值做刻度判定。
 *
 * 为什么需要：原实现按整行抓所有 Npx 值，于是 `padding:0 16px;border:1px solid`
 * 里 border 的 1px 会被算成"间距不在 4pt 刻度"。只取值片段可根治。
 */
export function propValueSpan(line, prop) {
  const re = new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;}]+)`, "i");
  const m = line.match(re);
  return m ? m[1].trim() : null;
}

/**
 * 视觉隐藏（sr-only / visually-hidden）惯用法判定：
 * width:1px + height:1px（+ clip/overflow/clip-path 之一）——1px 在这里是技术必需，不是刻度违规。
 */
export function isSrOnlyIdiom(line) {
  const hasW = /(?:^|[;{\s])width\s*:\s*1px/i.test(line);
  const hasH = /(?:^|[;{\s])height\s*:\s*1px/i.test(line);
  const hasHide = /clip(-path)?\s*:|overflow\s*:\s*hidden|position\s*:\s*absolute/i.test(line);
  return hasW && hasH && hasHide;
}
