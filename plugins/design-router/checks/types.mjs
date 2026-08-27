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
