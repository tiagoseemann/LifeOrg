# PRD — Etapa 4: Arquitetura e Stack

---

## 4.1 Decisão Arquitetural Central: Local-First com Docker

Toda a aplicação (interface, servidor e banco de dados) roda na máquina do usuário, dentro de containers Docker. O sistema inteiro é iniciado com um único comando:

```bash
docker compose up
```

Acesso via navegador em `http://localhost:3000`.

**Justificativa:**
- Custo zero permanente — sem dependência de serviços externos
- Performance máxima — sem latência de rede
- Usuário possui familiaridade com Docker
- Quando necessário, os containers já estão prontos para deploy em plataformas free tier (Railway, Render, Vercel)

---

## 4.2 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────┐
│              DOCKER COMPOSE                 │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐  │
│  │   FRONTEND   │ ───► │    BACKEND      │  │
│  │   React 18   │      │   FastAPI       │  │
│  │   Vite       │      │   (Python)      │  │
│  │   :3000      │      │   :8000         │  │
│  └──────────────┘      └────────┬────────┘  │
│                                 │            │
│                        ┌────────▼────────┐  │
│                        │   PostgreSQL 16 │  │
│                        │   :5432         │  │
│                        │   volume local  │  │
│                        └─────────────────┘  │
└─────────────────────────────────────────────┘
         │
         ▼
  http://localhost:3000  (Safari / Chrome / Firefox)
```

---

## 4.3 Stack Detalhada

### Frontend

| Tecnologia | Função | Justificativa |
|---|---|---|
| **React 18** | Framework de interface | Ecossistema maduro para SPAs; referência já em React no shell HTML |
| **TypeScript** | Linguagem | Tipagem estática reduz bugs em dados relacionais (card↔bloco↔sessão) |
| **Vite** | Build tool | Extremamente rápido em dev local |
| **CSS Modules + tokens globais** | Estilização | Os tokens do `DESIGN_SPEC.md` são declarados em `app.css` como custom properties. Componentes usam CSS Modules. **Não usar Tailwind** — o design system tem valores muito específicos (0.5px borders, fontes editoriais, spacing em subscala de 2px) que se combatem com classes utilitárias. |
| **FullCalendar** | Módulo de Calendário | Suporta visão semanal, navegação entre semanas e, futuramente, drag-and-drop |
| **@dnd-kit** | Drag-and-drop do Kanban | Biblioteca acessível e moderna para DnD em React |
| **Zustand** | Estado global | Gerencia: sessão de foco ativa, tela ativa, filtros Kanban |
| **React Query (TanStack Query)** | Sincronização com API | Cache local, invalidação automática, retry — ideal para autosave e polling |

> **Nota sobre Tailwind:** A `etapa4` original sugeria Tailwind. A análise do `DESIGN_SPEC.md` e do `LifeOrg Shell.html` mostra que o design system usa hairlines de 0.5px, custom properties CSS, fontes com stacks específicas e valores de spacing fora de qualquer grid Tailwind. O shell HTML já demonstra que CSS customizado direto é o caminho correto. Tailwind seria um atrito, não uma vantagem aqui.

### Backend

| Tecnologia | Função | Justificativa |
|---|---|---|
| **FastAPI** | Framework web | Python moderno, alta performance, documentação automática via Swagger em `/docs` |
| **SQLAlchemy 2.x** | ORM | Traduz operações Python para SQL; suporta relacionamentos complexos (card↔bloco↔sessão) |
| **Alembic** | Migrações de banco | Controla evolução do schema de forma segura e reversível |
| **Pydantic v2** | Validação de dados | Integrado ao FastAPI — valida e serializa todos os payloads |
| **Uvicorn** | Servidor ASGI | Alta performance; executa o FastAPI dentro do container |

### Banco de Dados

| Tecnologia | Função | Justificativa |
|---|---|---|
| **PostgreSQL 16** | Banco de dados relacional | Integridade referencial para card↔bloco↔sessão; suporte a JSON nativo (checklists); padrão de mercado para deploy futuro |

> **Por que não SQLite?** As relações entre cards, blocos e sessões exigem integridade referencial robusta com foreign keys, cascade deletes e transações. PostgreSQL é superior e elimina problemas de concorrência ao expandir para múltiplos usuários no futuro.

### Infraestrutura

| Tecnologia | Função |
|---|---|
| **Docker** | Containerização isolada de cada serviço |
| **Docker Compose** | Orquestração com um único comando |

---

## 4.4 Estrutura de Containers

```yaml
# docker-compose.yml

services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
    environment:
      - VITE_API_URL=http://localhost:8000

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [database]
    environment:
      - DATABASE_URL=postgresql://lifeorg:lifeorg@database:5432/lifeorgdb
      - API_SECRET_KEY=${API_SECRET_KEY}

  database:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      - POSTGRES_USER=lifeorg
      - POSTGRES_PASSWORD=lifeorg
      - POSTGRES_DB=lifeorgdb
    volumes:
      - ./data/postgres:/var/lib/postgresql/data  # Persistência local
