#!/bin/bash
# 生成 Design-Agent 真机测试素材
# 用法: bash docs/test-fixtures/make-fixtures.sh [目标目录]
# 默认目标: ~/Desktop/design-test
set -e
DEST="${1:-$HOME/Desktop/design-test}"
P="$DEST/project"
mkdir -p "$P/styles" "$P/designs"

# ── 素材 A：待改进页面（audit 有料：实测 14 项检出）────────────────────────
cat > "$P/landing.html" <<'EOF'
<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8"><title>产品落地页</title>
<style>
:root { --ink:#0f1011; --paper:#f5f4ed; --brand:#5e6ad2; }
body { background:var(--paper); color:var(--ink); font-family:'Inter',sans-serif; }
.card { background:#fff; border-radius:13px; padding:13px; }
.btn { background:linear-gradient(90deg,#5e6ad2,#8b5cf6); color:#fff; border-radius:999px; transition:all .3s; }
h1 { font-style:italic; font-weight:700; }
</style></head><body>
<h1>✨ 一站式重新定义你的工作流</h1>
<p>Trusted by 50,000+ teams。无缝体验，极致丝滑。</p>
<div class="card"><h2>功能</h2><p>简单、强大、快。</p></div>
<div class="btn">立即开始</div>
<svg><rect width="10" height="10"/></svg>
</body></html>
EOF

# ── 素材 B：多页面项目（定位双通道分离测试，关键设计）──────────────────────
# checkout.html：文件名是英文、内容里没有"结算"以外的线索 → 测【文件名通道】
cat > "$P/checkout.html" <<'EOF'
<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>结算</title>
<link rel="stylesheet" href="styles/theme.css"></head>
<body><div class="card"><h1>订单结算</h1><button class="btn">支付</button></div></body></html>
EOF

# member.html：文件名不含 login，但内容标题是「登录」→ 测【内容通道】
# （如果 agent 只用文件名搜 "登录"，会找不到这个文件 → 暴露只走单通道的问题）
cat > "$P/member.html" <<'EOF'
<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>登录</title>
<link rel="stylesheet" href="styles/theme.css"></head>
<body><form class="card"><h1>登录</h1><input type="text"><button class="btn">进入</button></form></body></html>
EOF

cat > "$P/dashboard.html" <<'EOF'
<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>控制台</title>
<link rel="stylesheet" href="styles/theme.css"></head>
<body><div class="grid"><h2>数据概览</h2><button class="btn">导出</button></div></body></html>
EOF

# theme.css：颜色写在变量里 → 测【内容特征通道】（"那个蓝的"文本搜不到，需读文件解析）
cat > "$P/styles/theme.css" <<'EOF'
:root { --brand:#5e6ad2; --ink:#0f1011; --paper:#f5f4ed; --radius:8px; --space-4:16px; }
.btn { background:var(--brand); color:#fff; border-radius:var(--radius); }
.card { background:#fff; border:1px solid #eee; padding:var(--space-4); }
EOF

echo "正在清理（保留既有 designs/ 产物）..."
ls -d "$P"/designs/* >/dev/null 2>&1 && echo "  ℹ️ designs/ 已有产物，未清空（续跑测试需要）" || true

echo ""
echo "✅ 测试素材已生成：$DEST"
echo ""
echo "  project/landing.html    ← 素材 A：待改进页面（audit 实测检出 14 项（13 个 gate））"
echo "  project/checkout.html   ← 素材 B：文件名 checkout（测文件名通道）"
echo "  project/member.html     ← 素材 B：内容含「登录」但文件名不含 login（测内容通道）"
echo "  project/dashboard.html  ← 素材 B：控制台"
echo "  project/styles/theme.css← 素材 B：--brand:#5e6ad2（蓝，测内容特征通道）"
echo "  project/designs/        ← 产物目录（初始为空）"
echo ""
echo "记录初始哈希（验证「绝不动原项目文件」用）："
cd "$P" && shasum -a 256 *.html styles/*.css | tee "$DEST/.initial-hashes.txt"
echo ""
echo "测试结束后跑这个核对：cd $P && shasum -a 256 -c $DEST/.initial-hashes.txt"
