#!/usr/bin/env sh
set -eu

# Resolve project root regardless of where the script is called from
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Uso: ./scripts/dev.sh [comando]

  up       Sobe a aplicação (padrão)
  build    Reconstrói as imagens Docker e sobe
  logs     Acompanha os logs em tempo real
  stop     Para os containers sem remover
  down     Para e remove os containers
  help     Exibe esta ajuda
EOF
}

dc() {
  docker compose "$@"
}

ensure_env() {
  if [ ! -f .env ] || [ ! -s .env ]; then
    cp .env.example .env
    echo "→ .env criado a partir de .env.example"
    echo "  Edite .env e defina API_SECRET_KEY antes de continuar."
    echo ""
  fi
}

port() {
  # Read FRONTEND_PORT from environment or .env, default 3000
  if [ -n "${FRONTEND_PORT:-}" ]; then
    echo "$FRONTEND_PORT"
  elif [ -f .env ]; then
    val=$(sed -n 's/^FRONTEND_PORT=//p' .env | tail -n 1)
    echo "${val:-3000}"
  else
    echo "3000"
  fi
}

cmd="${1:-up}"

case "$cmd" in
  up)
    ensure_env
    echo "→ Subindo LifeOrg em http://localhost:$(port)"
    dc up
    ;;
  build)
    ensure_env
    echo "→ Reconstruindo imagens e subindo em http://localhost:$(port)"
    dc up --build
    ;;
  logs)
    dc logs -f
    ;;
  stop)
    dc stop
    ;;
  down)
    dc down
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "Comando desconhecido: $cmd" >&2
    usage >&2
    exit 1
    ;;
esac
