# PLANNING.md — Estado, Dívidas e Roadmap do LifeOrg

> Documento de análise arquitetural produzido em 2026-05-12 sobre o branch `main`.
> Cobre o snapshot atual do código (incluindo arquivos ainda untracked de Google Calendar),
> as specs em `Claude/` e `docs/`, e propõe próximos passos.
> Última atualização: 2026-05-12.

---

## 1. ESTADO ATUAL DO MVP

### 1.1. Tabela de módulos

| Módulo | Status | O que está feito | O que está faltando |
|---|---|---|---|
| **Kanban** | 🟡 Parcial | Backend CRUD completo (cards, columns, categorias); reorder por bulk PATCH; categorias padrão protegidas (Pessoal/Trabalho/Estudo); proteção contra deletar última coluna; cascade `column→cards`; soft-delete via `SET NULL` em categoria. Frontend: board com DnD via `@dnd-kit`, drawer com autosave debounced, filtro por categoria, busca por título, integração para iniciar foco a partir do card. | Botão de **deletar card** na UI (spec em `docs/BUGFIX-001.md`); UI para `checklist` (campo JSONB existe, frontend não popula); UI para `time_estimate`; visual de `total_focus_time` por card; sem boards/projetos múltiplos; sem tags além de categoria. |
| **Calendário** | 🟡 Parcial | Backend CRUD com janela semanal (`?week_start=YYYY-MM-DD`); validação `end > start`; linkagem card↔block com auto-unlink; cascade `card→block` em SET NULL. Frontend: grade semanal 06:00–23:00, modal de criar/editar, link com card, banner do Google. Integração Google Calendar **escrita mas untracked** (migração `0002`, modelo `OAuthToken`, service `google_calendar.py`, routers `auth_google.py`/`google_sync.py`, hook `useGoogleCalendar.ts`, `GoogleConnectBanner.tsx`). | Drag-and-drop no calendário (Fase 2); views de dia/mês; **`recurrence` está no schema mas não é processado** em lugar nenhum; sem detecção de overlap; commit/migração de Google Calendar ainda não foi mergeada. |
| **Foco** | 🟡 Parcial | Backend com modos fixed/free, snapshots de título/categoria, índice único parcial garantindo **uma sessão ativa por vez** (`uq_active_session` em `0001`), regra dos 30s mínimos, heartbeat. Frontend: timer com ring, pause/resume, recovery via heartbeat. | `FocusScreen` com seletor de duração centralizado quando deveria estar ancorado no rodapé (`docs/BUGFIX-001.md`, Bug 2); fluxo de recovery não foi testado end-to-end; sem ajuste manual de tempo retroativo; sem efeitos sonoros/hápticos. |
| **Dashboard** | ✅ Completo no MVP | Tela `Dashboard` entregue com `MetricCard`, `TimePie`, `KanbanPreview`, `AgendaPanel`; consome `useCards`, `useColumns`, `useBlocks`, `useTodaySessions`. Atende aos requisitos de `etapa1 §1.4`. | Backlog futuro (não bloqueia MVP): histórico semanal/mensal, widgets customizáveis, tendências, tratamento explícito de timezone no "próximo bloco". |
| **Google Calendar** | 🟡 Parcial (untracked) | Migração 0002 cria `google_event_id`, `is_google_event`, `sync_status` + tabela `oauth_tokens`. Service implementa OAuth flow, refresh automático, fetch/create/update/delete de eventos. Routers expõem `/api/auth/google/{connect,callback,status,disconnect}` e `/api/google/sync`. Frontend tem hook + banner + auto-sync a cada 2min. | **Nada committado** — risco de perder trabalho. Sem criptografia dos tokens. Sem UI para erros de sync. Sem suporte a múltiplas agendas (hardcoded "primary"). Sem histórico/conflito. Sync é one-shot, não streaming. |
| **Financeiro** | ❌ Ausente | — | Tudo: modelos, schemas, rotas, UI. Tela `finance` é placeholder no `appStore` (`activeScreen` aceita o valor, mas nenhum componente renderiza). User stories em `etapa2`. |
| **Ideias / Planos longos** | ❌ Ausente | — | Tudo. User stories em `etapa2`. |
| **Notificações** | ❌ Ausente | TopBar tem ícone decorativo. | Backend, scheduler, push, in-app toasts, regras de disparo. |
| **Configurações** | ❌ Ausente | — | Tela de settings inexistente; preferências hardcoded. |
| **Busca global** | ❌ Ausente | Kanban tem busca por título local. | Index full-text, busca cross-módulo. |

