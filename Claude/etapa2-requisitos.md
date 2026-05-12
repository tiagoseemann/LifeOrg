# PRD — Etapa 2: Requisitos Funcionais e Não Funcionais

---

## 2.1 User Stories — Módulo 1: Kanban

| ID | História | Critério de Aceite |
|---|---|---|
| KAN-01 | Como usuário, quero criar colunas no Kanban e renomeá-las para adaptar o quadro ao meu fluxo de trabalho. | Deve ser possível criar, renomear, reordenar e excluir colunas. |
| KAN-02 | Como usuário, quero criar um card de tarefa com título, descrição, categoria, prazo, prioridade, checklist e estimativa de tempo para registrar tudo que preciso sobre aquela tarefa. | Todos os campos devem ser opcionais exceto o título. |
| KAN-03 | Como usuário, quero arrastar cards entre colunas para atualizar o status de uma tarefa visualmente. | A posição do card deve ser persistida automaticamente no banco após o drag-and-drop. |
| KAN-04 | Como usuário, quero filtrar os cards por categoria para visualizar apenas as tarefas de um contexto específico. | O filtro deve ser aplicado em tempo real, sem recarregar a página. |
| KAN-05 | Como usuário, quero buscar um card pelo nome para encontrá-lo rapidamente sem percorrer todas as colunas. | A busca deve funcionar em tempo real enquanto digito. |
| KAN-06 | Como usuário, quero criar categorias personalizadas além das três padrão (Pessoal, Trabalho, Faculdade) para organizar tarefas de outros contextos. | As categorias criadas devem estar disponíveis tanto no Kanban quanto no Calendário. |
| KAN-07 | Como usuário, quero ver o tempo total de foco acumulado em um card para saber quanto tempo já investi naquela tarefa. | O campo deve ser atualizado automaticamente após cada sessão de foco concluída. |
| KAN-08 | Como usuário, quero vincular um card a um bloco do calendário diretamente pelo próprio card para planejar quando vou executar aquela tarefa. | O vínculo deve aparecer tanto no card quanto no bloco do calendário. |

---

## 2.2 User Stories — Módulo 2: Calendário de Rotina

| ID | História | Critério de Aceite |
|---|---|---|
| CAL-01 | Como usuário, quero criar um bloco de tempo no calendário para reservar um período para uma atividade. | O bloco deve ter título, hora de início, hora de fim e categoria. |
| CAL-02 | Como usuário, quero editar e excluir um bloco de tempo existente para corrigir ou reorganizar minha rotina. | As alterações devem ser persistidas automaticamente no banco. |
| CAL-03 | Como usuário, quero navegar entre semanas usando os chevrons ‹ › para ver minha rotina passada e futura. | A troca de semana deve ser instantânea, sem recarregar a página. |
| CAL-04 | Como usuário, quero clicar em "Hoje" para retornar imediatamente à semana atual. | A visão deve saltar para a semana contendo a data de hoje. |
| CAL-05 | Como usuário, quero vincular um card do Kanban a um bloco do calendário para reservar formalmente um tempo para trabalhar naquela tarefa. | O bloco vinculado deve exibir o título do card e a cor da sua categoria. |
| CAL-06 | Como usuário, quero que os blocos do calendário sejam diferenciados visualmente de acordo com a categoria para separar rotina, trabalho e estudo. | As diferenciações devem seguir a paleta e regras do `DESIGN_SPEC.md`. |

---

## 2.3 User Stories — Módulo 3: Controle de Foco

| ID | História | Critério de Aceite |
|---|---|---|
| FOC-01 | Como usuário, quero selecionar um card do Kanban antes de iniciar o cronômetro para registrar o tempo gasto naquela tarefa específica. | Não deve ser possível iniciar o cronômetro sem um card vinculado. |
| FOC-02 | Como usuário, quero usar o Modo Fixo com duração configurável para trabalhar em blocos estruturados de tempo. | O usuário deve poder definir a duração (15/25/45/60 min ou customizado) antes de iniciar. O ring SVG deve refletir o progresso em tempo real. |
| FOC-03 | Como usuário, quero usar o Modo Livre para iniciar e parar o cronômetro manualmente quando meu trabalho não segue ciclos fixos. | O cronômetro deve exibir o tempo decorrido em tempo real, sem auto-parar. |
| FOC-04 | Como usuário, quero que, ao finalizar ou encerrar uma sessão, o tempo seja automaticamente somado ao `total_focus_time` do card no banco. | O tempo deve ser registrado mesmo que o usuário pare o timer manualmente antes do fim (desde que ≥ 30 s). |
| FOC-05 | Como usuário, quero poder trocar entre Modo Fixo e Modo Livre antes de iniciar uma sessão. | A troca de modo só é permitida antes de iniciar — não durante uma sessão ativa. |
| FOC-06 | Como usuário, se eu fechar o navegador com uma sessão ativa, quero que ao reabrir o sistema eu possa escolher contabilizar o tempo decorrido ou descartar a sessão. | O sistema deve detectar a sessão incompleta e exibir o modal de recuperação. |

