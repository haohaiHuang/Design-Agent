#!/usr/bin/env node
/**
 * build-registry.mjs — registry.md → registry.json 生成器
 *
 * 数据真源：my-pi-skills/skills/design-references/references/registry.md（人可读 markdown 表格）
 * 生成物：design-router/data/registry.json（extension 运行时数据）
 * 维护规则：改 registry.md 后重跑本脚本；禁止手改 registry.json。
 *
 * 用法：node scripts/build-registry.mjs [path/to/registry.md]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SRC = join(HERE, "../../../skills/design-references/references/registry.md");
const OUT = join(HERE, "../data/registry.json");

// ---------- 名称 → slug 映射（registry 首列为中文+括号描述，需人工映射） ----------
const SLUG_BY_KEYWORD = [
  // R 调研源
  ["refero-design", "refero Styles 网站"],
  ["zine-style-library", "Zine 风格库"],
  ["poster-compositions", "海报构图词典"],
  ["voltagent", "VoltAgent"],
  ["beautiful-ui", "Beautiful UI"],
  ["aceternity", "Aceternity UI"],
  ["21st-dev", "21st.dev"],
  ["minimal-gallery", "minimal.gallery"],
  ["uiverse", "Uiverse Galaxy"],
  ["orange-line-illustration", "orange-line-illustration"],
  ["lucide", "Lucide"],
  ["heroicons", "Heroicons"],
  ["google-fonts", "Google Fonts"],
  ["hero-patterns", "Hero Patterns"],
  ["css-gradient-tools", "CSS 渐变工具"],
  ["design-md-spec", "DESIGN.md 格式规范"],
  ["liquid-gooey", "Liquid Gooey"],
  ["transitions-dev", "transitions.dev"],
  ["vibeprompts", "vibeprompts.dev"],
  ["dembrandt-extract", "dembrandt 萃取产物"],
  ["dembrandt", "dembrandt（URL→设计 token"],
  // DSH 书签导入（2026-08-28）
  ["recent-design", "Recent Design"],
  ["awwwards", "Awwwards"],
  ["siteinspire", "SiteInspire"],
  ["land-book", "Landbook"],
  ["onepagelove", "One Page Love"],
  ["lapa-ninja", "Lapa Ninja"],
  ["muzli", "Muzli"],
  ["inspora", "Inspora"],
  ["logggos", "Logggos"],
  ["logo-archive", "LogoArchive"],
  ["logoinspo", "Logoinspo"],
  ["logosystem", "Logosystem"],
  ["logobook", "Logobook"],
  ["footer-design", "Footer"],
  ["cta-gallery", "CTA.gallery"],
  ["navbar-gallery", "Navbar Gallery"],
  ["supahero", "Supahero"],
  ["threeui", "ThreeUI"],
  ["designspells", "Design Spells"],
  ["mobbin", "Mobbin"],
  ["loadmore", "loadmo.re"],
  ["uipedia", "UiPedia"],
  ["dribbble-shot", "Dribbble 案例"],
  // C 约束模板
  ["kami-skeleton", "Kami 约束骨架"],
  ["kami-spec", "Kami 完整设计规范"],
  ["zine-family-recipes", "Zine 风格族配方"],
  ["poster-compositions", "海报构图词典"],
  ["design-md", "DESIGN.md（选定参考的设计系统文件）"],
  ["design-md-skill", "design-md-skill"],
  ["huashu-philosophy", "huashu-design 设计哲学"],
  ["brand-guidelines", "brand-guidelines / theme-factory"],
  ["logo-design-patterns", "logo-generator 设计模式库"],
  ["logo-background-styles", "logo-generator 背景风格库"],
  ["logo-webgl-backgrounds", "logo-generator WebGL"],
  ["hallmark-anti-patterns", "hallmark anti-patterns 约束集"],
  ["hallmark-genre-bans", "hallmark genre 允许/禁止清单"],
  ["interfaces-cheat-sheet", "interfaces cheat-sheet 约束集"],
  // E 执行工具
  ["kami-skill", "kami 技能"],
  ["huashu-design", "huashu-design（HTML 高保真原型"],
  ["baoyu-design", "baoyu-design"],
  ["frontend-design", "frontend-design"],
  ["gpt-image-2", "gpt-image-2"],
  ["imagegen", "imagegen（openai/skills"],
  ["figma-family", "Figma 家族"],
  ["guizang-ppt-skill", "guizang-ppt-skill"],
  ["motion-lib", "motion（Motion.dev"],
  ["motion-dev-animations", "motion-dev-animations"],
  ["animejs", "Anime.js"],
  ["hyperframes", "hyperframes"],
  ["diagram-design", "diagram-design"],
  ["anthropics-tools", "theme-factory / brand-guidelines / canvas-design"],
  ["openai-imagegen", "OpenAI imagegen"],
  ["openmotion", "OpenMotion"],
  // V 校验标准
  ["kami-sancha", "Kami 三查"],
  ["huashu-5dim", "huashu 5 维评审"],
  ["zine-consistency", "Zine 风格一致性自检"],
  ["design-qa-checklist", "design-qa-checklist"],
  ["design-research-methods", "设计研究 UX 方法"],
  ["logo-quality-floor", "logo-generator 图形质量底线"],
  ["hallmark-slop-test", "hallmark slop-test 58 gates"],
];

// ---------- 风格桶：资源名称关键词 → 桶（反同质化索引，只给"可作风格候选"的资源打桶；工具/素材类资源无桶） ----------
// 桶定义见 BUCKETS；需求路由见 ROUTING；空桶查询指引见 BUCKET_NOTES。
const BUCKET_BY_KEYWORD = [
  // minimal 极简现代
  ["minimal", "refero Styles 网站"],
  ["minimal", "VoltAgent"],
  ["minimal", "Beautiful UI"],
  ["minimal", "Aceternity UI"],
  ["minimal", "21st.dev"],
  ["minimal", "minimal.gallery"],
  ["minimal", "vibeprompts.dev"],
  // editorial 编辑杂志
  ["editorial", "orange-line-illustration"],
  // warmpaper 暖纸人文
  ["warmpaper", "Kami 约束骨架"],
  ["warmpaper", "Kami 完整设计规范"],
  // liquid 液态动效
  ["liquid", "Liquid Gooey"],
  ["liquid", "transitions.dev"],
  // bold 撞色大胆
  ["bold", "Uiverse Galaxy"],
  // retro 复古档案
  ["retro", "Zine 风格库"],
  ["retro", "Zine 风格族配方"],
  // DSH 书签导入
  ["minimal", "Recent Design"],
  ["minimal", "Awwwards"],
  ["minimal", "SiteInspire"],
  ["minimal", "Landbook"],
  ["minimal", "One Page Love"],
  ["minimal", "Lapa Ninja"],
  ["minimal", "Muzli"],
  ["minimal", "Inspora"],
  ["minimal", "Footer"],
  ["minimal", "CTA.gallery"],
  ["minimal", "Navbar Gallery"],
  ["minimal", "Supahero"],
  ["minimal", "Mobbin"],
  ["minimal", "loadmo.re"],
  ["liquid", "ThreeUI"],
  ["liquid", "Design Spells"],
  ["bold", "Uiverse Galaxy"],
];

const BUCKETS = {
  "minimal": "极简现代：干净留白/几何/现代无衬线（refero 同品类主池）",
  "editorial": "编辑杂志：网格/衬线/印刷感/克制（kami/zine 编辑向/纽约客插画）",
  "darktech": "暗色科技：深底/霓虹/终端/仪表盘（cobalt/terminal 系）",
  "bold": "撞色大胆：高饱和/波普/趣味（carnival/playful 系）",
  "warmpaper": "暖纸人文：暖底/书卷气/克制排版（kami 暖纸/lumen/atmospheric 系）",
  "liquid": "液态动效：流体/粘性/微交互（gooey/transitions 系）",
  "dataviz": "数据可视化：图表/规格表/信息密度（stat-led/spec-sheet 系）",
  "retro": "复古档案：像素/拼贴/档案感（zine retro/pixel 系）"
};

// 需求特征关键词（| 分隔）→ 主桶（必查）+ 次桶（按需）+ extra（专项资源，如 logo）
const ROUTING = {
  "logo|app icon|图标|icon|商标|brandmark|logo 设计|logo设计": {
    "primary": [
      "bold"
    ],
    "secondary": [
      "minimal",
      "retro"
    ],
    "extra": "logo"
  },
  "saas|落地页|landing|工具|product|startup": {
    "primary": [
      "minimal"
    ],
    "secondary": [
      "darktech",
      "editorial"
    ]
  },
  "ai|agent|chat|对话|智能|copilot": {
    "primary": [
      "minimal"
    ],
    "secondary": [
      "liquid",
      "darktech"
    ]
  },
  "数据|dashboard|仪表盘|analytics|监控|报表": {
    "primary": [
      "dataviz"
    ],
    "secondary": [
      "minimal",
      "darktech"
    ]
  },
  "文档|docs|内容|article|博客|blog|阅读": {
    "primary": [
      "editorial"
    ],
    "secondary": [
      "warmpaper",
      "minimal"
    ]
  },
  "海报|poster|品牌|brand|营销|campaign|视觉": {
    "primary": [
      "bold"
    ],
    "secondary": [
      "retro",
      "editorial"
    ]
  },
  "电商|ecommerce|商城|shop|零售": {
    "primary": [
      "minimal"
    ],
    "secondary": [
      "bold",
      "warmpaper"
    ]
  },
  "演示|ppt|slides|deck|提案": {
    "primary": [
      "editorial"
    ],
    "secondary": [
      "minimal",
      "bold"
    ]
  },
  "移动|mobile|app|ios|android": {
    "primary": [
      "minimal"
    ],
    "secondary": [
      "liquid",
      "darktech"
    ]
  }
};

// 空桶/弱桶查询指引（桶内无 registry 资源时怎么找候选）
const BUCKET_NOTES = {
  "darktech": "hallmark 主题 cobalt/terminal（技能内 references/themes/）；refero 搜暗色仪表盘/开发工具类产品（Vercel/Raycast 暗色系）",
  "dataviz": "hallmark 宏结构 stat-led/spec-sheet（技能内 SKILL.md）；refero 搜数据分析类产品（Linear/Amplitude 类仪表盘）；diagram-design 工具产图表",
  "warmpaper": "kami 暖纸底（本地 ~/Desktop/Design/kami-design-principles/）；hallmark 主题 lumen/atmospheric（技能内 references/themes/）",
  "retro": "zine 复古族（本地 ~/Desktop/Design/zine-style-references/）；hallmark 主题 复古/档案类",
  "bold": "hallmark 主题 carnival/playful（技能内 references/themes/）；uiverse 组件"
};

// 质量档位（客观信号定档，非审美）
const QUALITY_LEVELS = {
  "优": "验证成功且多次一次通过",
  "良": "验证成功",
  "中": "提取部分失败/未验证",
  "差": "多次回炉或不可达"
};

// ---------- 分支 × 环节 → 资源 slug 路由表（来自 SKILL.md 分支表 + workflow.md 环节调用表） ----------
// stage: 0 意图 / 1 调研 / 2 约束 / 3 产出 / 4 校验
const ROUTES = {
  "A1": {
    "1": [
      "refero-design",
      "beautiful-ui",
      "minimal-gallery",
      "dembrandt",
      "recent-design",
      "awwwards",
      "siteinspire",
      "land-book",
      "onepagelove",
      "lapa-ninja",
      "muzli",
      "inspora",
      "mobbin"
    ],
    "2": [
      "kami-skeleton",
      "refero-design",
      "design-md-skill",
      "poster-compositions"
    ],
    "3": [
      "kami-skill",
      "huashu-design",
      "figma-family",
      "motion-lib"
    ],
    "4": [
      "kami-sancha",
      "design-qa-checklist",
      "huashu-5dim"
    ]
  },
  "A2": {
    "1": [
      "refero-design",
      "aceternity",
      "21st-dev",
      "dembrandt",
      "recent-design",
      "awwwards",
      "siteinspire",
      "land-book",
      "onepagelove",
      "lapa-ninja",
      "muzli",
      "inspora",
      "footer-design",
      "cta-gallery",
      "navbar-gallery",
      "supahero",
      "designspells",
      "threeui",
      "loadmore"
    ],
    "2": [
      "kami-skeleton",
      "refero-design",
      "design-md-skill",
      "poster-compositions"
    ],
    "3": [
      "huashu-design",
      "kami-skill",
      "frontend-design"
    ],
    "4": [
      "kami-sancha",
      "huashu-5dim"
    ]
  },
  "A3": {
    "1": [
      "refero-design",
      "voltagent",
      "dembrandt"
    ],
    "2": [
      "kami-skeleton",
      "refero-design"
    ],
    "3": [
      "frontend-design"
    ],
    "4": [
      "kami-sancha",
      "huashu-5dim"
    ]
  },
  "B1": {
    "1": [
      "zine-style-library",
      "orange-line-illustration",
      "poster-compositions"
    ],
    "2": [
      "zine-family-recipes",
      "logo-background-styles",
      "poster-compositions"
    ],
    "3": [
      "gpt-image-2",
      "kami-skill"
    ],
    "4": [
      "zine-consistency",
      "kami-sancha",
      "poster-compositions"
    ]
  },
  "B2": {
    "1": [
      "zine-style-library",
      "orange-line-illustration"
    ],
    "2": [
      "zine-family-recipes",
      "kami-spec",
      "poster-compositions"
    ],
    "3": [
      "gpt-image-2",
      "kami-skill"
    ],
    "4": [
      "zine-consistency",
      "kami-sancha"
    ]
  },
  "B3": {
    "1": [],
    "2": [
      "kami-skeleton"
    ],
    "3": [
      "guizang-ppt-skill"
    ],
    "4": []
  },
  "C1": {
    "1": [
      "lucide",
      "google-fonts",
      "hero-patterns",
      "21st-dev",
      "uiverse",
      "footer-design",
      "cta-gallery",
      "navbar-gallery",
      "supahero",
      "designspells"
    ],
    "2": [
      "kami-skeleton"
    ],
    "3": [
      "21st-dev",
      "uiverse"
    ],
    "4": [
      "kami-sancha"
    ]
  },
  "C2": {
    "1": [
      "transitions-dev",
      "liquid-gooey",
      "threeui"
    ],
    "2": [],
    "3": [
      "motion-lib",
      "motion-dev-animations",
      "animejs"
    ],
    "4": []
  },
  "C3": {
    "1": [],
    "2": [
      "kami-skeleton"
    ],
    "3": [
      "kami-skill"
    ],
    "4": [
      "kami-sancha"
    ]
  }
};

// logo 场景跨分支附加（环节 2/4 必读）
const LOGO_EXTRA = {"2":["logo-design-patterns","logggos","logo-archive","logoinspo","logosystem","logobook"],"4":["logo-quality-floor"]};

// hallmark 去 AI 味跨分支附加（环节 2 前置约束 / 环节 4 验收，软依赖）
const HALLMARK_EXTRA = {"2":["hallmark-anti-patterns","hallmark-genre-bans"],"4":["hallmark-slop-test"]};

// interfaces cheat-sheet 细节 craft 跨分支附加（环节 2 转译）
const CHEAT_EXTRA = {"2":["interfaces-cheat-sheet"]};

// ---------- markdown 表格解析 ----------
function parseTableRows(lines) {
  const rows = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // 表头行：| 资源 | 形态 | ...（首列是"资源"或"---"）
    if (/^\|.*资源.*\|/.test(line) || /^\|\s*---/.test(line)) {
      i++;
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
        if (cells.length >= 5) rows.push(cells);
        i++;
      }
      continue;
    }
    i++;
  }
  return rows;
}

// ---------- 主流程 ----------
function main() {
  const src = process.argv[2] || DEFAULT_SRC;
  const text = readFileSync(src, "utf8");
  const lines = text.split("\n");

  // 角色段落定位
  let currentRole = null;
  const resources = [];
  const skipped = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const roleMatch = line.match(/^## ([RCEV]) /);
    if (roleMatch) {
      currentRole = roleMatch[1];
      continue;
    }
    // 登记空白区/安装裁定段落停止收录
    if (/^## /.test(line) && !/^## [RCEV] /.test(line)) {
      currentRole = null;
      continue;
    }
    if (currentRole && /^\|/.test(line) && !/^\|\s*---/.test(line) && !/^\| 资源 /.test(line) && !/^\| 格子 /.test(line) && !/^\| ---/.test(line)) {
      const cells = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
      if (cells.length >= 6 && cells[0] !== "---") {
        const [name, form, level, scenarios, fallback, source] = cells;
        // 找 slug
        let slug = null;
        for (const [s, kw] of SLUG_BY_KEYWORD) {
          if (name.includes(kw)) {
            slug = s;
            break;
          }
        }
        // 找风格桶（R 调研源 + 可作风格候选的 C 模板资源打桶；工具/素材类资源无桶字段）
        let bucket = null;
        if (currentRole === "R" || currentRole === "C") {
          for (const [b, kw] of BUCKET_BY_KEYWORD) {
            if (name.includes(kw)) {
              bucket = b;
              break;
            }
          }
        }
        const res = {
          name,
          role: currentRole,
          form,
          level,
          scenarios,
          fallback,
          source,
        };
        if (slug) res.slug = slug;
        else skipped.push(name);
        res.bucket = bucket || null;
        res.quality = "未评估";
        resources.push(res);
      }
    }
  }

  // 组装输出
  const output = {
    generated: new Date().toISOString().slice(0, 10),
    source: "skills/design-references/references/registry.md",
    resources,
    routes: ROUTES,
    logoExtra: LOGO_EXTRA,
    hallmarkExtra: HALLMARK_EXTRA,
    cheatExtra: CHEAT_EXTRA,
    buckets: BUCKETS,
    routing: ROUTING,
    bucketNotes: BUCKET_NOTES,
    qualityLevels: QUALITY_LEVELS,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");

  // 版本配套元数据（追溯用）：checks/ 的 gate 号语义跟随 hallmarkRuleVersion；
  // designReferencesSource 记录 registry.md 来源 commit（非 git 环境回退写死值）。
  let drCommit = "unknown";
  try {
    drCommit = execSync("git rev-parse --short HEAD", { cwd: join(HERE, "../../..") }).toString().trim();
  } catch {
    /* 非 git 环境 */
  }
  const manifest = {
    hallmarkRuleVersion: "1.1.0",
    designReferencesSource: `skills/design-references @ ${drCommit}`,
    registryGenerated: output.generated,
    registryResourceCount: resources.length,
  };
  writeFileSync(join(HERE, "../data/manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`✅ registry.json + manifest.json 生成：${resources.length} 条资源，${Object.keys(ROUTES).length} 个分支路由`);
  if (skipped.length) {
    console.log(`⚠️ 未匹配 slug 的资源（${skipped.length}）：`);
    for (const s of skipped) console.log(`   - ${s}`);
  }
}

main();
