# LifeOrg: o que o Claude fez e onde as coisas estao

Este documento explica o estado atual do projeto depois do trabalho do Claude. Ele nao muda codigo, nao implementa feature e nao substitui os documentos de produto. A ideia aqui e servir como um mapa para voce entender o que existe, o que foi planejado, o que foi implementado e como continuar sem perder trabalho.

## Resumo curto

O projeto esta dividido em duas partes importantes:

- `main`: contem principalmente documentos de produto, especificacao visual e planos de implementacao.
- `.worktrees/feature-mvp`: contem uma worktree Git separada na branch `feature/mvp`, onde Claude comecou a implementar a fundacao tecnica do app.

No `main`, Claude adicionou planos detalhados em `docs/superpowers/plans/`. Esses planos descrevem como construir o MVP em etapas.

Na worktree `feature/mvp`, Claude ja implementou uma parte da fundacao: Docker Compose, backend FastAPI inicial, modelos SQLAlchemy, migracao Alembic inicial, seed de dados basicos, rota de health check e scaffold inicial do frontend Vite.

O produto completo ainda nao esta pronto. Kanban, Calendario, Foco e Dashboard ainda estao majoritariamente no nivel de plano ou prototipo, nao como aplicacao final integrada.

## Mapa do repositorio

A pasta externa `/Users/tiagoseemann/Projetos/LifeOrg` nao e o repositorio Git real. O repositorio fica dentro de:

```text
/Users/tiagoseemann/Projetos/LifeOrg/LifeOrg
```

O estado atual do Git mostra:

```text
main                         -> branch principal
.worktrees/feature-mvp       -> worktree ligada a branch feature/mvp
```

Para confirmar isso:

```sh
cd /Users/tiagoseemann/Projetos/LifeOrg/LifeOrg
git worktree list
```

Hoje existem duas linhas de trabalho:

- `main`: esta apontando para um commit que ajusta `.gitignore` para ignorar `.worktrees/`.
- `feature/mvp`: esta dentro de `.worktrees/feature-mvp` e contem commits de implementacao.

## O que existe no `main`

No `main`, o projeto ainda e principalmente uma especificacao.

Arquivos principais:

- `CLAUDE.md`: briefing de engenharia. Define a hierarquia das fontes de verdade, stack, design rules, persistencia e ordem de implementacao.
- `README.md`: descricao minima do projeto.
- `Claude/etapa1-visao-e-mvp.md`: visao do produto e escopo do MVP.
- `Claude/etapa2-requisitos.md`: user stories e requisitos nao funcionais.
- `Claude/etapa3-regras-e-casos-de-uso.md`: regras de negocio e fluxos importantes.
- `Claude/etapa4-arquitetura-e-stack.md`: arquitetura planejada, banco, API e estrutura de pastas.
- `Claude/DESIGN_SPEC.md`: especificacao visual definitiva.
- `Claude/LifeOrg Shell.html`: prototipo HTML interativo com React via CDN.

Claude tambem criou estes planos:

```text
docs/superpowers/plans/2026-05-08-01-fundacao.md
docs/superpowers/plans/2026-05-08-02-kanban.md
docs/superpowers/plans/2026-05-08-03-calendario-foco.md
docs/superpowers/plans/2026-05-08-04-integracao-dashboard.md
```

Esses arquivos sao planos de execucao. Eles nao significam que tudo ja foi implementado. Eles funcionam como uma receita para agentes ou engenheiros seguirem passo a passo.

O `git status --short` no `main` mostra varios arquivos como untracked:

```text
?? CLAUDE.md
?? Claude/
?? docs/
```

Isso significa que esses arquivos existem no disco, mas ainda nao foram commitados no `main`.

## O que existe na worktree `feature/mvp`

A worktree fica em:

```text
/Users/tiagoseemann/Projetos/LifeOrg/LifeOrg/.worktrees/feature-mvp
```

Ela esta na branch:

```text
feature/mvp
```

O status dessa worktree esta limpo, ou seja, nao ha mudancas pendentes nela no momento da revisao.

Para entrar nela:

```sh
cd /Users/tiagoseemann/Projetos/LifeOrg/LifeOrg/.worktrees/feature-mvp
```

Para ver os commits que Claude fez:

```sh
git log --oneline --decorate --max-count=20
```

Os commits mostram esta sequencia de trabalho:

```text
chore: project scaffold — docker compose + env template
chore: backend dockerfile + requirements
feat(backend): database engine + all ORM models
feat(backend): alembic + initial schema migration with seeds
feat(backend): FastAPI app + CORS + API key middleware + health route
chore: migration verified — 5 tables + seeds ok
fix(backend): uq_active_session must use constant expression to enforce single active session
fix(backend): fail-fast on missing API_SECRET_KEY + move --reload to compose override
chore(frontend): dockerfile + package.json + vite config + index.html with SVG library
```

Em termos praticos, Claude implementou a fundacao, mas nao o app completo.

## Fundacao implementada

### Docker Compose

Arquivo principal:

```text
docker-compose.yml
```

Ele define tres servicos:

- `frontend`: Vite/React em `localhost:3000`.
- `backend`: FastAPI em `localhost:8000`.
- `database`: PostgreSQL 16 em `localhost:5432`.

O backend depende do banco ficar saudavel antes de subir. O banco usa volume local em `data/postgres`, entao os dados sobrevivem entre reinicios dos containers.

### Variaveis de ambiente

Arquivos:

```text
.env.example
.env
```

O `.env.example` documenta as variaveis esperadas. O `.env` existe localmente para rodar Docker e nao deve ser commitado.

Variaveis importantes:

- `API_SECRET_KEY`: chave usada para proteger a API.
- `DATABASE_URL`: string de conexao do backend com PostgreSQL.
- `VITE_API_URL`: URL da API para o frontend.
- `VITE_API_KEY`: chave usada pelo frontend para chamar o backend.

### Backend FastAPI

Arquivos principais:

```text
backend/app/main.py
backend/app/database.py
backend/app/routers/health.py
```

O backend ja tem:

- app FastAPI com titulo `LifeOrg API`;
- CORS liberado para `http://localhost:3000`;
- middleware que exige `X-API-Key` nas rotas protegidas;
- excecoes para `/health`, `/docs`, `/openapi.json` e `/redoc`;
- rota de health check.

Importante: `API_SECRET_KEY` e lida com `os.environ["API_SECRET_KEY"]`. Isso e intencionalmente fail-fast: se a variavel nao existir, o backend quebra ao iniciar em vez de rodar inseguro.

### Banco e modelos SQLAlchemy

Arquivos principais:

```text
backend/app/models/category.py
backend/app/models/column.py
backend/app/models/card.py
backend/app/models/block.py
backend/app/models/session.py
```

Claude criou modelos para cinco tabelas:

- `categories`
- `kanban_columns`
- `kanban_cards`
- `calendar_blocks`
- `focus_sessions`

Essas tabelas representam o modelo central do produto:

- categorias sao usadas por cards e blocos;
- colunas contem cards;
- cards representam tarefas;
- blocos representam horarios no calendario;
- sessoes registram tempo de foco em cards.

### Migracao Alembic

Arquivo principal:

```text
backend/alembic/versions/0001_initial_schema.py
```

A migracao cria as cinco tabelas e tambem faz seeds iniciais.

Seeds criados:

- categorias: `Pessoal`, `Trabalho`, `Estudo`;
- colunas: `A fazer`, `Em progresso`, `Concluido`.

Ponto de atencao: os documentos originais citam categorias padrao `Pessoal`, `Trabalho`, `Faculdade`, mas a migracao usa `Estudo`. Isso pode ser uma decisao de design/prototipo ou uma divergencia a revisar antes de continuar.

Outro ponto importante: a migracao cria um indice unico parcial em `focus_sessions` para garantir que so exista uma sessao ativa por vez:

```sql
CREATE UNIQUE INDEX uq_active_session
ON focus_sessions ((true))
WHERE ended_at IS NULL
```

Isso e uma boa protecao de banco para a regra de negocio: apenas uma sessao de foco ativa por vez.

### Frontend Vite

Arquivos principais:

```text
frontend/package.json
frontend/Dockerfile
frontend/index.html
frontend/tsconfig.json
frontend/vite.config.ts
```

O frontend foi scaffoldado com:

- React 18;
- TypeScript;
- Vite;
- TanStack Query;
- Zustand;
- `@dnd-kit`;
- SVG symbol library no `index.html`.

Ainda nao existem os componentes reais do app em `frontend/src/`. O frontend esta preparado, mas a interface React ainda precisa ser portada do prototipo `Claude/LifeOrg Shell.html` para arquivos reais.

## O que ainda e plano, nao implementacao

Os planos 2, 3 e 4 descrevem funcionalidades que ainda precisam ser implementadas.

### Kanban

Planejado:

- CRUD de categorias, colunas e cards;
- drag-and-drop com `@dnd-kit`;
- drawer lateral com autosave;
- filtros e busca;
- persistencia de posicoes no backend.

Status atual: planejado, mas nao implementado na worktree.

### Calendario