---

## 2.4 User Stories — Módulo 4: Planilha Financeira *(Fase 2)*

| ID | História |
|---|---|
| FIN-01 | Como usuário, quero registrar receitas e despesas com data, valor e categoria para ter controle do meu fluxo de caixa. |
| FIN-02 | Como usuário, quero visualizar um resumo mensal de entradas e saídas para entender minha saúde financeira no período. |
| FIN-03 | Como usuário, quero definir metas de gastos por categoria para monitorar se estou dentro do planejado. |

---

## 2.5 User Stories — Módulo 5: Controle de Ideias e Planos *(Fase 2)*

| ID | História |
|---|---|
| IDE-01 | Como usuário, quero registrar ideias e planos de longo prazo em um espaço dedicado para não misturá-los com as tarefas do dia a dia. |
| IDE-02 | Como usuário, quero organizar ideias por categorias ou projetos para recuperá-las facilmente no futuro. |
| IDE-03 | Como usuário, quero converter uma ideia em um card do Kanban para transformar planos em execução concreta. |

---

## 2.6 Requisitos Não Funcionais

### Performance

| ID | Requisito |
|---|---|
| RNF-01 | O tempo de carregamento inicial da aplicação deve ser inferior a 3 segundos em conexões locais (Docker). |
| RNF-02 | Todas as interações em tempo real (drag-and-drop, filtros, busca) devem responder em menos de 300 ms. |
| RNF-03 | O salvamento automático (autosave do drawer) não deve causar travamentos ou interromper a interação do usuário. |

### Persistência e Dados

| ID | Requisito |
|---|---|
| RNF-04 | **Todos os dados do MVP devem ser persistidos em PostgreSQL (via Docker).** Nenhuma informação pode ser perdida ao fechar o navegador ou reiniciar os containers (o volume Docker garante isso). |
| RNF-05 | O sistema deve ser arquitetado com suporte futuro a modo offline (Service Workers / PWA) sem necessidade de reescrita completa. |
| RNF-06 | O salvamento deve ser automático e silencioso — sem botão "Salvar" no drawer nem no calendário. Mudanças persistem imediatamente via chamada ao backend. |
| RNF-07 | O estado de uma sessão de foco ativa deve ser armazenado no backend (tabela `focus_sessions` com `ended_at = NULL`) para que a recuperação após fechamento de aba funcione. |

### Compatibilidade

| ID | Requisito |
|---|---|
| RNF-08 | O sistema deve ser totalmente funcional no Safari (macOS) como navegador primário. |
| RNF-09 | O sistema deve ser funcionalmente compatível com Chrome e Firefox, sem quebras críticas de layout ou lógica. |
| RNF-10 | O layout deve ser otimizado para uso em desktop. Responsividade mobile é desejável mas não obrigatória no MVP. Os breakpoints existentes (`880px`, `640px`) são reflows gentis, não um produto mobile separado. |

### Usabilidade e Design

| ID | Requisito |
|---|---|
| RNF-11 | A interface deve seguir integralmente o `DESIGN_SPEC.md`. O acento visual é o coral `#CC5200`, não uma paleta monocromática. Qualquer desvio de cor, tipografia, espaçamento ou motion que contradiga o `DESIGN_SPEC.md` é um bug de design. |
| RNF-12 | A interface deve ser operável sem manual de instruções — todos os controles devem ser autoexplicativos. |
| RNF-13 | Nenhum elemento visual deve existir sem uma função clara. Zero ornamentos decorativos que não sirvam à UI. |
| RNF-14 | O `LifeOrg Shell.html` é o protótipo de referência visual. A implementação React deve reproduzir fielmente seu CSS, estrutura de componentes e comportamento interativo. |

### Segurança

| ID | Requisito |
|---|---|
| RNF-15 | Por ser uma aplicação single-user rodando em localhost, a proteção de acesso ao backend é por camadas locais: (a) o backend bind em `localhost` apenas (não expõe para rede externa); (b) CORS configurado para aceitar apenas `http://localhost:3000`; (c) um header `X-API-Key` com `API_SECRET_KEY` como camada de proteção contra acesso acidental de outros processos locais. **Isso não é autenticação real** — é uma barreira de conveniência. O `API_SECRET_KEY` não deve ser tratado como segredo criptográfico e será visível no bundle Vite para o dono da máquina, o que é aceitável para uso local single-user. |
| RNF-16 | O sistema deve ser arquitetado de forma que a adição de autenticação de usuário (login) seja possível em versão futura sem reescrita do backend. |
