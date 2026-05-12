# LifeOrg — instruções para agentes

> Memória de projeto compartilhada. Mantenha este arquivo curto, específico e
> estável; detalhes longos de implementação ficam nos documentos referenciados.
> Última atualização: 2026-05-11.

## Contexto do projeto

- LifeOrg é um sistema operacional pessoal single-user, local-first, com fluxo:
  ver no Dashboard -> planejar no Kanban/Calendário -> executar no Foco ->
  registrar métricas no Dashboard.
- Stack: React 18 + TypeScript + Vite + CSS Modules, Zustand, TanStack Query v5,
  FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2 e PostgreSQL 16 via Docker Compose.
- A raiz operacional do repositório é
  `/Users/tiagoseemann/Projetos/LifeOrg/LifeOrg`.
- O código da aplicação fica em `frontend/`, `backend/`, `scripts/`,
  `docker-compose.yml` e arquivos de configuração na raiz.

## Fontes de verdade

- Visão rápida, setup, arquitetura corrente e comandos: `README.md`.
- Regras de negócio e casos de uso: `Claude/etapa3-regras-e-casos-de-uso.md`.
- Arquitetura, banco, rotas e contratos: `Claude/etapa4-arquitetura-e-stack.md`.
- Referência visual definitiva: `Claude/DESIGN_SPEC.md`.
- Protótipo visual de referência: `Claude/LifeOrg Shell.html`.
- Backlog/specs de tarefa:
  - Agora: `docs/BUGFIX-001.md`.
  - Depois dos bugs: `docs/FEAT-GOOGLE-CALENDAR.md`.

Quando documentos conflitarem, priorize regras de negócio, depois arquitetura/API,
depois escopo de MVP e por fim referências visuais. Antes de aplicar snippets de
docs longos, valide contra o código real.

## Como trabalhar

- Antes de editar, leia os arquivos relevantes no repo atual; não assuma que
  planos antigos em `docs/` ainda batem 1:1 com a implementação.
- Use `rg`/`rg --files` para localizar código e mantenha mudanças pequenas e
  focadas no pedido.
- Não copie specs grandes para este arquivo nem use imports automáticos `@` para
  docs extensos; consulte-os sob demanda.
- Não introduza Tailwind; a UI usa CSS Modules e tokens globais em
  `frontend/src/app.css`.
- Toda string visível da UI deve estar em pt-BR e seguir o copy/formatação do
  `DESIGN_SPEC.md` quando houver referência.
- Tudo que for dado persistente deve ir para PostgreSQL; evite estado in-memory
  como fonte de verdade.
- Nunca commite `.env`, `data/`, `node_modules/`, `dist/`, caches ou segredos.
  Use `.env.example` como referência pública de variáveis.

## Comandos úteis

```bash
cd /Users/tiagoseemann/Projetos/LifeOrg/LifeOrg

./scripts/dev.sh              # sobe a aplicação
./scripts/dev.sh build        # reconstrói imagens e sobe
./scripts/dev.sh logs         # acompanha logs
./scripts/dev.sh stop         # para containers
./scripts/dev.sh down         # remove containers

docker compose exec backend alembic upgrade head
docker compose build backend
```

- O frontend fica na porta definida por `FRONTEND_PORT`; consulte `.env` ou a
  mensagem do `./scripts/dev.sh`.
- O backend roda internamente no Compose e é acessado pelo frontend via proxy
  Vite em `/api`.
- Swagger pode exigir exposição/porta adequada do backend; consulte o Compose
  atual antes de prometer uma URL externa.

## Regras críticas

- Categorias padrão Pessoal, Trabalho e Estudo não podem ser deletadas.
- Nunca deletar a última coluna do Kanban.
- Deletar coluna com cards exige confirmação e faz cascade dos cards.
- Deletar bloco de calendário não deleta card vinculado.
- `end_datetime` deve ser estritamente posterior a `start_datetime`.
- Só pode existir uma sessão de foco ativa por vez.
- Sessão encerrada com menos de 30 segundos é descartada para métricas.
- Heartbeat de foco ocorre a cada 30 segundos; sessão sem heartbeat por 24h é
  abandonada.
- Backend recebe `elapsed_seconds` líquido; tempo pausado não conta.
- `total_focus_time` é somente leitura para a UI e só o sistema incrementa.

## Design e frontend

- Acento principal: coral `#CC5200`; não trocar por azul, roxo ou índigo.
- Base visual: `#F1EFE8`; dark `#1E1C1A` apenas onde o design especificar.
- Use tokens CSS já declarados; não hardcode hex em componentes novos.
- Tipografia: display serif para títulos, sans para corpo e mono para timers,
  horários, durações e métricas numéricas.
- Separadores usam `0.5px`; `1px` fica reservado para foco/estados especiais.
- Sombras devem seguir tokens ou `rgba(30,28,26,...)`, não `rgba(0,0,0,...)`.

## Commits

- Use mensagens em português com Conventional Commits:
  - `fix(modulo): descricao`
  - `feat(modulo): descricao`
  - `chore: descricao`
