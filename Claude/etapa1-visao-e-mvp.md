# PRD — Etapa 1: Visão do Produto e MVP

---

## 1.1 Visão do Produto

**Conceito central:**
Um sistema operacional da vida pessoal — uma aplicação web minimalista e centralizada que conecta o planejamento de alto nível com a execução diária. A plataforma elimina a fragmentação entre ferramentas ao unir, em um único ambiente, o controle da rotina, a gestão de tarefas e o foco na execução.

**Para quem:**
Uso pessoal exclusivo. Aplicação single-user, sem necessidade de cadastro, autenticação múltipla ou funcionalidades colaborativas. Um único usuário, um único dispositivo, um único ambiente de trabalho.

**Filosofia de design:**
Interface editorial, quente e respirável. Superfície off-white (`#F1EFE8`), acento em coral (`#CC5200`), tipografia com mix editorial serif (títulos) + sans-serif (corpo) + mono (numerais). O produto deve sentir como _claude.ai_, não como Notion ou Linear. A identidade visual é definida integralmente no `DESIGN_SPEC.md` — esse documento é a fonte de verdade visual e prevalece sobre qualquer outra descrição de UI.

---

## 1.2 O que é o MVP e por que essas 3 prioridades

O problema central da aplicação é: **a desconexão entre planejar e executar**. O usuário sabe o que precisa fazer (Kanban), sabe quando tem tempo disponível (Calendário), mas na hora de sentar e trabalhar, não há uma estrutura que una os dois e mantenha o foco (Cronômetro).

Por isso, as prioridades 1, 2 e 3 formam juntas o núcleo insubstituível do produto. As prioridades 4 e 5 (Financeiro e Ideias) são poderosas, mas não alteram a dinâmica do dia a dia — ficam para a Fase 2.

---

## 1.3 Escopo do MVP

### ✅ Módulo 1 — Kanban

**O que entra no MVP:**
- Colunas renomeáveis, reordenáveis, criáveis e excluíveis pelo usuário
- Cards com os seguintes campos:
  - Título *(obrigatório)*
  - Descrição
  - Categoria (padrões: Pessoal, Trabalho, Estudo — com opção de criar novas)
  - Prazo / Data de entrega
  - Nível de prioridade (Alta, Média, Baixa)
  - Checklist de subtarefas
  - Estimativa de tempo
  - Tempo total de foco registrado *(preenchido automaticamente pelo Módulo 3)*
- Cards arrastáveis entre colunas (drag-and-drop via @dnd-kit)
- Drawer lateral de detalhes com edição inline (autosave — sem botão "Salvar")
- Filtro por categoria e busca por nome do card
- Vinculação de um card a um bloco do Calendário

**Fora do MVP:**
- Etiquetas/tags adicionais além das categorias
- Anexos de arquivos

---

### ✅ Módulo 2 — Calendário de Rotina

**O que entra no MVP:**
- Criação, edição e exclusão de blocos de tempo via modal
- Visão semanal (7 colunas × horas de 06:00 a 23:00)
- Navegação entre semanas (chevrons ‹ ›)
- Diferenciação visual dos blocos por categoria (trabalho / estudo / pessoal)
- Vincular um card do Kanban a um bloco de tempo
- Now-line em coral mostrando o horário atual

**Fora do MVP:**
- Drag-and-drop de blocos para reorganizar (Fase 2)
- Visões de dia e mês (Fase 2)
- Blocos recorrentes realmente expandidos em múltiplas semanas
- Notificações e integração com Google Calendar

---

### ✅ Módulo 3 — Controle de Foco

**O que entra no MVP:**
- Seleção de um card do Kanban (obrigatório) para iniciar sessão
- Dois modos:
  - **Modo Fixo (timer countdown):** duração configurável (15 / 25 / 45 / 60 min ou valor customizado). Ring SVG animado. Auto-encerramento ao atingir o tempo.
  - **Modo Livre (cronômetro):** início e parada manuais, contagem crescente, ring estático. Badge "● Cronômetro livre" visível.
