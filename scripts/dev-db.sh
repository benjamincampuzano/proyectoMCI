#!/usr/bin/env bash
# Helper de la base de datos local de desarrollo (PostgreSQL 16, puerto 5433).
#
#   ./scripts/dev-db.sh start|stop|status|psql|reset|restore <archivo>
#
# El cluster vive en ~/.local/share/iglesia-pg (fuera del repo para no ensuciar git).

set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PG_DIR="${PG_DIR:-$HOME/.local/share/iglesia-pg}"
PG_LOG="${PG_LOG:-$HOME/.local/share/iglesia-pg.log}"
PG_PORT="${PG_PORT:-5433}"
PG_USER="${PG_USER:-postgres}"
PG_PASSWORD="${PG_PASSWORD:-iglesia_local_dev_2026}"
PG_DB="${PG_DB:-iglesia}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PGPASSWORD="$PG_PASSWORD"

psql_local() {
  psql -h 127.0.0.1 -p "$PG_PORT" -U "$PG_USER" -d "${1:-$PG_DB}" "${@:2}"
}

sanitize_dump() {
  # PG 18 -> PG 16: quitar GUC y meta-comandos que no existen en psql 16
  sed -E '/^[[:space:]]*SET transaction_timeout\b/Id; /^[[:space:]]*\\restrict\b/Id; /^[[:space:]]*\\unrestrict\b/Id' "$1"
}

cmd_start() {
  if "$PG_BIN/pg_ctl" -D "$PG_DIR" status >/dev/null 2>&1; then
    echo "✔ PostgreSQL local ya está corriendo (puerto $PG_PORT)"
  else
    "$PG_BIN/pg_ctl" -D "$PG_DIR" -l "$PG_LOG" start -w -t 30
  fi
}

cmd_stop() {
  "$PG_BIN/pg_ctl" -D "$PG_DIR" stop -m fast
}

cmd_status() {
  "$PG_BIN/pg_ctl" -D "$PG_DIR" status || true
  psql_local "$PG_DB" -tAc "select 'conectado: '||current_database()||' | tablas: '||count(*) from information_schema.tables where table_schema='public'" 2>/dev/null || true
}

cmd_reset() {
  cmd_start
  psql_local postgres -qc "DROP DATABASE IF EXISTS $PG_DB;" -c "CREATE DATABASE $PG_DB;"
  local dump="$ROOT_DIR/Backups/backup_2026-07-20T19-57-09-939Z.sql"
  echo "↺ Restaurando $dump"
  sanitize_dump "$dump" | psql_local "$PG_DB" -v ON_ERROR_STOP=1 -q
  echo "✔ Base de datos '$PG_DB' restaurada (luego ejecuta: pnpm run migrate)"
}

cmd_restore() {
  local file="${1:?Uso: dev-db.sh restore <archivo.sql|.sql.enc>}"
  cmd_start
  local plain="$file"
  if [[ "$file" == *.enc ]]; then
    plain="$(mktemp /tmp/XXXXXX.sql)"
    (cd "$ROOT_DIR/server" && node -e "
      require('dotenv').config();
      const { decryptBackupFile } = require('./utils/backupCrypto');
      decryptBackupFile(process.argv[1], process.argv[2]);
    " "$ROOT_DIR/$file" "$plain")
  fi
  psql_local postgres -qc "DROP DATABASE IF EXISTS $PG_DB;" -c "CREATE DATABASE $PG_DB;"
  sanitize_dump "$plain" | psql_local "$PG_DB" -v ON_ERROR_STOP=1 -q
  [[ "$plain" != "$file" ]] && rm -f "$plain"
  echo "✔ Restaurado $file → base '$PG_DB' (luego ejecuta: pnpm run migrate)"
}

case "${1:-status}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  status)  cmd_status ;;
  psql)    shift; psql_local "$PG_DB" "$@" ;;
  reset)   cmd_reset ;;
  restore) shift; cmd_restore "$@" ;;
  *)       echo "Uso: $0 {start|stop|status|psql|reset|restore <archivo>}"; exit 1 ;;
esac
