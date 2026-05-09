#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/dev.sh [comando]

Comandos:
  up        Sobe a aplicacao com Docker Compose (padrao)
  rebuild   Recria as imagens Docker e sobe a aplicacao
  logs      Acompanha os logs dos containers
  stop      Para os containers
  down      Para e remove os containers
  help      Mostra esta ajuda
EOF
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Docker Compose nao foi encontrado. Instale o Docker Desktop ou docker-compose." >&2
    exit 1
  fi
}

ensure_env() {
  if [ ! -s .env ]; then
    if [ ! -f .env.example ]; then
      echo ".env nao existe ou esta vazio, e .env.example nao foi encontrado." >&2
      exit 1
    fi

    cp .env.example .env
    echo "Criado .env a partir de .env.example."
  fi
}

command="${1:-up}"

case "$command" in
  up)
    ensure_env
    compose up
    ;;
  rebuild)
    ensure_env
    compose up --build
    ;;
  logs)
    compose logs -f
    ;;
  stop)
    compose stop
    ;;
  down)
    compose down
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "Comando desconhecido: $command" >&2
    echo >&2
    usage >&2
    exit 1
    ;;
esac