### 1.2. Endpoints existentes por módulo

**Kanban — `backend/app/routers/columns.py`, `cards.py`, `categories.py`:**
- `GET/POST /api/columns`; `PATCH /api/columns/reorder`; `PATCH/DELETE /api/columns/{id}`
- `GET/POST /api/cards`; `PATCH /api/cards/reorder`; `GET/PATCH/DELETE /api/cards/{id}`
- `GET/POST /api/categories`; `DELETE /api/categories/{id}`

**Calendário — `backend/app/routers/blocks.py`:**
- `GET /api/blocks` (filtro `?week_start=YYYY-MM-DD`)
- `POST /api/blocks`; `PATCH/DELETE /api/blocks/{id}`

**Foco — `backend/app/routers/sessions.py`:**
- `GET /api/sessions` (filtros `?active=true`, `?today=true`)
- `POST /api/sessions`
- `PATCH /api/sessions/{id}/heartbeat`; `PATCH /api/sessions/{id}/end`
- `DELETE /api/sessions/{id}` (descarta)

**Google (untracked — `backend/app/routers/auth_google.py`, `google_sync.py`):**
- `GET /api/auth/google/connect` (redirect)
- `GET /api/auth/google/callback`
- `GET /api/auth/google/status`
- `DELETE /api/auth/google/disconnect`
- `POST /api/google/sync?week_start=YYYY-MM-DD`

Autenticação: header `X-API-Key` exigido globalmente exceto `/health`, `/docs` e `/api/auth/google/*` (`backend/app/main.py:25-32`).

---

## 2. DÍVIDAS TÉCNICAS

**[ALTA] — Trabalho do Google Calendar não está committado**
Arquivo: `backend/alembic/versions/0002_google_calendar.py`, `backend/app/services/google_calendar.py`, `backend/app/routers/auth_google.py`, `backend/app/routers/google_sync.py`, `backend/app/models/oauth_token.py`, `frontend/src/hooks/useGoogleCalendar.ts`, `frontend/src/calendar/GoogleConnectBanner.tsx`
Problema: arquivos untracked há vários dias; nenhum commit em `git log` referencia FEAT-GOOGLE-CALENDAR. Risco direto de perda de trabalho num `git clean` ou checkout acidental.
Impacto: meio dia (ou mais) de implementação some.
Solução: revisar e committar com `feat(calendar): integração bidirecional com Google Calendar` antes de qualquer outra mudança.

**[ALTA] — Tokens OAuth armazenados em plaintext**
Arquivo: `backend/app/models/oauth_token.py`, `backend/alembic/versions/0002_google_calendar.py`
Problema: `access_token` e `refresh_token` ficam em `TEXT` puro no Postgres. Mesmo sendo single-user, um dump do banco compartilhado por engano (backup, screenshot do psql, repo demo) vaza acesso à agenda Google do usuário.
Impacto: vazamento de credencial Google se o `data/` for replicado, anexado em issue ou enviado para suporte.
Solução: criptografar simétrica em repouso com Fernet/AES-GCM (`cryptography` já é dep transitiva), com chave em env (`OAUTH_TOKEN_KEY`). Pode ser um helper get/set no model.

**[ALTA] — `recurrence` é fantasma**
Arquivo: `backend/app/models/block.py`, `frontend/src/calendar/NewBlockModal.tsx`, `frontend/src/types/calendar.ts`
Problema: o campo existe no schema e o select aparece na UI, mas backend não expande recorrência e o sync com Google ignora. Usuário pode "salvar semanal" sem que produza efeito algum.
Impacto: bug silencioso que vira reclamação ("marquei recorrente e não apareceu na semana seguinte").
Solução: ou (a) esconder o controle no UI até a Fase 2, ou (b) implementar expansão server-side com janela limitada. Recomendo (a) agora e (b) como módulo dedicado.

