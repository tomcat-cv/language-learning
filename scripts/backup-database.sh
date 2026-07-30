#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?缺少 DATABASE_URL}"

backup_dir="${HIBI_BACKUP_DIR:-/var/backups/hibi}"
retention_days="${HIBI_BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date +%F-%H%M%S)"
backup_path="${backup_dir}/hibi-${timestamp}.dump"

umask 077
mkdir -p "${backup_dir}"
pg_dump --format=custom --file="${backup_path}" "${DATABASE_URL}"
pg_restore --list "${backup_path}" >/dev/null
find "${backup_dir}" -maxdepth 1 -type f -name 'hibi-*.dump' \
  -mtime "+${retention_days}" -delete

echo "数据库备份完成：${backup_path}"
