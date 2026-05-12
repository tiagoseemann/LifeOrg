# PRD — Etapa 3: Regras de Negócio e Casos de Uso

---

## 3.1 Regras de Negócio

As regras abaixo são as leis internas do sistema. O desenvolvedor deve implementá-las exatamente como descritas.

---

### RN — Módulo Kanban

| ID | Regra |
|---|---|
| RN-KAN-01 | Não existe limite de colunas nem de cards por coluna. |
| RN-KAN-02 | O título é o único campo obrigatório de um card. Todos os demais campos são opcionais. |
| RN-KAN-03 | Ao excluir uma coluna que contém cards, o sistema deve exibir um alerta informando quantos cards serão perdidos e solicitar confirmação explícita do usuário antes de prosseguir. Se confirmado, a coluna e todos os seus cards são excluídos permanentemente. Cards vinculados a blocos do calendário têm seus blocos excluídos automaticamente junto (via cascade no banco). |
| RN-KAN-04 | As três categorias padrão (Pessoal, Trabalho, Estudo) não podem ser renomeadas nem excluídas. Categorias criadas pelo usuário podem ser renomeadas e excluídas. |
| RN-KAN-05 | Ao excluir uma categoria personalizada, os cards que a utilizam não são excluídos — eles ficam com `category_id = NULL` (sem categoria atribuída). |
| RN-KAN-06 | O campo `total_focus_time` de um card é somente leitura para o usuário — ele só pode ser incrementado pelo sistema via encerramento de sessão de foco. O usuário não pode editá-lo manualmente. |
| RN-KAN-07 | A posição (ordem) dos cards dentro de cada coluna e a posição das colunas no board devem ser persistidas. Após um drag-and-drop, o backend deve ser atualizado imediatamente com as novas posições. O endpoint de reorder é transacional e rejeita posições duplicadas dentro do mesmo escopo. |
| RN-KAN-08 | Títulos de cards e colunas são sempre armazenados com whitespace removido nas extremidades (trim). Um título vazio após trim é inválido — a operação é rejeitada. |
| RN-KAN-09 | Não é possível excluir a última coluna do board. O sistema deve ter sempre ao menos uma coluna. |
| RN-KAN-10 | Um card pode estar vinculado a no máximo um bloco do calendário por vez. Ao vincular um card a um novo bloco, o vínculo anterior é removido automaticamente (o bloco antigo passa a ter `card_id = NULL`). |

---

### RN — Módulo Calendário

| ID | Regra |
|---|---|
| RN-CAL-01 | Um bloco do calendário pode existir sem estar vinculado a nenhum card do Kanban (`card_id = NULL`). |
| RN-CAL-02 | Um card do Kanban pode estar vinculado a no máximo um bloco do calendário por vez. |
| RN-CAL-03 | Ao excluir um card do Kanban que possui um bloco de calendário vinculado, o bloco do calendário é excluído automaticamente junto (cascade). Nenhuma confirmação adicional é necessária além da confirmação de exclusão do card. |
| RN-CAL-04 | Ao excluir um bloco do calendário que possui um card do Kanban vinculado, o sistema deve exibir um alerta informando que o bloco está vinculado ao card '[título]' e perguntar: "Deseja excluir o bloco e desvincular o card?". A exclusão do bloco **nunca** exclui o card — apenas remove o vínculo (`card_id = NULL` no bloco antes de excluir). |
| RN-CAL-05 | A diferenciação visual de um bloco do calendário deve seguir a categoria do evento. Se o bloco estiver vinculado a um card, a categoria do card prevalece. |
| RN-CAL-06 | Os campos `start_datetime` e `end_datetime` são obrigatórios. O `end_datetime` deve ser estritamente posterior ao `start_datetime` (igual também é inválido). A validação ocorre tanto no frontend quanto no backend (400 Bad Request se violado). |
| RN-CAL-07 | Blocos de calendário sobrepostos no mesmo dia são permitidos no MVP. Não há validação de conflito de horário. |
| RN-CAL-08 | Nomes de categorias são únicos (case-insensitive). O backend rejeita a criação de categoria com nome que conflite com uma existente. As três categorias padrão (Pessoal, Trabalho, Estudo) são semeadas pela migration inicial e nunca recriadas. |

---

### RN — Módulo Controle de Foco