**[ALTA] — Convenção de timezone frágil e implícita**
Arquivo: `backend/app/routers/blocks.py:16-20`, `backend/app/services/google_calendar.py` (helpers `_to_utc_iso`, `_from_google_iso`), `backend/alembic/versions/0001_initial_schema.py`
Problema: migração cria colunas `TIMESTAMP WITH TIMEZONE`, mas o código grava/lê datetimes **naive UTC** por convenção. A conversão é feita à mão em pontos de borda; o filtro `?week_start=...` chega a comparar string ISO (`blocks.py:36`) em vez de datetime. Vai quebrar a primeira vez que alguém viajar de fuso ou um evento Google chegar com offset esquisito.
Impacto: blocos aparecem no dia errado; recovery de foco pode descartar sessão válida pela diferença de 3h.
Solução: padronizar com timezone-aware UTC no banco + conversão pra `America/Sao_Paulo` só na renderização. Um helper `dt_utils.py` centraliza.

**[MÉDIA] — Sem índices em FKs e colunas de ordenação**
Arquivo: `backend/alembic/versions/0001_initial_schema.py`
Problema: `cards.position`, `columns.position`, `cards.column_id`, `blocks.start_datetime`, `blocks.card_id`, `focus_sessions.card_id` não têm índices explícitos. Tudo passa por seq scan.
Impacto: ainda imperceptível em single-user com dezenas de cards, mas o filtro `GET /api/blocks?week_start=...` faz range query em coluna não indexada — vai degradar quando houver histórico longo + sync com Google trazendo centenas de eventos.
Solução: nova migração `0003_indexes` adicionando índices direcionados.

**[MÉDIA] — Sem validação de DB-level enums**
Arquivo: `backend/app/models/card.py` (`priority`), `backend/app/models/block.py` (`sync_status`), `backend/app/models/session.py` (`mode`)
Problema: tudo declarado como `String[N]`. Validação só na Pydantic. Insert direto via psql (ou bug em outro endpoint) pode meter "Alto" em vez de `"high"`.
Impacto: filtros, comparações e UI quebram silenciosamente.
Solução: converter para `ENUM` PostgreSQL via Alembic, ou adicionar `CHECK` constraints. Enum tem custo de migração maior; CHECK é mais simples e suficiente.

**[MÉDIA] — Backend não tem testes**
Arquivo: `backend/` (raiz)
Problema: não há diretório `tests/` no backend. Toda regra crítica (RN-FOC-02 sessão única, RN-KAN-09 última coluna, RN-CAL-06 `end > start`) é regressível sem aviso.
Impacto: refatoração e novas features são arriscadas; bug no Google sync passa para produção.
Solução: pytest + httpx async client + DB de teste isolado (testcontainers ou schema temp). Começar pelos invariantes de negócio listados no CLAUDE.md.

**[MÉDIA] — Sync com Google é one-shot e síncrono**
Arquivo: `backend/app/routers/google_sync.py`, `backend/app/routers/blocks.py:45-49`
Problema: criar/editar/deletar bloco chama API do Google dentro do request HTTP. Se Google demora 4s, o usuário espera. Se Google está fora, o block falha (`DELETE` retorna 502 hoje). Sem fila, sem retry, sem reconciliação.
Impacto: UX fica refém da latência do Google; erro transitório vira erro permanente no UI.
Solução: extrair para um worker em background (apscheduler já roda no processo, ou um endpoint `/api/google/sync/pending`). Marcar `sync_status="pending"` e reconciliar fora do request.