Planejado:

- visao semanal;
- criacao/edicao/exclusao de blocos;
- now-line coral;
- categorias visuais;
- persistencia em PostgreSQL.

Status atual: planejado, mas nao implementado na worktree.

### Foco

Planejado:

- timer fixo;
- modo livre;
- ring SVG;
- picker de card;
- historico do dia;
- recuperacao de sessao interrompida.

Status atual: modelo de banco existe, mas API e UI ainda nao estao implementadas.

### Dashboard

Planejado:

- metricas reais;
- grafico de tempo;
- preview do Kanban;
- agenda do dia.

Status atual: existe no prototipo HTML, mas nao na aplicacao React real.

## Como o prototipo se encaixa nisso

O arquivo:

```text
Claude/LifeOrg Shell.html
```

e um prototipo interativo. Ele usa React via CDN dentro de um HTML unico, com CSS embutido e dados mockados.

Ele contem a referencia visual e comportamental para:

- Sidebar;
- TopBar;
- Dashboard;
- Kanban;
- Drawer;
- Calendario semanal;
- modal de novo bloco;
- tela de Foco;
- timer e ring.

Esse arquivo nao e a aplicacao final. Ele e uma implementacao de referencia para ser portada para:

```text
frontend/src/
```

Ou seja: quando alguem implementar o frontend real, deve copiar o comportamento e visual do shell HTML, mas separar em componentes React, CSS Modules, hooks e stores.

## Pontos de revisao que eu observaria antes de continuar

1. **Arquivos untracked no `main`**

   `CLAUDE.md`, `Claude/` e `docs/` aparecem como nao commitados no `main`. Se esses documentos sao a fonte de verdade, faz sentido commitar antes de continuar.

2. **Divergencia `Faculdade` vs `Estudo`**

   Os documentos mencionam `Faculdade` como categoria padrao em alguns pontos, mas a migracao cria `Estudo`. Antes de implementar Kanban e Calendario, escolha uma nomenclatura final.

3. **Frontend ainda nao tem `src/` real**

   O pacote Vite existe, mas os componentes do app ainda nao. A proxima etapa natural e criar `frontend/src/app.css`, `main.tsx`, `App.tsx`, Sidebar, TopBar e placeholders.

4. **Rotas de dominio ainda nao existem**

   O backend so tem fundacao e health check. Ainda faltam routers e schemas para categorias, colunas, cards, blocos e sessoes.

5. **Sem testes automatizados visiveis**

   Nao encontrei suite de testes configurada. Por enquanto, a verificacao parece ter sido manual via Docker/migracao.

6. **Dados locais de PostgreSQL existem**

   A worktree tem `data/postgres/`, indicando que o banco ja foi inicializado localmente. Isso e normal para desenvolvimento, mas nao deve ser commitado.

7. **`.env` existe localmente**

   Tambem e esperado. Nao deve ser commitado.

## Como continuar com seguranca

Primeiro, veja o estado do `main`:

```sh
cd /Users/tiagoseemann/Projetos/LifeOrg/LifeOrg
git status --short
```

Depois, veja o estado da worktree:

```sh
cd /Users/tiagoseemann/Projetos/LifeOrg/LifeOrg/.worktrees/feature-mvp
git status --short
git log --oneline --decorate --max-count=20
```

Para rodar a implementacao da worktree:

```sh
cd /Users/tiagoseemann/Projetos/LifeOrg/LifeOrg/.worktrees/feature-mvp
docker compose up
```

Depois teste:

```sh
curl http://localhost:8000/health
```

E abra:

```text
http://localhost:3000
```

Se for continuar a implementacao, eu faria nesta ordem:

1. Commitar os documentos de produto e planos no `main`, se voce quiser preserva-los oficialmente.
2. Continuar na branch `feature/mvp`.
3. Finalizar o Plano 1: criar `frontend/src/` com shell React real e tokens CSS.
4. So depois implementar Kanban.
5. Depois Calendario e Foco.
6. Por ultimo, Dashboard com dados reais.

## Modelo mental

Pense no projeto assim:

```text
Claude/*.md                 -> o que o produto deve ser
Claude/LifeOrg Shell.html   -> como o produto deve parecer e se comportar
docs/superpowers/plans/     -> como implementar por etapas
.worktrees/feature-mvp      -> onde Claude comecou a transformar plano em codigo
```

O trabalho atual e uma boa fundacao, mas ainda esta no comeco. A parte mais valiosa que Claude deixou foi a separacao clara entre especificacao, planos e worktree de implementacao. Isso torna bem mais seguro continuar sem misturar experimento com a branch principal.
