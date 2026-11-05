#!/bin/bash
# 生成「结构完整」的真实站点素材——用于 audit / 交接类真机测试
#
# 与 make-fixtures.sh（碎片页素材）的分工：
#   make-fixtures.sh  → 定位类测试（member.html 内容含「登录」、checkout 文件名通道…）
#   本脚本            → audit / 交接类测试：页面**结构完整**（header/nav/main/footer/各 section 齐全）
#
# 为什么需要它：碎片页（15 行、没有 nav/header/footer）会让「这页面很丑」天然变成"重建结构"，
# 与「逐项补丁清单」的交付格式冲突——2026-10-01 第三轮真机上就卡在这一条（清单第 17 项要改
# 原页面根本不存在的 `.nav`）。换成本素材后，"重建 vs 打补丁"的诱导矛盾应消失。
#
# 用法: bash docs/test-fixtures/make-realistic-site.sh [目标目录]
# 默认: ~/Desktop/design-agent-page
set -e
DEST="${1:-$HOME/Desktop/design-agent-page}"
P="$DEST/project"
# 产物根 = 工作区根（不是 project/designs/）
mkdir -p "$P/styles" "$DEST/designs"

cat > "$P/styles/theme.css" <<'EOF'
:root {
  --brand:#5e6ad2;
  --ink:#0f1011;
  --paper:#f5f4ed;
  --radius:8px;
  --space-4:16px;
}
.container { max-width:1120px; margin:0 auto; padding:0 var(--space-4); }
.card { background:#fff; border:1px solid #eee; border-radius:var(--radius); padding:var(--space-4); }
.btn { background:var(--brand); color:#fff; border-radius:var(--radius); padding:12px 20px; }
EOF

cat > "$P/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flowdesk — 把重复的周报交给自动化</title>
<link rel="stylesheet" href="styles/theme.css">
<style>
  body { margin:0; background:var(--paper); color:var(--ink); font-family:'Inter', sans-serif; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:13px var(--space-4); }
  .nav a { margin-left:16px; color:var(--ink); text-decoration:none; }
  .hero { padding:64px var(--space-4); }
  h1 { font-style: italic; font-size:40px; margin:0 0 12px; }
  h2 { font-size:24px; margin:0 0 12px; }
  .btn { border:0; background:linear-gradient(90deg,#5e6ad2,#8b5cf6); border-radius:999px; transition:all .3s; }
  .grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:13px; }
  footer { padding:32px var(--space-4); border-top:1px solid #eee; }
</style>
</head>
<body>
<header class="topbar">
  <span class="brand">Flowdesk</span>
  <nav class="nav"><a href="#features">功能</a><a href="#proof">客户</a><a href="#pricing">价格</a></nav>
</header>

<main>
  <section class="hero container">
    <h1>✨ 一站式重新定义你的工作流</h1>
    <p>无缝体验，极致丝滑。让团队把时间花在真正重要的事上。</p>
    <button class="btn">免费试用 14 天</button>
  </section>

  <section id="features" class="container">
    <h2>功能</h2>
    <div class="grid">
      <div class="card"><h3>自动汇总</h3><p>把散落各处的进展汇总成一份周报。</p></div>
      <div class="card"><h3>定时提醒</h3><p>到点提醒成员补全本周进展。</p></div>
      <div class="card"><h3>一键导出</h3><p>导出 PDF 或 Markdown 交给上级。</p></div>
    </div>
  </section>

  <section id="proof" class="container">
    <h2>客户</h2>
    <p>Trusted by 50,000+ teams</p>
    <div class="card"><p>“以前每周要花两小时整理，现在十分钟。”— 某团队负责人</p></div>
  </section>

  <section id="pricing" class="container">
    <h2>价格</h2>
    <div class="grid">
      <div class="card"><h3>团队版</h3><p>¥49 / 人 / 月</p></div>
      <div class="card"><h3>企业版</h3><p>联系销售</p></div>
      <div class="card"><h3>免费版</h3><p>最多 5 人</p></div>
    </div>
  </section>
</main>

<footer class="container">
  <p>© 2026 Flowdesk</p>
  <svg width="24" height="24" viewBox="0 0 24 24"><rect width="10" height="10" fill="var(--brand)"/></svg>
</footer>
</body>
</html>
EOF

cat > "$P/README.md" <<'EOF'
# Flowdesk 官网

- `index.html` — 落地页（首页）
- `styles/theme.css` — 共用设计令牌
EOF

echo ""
echo "✅ 结构完整素材已生成：$DEST"
echo ""
echo "  index.html         ← 完整落地页：header/nav + hero + features + proof + pricing + footer"
echo "  styles/theme.css   ← 共用令牌"
echo "  designs/           ← 产物目录【工作区根，初始为空】"
echo ""
echo "植入的可检出反模式（供 audit 用）：Inter 默认字体 / 斜体 h1 / emoji 图标 / 渐变胶囊按钮 /"
echo "13px 非刻度 / transition:all / 编造指标 50,000+ / AI 文案腔 / 缺 overflow-x:clip /"
echo "缺 reduced-motion / svg 缺 aria / 硬编码 #eee"
echo ""
echo "记录初始哈希（验证「绝不动原项目文件」用）："
cd "$P" && shasum -a 256 *.html styles/*.css | tee "$DEST/.initial-hashes.txt"
echo ""
echo "测试结束后：cd $P && shasum -a 256 -c $DEST/.initial-hashes.txt"