**[MÉDIA] — `useFocusTimer` pode vazar interval em re-renderizações estranhas**
Arquivo: `frontend/src/focus/useFocusTimer.ts`
Problema: a auditoria do frontend observou que o timer é dirigido por Zustand e mantém refs para callbacks. Em transições rápidas de tela (Kanban→Foco→Kanban) ainda em uso ativo, intervalos podem se sobrepor se `reset()` for chamado fora de ordem.
Impacto: heartbeat duplicado, contagem fora do ritmo.
Solução: revisar `useEffect` cleanup e adicionar testes de integração (`@testing-library/react` com `vi.useFakeTimers()`).

**[MÉDIA] — Componentes grandes com múltiplas responsabilidades**
Arquivo: `frontend/src/kanban/KanbanScreen.tsx`, `frontend/src/kanban/Drawer.tsx`
Problema: `KanbanScreen` (~250 linhas) acumula DnD context, modais de confirmação, filtros e CRUD. `Drawer` mistura sync de título/desc, detecção de bloco vinculado e delete inline.
Impacto: cada nova feature (ex.: linkar bloco do drawer, edição em batch) força mexer num arquivo já saturado.
Solução: extrair `ConfirmDeleteColumnModal`, `ConfirmDeleteCardSection`, `CardLinkedBlockHint` como componentes próprios.

**[MÉDIA] — Acessibilidade insuficiente**
Arquivo: `frontend/src/calendar/CalendarScreen.tsx`, `frontend/src/focus/FocusRing.tsx`, `frontend/src/kanban/Drawer.tsx`
Problema: a grade do calendário não tem `role="grid"`; `FocusRing` e `TimePie` não têm fallback textual; drawer/modal sem trap de foco; sem suporte a Escape em vários modais.
Impacto: usabilidade com teclado e leitor de tela ruim. Pode te incomodar pessoalmente se algum dia precisar usar sem mouse.
Solução: passada dedicada de acessibilidade — usar `radix-ui/react-dialog` ou `@react-aria` só nos modais para resolver foco + Escape de uma vez.

**[BAIXA] — Pequenas violações de tokens no CSS**
Arquivo: `frontend/src/kanban/KanbanScreen.module.css:62` (hex hardcoded `#f0d8cd`), `frontend/src/calendar/CalendarScreen.module.css:175` (rgba(250,236,231,0.32) literal), `frontend/src/components/Sidebar.module.css` (gradient marrom literal)
Problema: violam a regra do `CLAUDE.md` de não usar hex hardcoded em componentes.
Impacto: ajuste de tema fica em vários lugares.
Solução: trocar por `var(--color-*)`. Onde precisar de opacity, declarar uma nova variável (`--color-accent-bg-32`).

**[BAIXA] — Constantes mágicas espalhadas**
Arquivo: `backend/app/routers/sessions.py:11` (`MIN_SESSION_SECONDS=30`), `backend/app/routers/google_sync.py:30` (janela 7 dias), `backend/app/services/google_calendar.py` (scopes, `"primary"`)
Problema: regras de negócio embutidas no router. Trocar a janela vira hunt pelo arquivo certo.
Impacto: refatoração lenta.
Solução: centralizar em `backend/app/config.py` ou similar.

**[BAIXA] — Lógica "segunda-feira da semana" duplicada**
Arquivo: `frontend/src/calendar/CalendarScreen.tsx`, `frontend/src/dashboard/Dashboard.tsx` (e provavelmente outros)
Problema: cada tela reimplementa `getMondayOf(date)`.
Impacto: bug em um lugar não se propaga consertado.
Solução: extrair para `frontend/src/utils/date.ts`.

---

## 3. ROADMAP DE MÓDULOS

> Ordenado pelo retorno percebido sobre o ciclo central (ver → planejar → executar → registrar) e pelas dependências técnicas. Bugfixes pequenos abertos em `docs/BUGFIX-001.md` ficam fora desta lista — vão para a Próxima Sprint (§6).

