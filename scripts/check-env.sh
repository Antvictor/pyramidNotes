#!/usr/bin/env bash
# 项目环境检查：Node / npm / 依赖
# 要求：Node 20.19+ 或 22.12+（Vite 7）、npm、根目录与 electron 依赖已安装

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

err() { echo -e "${RED}[ERROR]${NC} $*"; }
ok()  { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

FAIL=0

# 检查 Node 版本：Vite 7 需要 20.19+ 或 22.12+
check_node() {
  if ! command -v node &>/dev/null; then
    err "未找到 node。请安装 Node.js（推荐 20 LTS 或 22）。"
    ((FAIL++)) || true
    return
  fi
  local raw
  raw=$(node -v 2>/dev/null) || raw=""
  # 用 Node 自己算可比较的版本号：major*1e4 + minor*1e2 + patch
  local code
  code=$(node -e "
    const v = process.versions.node.split('.').map(Number);
    const n = (v[0]||0)*10000 + (v[1]||0)*100 + (v[2]||0);
    console.log(n);
  " 2>/dev/null) || code=0
  # 20.19.0 => 201900
  if [[ "$code" -ge 201900 ]]; then
    ok "Node ${raw}（满足 20.19+ 或 22.12+）"
  else
    err "当前 Node 版本: ${raw}。本项目需要 Node 20.19+ 或 22.12+（Vite 7 要求）。"
    echo "  若使用 nvm: nvm install 20 && nvm use 20"
    echo "  或: nvm install 22 && nvm use 22"
    ((FAIL++)) || true
  fi
}

# 检查 npm
check_npm() {
  if ! command -v npm &>/dev/null; then
    err "未找到 npm。请先安装 Node.js（自带 npm）。"
    ((FAIL++)) || true
    return
  fi
  ok "npm $(npm -v)"
}

# 检查根目录依赖及写权限（Vite 需写 node_modules/.vite-temp）
check_root_deps() {
  if [[ ! -d "$REPO_ROOT/node_modules" ]] || [[ ! -f "$REPO_ROOT/node_modules/vite/package.json" ]]; then
    warn "根目录依赖未安装或不全。请执行: npm install"
    ((FAIL++)) || true
    return
  fi
  ok "根目录 node_modules 已安装"
  if [[ ! -w "$REPO_ROOT/node_modules" ]]; then
    err "node_modules 无写权限（可能属主为 root），Vite 会报 EACCES。请执行: ./scripts/fix-node-modules-permissions.sh"
    ((FAIL++)) || true
  fi
}

# 检查 electron 子项目依赖
check_electron_deps() {
  if [[ ! -d "$REPO_ROOT/electron/node_modules" ]]; then
    warn "electron 依赖未安装。请执行: cd electron && npm install"
    ((FAIL++)) || true
  elif [[ ! -d "$REPO_ROOT/electron/node_modules/better-sqlite3" ]]; then
    warn "electron 中 better-sqlite3 未安装。请执行: cd electron && npm install"
    ((FAIL++)) || true
  else
    ok "electron node_modules 已安装（含 better-sqlite3）"
  fi
}

echo "--- 环境检查（项目要求：Node 20.19+ 或 22.12+）---"
check_node
check_npm
check_root_deps
check_electron_deps
echo "----------------------------------------"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  err "共 $FAIL 项未通过。请按上述提示修复后重试。"
  exit 1
fi
echo ""
ok "环境检查通过，可执行: npm run start"
exit 0
