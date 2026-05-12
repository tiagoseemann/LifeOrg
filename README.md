# LifeOrg

Sistema operacional pessoal. Une planejamento e execução do dia a dia em um único ambiente local.

**Fluxo central:** ver (Dashboard) → planejar (Kanban + Calendário) → executar (Foco) → registrar (métricas)

---

## Módulos

- **Kanban** — quadro de tarefas com colunas renomeáveis, drag-and-drop, drawer de detalhes e autosave
- **Calendário** — visão semanal com blocos de tempo, categorias e now-line coral
- **Foco** — timer fixo ou livre, ring SVG animado, heartbeat e recuperação de sessão interrompida
- **Dashboard** — métricas reais, gráfico de distribuição de tempo, preview do Kanban e agenda do dia

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite + CSS Modules |
| Estado | Zustand + TanStack Query v5 |
| Kanban DnD | @dnd-kit |
| Backend | FastAPI + SQLAlchemy 2.x + Alembic + Pydantic v2 |
| Banco | PostgreSQL 16 |
| Infra | Docker Compose |

---

## Início rápido

**Pré-requisitos:** Docker Desktop instalado e rodando.

```bash
# 1. Clonar
git clone https://github.com/tiagoseemann/LifeOrg.git
cd LifeOrg

# 2. Subir
./scripts/dev.sh
```

Acesse **http://localhost:3000** no navegador, ou a porta configurada em `FRONTEND_PORT`.

O script cria `.env` a partir de `.env.example` quando o arquivo não existe ou está vazio.
Na primeira inicialização, as migrações do banco são aplicadas automaticamente. Três categorias padrão (Pessoal, Trabalho, Estudo) e três colunas Kanban (A fazer, Em progresso, Concluído) são criadas automaticamente.

Comandos úteis:

```bash
./scripts/dev.sh rebuild  # recria as imagens Docker e sobe a aplicação
./scripts/dev.sh logs     # acompanha os logs dos containers
./scripts/dev.sh stop     # para os containers
./scripts/dev.sh down     # para e remove os containers
```

Se a porta `3000` já estiver em uso, suba o frontend em outra porta:

```bash
FRONTEND_PORT=3001 ./scripts/dev.sh
```

Para deixar isso fixo, defina `FRONTEND_PORT=3001` no `.env`.

---

## Variáveis de ambiente

O `./scripts/dev.sh` cria `.env` a partir de `.env.example` automaticamente quando necessário. Para configurar manualmente, copie `.env.example` para `.env` e preencha:

| Variável | Descrição | Padrão |
|---|---|---|
| `API_SECRET_KEY` | Chave usada pelo proxy Vite para autenticar requests ao backend | — |
| `FRONTEND_PORT` | Porta do host usada para acessar o frontend | `3000` |
| `POSTGRES_USER` | Usuário do PostgreSQL | `lifeorg` |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | `lifeorg` |
| `POSTGRES_DB` | Nome do banco | `lifeorgdb` |
| `DATABASE_URL` | URL completa de conexão (usada pelo backend) | `postgresql://lifeorg:lifeorg@database:5432/lifeorgdb` |

> A `API_SECRET_KEY` não é exposta no bundle JavaScript — o proxy Vite a injeta server-side nos headers das requisições ao backend.

---

## Arquitetura

```
┌─────────────────────────────────────────────┐
│              DOCKER COMPOSE                 │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐  │
│  │   FRONTEND   │─────▶│    BACKEND      │  │
│  │  React + Vite│      │   FastAPI       │  │
│  │  :3000       │      │   :8000 (int)   │  │
│  └──────────────┘      └────────┬────────┘  │
│       proxy /api/*              │            │
│                        ┌────────▼────────┐  │
│                        │  PostgreSQL 16  │  │
│                        │  volume local   │  │
│                        └─────────────────┘  │
└─────────────────────────────────────────────┘
         ▼
  http://localhost:3000
```

O backend não expõe porta externamente — toda comunicação passa pelo proxy do Vite em `:3000/api/*`.

Os dados persistem em `./data/postgres/` (volume local montado no container PostgreSQL). Derrubar os containers não apaga os dados.

---

## Estrutura de pastas

```
.
├── docker-compose.yml
├── scripts/
│   └── dev.sh              ← inicialização rápida via Docker Compose
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh        ← roda alembic upgrade head antes do servidor
│   ├── requirements.txt
│   ├── alembic/             ← migrations
│   └── app/
│       ├── main.py
│       ├── models/          ← SQLAlchemy ORM
│       ├── schemas/         ← Pydantic v2
│       └── routers/         ← endpoints REST
└── frontend/
    ├── Dockerfile
    ├── vite.config.ts       ← proxy /api/* → backend com injeção de auth header
    └── src/
        ├── app.css          ← design tokens (custom properties CSS)
        ├── shell/           ← Sidebar, TopBar, Icon, Placeholder
        ├── kanban/          ← KanbanScreen, Column, KanbanCard, Drawer
        ├── calendar/        ← CalendarScreen, CalBlock, NewBlockModal
        ├── focus/           ← FocusScreen, FocusRing, CardPicker
        ├── dashboard/       ← Dashboard, MetricCard, TimePie, AgendaPanel
        ├── hooks/           ← React Query hooks por domínio
        ├── store/           ← Zustand stores (app, kanban, focus)
        ├── types/           ← interfaces TypeScript
        └── lib/             ← api.ts, format.ts
```

---

## API

Documentação interativa disponível em `http://localhost:8000/docs` (Swagger UI).

Endpoints principais:

```
GET  /api/categories
POST /api/categories
DELETE /api/categories/{id}

GET  /api/columns
POST /api/columns
PATCH /api/columns/reorder
PATCH /api/columns/{id}
DELETE /api/columns/{id}

GET  /api/cards
POST /api/cards
PATCH /api/cards/reorder
PATCH /api/cards/{id}
DELETE /api/cards/{id}

GET  /api/blocks?week_start=YYYY-MM-DD
POST /api/blocks
PATCH /api/blocks/{id}
DELETE /api/blocks/{id}

GET  /api/sessions?active=true
GET  /api/sessions?today=true
POST /api/sessions
PATCH /api/sessions/{id}/heartbeat
PATCH /api/sessions/{id}/end
DELETE /api/sessions/{id}
```

---

## Fora do escopo v1

- Autenticação / login (single-user local)
- Drag-and-drop no Calendário
- Visões de dia e mês
- Notificações
- Módulos Financeiro e Ideias (planejados para v2)
- Modo offline / PWA