### 1. Consolidação do Google Calendar (Fase 1.5)
- Prioridade no PRD: 2 (extensão de Calendário, módulo já priorizado)
- Complexidade: **M** (código existe, falta committar, criptografar tokens, melhorar UX de erros, escrever testes)
- Dependências técnicas: nenhuma; tudo está no repo (untracked).
- Conexões: Calendário (CRUD ↔ Google), Dashboard ("próximo bloco" puxa de blocks sincronizados).
- Decisões de produto pendentes: bidirecionalidade total ou Google-wins? (FEAT-GOOGLE-CALENDAR diz Google-wins, confirmar). Múltiplas agendas? Suporte a all-day events?
- Riscos técnicos: tokens em plaintext, sync síncrono dentro do request, sem retry, conversão TZ frágil.

### 2. Recorrência real de blocos
- Prioridade no PRD: 3 (citada em `etapa1` como Fase 2, mas campo já existe e UI já mostra)
- Complexidade: **L**
- Dependências técnicas: módulo de expansão de eventos (RRULE), normalização de timezone, suporte no sync Google (Google usa RRULE nativamente).
- Conexões: Calendário, Dashboard (próximo bloco), Foco (iniciar foco a partir de instância de bloco recorrente).
- Decisões de produto pendentes: expansão indefinida ou janela limitada? Editar uma instância vs toda a série?
- Riscos técnicos: complexidade clássica de calendários (exceções, edição de série). Sugiro adotar `python-dateutil` para RRULE e tratar exceções como `EXDATE`.

### 3. Notificações
- Prioridade no PRD: 3 (sino existe no Topbar, decorativo)
- Complexidade: **L** (toda a infra)
- Dependências técnicas: **job scheduler** (precisa existir antes — ver §5.3), serviço de envio (browser Push API + service worker para PWA, ou apenas in-app), regras de disparo (X min antes do bloco, fim de Foco).
- Conexões: Calendário (lembrete de bloco), Foco (fim de sessão fixa), Kanban (deadline próximo).
- Decisões de produto pendentes: só in-app ou também push do navegador? Email opcional?
- Riscos técnicos: PWA precisa HTTPS local (mkcert ou caddy) e isso choca com o "tudo local". Pode começar só in-app (toast persistente + badge no sino).

### 4. Financeiro
- Prioridade no PRD: 4 (Fase 2 explícita)
- Complexidade: **L**
- Dependências técnicas: novo módulo isolado; pode reaproveitar Categories. Considerar import de extratos (CSV/OFX) já no MVP do módulo.
- Conexões: Categories (mesmas categorias atravessam Kanban/Calendar/Finance?), Dashboard (slice de gasto por categoria).
- Decisões de produto pendentes: categorias compartilhadas ou paralelas com tasks? Lançamento manual ou import? Moeda (BRL fixo)?
- Riscos técnicos: dataset cresce rápido; precisa paginação e índices desde o dia 1.

### 5. Ideias / Planos longos
- Prioridade no PRD: 5 (Fase 2)
- Complexidade: **M**
- Dependências técnicas: tabela `ideas` (title, body, category, status); endpoint de "promover idéia → card".
- Conexões: Kanban (promoção); Dashboard opcional.
- Decisões de produto pendentes: hierarquia (ideia → projeto → cards) ou flat? Tags próprias?
- Riscos técnicos: baixos. É essencialmente um Kanban simplificado.

### 6. Boards/Projetos múltiplos no Kanban
- Prioridade no PRD: não explícita — surge naturalmente quando o board único saturar
- Complexidade: **M**
- Dependências técnicas: refator no schema (`column.board_id`), migração de dados existentes para "board padrão".
- Conexões: Kanban, Focus (picker passa a filtrar por board), Calendar (vínculo card↔block precisa carregar board).
- Decisões de produto pendentes: usuário quer múltiplos boards (Pessoal/Trabalho) ou prefere um só com filtros?
- Riscos técnicos: migração no banco — não destrutiva, mas requer cuidado com `position` por board.

---

## 4. INTEGRAÇÕES FUTURAS

**Google Tasks**
Valor: backlog do Kanban sincronizado com o app oficial de tasks do Android/iOS, possibilitando captura mobile.
Módulo beneficiado: Kanban.
Complexidade: **M** (mesmo SDK do Google Calendar já em uso).
Depende de: criptografia dos tokens OAuth (§2), abstração de escopo do OAuth (hoje hardcoded para Calendar).

