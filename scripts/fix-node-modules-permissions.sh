#!/usr/bin/env bash
# 修复 node_modules 属主为 root 导致的 EACCES（Vite 无法写 .vite-temp）
# 用法：在项目根目录执行 ./scripts/fix-node-modules-permissions.sh（需要输入 sudo 密码）

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -d "node_modules" ]]; then
  echo "未找到 node_modules，请先执行: npm install"
  exit 1
fi

CURRENT_USER=$(whoami)
OWNER=$(stat -f '%Su' node_modules 2>/dev/null || stat -c '%U' node_modules 2>/dev/null)

if [[ "$OWNER" != "$CURRENT_USER" ]]; then
  echo "node_modules 当前属主: $OWNER，当前用户: $CURRENT_USER"
  echo "正在修复权限（需 sudo）: sudo chown -R $CURRENT_USER node_modules"
  sudo chown -R "$CURRENT_USER" node_modules
  echo "已修复。可重新执行: npm run start"
else
  echo "node_modules 已属当前用户，无需修复。"
fi

# 若存在 .vite-temp 且属主不对也一并修复
if [[ -d "node_modules/.vite-temp" ]]; then
  sudo chown -R "$CURRENT_USER" node_modules/.vite-temp 2>/dev/null || true
fi