```

O volume do PostgreSQL garante que os dados **não são perdidos** ao desligar os containers.

---

## 4.5 Estrutura de Pastas do Projeto

```
/
├── docker-compose.yml
├── .env                        ← API_SECRET_KEY e variáveis sensíveis
│
├── frontend/
│   ├── Dockerfile
│   ├── index.html              ← Inclui o SVG icon library (do shell HTML)
│   ├── src/
│   │   ├── app.css             ← Tokens CSS globais (:root custom properties)
│   │   ├── main.tsx
│   │   ├── App.tsx             ← Roteamento por estado (active screen)
│   │   ├── shell/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── Icon.tsx        ← Wrapper do SVG symbol library
│   │   │   └── Placeholder.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── TimePie.tsx
│   │   │   ├── Agenda.tsx
│   │   │   └── KanbanPreview.tsx
│   │   ├── kanban/
│   │   │   ├── KanbanScreen.tsx
│   │   │   ├── Column.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Drawer.tsx
│   │   ├── calendar/
│   │   │   ├── CalendarScreen.tsx
│   │   │   ├── Block.tsx
│   │   │   └── NewBlockModal.tsx
│   │   ├── focus/
│   │   │   ├── FocusScreen.tsx
│   │   │   ├── FocusRing.tsx
│   │   │   └── Picker.tsx
│   │   ├── store/              ← Zustand stores
│   │   │   ├── appStore.ts     ← active screen, navigation
│   │   │   ├── focusStore.ts   ← sessão ativa, elapsed, running
│   │   │   └── kanbanStore.ts  ← filtros, selectedCard
│   │   ├── hooks/              ← React Query hooks por domínio
│   │   │   ├── useCards.ts
│   │   │   ├── useColumns.ts
│   │   │   ├── useBlocks.ts
│   │   │   └── useSessions.ts
│   │   └── lib/
│   │       ├── api.ts          ← fetch wrapper com API_SECRET_KEY
│   │       └── format.ts       ← fmtHM, fmtHours, fmtDuration (pt-BR)
│   └── package.json
│
└── backend/
    ├── Dockerfile
    ├── app/
    │   ├── main.py             ← FastAPI app, CORS, auth middleware
    │   ├── database.py         ← SQLAlchemy engine + session
    │   ├── models/
    │   │   ├── category.py
    │   │   ├── column.py
    │   │   ├── card.py
    │   │   ├── block.py
    │   │   └── session.py
    │   ├── schemas/
    │   │   ├── category.py
    │   │   ├── column.py
    │   │   ├── card.py
    │   │   ├── block.py
    │   │   └── session.py
    │   └── routers/
    │       ├── categories.py
    │       ├── columns.py
    │       ├── cards.py
    │       ├── blocks.py
    │       └── sessions.py
    ├── alembic/
    │   ├── env.py
    │   └── versions/           ← migration files
    ├── alembic.ini
    └── requirements.txt
```

---

## 4.6 Modelagem do Banco de Dados

```
┌──────────────────────┐       ┌───────────────────────┐
│      categories      │       │    kanban_columns      │
│──────────────────────│       │───────────────────────│
│ id (PK, UUID)        │       │ id (PK, UUID)         │
│ name     TEXT UNIQUE │       │ title      TEXT       │
│ slug     TEXT UNIQUE │       │ position   INT        │
│ is_default BOOL      │       │ created_at TIMESTAMPTZ│
└──────────┬───────────┘       │ updated_at TIMESTAMPTZ│
           │                   └──────────┬────────────┘
           │          ┌───────────────────▼────────────┐
           │          │         kanban_cards            │
           └─────────►│────────────────────────────────│
                      │ id (PK, UUID)                  │
                      │ title           TEXT           │
                      │ description     TEXT           │
                      │ category_id     FK → NULL      │
                      │ column_id       FK             │
                      │ priority        ENUM           │ ← 'high'|'medium'|'low'
                      │ due_date        DATE           │
                      │ time_estimate   INT (min)      │
                      │ total_focus_time INT (s)       │ ← somente leitura
                      │ checklist       JSONB          │ ← [{id,text,done}]
                      │ position        INT            │
                      │ created_at      TIMESTAMPTZ    │
                      │ updated_at      TIMESTAMPTZ    │
                      └──────────────┬─────────────────┘
                                     │
                      ┌──────────────▼─────────────────┐
                      │        calendar_blocks          │
                      │────────────────────────────────│
                      │ id (PK, UUID)                  │
                      │ title          TEXT            │
                      │ start_datetime TIMESTAMPTZ     │
                      │ end_datetime   TIMESTAMPTZ     │
                      │ category_id    FK → NULL       │
                      │ card_id        FK → NULL       │ ← NULL se não vinculado
                      │ recurrence     ENUM            │ ← para uso futuro
                      │ created_at     TIMESTAMPTZ     │
                      │ updated_at     TIMESTAMPTZ     │
                      └────────────────────────────────┘

                      ┌────────────────────────────────┐
                      │        focus_sessions           │
                      │────────────────────────────────│
                      │ id (PK, UUID)                  │
                      │ card_id         FK → NULL      │ ← NULL se card excluído
                      │ card_title_snapshot TEXT       │ ← cópia do título no início
                      │ card_cat_snapshot   TEXT       │ ← cópia da categoria
                      │ mode            ENUM           │ ← 'fixed' | 'free'
                      │ duration_seconds INT           │ ← NULL para modo livre
                      │ elapsed_seconds  INT           │ ← preenchido ao encerrar
                      │ last_heartbeat_at TIMESTAMPTZ  │ ← atualizado a cada 30s
                      │ started_at      TIMESTAMPTZ    │
                      │ ended_at        TIMESTAMPTZ    │ ← NULL = sessão em aberto
                      └────────────────────────────────┘