**Apple/iCal (CalDAV)**
Valor: alternativa para quem não usa Google.
Módulo: Calendário.
Complexidade: **L**.
Depende de: refator do `google_calendar` service para abstrair um `CalendarProvider` (interface comum).

**Toggl / Clockify export**
Valor: registrar sessões de Foco como entradas de tempo num tracker profissional.
Módulo: Foco.
Complexidade: **S**.
Depende de: nada além de um token de API por provider em settings.

**Notion / Obsidian sync**
Valor: anotações ricas vinculadas a cards/ideias.
Módulo: Kanban, Ideias.
Complexidade: **L** (cada um tem API/storage diferentes).
Depende de: módulo de Ideias estar maduro; campo `notes` markdown nos cards.

**Bancos via Open Banking (Pluggy/Belvo)**
Valor: import automático de transações para o módulo Financeiro.
Módulo: Financeiro.
Complexidade: **XL**.
Depende de: módulo Financeiro existir; criptografia OAuth genérica; arquitetura de jobs em background.

**Backup criptografado em S3 / B2 / Drive**
Valor: peace of mind — perder o notebook não perde o histórico de vida.
Módulo: transversal.
Complexidade: **M**.
Depende de: job scheduler (§5.3); criptografia simétrica (já será introduzida em §2).

---

## 5. SAÚDE DA ARQUITETURA

### 5.1. O que vai travar com o crescimento

- **Sync síncrono e dentro do request HTTP** — `blocks.py` chama Google dentro de `POST/PATCH/DELETE` (`backend/app/routers/blocks.py:45-49` e similares). Quando o usuário tiver 200+ eventos por semana ou estiver com rede instável, cada operação fica refém da latência Google. Evidência: ausência de qualquer chamada `BackgroundTasks` ou fila no router.
- **Filtros por data via comparação de string** — `blocks.py:36` faz `CalendarBlock.start_datetime >= start.isoformat()`. Funciona enquanto convenção for naive UTC, mas vai produzir resultados sutilmente errados na primeira vez que a regra mudar. Evidência: `start.isoformat()` retorna string, comparação ordinal.
- **`total_focus_time` recalculado por escrita direta** — `sessions.py` faz `card.total_focus_time += elapsed` em vez de consolidar via agregação. Já funciona, mas em caso de bug de duplicação fica difícil reconciliar. Evidência: `backend/app/routers/sessions.py` (linhas próximas ao `end` endpoint).
- **Estado de Foco no client é o source-of-truth da contagem corrente** — Zustand mantém `elapsed`, e o backend só sabe o que recebeu no `/end`. Se o tab fechar sem fechar a sessão e o heartbeat não chegar, perde-se tempo. Evidência: `useFocusTimer.ts` + `focusStore.ts`.
- **Sem índices em FKs/sort columns** — `cards.position`, `blocks.start_datetime`, `focus_sessions.card_id` etc (§2 [MÉDIA] sobre índices). Evidência: ausência em `0001_initial_schema.py`.
- **Sem testes automatizados em backend** — toda mudança é "espero que funcione". Evidência: não há `backend/tests/`.
- **Estado do Calendário re-fetch redundante** — `CalendarScreen` e `Dashboard` ambos chamam `useBlocks` com `weekStart` diferentes; alternar rápido entre telas pode disparar várias queries da mesma semana. Evidência: auditoria do frontend, item 6 da seção de tech debt.

### 5.2. O que foi bem construído

- **Separação clara entre estado de servidor (TanStack Query) e estado de UI (Zustand)** — não há duplicação. Padrão pode (e deve) ser repetido em Financeiro, Ideias, Notificações.
- **Snapshots em `focus_sessions`** (`card_title_snapshot`, `card_cat_snapshot`) — protege a integridade histórica quando cards são deletados. Reaproveite em Financeiro (snapshot de descrição na hora do lançamento) e em Notificações (snapshot do título do bloco).
- **Índice único parcial `uq_active_session`** (`0001_initial_schema.py:94-96`) — solução elegante para garantir uma sessão ativa por vez no banco. Padrão pode ser reusado se houver "lançamento em edição" no Financeiro etc.
- **Hooks finos por entidade** (`useCards`, `useBlocks`, `useColumns`…) com invalidação consistente das queries — boa fundação para crescer.
- **Cascade/SET NULL pensadas** — `column→cards` cascade, `category→cards` SET NULL, `card→sessions` SET NULL com snapshot. Política consistente.
- **CSS tokens centralizados em `app.css`** — adesão >90% no código; basta consertar as poucas violações.
- **Auto-sync com pausa por visibility** (`useGoogleAutoSync`) — padrão elegante, considerar reuso para outras integrações.