| ID | Regra |
|---|---|
| RN-FOC-01 | O cronômetro só pode ser iniciado se houver um card do Kanban selecionado. |
| RN-FOC-02 | Apenas uma sessão de foco pode estar ativa por vez. O sistema não permite iniciar uma segunda sessão enquanto outra estiver em andamento. |
| RN-FOC-03 | A troca entre Modo Fixo e Modo Livre só é permitida antes de iniciar uma sessão. Durante uma sessão ativa, o modo não pode ser alterado. |
| RN-FOC-04 | Uma sessão com duração inferior a 30 segundos ao ser encerrada manualmente é descartada sem registro. |
| RN-FOC-05 | Se o usuário fechar o navegador ou a aba com uma sessão de foco ativa, o backend mantém a sessão com `ended_at = NULL`. O frontend envia heartbeats ao backend a cada 30 segundos enquanto a sessão está ativa, atualizando `last_heartbeat_at`. Ao reabrir a aplicação, o frontend detecta a sessão incompleta (GET `/api/sessions?active=true`) e apresenta ao usuário as opções: **(a)** contabilizar o tempo decorrido até o último heartbeat e encerrar a sessão, ou **(b)** descartar a sessão. Sessões com `last_heartbeat_at` mais antiga que 24 horas são consideradas abandonadas e descartadas automaticamente sem contabilização. |
| RN-FOC-06 | Uma sessão encerrada manualmente antes do fim tem seu tempo parcial contabilizado normalmente no card, desde que ≥ 30 segundos (RN-FOC-04). |
| RN-FOC-07 | No Modo Fixo, quando `elapsed ≥ duration`, a sessão encerra automaticamente, registra `duration` segundos no card, e retorna ao estado idle. |
| RN-FOC-08 | No Modo Livre, o timer nunca para automaticamente. O formato exibido cresce de `MM:SS` para `HH:MM:SS` quando o tempo acumulado ≥ 1 hora. |
| RN-FOC-09 | O picker de seleção de card no módulo Foco exibe todos os cards com status diferente de "concluído" (i.e., não restringe a uma coluna específica pelo nome, pois colunas são renomeáveis). A coluna marcada como "em progresso" é identificada por posição ou por flag futura, não por nome. Para o MVP, o picker exibe todos os cards de todas as colunas, ordenados por coluna e posição. |
| RN-FOC-10 | Ao excluir um card que possui sessões de foco registradas, as sessões são mantidas no banco com `card_id = NULL`. O histórico de tempo não é apagado — apenas o vínculo com o card é removido. |
| RN-FOC-11 | A pausa não cria uma nova sessão — o tempo de pausa não conta para o `elapsed`. O frontend acumula o tempo pausado e o desconta do total ao encerrar. O backend recebe apenas o `elapsed_seconds` líquido (sem pausas) ao finalizar a sessão. |

---

## 3.2 Casos de Uso

---

### UC-01 — Criar um Card e Vinculá-lo ao Calendário

**Pré-condição:** A aplicação está aberta. Existe pelo menos uma coluna no Kanban.

**Fluxo Principal:**
1. Usuário abre o módulo Kanban.
2. Usuário cria um novo card preenchendo título, categoria e prazo.
3. Usuário abre o drawer do card e acessa "Vincular ao Calendário".
4. Sistema exibe um seletor com os blocos existentes na semana atual + opção de criar novo bloco.
5. Usuário seleciona ou cria um bloco de tempo no calendário.
6. Sistema persiste o vínculo (`card_id` no `calendar_blocks`) e exibe a referência do card dentro do bloco.

**Fluxo Alternativo A — Vínculo pelo Calendário:**
1. Usuário cria um bloco no calendário diretamente.
2. Dentro do bloco (no modal de edição), acessa "Vincular a um Card".
3. Sistema exibe a lista de cards do Kanban com busca e filtro por categoria.
4. Usuário seleciona o card desejado.
5. Sistema persiste o vínculo nos dois lados.

---

### UC-02 — Excluir um Card com Vínculo Ativo no Calendário

**Pré-condição:** Existe um card no Kanban vinculado a um bloco do calendário.

**Fluxo Principal:**
1. Usuário solicita a exclusão do card no Kanban.
2. Sistema exibe alerta: *"Este card está vinculado a um bloco no calendário. Ao excluir o card, o bloco do calendário também será excluído. Deseja continuar?"*
3. Usuário confirma.
4. Sistema exclui o card e, em cascade, o bloco do calendário vinculado.