```

**Notas de implementação:**
- UUIDs como PKs: evita colisão em deploy futuro multi-usuário
- `ended_at = NULL` é o sinal de sessão interrompida (RN-FOC-05)
- `total_focus_time` em `kanban_cards` é atualizado via UPDATE explícito no router de sessões ao encerrar
- `checklist` como JSONB: array de `{ id, text, done }` — simples e sem tabela extra
- `focus_sessions.card_id` usa `ON DELETE SET NULL`: excluir o card preserva o histórico de sessões
- `card_title_snapshot` e `card_cat_snapshot`: capturam título e categoria no momento de início da sessão, para que o histórico seja legível mesmo após exclusão do card
- `last_heartbeat_at`: base para recuperação de sessão interrompida (RN-FOC-05); sessões sem heartbeat por mais de 24h são descartadas automaticamente
- Índice único parcial: `CREATE UNIQUE INDEX uq_active_session ON focus_sessions (id) WHERE ended_at IS NULL` — garante uma única sessão ativa por vez
- `categories.slug`: versão normalizada do nome (lowercase, sem acentos), para uso interno; nunca exibido na UI
- Constraint unique em `kanban_cards (column_id, position)` e `kanban_columns (position)` garante posições sem duplicata dentro do escopo

---

## 4.7 API REST — Rotas Principais

```
GET    /api/categories
POST   /api/categories
DELETE /api/categories/{id}

GET    /api/columns
POST   /api/columns
PATCH  /api/columns/{id}
DELETE /api/columns/{id}
PATCH  /api/columns/reorder          ← bulk update de positions

GET    /api/cards
POST   /api/cards
GET    /api/cards/{id}
PATCH  /api/cards/{id}
DELETE /api/cards/{id}
PATCH  /api/cards/reorder            ← bulk update de positions após DnD

GET    /api/blocks?week_start=YYYY-MM-DD
POST   /api/blocks
PATCH  /api/blocks/{id}
DELETE /api/blocks/{id}

GET    /api/sessions?active=true     ← detectar sessão em aberto
POST   /api/sessions
PATCH  /api/sessions/{id}/heartbeat  ← atualiza last_heartbeat_at (chamado a cada 30s pelo frontend)
PATCH  /api/sessions/{id}/end        ← encerrar sessão (elapsed_seconds obrigatório)
DELETE /api/sessions/{id}            ← descartar sessão
```

Documentação automática disponível em `http://localhost:8000/docs` durante desenvolvimento.

---

## 4.8 Caminho para Deploy Futuro

Quando necessário, a migração do local para a nuvem é direta:

| Camada | Plataforma | Custo |
|---|---|---|
| Frontend | **Vercel** | Gratuito |
| Backend | **Railway** ou **Render** | Gratuito (free tier) |
| Banco de Dados | **Supabase** ou **Railway PostgreSQL** | Gratuito até 500 MB |

---

## 4.9 Resumo Executivo

> **Stack:** React 18 + TypeScript + CSS Modules (Frontend) · FastAPI + SQLAlchemy + PostgreSQL (Backend) · Docker Compose (Infraestrutura)
>
> **Persistência:** PostgreSQL local via Docker, com volume montado. Nenhum dado é perdido ao reiniciar os containers. Todos os dados do MVP — cards, colunas, blocos, sessões — são persistidos em banco.
>
> **Visual:** Implementação React deve reproduzir fielmente o `LifeOrg Shell.html`. Tokens CSS em `app.css` como custom properties. Referência definitiva: `DESIGN_SPEC.md`.
>
> **Padrão de API:** REST com FastAPI. Backend binds em `localhost`. CORS restrito a `http://localhost:3000`. Header `X-API-Key` como barreira de acesso local (não é autenticação real — ver RNF-15).
>
> **Ambiente:** Local-First. `docker compose up` sobe tudo. Nenhuma dependência de serviço externo no MVP.
>
> **Ordem de desenvolvimento:** Fundação → Kanban → Calendário → Foco → Integração cross-screen → Dashboard → Financeiro/Ideias (Fase 2).
>
> **Regras de negócio:** consultar `etapa3-regras-e-casos-de-uso.md` para toda decisão de lógica.
> **Visual:** consultar `DESIGN_SPEC.md` e `LifeOrg Shell.html` para toda decisão de UI.
