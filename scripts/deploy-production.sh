#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="${HIBI_APP_DIR:-/opt/hibi/current}"
BRANCH="${HIBI_BRANCH:-main}"
SERVICE="${HIBI_SERVICE:-hibi}"
ENV_FILE="${HIBI_ENV_FILE:-/etc/hibi/hibi.env}"
APP_USER="${HIBI_APP_USER:-}"

log() {
  printf '[hibi-deploy] %s\n' "$1"
}

fail() {
  printf '[hibi-deploy] 失败：%s\n' "$1" >&2
  exit 1
}

cd "$APP_DIR" || fail "找不到项目目录：$APP_DIR"

if [[ -z "$APP_USER" ]]; then
  APP_USER="$(stat -c '%U' "$APP_DIR")"
fi

run_as_app() {
  if [[ "$EUID" -eq 0 && "$APP_USER" != "root" ]]; then
    runuser -u "$APP_USER" -- "$@"
  else
    "$@"
  fi
}

if [[ -n "$(run_as_app git status --porcelain)" ]]; then
  fail "服务器工作树不是干净状态，请先处理本地改动。"
fi

if [[ "$(run_as_app git branch --show-current)" != "$BRANCH" ]]; then
  fail "当前分支不是 $BRANCH。"
fi

if [[ ! -r "$ENV_FILE" ]]; then
  fail "找不到或无法读取环境文件：$ENV_FILE"
fi

log "拉取 $BRANCH 最新代码"
run_as_app git fetch origin "$BRANCH"
run_as_app git pull --ff-only origin "$BRANCH"

log "加载生产环境配置"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

log "安装锁定版本依赖"
run_as_app npm ci

log "执行数据库迁移"
run_as_app npm run db:migrate

log "运行代码检查和单元测试"
run_as_app npm run lint
run_as_app npm test

log "构建生产版本"
run_as_app npm run build

log "重启 systemd 服务：$SERVICE"
if [[ "$EUID" -eq 0 ]]; then
  systemctl restart "$SERVICE"
  systemctl is-active --quiet "$SERVICE"
else
  sudo systemctl restart "$SERVICE"
  sudo systemctl is-active --quiet "$SERVICE"
fi

log "部署完成：$(run_as_app git rev-parse --short HEAD)"