**Fluxo Alternativo — Usuário Cancela:**
1. No passo 3, usuário cancela.
2. Sistema fecha o alerta. Card e bloco permanecem intactos.

---

### UC-03 — Excluir um Bloco do Calendário com Card Vinculado

**Pré-condição:** Existe um bloco no calendário vinculado a um card do Kanban.

**Fluxo Principal:**
1. Usuário solicita a exclusão do bloco no calendário.
2. Sistema exibe alerta: *"Este bloco está vinculado ao card '[título do card]' no Kanban. Ao excluir o bloco, o card será mantido mas ficará sem bloco de calendário vinculado. Deseja continuar?"*
3. Usuário confirma.
4. Sistema exclui o bloco do calendário. O card do Kanban é mantido intacto.

**Fluxo Alternativo — Usuário Cancela:**
1. No passo 3, usuário cancela.
2. Sistema fecha o alerta. Bloco e card permanecem intactos.

---

### UC-04 — Excluir uma Coluna do Kanban com Cards

**Pré-condição:** Existe uma coluna no Kanban com pelo menos um card.

**Fluxo Principal:**
1. Usuário solicita a exclusão de uma coluna.
2. Sistema verifica que a coluna contém cards.
3. Sistema exibe alerta: *"A coluna '[nome]' contém X cards. Ao excluir a coluna, todos os cards serão permanentemente excluídos. Esta ação não pode ser desfeita. Deseja continuar?"*
4. Usuário confirma.
5. Sistema exclui a coluna e todos os seus cards. Cards com blocos vinculados têm seus blocos excluídos em cascade (RN-KAN-03 + RN-CAL-03).

**Fluxo Alternativo — Coluna Vazia:**
1. Usuário solicita a exclusão de uma coluna vazia.
2. Sistema exclui a coluna diretamente, sem alerta.

---

### UC-05 — Iniciar uma Sessão de Foco

**Pré-condição:** Existe pelo menos um card no Kanban. Nenhuma outra sessão está ativa.

**Fluxo Principal:**
1. Usuário abre o módulo de Foco.
2. Usuário seleciona um card da lista (picker modal — exibe cards em progresso).
3. Usuário escolhe duração (Modo Fixo) ou seleciona "Livre" (Modo Livre).
4. Usuário clica em "▶ Selecionar Tarefa" / card já selecionado → o timer inicia.
5. Backend cria registro em `focus_sessions` com `started_at = NOW()`, `ended_at = NULL`.
6. Sistema bloqueia a troca de modo e exibe o card vinculado em destaque.

**Fluxo Alternativo A — Tentativa sem Card:**
1. Usuário tenta iniciar sem selecionar card.
2. Sistema bloqueia e exibe: *"Selecione um card para iniciar a sessão."*

**Fluxo Alternativo B — Sessão já ativa:**
1. Usuário tenta iniciar segunda sessão.
2. Sistema bloqueia e exibe: *"Já existe uma sessão de foco ativa. Finalize ou encerre a sessão atual para começar uma nova."*

---

### UC-06 — Encerrar uma Sessão de Foco

**Pré-condição:** Uma sessão de foco está ativa.

**Fluxo Principal — Encerramento Natural (Modo Fixo):**
1. `elapsed ≥ duration` → sistema encerra automaticamente.
2. Backend atualiza `focus_sessions.ended_at = NOW()` e incrementa `kanban_cards.total_focus_time` com `duration` segundos.
3. Frontend retorna ao estado idle, exibe o chip da sessão no histórico do footer.

**Fluxo Alternativo A — Encerramento Manual:**
1. Usuário clica em "⏹ Encerrar" durante o cronômetro ativo.
2. Se `elapsed < 30s`: sessão descartada sem registro (RN-FOC-04).
3. Se `elapsed ≥ 30s`: backend registra o tempo parcial e incrementa o card.
4. Frontend retorna ao estado idle.

**Fluxo Alternativo B — Fechamento do Navegador:**
1. Usuário fecha o navegador com sessão ativa.
2. Backend mantém a sessão com `ended_at = NULL`.
3. Ao reabrir, o frontend detecta a sessão incompleta e exibe:
   *"Você tinha uma sessão de foco ativa para o card '[título]'. O que deseja fazer?"*
   - **"Contabilizar o tempo decorrido ([X min]) e encerrar"**
   - **"Descartar a sessão"**
4. Usuário escolhe. Sistema executa e atualiza o banco.