- Pausa / Retomada durante sessão ativa
- Encerramento manual (registra tempo parcial se ≥ 30 s)
- Ao finalizar ou encerrar, o tempo é somado ao `total_focus_time` do card no banco
- Histórico do dia (footer fixo): chips de sessões, total acumulado
- Recuperação de sessão interrompida (fechamento de aba/navegador): ao reabrir, exibir opção de contabilizar ou descartar

**Fora do MVP:**
- Notificações sonoras/visuais de fim de sessão
- Relatórios e gráficos históricos (Fase 2)

---

## 1.4 Dashboard (Fase 1 — após os três módulos)

O Dashboard é a tela de entrada. Ele é construído **depois** que Kanban, Calendário e Foco estiverem funcionais, pois depende de dados reais de todos eles.

Conteúdo do Dashboard:
- Strip de 3 métricas: Tarefas hoje, Foco acumulado, Próximo bloco
- Gráfico de distribuição de tempo por categoria (donut/pizza, toggleável)
- Preview do Kanban (3 colunas, cards mini)
- Agenda do dia (fatias de tempo com blocos por categoria e now-line)

---

## 1.5 Fora do Escopo do MVP (Fase 2)

| Prioridade | Módulo | Motivo do adiamento |
|---|---|---|
| 4 | Planilha Financeira | Não impacta o ciclo planejar → executar do dia a dia |
| 5 | Controle de Ideias e Planos de Longo Prazo | Complementa a visão macro, mas não é bloqueante para o uso diário |
| — | Drag-and-drop no Calendário | Complexidade alta, baixo impacto para o MVP |
| — | Visões dia/mês no Calendário | A visão semanal cobre o fluxo diário do MVP |
| — | Notificações sonoras/visuais | Requer integração externa; complexidade desproporcional |
| — | Relatórios históricos de Foco | Valioso, mas não essencial para o fluxo central |
| — | Autenticação / Login | Single-user em dispositivo único; sem necessidade no MVP |
| — | Modo offline (PWA) | A arquitetura deve suportá-lo futuramente sem reescrita; não implementar no MVP |

---

## 1.6 A Jornada Central do Usuário no MVP

> *"Acordo segunda-feira, abro o sistema, vejo no **Calendário** que tenho 2h livres à tarde. Acesso o **Kanban**, pego o card mais prioritário da categoria Trabalho, e o vinculo àquele bloco de tempo. Às 14h, abro o card, ativo o **Cronômetro de Foco**, e trabalho. Ao terminar, o card já mostra que gastei 1h45min nele. Volto ao **Dashboard** e vejo o progresso do dia."*

Esse fluxo completo — **ver → planejar → executar → registrar** — é o coração do MVP.

---

## 1.7 Ordem de Implementação

A ordem de desenvolvimento deve seguir exatamente esta sequência, pois cada etapa desbloqueia a próxima:

1. **Fundação** — Docker Compose, PostgreSQL, FastAPI skeleton, React + Vite shell, tokens CSS, componentes App Shell (Sidebar + Topbar)
2. **Módulo Kanban** — backend CRUD completo + frontend com drag-and-drop e drawer
3. **Módulo Calendário** — backend CRUD + frontend visão semanal + modal "Novo Bloco"
4. **Módulo Foco** — backend sessões + frontend timer + ring + histórico + recuperação de sessão interrompida
5. **Integração cross-screen** — "Iniciar Foco" do Kanban, "Ver Card" do Foco, vínculo Card↔Bloco
6. **Dashboard** — métricas reais, agenda, preview Kanban

> Referência para regras de negócio: consultar `etapa3-regras-e-casos-de-uso.md`.
> Referência visual definitiva: `DESIGN_SPEC.md` + `LifeOrg Shell.html`.
