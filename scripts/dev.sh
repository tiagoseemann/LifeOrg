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

cmd="${1:-up}"

case "$cmd" in
  up)
    ensure_env
    echo "→ Subindo LifeOrg em http://localhost:3000"
    dc up
    ;;
  build)
    ensure_env
    echo "→ Reconstruindo imagens e subindo..."
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
