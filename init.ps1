# harness 标准入口（Windows PowerShell）
# 用法：
#   ./init.ps1          # 环境检查 + 资产保真校验；依赖缺失时跳过构建
#   ./init.ps1 -Full    # 额外执行 npm install 与小程序构建
param([switch]$Full)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host '=== 1/3 环境检查 ==='
node -v

Write-Host ''
Write-Host '=== 2/3 资产保真校验（零依赖） ==='
node scripts/verify-assets.mjs

Write-Host ''
Write-Host '=== 3/3 构建验证 ==='
if (-not (Test-Path node_modules)) {
  Write-Host '未安装依赖（node_modules 缺失）。'
  if ($Full) {
    npm install --no-audit --no-fund
  } else {
    Write-Host '跳过构建。完整验证请执行：./init.ps1 -Full'
  }
}
if (Test-Path node_modules) {
  npm run build:mp-weixin
}

Write-Host ''
Write-Host '=== 验证完成 ==='
Write-Host '下一步：'
Write-Host '1. 打开 feature_list.json 查看当前功能状态与依赖'
Write-Host '2. 只挑一个 not-started 功能着手'
Write-Host '3. 改动前先看 docs/legacy-assets.md 的复用策略'
Write-Host '4. 声称完成前重新运行 ./init.ps1'
