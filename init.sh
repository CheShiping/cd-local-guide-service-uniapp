#!/bin/bash
# harness 标准入口（Git Bash / macOS / Linux）
# 用法：
#   bash init.sh          # 环境检查 + 资产保真校验；依赖缺失时跳过构建
#   bash init.sh --full   # 额外执行 npm install 与小程序构建
set -e

cd "$(dirname "$0")"
FULL=0
[ "$1" = "--full" ] && FULL=1

echo "=== 1/6 环境检查 ==="
node -v

echo ""
echo "=== 2/6 资产保真校验（零依赖） ==="
node scripts/verify-assets.mjs

echo ""
echo "=== 3/6 设计令牌校验（零依赖） ==="
node scripts/check-tokens.mjs

echo ""
echo "=== 4/6 数据库表结构校验（零依赖） ==="
node scripts/check-schema.mjs

echo ""
echo "=== 5/6 mock 数据层校验（零依赖） ==="
node scripts/check-mock.mjs

echo ""
echo "=== 6/6 构建验证 ==="
if [ ! -d node_modules ]; then
  echo "未安装依赖（node_modules 缺失）。"
  if [ "$FULL" = "1" ]; then
    npm install --no-audit --no-fund
  else
    echo "跳过构建。完整验证请执行：bash init.sh --full"
  fi
fi

if [ -d node_modules ]; then
  npm run build:mp-weixin
fi

echo ""
echo "=== 验证完成 ==="
echo "下一步："
echo "1. 打开 feature_list.json 查看当前功能状态与依赖"
echo "2. 只挑一个 not-started 功能着手"
echo "3. 改动前先看 docs/legacy-assets.md 的复用策略"
echo "4. 声称完成前重新运行 bash init.sh"