### 5.3. O que está faltando (precisará nos próximos módulos)

- **Job scheduler / background worker** — necessário para Notificações, sync Google assíncrono, reconciliação de blocos pendentes, backup, expansão de recorrência. Quando: ao começar Notificações (Roadmap §3) ou ao remover a chamada Google do request (Tech debt §2). Recomendado: APScheduler dentro do processo FastAPI (não justifica Celery/Redis para single-user) **ou** um script `cron`-like dentro do container backend.
- **Sistema de notificações in-app** — modelos `notification` + endpoint `/api/notifications` + componente `Toast`/`NotificationCenter`. Quando: antes de qualquer feature de lembrete.
- **Helpers de timezone** — função canônica `to_user_tz(dt) -> dt` e `from_user_tz(dt) -> utc`. Quando: imediatamente; já é dívida.
- **Camada de configuração** — `backend/app/config.py` com pydantic-settings, expondo `MIN_SESSION_SECONDS`, `SYNC_WINDOW_DAYS`, `TIMEZONE`, `OAUTH_TOKEN_KEY`. Quando: ao começar a próxima feature.
- **Abstração de provider de calendário** — interface `CalendarProvider` (Google, Apple, ICS) para destravar §4 Apple/iCal. Quando: ao chegar a 2º provider.
- **Audit log / event log** — tabela `events` com ação + entidade + timestamp + snapshot. Quando: ao introduzir Financeiro (lançamentos exigem trilha) ou quando algum bug de "sumiu meu card" aparecer.
- **Frontend: error boundary + sistema de toasts** — hoje erros silenciam. Quando: antes de Notificações; é o mesmo componente base.
- **Frontend: biblioteca de validação (zod/valibot)** — para formulários crescerem sem regredir. Quando: ao introduzir Financeiro.
- **i18n scaffolding** — strings ainda hardcoded em pt-BR; mesmo que single-language por enquanto, criar `t('chave')` evita reescrita futura. Quando: opcional; menor prioridade.
- **Atalhos de teclado + foco trap em modais** — hoje só Enter/Esc em alguns lugares. Quando: junto da passada de acessibilidade.

---

## 6. PRÓXIMA SPRINT

> Critério: máximo de retorno sobre o estado atual, desbloqueando trabalho futuro. As 6 tasks abaixo cobrem (a) salvar o trabalho não-committado, (b) consertar bugs visíveis no MVP, (c) endurecer a fundação para a próxima feature.

| # | Título | Módulo | Descrição | Estimativa | Bloqueadores |
|---|---|---|---|---|---|
| 1 | Committar e fechar FEAT-GOOGLE-CALENDAR | Calendário/Google | Revisar untracked, rodar migração local (`alembic upgrade head`), validar fluxo end-to-end (connect→sync→edit→delete), commit em pequenos pedaços (migração; service+routers; main.py+exempt; frontend hook+banner; CalBlock badge). | 0.5 dia | Nenhum |
| 2 | BUGFIX-001 — Deletar card + duração no Foco | Kanban, Foco | Implementar exatamente o spec em `docs/BUGFIX-001.md` (deleção inline no Drawer + reposicionar `durSection` para fora de `.stage`). | 0.5 dia | #1 ideal (evita rebase) |
| 3 | Criptografar tokens OAuth + helper TZ | Plataforma | Adicionar `OAUTH_TOKEN_KEY` em env, criptografar `access_token`/`refresh_token` em repouso (Fernet), criar `backend/app/utils/datetime.py` com `to_utc`, `from_utc`, `week_window(date, tz)`. Refatorar `blocks.py` e `google_sync.py` para usar o helper. | 1 dia | #1 (precisa do código de Google committado) |
| 4 | Esconder UI de `recurrence` (ou marcar como "em breve") | Calendário | Remover o select de recorrência do `NewBlockModal` (ou disable + tooltip "em breve"). Backend mantém o campo. | 1h | Nenhum |
| 5 | Migração 0003 — índices direcionados | Plataforma | Criar índices em `cards.column_id`, `cards.position`, `blocks.start_datetime`, `blocks.card_id`, `focus_sessions.card_id`. Concurrent index se possível. | 2h | Nenhum |
| 6 | Testes pytest para invariantes críticos | Plataforma | Setup pytest + httpx + DB de teste. Casos mínimos: RN-FOC-02 (sessão única), RN-KAN-09 (última coluna), RN-CAL-06 (`end>start`), RN-KAN-04 (categorias default). | 1 dia | #1 (para não cobrir só pré-Google) |

Total estimado: **3.5 dias** focados.

---

## 7. PERGUNTAS PARA O PRODUTO

1. **Google Calendar — bidirecionalidade total ou Google-wins?** `FEAT-GOOGLE-CALENDAR.md` diz "Google sempre vence" em conflito. Isso significa que editar um bloco Google no LifeOrg **não** propaga de volta? Ou propaga, mas a próxima sync sobrescreve se houver conflito? Preciso confirmar para definir a UX de "este bloco veio do Google" (read-only, hint, ou totalmente editável).
2. **Suporte a múltiplas agendas Google ou só `primary`?** Hoje hardcoded. Se sim, virá no MVP do módulo ou Fase 2?
3. **`recurrence`: esconder agora ou implementar?** O campo já existe na UI e no banco. Opção A: esconder/disable até virar feature dedicada (rápido, honesto). Opção B: implementar expansão básica (semanal/diária) já. Recomendo A.
4. **Boards/Projetos no Kanban — quando?** Em algum momento o board único satura. Você prefere (a) board único com tags/projetos como dimensão extra, ou (b) múltiplos boards independentes (Pessoal / Trabalho)?
5. **Categorias compartilhadas com o módulo Financeiro?** As 3 padrão (Pessoal/Trabalho/Estudo) fazem sentido para tasks; para finanças geralmente são outras dimensões (Comida/Transporte/Lazer). Compartilhamos a mesma tabela com flag de "tipo", ou tabelas paralelas?
6. **Timezone fixo (`America/Sao_Paulo`) ou seguir o do navegador?** A `FEAT-GOOGLE-CALENDAR.md` menciona SP. Se o usuário viajar, o que esperamos? Tudo continua em SP, ou tudo passa a aparecer no fuso local?
7. **Notificações: só in-app ou Push do navegador também?** Push exige HTTPS no localhost (mkcert) e service worker. In-app (toast + badge) é simples e cobre 80% do uso.
8. **Backup / export — algum compromisso de "nunca perder histórico"?** Se sim, isso vira requisito de arquitetura (audit log + backup automático). Se não, fica como nice-to-have.
9. **`time_estimate` e `checklist` do card — vamos usar ou remover?** Ambos existem no schema mas não no UI. Manter cobra atenção (validação, retro-compatibilidade). Remover simplifica.

---

## RESUMO EXECUTIVO (3 pontos)

1. **Maior risco que encontrei:** todo o trabalho de Google Calendar (migração 0002, service, routers, hook, banner) está untracked — meio dia de implementação a um `git clean` de distância.
2. **Task que recomendo começar primeiro:** committar e fechar FEAT-GOOGLE-CALENDAR (em commits pequenos), porque trava o resto da sprint e remove o risco acima.
3. **Decisão de produto mais urgente:** Google Calendar — bidirecionalidade ("Google sempre vence" significa que blocos importados são editáveis no LifeOrg ou não?). Sem essa resposta, a UX de blocos sincronizados fica em limbo.
