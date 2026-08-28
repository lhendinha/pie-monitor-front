# Contexto do projeto — Argos (Frontend)

> Este arquivo existe pra você (Claude) retomar o projeto numa sessão nova
> sem precisar que o usuário reexplique tudo do zero. Leia isso primeiro.
> Uma cópia equivalente (focada no backend) existe em `CONTEXT.md` no
> repositório da API, `argos-monitor-api` (caminho interno:
> /Users/pedrohenriquesousaalmeida/Documents/Projects/PJE Monitor/api).

## 1) Objetivo do projeto

Front-end React + TypeScript pra um sistema que monitora processos
judiciais brasileiros via API do PJe, organizados em **Grupos → Subgrupos →
Processos**, com controle de acesso por papéis, convites por e-mail, e
notificação automática de movimentação processual. Consome uma API AWS já
em produção (Lambda + DynamoDB + SES).

## 2) Estado atual

Front reescrito em TypeScript, estrutura em camadas (`pages/`, `services/`,
`utils/`, `components/`, `constants/`), usando **Yarn** (não npm), deployado
no **Vercel** em `argos-monitor.vercel.app`.

⚠️ O domínio MUDOU. Os dois `CONTEXT.md` diziam `pie-monitor-front.vercel.app`,
que hoje devolve `DEPLOYMENT_NOT_FOUND` -- descoberto ao tentar conferir uma
publicação. O repositório no GitHub continua sendo `pie-monitor-front`; o
alias do Vercel é que passou a ser `argos-monitor`, junto com a renomeação do
produto pra Argos. Conferir publicação por um endereço morto dá "não subiu"
pra um deploy que subiu. React Compiler configurado
e testado. Build (`yarn build`) passa limpo com type-check completo. Suite
de testes com `vitest` + `@testing-library/react` (`yarn test`): 59 arquivos,
605 testes, cobrindo `pages/` (27 arquivos), `components/` (11), `utils/`
(9), `services/` (7) e `hooks/` (3). O `yarn lint` roda ESLint com
`react-hooks` e passa sem erros.

⚠️ Este parágrafo dizia que a suíte cobria "`services/` e `utils/`" -- ficou
para trás de duas auditorias que encheram `pages/` e `components/` de
testes. `vercel.json` também define security headers (CSP,
HSTS, etc.) pra todo o app. Fluxo de recuperação de senha
(`EsqueciSenhaPage`/`RedefinirSenhaPage`), edição de apelido de processo, e
o link do e-mail de notificação abrindo direto na aba Histórico (deep link
via `?processo=&comunicacao=`) já implementados -- ver seção 3.

## 3) Decisões importantes já tomadas

### `services/api/` tem SÓ as chamadas de API (27/08/2026)

Nada de `interface`, `type` ou função auxiliar dentro de
`src/services/api/*.ts`: ali entra só a função que fala com a API
(`criarCliente`, `listarProcessos`, `lerConfiguracoesDoGrupo`). **Tipos vão
para `types/`, auxiliares de transformação para `utils/`.**

⚠️ O padrão anterior era o oposto -- eram **15 interfaces locais em 12
arquivos** de serviço, e a medição disso chegou a ser usada como argumento para
manter as coisas onde estavam. A decisão foi a inversa: o padrão existente é
que estava errado.

✅ **Migrados os 18 arquivos em 27/08/2026.** `services/api/` tem só chamadas.
`paginacao.ts` saiu de lá inteiro -- ele não chama API nenhuma, RECEBE uma
função de busca e a chama em laço.

🔴 **E o nome muda junto com o lugar.** O que era claro dentro do arquivo de
origem fica vago num barrel compartilhado, e foi preciso renomear seis:

| era | virou | por quê |
|---|---|---|
| `RECURSO` | `CAMINHO_POR_TIPO_DE_OPCAO` | uma constante `RECURSO` no barrel não diz de que recurso |
| `Envelope` | `EnvelopePaginado` | envelope de quê? |
| `RespostaCrua` | `RespostaCruaDaApi` | crua em relação a quê? |
| `OpcoesDePagina` | `OpcoesDePaginacao` | é o par que o laço passa, não "uma página" |
| `ValorQuery` | `ValorDeParametroDeQuery` | query de banco ou de URL? |
| `DadosDeDocumento` | `CamposDeDocumento` | "dados de documento" não diz nada |
| `OpcoesListarOpcoesProcesso` | `OpcoesListarFasesOuSituacoes` | trava-língua, e escondia o recurso |
| `corpoCamposOpcionais` | `corpoDosCamposDeProcesso` | opcionais de qual coisa? |

### Tipo de notificação novo: os DOIS lados, e o compilador cobra (27/08/2026)

Ao acrescentar um tipo de notificação ou um alvo, **três arquivos mudam
juntos** -- e o build quebra se algum ficar para trás:

1. `api/src/domain/entities.py` -- a constante `NOTIFICACAO_*` / `ALVO_*`;
2. `front/src/constants/notificacoes.ts` -- a constante `TIPO_*` / `ALVO_*`
   **e** a entrada em `TIPOS_DE_NOTIFICACAO` / `ALVOS_DE_NOTIFICACAO`;
3. `front/src/utils/notificacao.ts` -- o `case` no `switch`.

🔴 **`Notificacao.tipo` e `alvo_tipo` são uniões FECHADAS, não `string`.** O
`default` dos dois `switch` atribui a `const naoTratado: never`, então um
tipo declarado e não tratado **não compila**. Antes disso, `tipo` era
`string`: o caso novo caía no `default` e virava uma **linha vazia no sino**,
sem o compilador dizer palavra.

⚠️ **E não é `enum` do TypeScript, de propósito.** `enum` gera código em
runtime (entra no bundle), `const enum` não funciona com `isolatedModules`
-- que o Vite exige -- e o valor chega da API como string de JSON: com união
de literais a string JÁ é o tipo; com `enum` seria preciso converter e
validar na fronteira para o mesmo resultado. O padrão aqui é
`[...] as const` + `(typeof X)[number]`, o mesmo de `PRIORIDADES` e
`STATUS_DE_ATENDIMENTO`.

⚠️ **`alvo_tipo` é `AlvoDeNotificacao | ""`**, e o `""` não é sobra: a API
tem `alvo_tipo: str = ""` como default, então aviso sem destino chega com
string vazia. Fechar só nos quatro faria o tipo mentir -- e
`destinoDaNotificacao` precisa distinguir "não tem alvo" de "alvo que não
conheço".

⚠️ **O cast no teste de degradação é deliberado.** `notificacao.test.ts` usa
`as Notificacao["tipo"]` para simular um valor que o front ainda não conhece
-- e isso não é hipótese: a ordem de deploy é **API primeiro**, então
acontece a cada entrega. Sem o cast o teste não compilaria, e a tentação
seria apagá-lo, jogando fora a prova de que a degradação é graciosa.

🔴 **Do lado da API há um guarda que lê ESTE repositório**:
`tests/test_tipos_de_notificacao_batem_com_o_front.py` compara as duas listas
e falha dizendo o que falta onde. Ele pula quando o front não está ao lado --
e um quarto teste falha alto nesse caso, para o `skip` não sumir do relatório
e deixar a suíte verde sem ter conferido nada.

### Toda mudança nasce com o teste que a cobre (26/08/2026)

**Regra**: nenhuma mudança ou adição -- componente, campo, filtro, correção --
entra sem teste que a cubra. Não é "se der tempo": é parte da mudança, no mesmo
commit.

**Por que está escrito.** Os defeitos deste front passaram por não terem par, e
nenhum foi descuido:

- `status.warn.text` apontava para um token que **não existia**; caía em `ink`,
  passava no teste de contraste com 14,81:1 e a cor estava visualmente errada.
  Só a **cor computada em Chrome real** revelou;
- a verificação do documento de outro subgrupo afirmava a ausência **antes de a
  lista carregar** -- um teste que passava sem provar nada;
- três números da home não eram clicáveis porque as telas "ainda não
  existiam", e passaram a existir sem ninguém voltar lá.

**O que "cobrir" significa aqui**, e é mais que "existe um teste":

- **O par negativo.** Afirmar que aparece não prova nada sozinho; afirme também
  o que NÃO deve aparecer -- e **depois de a tela ter carregado**, senão o teste
  passa por chegar cedo demais.
- **A mutação.** Reverter a mudança e confirmar que **só** o teste dela falha.
- **A concordância**, quando duas telas mostram a mesma coisa: cada uma pode
  estar "certa" sozinha e diferente da outra.
- **O guarda mecânico**, quando a regra depende de lembrar de repetir algo --
  ver `src/constants/limites.test.ts`, que varre os `maxLength`.

**O que NÃO precisa de teste novo**: o que um guarda existente já pega sozinho.
Duplicar guarda é ruído, não cobertura.

🔴 **Cobrir não é o mesmo que passar, e aqui isso é literal.** `jsdom` e Chrome
**headless** já deram "passou" em tela quebrada. Interface se confere em
**Chrome com janela**, pelos scripts `verificar-*.mjs` -- e o que se mede é o
resultado computado (cor, tamanho, posição), não a existência do elemento.

⚠️ **Quando uma mudança não puder ser coberta, isso se escreve** -- aqui,
nominalmente, com o motivo. Lacuna conhecida é dívida; lacuna silenciosa é
armadilha. Um caso vivo: `constants/notificacoes.ts` espelha à mão os
`NOTIFICACAO_*` da API, e **nenhum teste atravessa os dois runtimes**. A rede é
a degradação graciosa -- `frasePrincipal` cai no título cru para tipo
desconhecido, `destinoDaNotificacao` devolve `null` para alvo desconhecido.

### Todo número da home leva à lista que ele contou (26/08/2026)

Três números do "Resumo rápido" não eram clicáveis enquanto os vizinhos
eram, e o motivo estava no código: `// Tarefas levam ao Kanban, que ainda
não existe` e `// Atendimentos ainda não tem tela`. **As telas passaram a
existir e ninguém voltou lá.**

Medindo os que TINHAM link, dois abriam a lista errada:

| card | contava | abria |
|---|---|---|
| Envios com falha | 2 | **6** |
| Movimentações (7 dias) | 3 | **4** |

A régua é o cabeçalho de `ResumoRapido`: *"o número e o destino contam a
MESMA história -- o clique aplica exatamente o filtro da contagem"*. Foi ela
que decidiu cada caso, e não a simetria visual.

**Atendimentos em andamento** → `/atendimentos` já filtrado, via
`useLocation().state` como `ProcessosPage` faz. O status vive numa constante
compartilhada, pra o número e o filtro não divergirem sozinhos.

**Envios com falha** e **Movimentações (N dias)** → o Histórico ganhou duas
pílulas ("Todos os envios"/"Só com falha" e "Todos os períodos"/"Últimos N
dias"), e a API ganhou os filtros correspondentes -- ela não tinha nenhum
dos dois.

⚠️ `DIAS_DA_JANELA_RECENTE` é UM valor, usado no rótulo do card E no `dias`
que vai pra API. Dois literais divergiriam no primeiro ajuste, e aí o card
voltaria a anunciar uma janela diferente da que a lista aplica.

**Tarefas sem responsável** → **não navega**. A lista já está na mesma tela
(o card "Disponíveis para assumir" usa filtro idêntico): o clique rola até
ele e o destaca por 1,6s. ⚠️ Destacar E rolar -- em tela larga as duas
colunas cabem juntas e `scrollIntoView` não move nada, então o clique
ficaria sem resposta.

**Tarefas atrasadas** → a Agenda, **em modo novo**. Este é o interessante:

🔴 Ela passou um tempo sem link **de propósito**, e havia um teste guardando
essa ausência com o pedido de que quem lhe desse destino apagasse o teste e
escrevesse por quê. O motivo era real: "atrasadas" é `data < hoje` em
QUALQUER dia passado, e toda visão da Agenda é limitada por janela de datas
(dia, semana, 14 dias, grade de 42) abrindo no mês corrente. Mandar pra lá
levava a uma tela mostrando **zero** delas.

A Agenda ganhou a pílula "Todos os períodos" com a opção "Atrasadas". Com
ela ligada:

- a consulta troca de FORMA: sai a janela, entram `apenasAbertas` +
  `dataAte: ontem` -- a mesma definição que o card conta;
- a lista monta os dias **presentes no resultado**, não 14 à frente, e o
  vazio diz "Nenhuma tarefa atrasada";
- **setas e "Hoje" somem**; o **rótulo fica**, dizendo *"Atrasadas — até
  25/08"*. ⚠️ Manter "Agosto de 2026" ali seria a tela afirmando o contrário
  do que é -- o defeito que a própria Agenda acabou de perder;
- o **seletor de visão fica desabilitado**, com o motivo no `title`.
  Controle desabilitado sem explicação é pior que controle que some.

⚠️ **`periodo` entra na `queryKey`.** Sem isso, ligar "Atrasadas" reusaria o
resultado da janela anterior -- lista errada, sem erro nenhum. Vale igual
para os dois filtros do Histórico, e há teste de mutação provando: tirar da
chave derruba exatamente os testes que a vigiam.

**A auditoria das mudanças achou quatro defeitos, todos introduzidos por
esta própria rodada** -- e três eram a tela afirmando o contrário do que é,
que é exatamente o que ela veio consertar:

- **A pílula de visão dizia "Por mês" sobre uma lista corrida.** No modo
  atrasadas `visao` continuava `"mes"`, e a pílula desabilitada exibia o
  rótulo antigo. Acontecia pelos DOIS caminhos: chegando da home e ligando o
  filtro na própria tela. Ligar o modo passou a trocar a visão junto.
- 🔴 **O cartão "Hoje" afirmava "Nenhuma tarefa para hoje"** -- num modo cuja
  consulta pede `data_ate: ontem`, então as de hoje NUNCA chegam. A pessoa
  podia ter cinco vencendo hoje. Agora ele diz que a lista traz só o passado.
- **"Ver todos os envios" não saía.** O botão do estado vazio limpava só o
  tipo; com "Só com falha" ligado, o único caminho de volta deixava a lista
  vazia. E a frase "Nenhum envio deste tipo" apontava pro filtro errado.
- **"Nova tarefa" herdava o mês navegado** -- quem fosse pra dezembro e
  depois ligasse o filtro criaria tarefa em 1º/12, já nascida atrasada.

⚠️ E um teste meu **não guardava nada**: o do caminho de volta montava a tela
com os filtros nos padrões (`apenasComFalha: false`, `dias: 0`), então
passava mesmo com o botão limpando só o tipo. Agora monta com os três
LIGADOS -- e a mutação prova que falha sem a correção.

**Como se prova**: `scripts/verificar-links-da-home.mjs` clica em cada
número em Chrome e compara com o total da tela. Na Agenda a asserção é
QUAIS tarefas aparecem -- a atrasada **concluída** tem que ficar de fora,
senão um filtro que esquecesse `apenasAbertas` passaria por acaso. O
controle (front anterior, mesma API) falha no primeiro clique.

### A API agora roda local, fora da AWS (25/08/2026)

Na pasta `api`, `yarn offline` sobe o sistema inteiro na máquina: DynamoDB
Local em docker, as seis lambdas com os handlers Python de verdade, o cron e
o canal WebSocket. Para apontar o front pra lá:

```bash
VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
  yarn dev --port 5174
```

⚠️ `VITE_WS_URL` junto, e não só a API: sem ele o front abre o canal no
endereço de PRODUÇÃO a partir de uma tela local — o sino "funciona" ali
mostrando notificação de verdade, e o que se estava testando não foi
testado.

Contas semeadas, senha `Senha!Local1`: `movida@local.test` (admin no
escritório Alfa) e `chefe@local.test` (super_admin, quem move). Cada
escritório tem um cliente com nome próprio, pra dar pra VER de qual grupo é a
tela.

**A regra combinada:** todo teste passa por ali antes de qualquer deploy --
inclusive os do front, que até aqui usavam `scripts/stubsDaApi.mjs`. O stub
continua útil para telas de UI pura; ele não vale como validação pré-deploy,
porque responde o que eu escrevi que ele responde.

### O produto é Argos; `pje-monitor` fica só onde renomear quebra algo (25/08/2026)

Documentação, títulos e `package.json` (`argos-monitor-front`) usam o nome
novo. **Não foram renomeadas as chaves de `localStorage`**
(`pje-monitor-access-token` e as outras seis em `services/auth.ts`,
`pje-monitor-ultimo-subgrupo-` em `hooks/useUltimoSubgrupo.ts`): elas são o
endereço sob o qual a sessão de cada pessoa já está gravada no navegador
dela, e trocar sem migrar desloga todo mundo no primeiro carregamento depois
do deploy.

Do lado da API, pela mesma lógica, `service: pje-monitor` continua no
`serverless.yml` -- é dele que saem os nomes das tabelas, da pilha e das
funções na AWS.

O repositório no GitHub ainda se chama `pie-monitor-front` (com "pie", erro
de digitação antigo); o domínio é `argos-monitor.vercel.app`.

### Por que Vercel, não AWS

A conta AWS do projeto foi criada após a mudança de política de julho/2025:
sem free tier permanente pra S3/CloudFront (só $200 de créditos por 6
meses, diferente de Lambda/DynamoDB que são "Always Free" de verdade). Pra
garantir $0 garantido, o front roda no Vercel (free tier permanente, deploy
automático a cada push).

### Modelo de domínio (espelha o backend)

- Grupo (1) → Subgrupo (N) → Processo (N, único por subgrupo).
- Usuário pertence a 1 grupo, sem exceção -- inclusive `super_admin` -- e
  a N subgrupos.
- Papéis: `user < manager < admin < super_admin`.
- `super_admin` age no próprio grupo como um `admin` -- não tem campo
  "Grupo alvo" na UI (removido de `App.tsx`). As diferenças ficam só nas
  4 rotas/grupos de rota cross-tenant do backend (ver `CONTEXT.md` do
  backend, seção "Modelo de domínio").
- `Cliente` é por grupo, associado a `Processo` via lista de ids embutida
  no próprio processo (`cliente_ids`), sem entidade de associação própria
  no front -- o `MultiSelect` de Cliente no form de processo resolve
  `id -> nome` a partir de `GET /clientes` cacheado.
- `Fase`/`Situação` de processo são uma lista GLOBAL da plataforma (não
  por grupo) -- toda pessoa vê as mesmas opções no dropdown do processo
  (piso `user`), só o CRUD da lista (aba "Fase/Situação") é exclusivo de
  `super_admin`.

### Estrutura de pastas (decisão explícita do usuário)

```
src/
  main.tsx              -- ponto de entrada
  App.tsx               -- SÓ os provedores (Toast, Sessão, Router)
  routes/index.tsx      -- o mapa de rotas
  routes/Rota*.tsx      -- rotas que precisam de casca própria (Login, Tarefa, Raiz…)

  types/                -- TODO tipo de alcance global (index.ts + respostas.ts)
  constants/            -- arquivos soltos + index.ts que reexporta (ambiente.ts,
                           roles.ts, paginacao.ts, periodos.ts, select.ts…)
  utils/                -- arquivos soltos + index.ts (mask, date, deepLink, calendario…)
  services/             -- auth.ts + api/ (client.ts e um arquivo por área) + index.ts
  theme/                -- tokens e paletas de design
  hooks/                -- hooks compartilhados por mais de uma página
  contexts/             -- SessaoContext
  components/           -- 53 componentes gerais, cada um em pasta com index.tsx
  pages/                -- 19 páginas, cada uma em pasta com index.tsx
  test/setup.ts
```

**As quatro regras que decidem onde um arquivo mora:**

1. **Componente e página viram PASTA com `index.tsx`.** Tudo o mais --
   constante, tipo, helper, hook -- é arquivo solto, nunca pasta com índice.
2. **Alcance decide o destino.** Serviu a mais de uma página? Sobe pra
   `types/`, `constants/`, `utils/` ou `hooks/`. É de uma página só? Fica na
   pasta dela, como `constants.ts`, `types.ts` e helpers soltos ao lado do
   `index.tsx`.
3. **Componente usado por uma página só** mora em `pages/AquelaPagina/
   components/NomeDele/index.tsx`, e não entra no índice público.
4. **O nome tem que fazer sentido onde o arquivo mora.** Tipo que sobe pra
   `types/` costuma precisar de nome novo -- ver a seção abaixo.

Uma página completa fica assim (`AgendaPage`):

```
AgendaPage/
  index.tsx  index.test.tsx
  constants.ts              -- VISOES, DIAS_DA_LISTA, PONTOS_POR_CELULA
  types.ts                  -- VisaoDaAgenda, FiltrosDaAgenda (privados daqui)
  periodoDaAgenda.ts  periodoDaAgenda.test.ts     -- helpers, soltos
  tarefasPorDia.ts    tarefasPorDia.test.ts
  hooks/useTarefasDaAgenda.ts  …
  components/VisaoPorMes/index.tsx  …
```

### O catálogo inteiro pra traduzir um id (25/08/2026)

Sete telas baixavam um catálogo completo só pra virar id em nome. **A
Agenda já tinha sido corrigida** com `/atendimentos/resumos`; faltavam as
que dependem do catálogo de CLIENTES -- o único que cresce sem limite
(equipe e subgrupos são dezenas por natureza).

O nome agora vem em `cliente_nomes`, DENTRO de cada processo/atendimento.
`AtendimentosPage` e `AtendimentoDetalhePage` deixaram de pedir `/clientes`
por completo -- verificado em Chrome: **zero requisições**.

**Os seletores foram os últimos, e fecharam em 25/08/2026** -- ver *Toda
lista que pode crescer sem limite* logo abaixo. `useTodosOsClientes` não
existe mais: era o último lugar que baixava o catálogo de clientes.

⚠️ A leitura é `cliente_nomes ?? cliente_ids`, e NÃO um `map` indexado sobre
os ids. A primeira versão fazia isso e a tabela de Processos apareceu vazia
na verificação em Chrome: o stub tinha `cliente_nomes` sem `cliente_ids`, e
iterar pelos ids não produzia nada. Jsdom não pegou -- as fixtures dos testes
tinham os dois campos.

### Toda lista que pode crescer sem limite carrega a primeira página (25/08/2026)

A regra que passou a valer no sistema inteiro, em duas frases:

> **Toda lista que pode crescer sem limite carrega a primeira página e se
> completa por busca. E todo dado que precisa de rótulo traz o rótulo
> consigo.**

Com um corolário que vale pra qualquer painel:

> **Nenhum painel mostra lista vazia sem dizer por quê.**

Lista vazia significa três coisas -- "ainda não chegou", "não deu pra saber"
e "não existe nenhuma" -- e quem lê precisa distinguir. Os seis filtros em
pílula têm os três estados: `Carregando…` na primeira abertura, a lista
anterior esmaecida com a faixa `Buscando…` durante uma busca, e a falha com
"Tentar de novo" DENTRO do painel.

**O que mudou de lugar**

| tela | antes | agora |
| --- | --- | --- |
| Processos, chip de cliente | catálogo inteiro na montagem | 1ª página ao ABRIR a pílula |
| Processos, campo de cliente do formulário | catálogo inteiro | `CampoDeClientes`, 1ª página ao focar |
| Processos, coluna "Cliente" | catálogo inteiro | `cliente_nomes`, na resposta |
| Kanban, pílula de subgrupo | catálogo inteiro | 1ª página na montagem (é ela que escolhe o quadro padrão) |
| Kanban, pílula de pessoas | todos os membros do grupo | 1ª página ao ABRIR |
| Kanban, responsável no cartão | todos os membros do grupo | `responsavel_nome`, na tarefa |
| Agenda, pílula de subgrupos | catálogo inteiro | 1ª página na montagem |
| Agenda, pílula de pessoas | todos os membros do grupo | 1ª página ao ABRIR |
| Membros, coluna "Subgrupos" | catálogo inteiro | `subgrupo_nomes`, na pessoa |
| Convidar / Novo atendimento / Modal de tarefa | catálogo inteiro | 1ª página + digitação |

`PRIMEIRA_PAGINA_DE_OPCOES = 50`, igual ao teto do servidor
(`MAXIMO_DE_RESULTADOS_DE_BUSCA`). Pedir mais daria lista cortada sem aviso;
pedir menos deixaria de fora resultado que o servidor já mandou.

**Onde a caixa de digitar fica, e por quê**

Na PÍLULA ela vai no topo do painel (`CampoDeBuscaDoPainel`). O controle da
pílula É o rótulo ("3 selecionados"), com largura de rótulo e caixa alta:
digitar ali apagaria o texto e a faria pular de tamanho a cada letra. Só é
possível porque o painel do chip é controlado (`menuIsOpen`) -- com o menu da
lib, tirar o foco do controle o fecharia.

No campo de FORMULÁRIO é o `isSearchable` da própria lib, que é onde se
espera digitar. Nos dois casos o filtro é nosso (`contemTermo`), e não o da
lib: o dela compara texto cru, então "angela" não acharia "Ângela" -- e quem
digita sem acento concluiria que o cliente não está cadastrado.

**🔴 O delay ao digitar voltou, e só a medição pegou**

Já tinha acontecido no protótipo. Voltou no componente de verdade, pela mesma
causa: o react-select desenha uma linha de DOM por opção, sem virtualização.
Medido em Chrome, com 5.000 itens por trás de cada lista:

```
pílula de cliente (o servidor corta em 50)    22ms por tecla
pílula de situação, filtro local SEM teto    170ms por tecla
pílula de situação, COM teto de 50            22ms por tecla
```

E 22ms continua com 20.000 -- o custo era o DOM, não o filtro. O teto local é
o mesmo 50, e **o corte é DITO**: o painel mostra "+N não exibidos — digite
mais pra refinar". Lista truncada em silêncio se lê como lista inteira, e
quem procura o que ficou de fora conclui que não existe.

`scripts/medir-digitacao.mjs` guarda a medição. Ele existe porque o defeito
voltou duas vezes e nas duas só apareceu medindo -- lendo o código, não.

**O X, e o fim das setas**

Toda pílula tem um × (`IconeX`) que limpa sem precisar abrir o painel,
inclusive as de escolha única: cheguei a defender que ali seria redundante
por causa da linha "Todas as X", mas é o mesmo argumento que eu tinha usado
A FAVOR dele no múltiplo -- ele derruba os dois casos ou nenhum.

E nenhuma pílula tem seta. Ela existia só nas desenhadas à mão
(`PilulaDeFiltro`) e não nas do react-select, que são a maioria: metade do
conjunto anunciava "abre um painel" e a outra metade abria o mesmo painel
calada. Havia um `semSeta` pra desligá-la caso a caso; um enfeite que precisa
de exceção em cada uso é enfeite errado. A prop foi removida.

⚠️ O `IconeX` é SVG, não o caractere `✕`. Caractere não é ícone: a espessura
do traço vem do peso da fonte, então dentro da pílula (700, caixa alta) ele
saía visivelmente mais gordo que o resto do conjunto -- e o desenho muda
entre plataformas.

**O quadro padrão do Kanban era uma afirmação falsa em três partes**

Era `subgrupos[subgrupos.length - 1]`, com o comentário *"o último da lista,
que é o mais recente, que é o que costuma estar em uso"*. Nenhuma das três
valia: a listagem passou a vir em ordem ALFABÉTICA (então o último é o último
do alfabeto); mesmo na ordem antiga, "mais recente" não é "mais usado"; e
quem trabalha sempre no mesmo subgrupo trocava a pílula toda vez que entrava
na tela.

Agora a ordem é: o que a pessoa escolheu nesta sessão → o do link do lembrete
→ **o último que ela usou** (`useUltimoSubgrupo`, em `localStorage`, com o
NOME junto do id) → o primeiro da primeira página. O link do lembrete VENCE a
memória: a memória é um palpite, o link é uma instrução.

**Três armadilhas que a verificação em Chrome pegou**

1. *A falha não aparecia.* Com `keepPreviousData` a lista anterior continua
   na tela, o painel nunca fica vazio, e a mensagem de erro -- que entrava
   pelo `noOptionsMessage` -- não tinha lugar. Pior: aquela lista velha era
   apresentada como resposta à busca nova.
2. *Consertar isso quebrou outra coisa.* Esvaziar TODAS as opções na falha
   levava junto as que não vieram do servidor: no filtro de pessoas, "Sem
   responsável" sumia porque a lista de gente falhou. Hoje o aviso CONVIVE
   com o que sobrou; só o resultado remoto é descartado.
3. *O erro demora ~7s.* O `QueryClient` repete erro transitório 3x com espera
   crescente. Uma verificação que esperava 2,5s dava "não mostrou" pra um
   painel que mostra.

**⚠️ O rótulo do escolhido não pode depender da lista carregada**

`comOpcaoEscolhida` / `comOpcoesEscolhidas` reinjetam a opção escolhida
quando ela não está na página atual. No múltiplo o estrago é maior que um
rótulo feio: o `MultiSelect` monta o `value` filtrando as opções pelos ids, e
um id ausente SOME do valor -- a pílula cai de "3 selecionados" pra "1" sem
ninguém ter desmarcado nada. É por isso que o NOME é guardado junto do id no
estado (`FiltrosProcessos.clienteNome`, `FiltrosDaAgenda.subgrupoNomes`).

⚠️ E o nome fica **fora** do objeto que vira `queryKey` e query string: é
rótulo de tela, não critério de busca. Dentro, a mesma consulta viraria duas
entradas de cache e `temFiltroAtivo` contaria um filtro que não filtra nada.

### Trocar de grupo derruba o cache -- e `clear()` era a escolha errada (25/08/2026)

O servidor passou a recusar token que discorda do banco (ver o `CONTEXT.md` da
API). O front já sabia lidar com 401: renova sozinho e repete. Faltava uma
coisa: **o React Query continua com os dados do grupo ANTIGO em cache**, e uma
tela já montada seguiria mostrando o outro escritório até algo forçar refetch.

O detector mora em `salvarTokens`, que compara o `grupo_id` do token novo com o
guardado -- assim vale pros DOIS caminhos: o aviso que chega pelo canal e o
401 -> refresh, que acontece mesmo com o WebSocket fechado.

🔴 **A reação certa foi MEDIDA, e a "óbvia" era a pior.** Amostrando a tela a
cada 200ms depois de uma troca de grupo, em Chrome (A = dado do escritório
antigo, N = do novo):

```
clear()               AAAAAAAAAAAAAAAAAAAAAAAAA
invalidateQueries()   AAAAAAAAAAAANNNNNNNNNNNNN
resetQueries()        .............NNNNNNNNNNNN
```

`clear()` REMOVE a consulta que está em voo: a resposta que chega é
descartada e a tela nunca se corrige -- fica com o dado do outro inquilino, ou
vazia. Eu tinha escolhido essa, com uma justificativa que soava boa ("invalidar
deixa o dado antigo na tela, e ele não pode ficar nem um instante").
`invalidateQueries()` refetcha mas mostra o dado alheio até a resposta chegar,
ou seja, o mesmo que não fazer nada. Só `resetQueries()` descarta E refaz.

⚠️ **Dois testes meus não provavam nada antes de eu rodar o controle:** o
primeiro navegava com `page.goto`, que recarrega a página e destrói o cache de
qualquer jeito; o segundo devolvia o MESMO cliente para os dois grupos, então
"o dado reapareceu" não distinguia cache mantido de cache refeito. Sem o
controle, eu teria subido o `clear()` achando que estava verificado.

⚠️ O `authBridge` ganhou uma vaga SEPARADA (`setGrupoTrocadoListener`). Ele tem
um slot só, e reusá-lo atropelaria a transição de sessão expirada. Quem
registra é `queryClient.ts`, dono do cache: `auth.ts` não pode importar o
queryClient, que já importa `auth` pra `estaAutenticado`.

**Verificação de ponta a ponta, local:** `scripts/verificar-sessao.mjs` contra
a API real (`api/scripts/api_local.py`). Login real, a pessoa é movida por
fora da tela, e ela só NAVEGA:

| | grupo no navegador | escritório antigo | escritório novo |
|---|---|---|---|
| sem a verificação | `g-alfa` | **aparece** | não |
| com a verificação | `g-beta` | não | aparece |

### Auditoria da rodada de 25/08/2026 — cinco defeitos, todos em Chrome

Feita antes de commitar, sobre o diff da própria rodada. Nenhum apareceu
lendo o código; todos precisaram de navegador, e **três só com latência**
(na máquina local a resposta é instantânea e o defeito não existe).

**A raiz de três deles era a mesma:** a página e a pílula liam a MESMA lista,
e digitar é da pílula.

1. **Fechar a pílula sem escolher deixava a lista da página filtrada, pra
   sempre.** Buscar "zzz", não achar nada e apertar Esc desabilitava o botão
   "Nova tarefa" da Agenda -- a tela passava a achar que não existe subgrupo
   nenhum. `useBuscaDoPainel` zerava o termo ao fechar mas não avisava o pai,
   porque o aviso era barrado justamente por estar fechado. Hoje FECHAR envia
   termo vazio.
2. **Digitar na pílula de subgrupo trocava o quadro inteiro por um
   esqueleto**, letra a letra. A tela usava `carregando`, que inclui a espera
   de cada busca. Virou `carregandoPrimeiraVez`.
3. **O modal de tarefa dividia o hook com a pílula da página**: digitar
   "famil" dentro do modal filtrava a barra de filtros atrás dele. Agora ele
   chama `useSubgruposBuscaveis` por conta própria -- o que já era a regra
   escrita pro quadro e pros membros (*"O modal de tarefa busca os próprios
   dados"*).

A correção estrutural dos três é `OpcoesBuscaveis.primeiraPagina`: a pílula
lê `opcoes` (que encolhe ao digitar) e a página lê `primeiraPagina` (que
não). São duas consultas na mesma chave enquanto não há busca, então o React
Query faz uma requisição só.

4. **No múltiplo de formulário, escolher não limpava o que tinha sido
   digitado.** Marcar "Família" depois de digitar "famil" deixava o campo
   dizendo "famil" -- e como `ResumoSelecionados` esconde o "N selecionados"
   enquanto há texto, não sobrava nenhum sinal de que algo fora escolhido. O
   react-select limpa sozinho quando é ele que controla o campo; como aqui
   quem controla somos nós, faltava tratar a ação `set-value`.
5. **A tela de Clientes anunciava "120 clientes" com 50 linhas embaixo.**
   Efeito colateral do teto de busca que a API ganhou nesta mesma rodada.
   Hoje a linha diz *"Mostrando 50 de 120 clientes — refine a busca"*.

   ⚠️ E a primeira tentativa de consertar criou outro: passou a dizer
   "Mostrando 10 de 120 — refine a busca" na tela SEM busca, onde a saída
   certa é clicar na página 2. O aviso só vale com busca ativa **e** com a
   tabela já correspondendo ao que foi digitado -- durante a espera entre
   teclas ela ainda mostra o resultado anterior.

**O que a auditoria confirmou que NÃO era defeito:** Backspace num campo de
busca não apaga o valor escolhido (o `onChange(null)` que o X introduziu
chega a existir, mas `backspaceRemovesValue` não dispara aqui), e a barra de
páginas não aparece durante a busca de clientes -- o `total_paginas` que a
API devolve ali não vira página clicável.

### Teto de campo: o front discordava de si mesmo (25/08/2026)

Cada formulário escrevia o próprio `maxLength`, e por isso eles não batiam.
O nome do cliente é o caso que fecha o argumento:

| onde | teto |
|---|---|
| criar cliente | **nenhum** |
| editar cliente | **256** |
| o que o servidor aceita | **512** |

Três respostas para a mesma pergunta, no mesmo campo. Quem cadastrasse uma
razão social longa passava pela criação e **não conseguia corrigi-la
depois**; quem tentasse editar batia numa parede invisível na metade do que
o sistema permite -- sem mensagem, porque `maxLength` não avisa, só para de
aceitar tecla.

Os tetos agora vêm de `constants/limites.ts`, no mesmo espírito de
`constants/senha.ts`: **quem decide continua sendo o servidor**, isto é
conveniência pra a pessoa não descobrir o limite depois de enviar.

⚠️ A tela de Configurações do grupo NÃO usa a constante, e faz certo: ela lê
`nome_tamanho_maximo` de `GET /configuracoes`. Onde dá pra perguntar,
perguntar é melhor que espelhar.

⚠️ Vários tetos valem 512 e continuam SEPARADOS, igual do lado da API: valor
igual não é decisão igual.

**E `ALTURA_MAXIMA_MENU` existia duas vezes**, com nomes diferentes -- aqui e
como `ALTURA_LISTA` em `theme/painelFiltro.ts`, ambos 240. Os dois limitam a
MESMA lista do MESMO componente por caminhos diferentes (`maxMenuHeight` na
variante `padrao`, `menuList.maxHeight` na `chip`): mudar um só faria as duas
variantes do mesmo `Select` discordarem de altura.

`constants/limites.test.ts` varre por LITERAL, não por campo -- um número
solto num `maxLength` já é a duplicata, tenha nome do outro lado ou não. Tem
um teste de controle junto: sem ele, apagar todos os `maxLength` do projeto
também deixaria a lista vazia e o teste verde.

### Arrumação de 25/08/2026: env, tipos e rotas

Três coisas fora do lugar, corrigidas juntas.

**1. `import.meta.env` espalhado.** `VITE_API_URL` era lida em DOIS arquivos
(`services/auth.ts` e `services/api/client.ts`), cada um com o próprio
`as string | undefined`. Agora só `constants/ambiente.ts` toca
`import.meta.env` -- um `grep` que ache outro é regressão.

- ⚠️ `EM_DESENVOLVIMENTO` passa por constante e **não** estraga a eliminação
  de código morto: medido, o bundle saiu byte a byte igual e o
  `react-query-devtools` continuou fora de todo chunk.
- ⚠️ A URL do canal é **função**, não constante: ela é lida na hora de
  conectar, dentro do efeito. Virar constante mudaria esse momento.

**2. Tipos declarados onde deu.** Doze tipos de alcance global viviam dentro
do módulo que os usou primeiro (`utils/`, `constants/`, `theme/`,
`components/`, `services/`). Enquanto o consumidor era um só isso não
incomodava; quando passou a ser vários, o import cruzava a casa inteira e a
resposta pra "onde declaro este tipo?" passou a depender de quem chegou
primeiro. Dois arquivos existiam SÓ pra segurar um tipo
(`components/Toast/tipos.ts`, `components/Select/types.ts`) e sumiram.

Nome global exige nome global -- cinco foram renomeados ao subir:

| antes | depois | por quê |
|---|---|---|
| `Intervalo` | `IntervaloDeDatas` | intervalo de quê? tempo, número, página? |
| `DiaDaGrade` | `DiaDoCalendario` | "grade" não diz de que grade |
| `Opcao` | `OpcaoDeSelect` | havia **três** `Opcao` diferentes no projeto |
| `FormaDaOpcao` | `FormaDaOpcaoDeSelect` | acompanha a de cima |
| `Prioridade` | `PrioridadeDaTarefa` | ao lado de `Tarefa`, dizer de quem é |
| `OpcaoDePeriodo` | `OpcaoDeMenu` | a forma `{id, rotulo}` não é de período |

O último revelou uma duplicata: `PilulaDeMenu` tinha uma `interface Opcao`
local idêntica, **com o mesmo comentário sobre o zag copiado junto**. O nome
descrevia o primeiro uso, não a forma -- então quem precisou da mesma forma
pra outra coisa escreveu de novo. A cópia foi removida.

⚠️ `PrioridadeDaTarefa` e `StatusDeAtendimento` são DERIVADOS
(`typeof PRIORIDADES[number]`), o que obriga `types/` a importar de
`constants/`. O import é `import type`: some na compilação, então não há
ciclo em tempo de execução. A alternativa -- escrever o tipo à mão -- é
justamente o que deixaria a lista de palavras e o tipo divergirem.

⚠️ Tipo PRIVADO de uma página continua no `types.ts` dela. O critério é
alcance, não arquivo.

**3. Rotas dentro do `App.tsx`.** O mapa saiu pra `routes/index.tsx`, onde os
componentes de rota já eram vizinhos. O `App` ficou com o que é dele: montar
os provedores.

**Junto foram as pastas de um arquivo só:** oito `pages/*/constants/nome.ts`
viraram `pages/*/constants.ts`, e quatro `pages/*/helpers/` viraram arquivos
soltos na pasta da página. `TAMANHOS_PAGINA` estava em `types/` (constante na
pasta de tipos) e foi pra `constants/paginacao.ts`; `DIAS_DA_LISTA` estava
declarada dentro de um helper e foi pro `constants.ts` da Agenda.

⚠️ **Um defeito que eu mesmo introduzi e a varredura pegou:** copiei
`FiltrosBuscaProcessos` e `CamposOpcionaisProcesso` pra `types/` e esqueci de
apagar os originais em `services/api/processos.ts`. Ficaram DUAS definições
de cada, com os consumidores ainda na antiga -- exatamente o tipo de divergência
silenciosa que esta arrumação existe pra impedir. Achado rodando a varredura
de export sem consumidor depois do refactor, não à mão.

Verificado em Chrome com janela: as nove telas abrem, sem um erro de runtime.

### Yarn, não npm

`package-lock.json` removido, `yarn.lock` gerado. Existe um `.yarnrc` no
projeto fixando `registry "https://registry.npmjs.org"` — o registro padrão
do Yarn deu instabilidade momentânea, isso resolve.

### React Compiler com React 18

O projeto usa React 18, não 19 — mas o React Compiler funciona mesmo assim
(saiu de beta em out/2025, suporte oficial a partir do React 17). Configurado
em `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "18" }]],
      },
    }),
  ],
});
```

**Versões corretas no `package.json`** (⚠️ cuidado, é fácil errar):
`babel-plugin-react-compiler@^1.0.0` e `react-compiler-runtime@^1.0.0` —
**NÃO** `^19.1.0` (essa era só a versão RC/beta antiga; a numeração mudou
pra `1.0.0` quando o pacote saiu do beta).

### Design visual

Paleta "papel/tinta/vinho/latão": ink navy `#1b2a4a`, paper ivory `#f7f4ec`,
oxblood `#7a2e2e`. Fontes: Source Serif 4 (display) + IBM Plex Mono (números
de processo, labels) + Inter (corpo). Estética de "diário/docket" jurídico.

### Decisões de UX específicas

- Cadastro de processo é um **modal** (botão "+ Novo Processo" abre), não
  formulário inline. Edição de processo (`DetalheEditarProcesso.tsx`) é
  outro modal, mas aberto ao **clicar na linha inteira** do processo (não
  um ícone ✎ dedicado -- esse botão foi descontinuado, apelido virou só
  mais um campo junto com Cliente/Objeto-Assunto/datas/Observações/Fase/
  Situação, todos editados juntos). Os 2 ícones que sobram na linha
  (histórico, remover) chamam `event.stopPropagation()` no próprio
  `onClick`, senão o clique neles também abriria o modal de edição junto.
  `EditarMembroForm.tsx` (`MembrosPage`) segue o padrão de modal por ícone
  ✎ ainda, mas visível só pra `super_admin` na lista "Pessoas do grupo".
- Campos opcionais compartilhados entre cadastro e edição de processo
  (Cliente, Objeto/Assunto, Próxima providência, datas, Observações, Fase,
  Situação) ficam num componente único, `CamposProcesso.tsx`, controlado
  por props e reaproveitado nos dois formulários -- inclusive é quem chama
  `GET /clientes`/`/fases`/`/situacoes` (cache do React Query evita
  refetch duplicado mesmo montando 2x). Dropdown de Fase/Situação mostra só
  opções `ativo === true` como escolha nova, mas preserva o valor já
  selecionado mesmo que ele aponte pra uma opção desativada depois.
- `type="date"` nativo do browser pros campos "Data para verificar"/"Prazo
  final" -- não existia campo de data no app antes disso, sem lib nova.
- Máscara de CPF/CNPJ (`mascararCpfCnpj`, alterna formato pela contagem de
  dígitos) e telefone (`mascararTelefone`) em `utils/mask.ts`, mesmo padrão
  de `mascararNumeroProcesso` já existente -- usadas no form de Cliente.
- Todo select do sistema (valor único ou múltiplo) passa por um wrapper
  único em `components/Select`, em cima do `react-select` (`unstyled` +
  `classNames`) pra manter a mesma aparência do `<input>` de texto --
  `<select>` nativo e o `MultiSelect` custom antigo tinham divergido
  visualmente um do outro. Aba Convidar/EditarMembroForm usam `MultiSelect`
  (dropdown fechado com checkboxes) pra escolher subgrupos -- **não** mais
  o `<select multiple>` nativo, cujo listbox sempre aberto destoava do
  resto do form.
- Feedback de ação pontual (erro, sucesso) usa **toast** (`components/Toast`,
  `useToast()`), não mais `<div className="banner">` -- banner ficou restrito
  a estados persistentes de tela inteira (sessão expirada, senha redefinida).
- Listas paginadas (`Processos`, `Histórico`) usam `components/Pagination`:
  números de página clicáveis direto (não só anterior/próximo), porque o
  backend pagina por intervalo de sequência real, não cursor -- dá pra pular
  pra qualquer página sem visitar as anteriores.
- Texto de comunicação processual (`DetalheProcesso.tsx`, `DetalheHistorico.tsx`)
  vem em HTML da API do PJe e é renderizado via `dangerouslySetInnerHTML`
  depois de passar por `DOMPurify.sanitize()` -- fonte externa, nunca
  confiar sem sanitizar.
- Barra de abas do topo reduzida de até 7 pra 4 (`Processos`, `Clientes`,
  `Histórico`, `Grupo`) -- `Grupo` (`GrupoPage`) agrupa Subgrupos, Membros,
  Convidar, Fases e Situações como **sub-navegação própria**
  (`<nav className="tabs tabs--sub">`, variante menor de `.tabs` em
  `index.css`), cada sub-aba com seu próprio piso de papel (`SubAbaConfig[]`
  filtrado por `papelAtende`, mesmo mecanismo de `TODAS_AS_ABAS`). Fases e
  Situações são **2 sub-abas separadas** (não uma tela com as 2 listas lado
  a lado), cada uma renderizando `OpcoesLista` com um `tipo` diferente.
- `ClientesPage` cria cliente por **modal** ("+ Novo Cliente" abre
  `NovoClienteForm.tsx`), não mais formulário inline -- mesmo padrão de
  `NovoProcessoForm`. Lista usa paginação real (`components/Pagination`),
  igual Processos/Histórico.
- Paginação real foi estendida também pra **Subgrupos** e **Clientes** --
  essas 2 listas de `GrupoPage`/`ClientesPage` usam `components/Pagination`,
  mesmo mecanismo de GSI + contador de sequência de Processos/Histórico.
  Removido de um `subgrupo`/`cliente` via `removerMutation` usa
  `invalidateQueries` em vez de splice otimista no cache (`setQueryData`)
  -- splice local não é seguro com paginação real, pois um item removido
  pode deslocar itens de uma página pra outra. Membros **ainda não** tem
  paginação real (fica pra depois). Fases/Situações **não** usam
  `Pagination` (ver bullet abaixo).
- **Ordem de Fase/Situação por drag and drop**, não mais um campo numérico
  "Ordem" editável no formulário -- `EditarOpcaoForm.tsx` agora só edita o
  rótulo. `OpcoesLista.tsx` busca a lista inteira de uma vez
  (`TAMANHO_PAGINA_PICKER`, teto de 100, mesmo usado pelo dropdown de
  Fase/Situação em `CamposProcesso`) em vez de paginar -- não dá pra
  arrastar um item de uma página pra outra sem carregar tudo. Implementado
  com `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
  (`OpcaoRow.tsx`, handle `IconeArrastar` de `components/Icons`).
  **Resolvido (achado 14, revisão pós-deploy): `ordem` virou fracionário**
  no backend (`float`, era `int`) -- ao soltar um item, o front calcula a
  nova `ordem` como o **ponto médio entre os vizinhos na posição de
  destino** (`calcularOrdemAposMover`, nas pontas usa o vizinho existente
  ± 1) e dispara **1 único** `PATCH /fases|situacoes/{id}` pro item movido,
  em vez de reindexar 1..N e mandar até N-1 PATCHs a cada drop (desenho
  antigo, substituído). `criarMutation` calcula a `ordem` da opção nova a
  partir do maior valor **em memória** (`Math.max(...opcoes.map(o =>
  o.ordem)) + 1`), não mais da contagem (`total + 1`) -- depois de
  reordenações, `ordem` deixou de ter relação direta com a posição/
  contagem. `ordemLocal` (carimbo otimista) só é limpo quando `query.data`
  muda **e** o PATCH do reorder não está mais em voo (`reordenarMutation.
  isPending`) -- sem esse guard, um refetch em segundo plano concorrente
  apagaria o carimbo antes da confirmação, e a lista "voltava" à ordem
  antiga por um instante. **Bug corrigido na revisão de consistência
  pós-implementação:** como `reordenarMutation` é 1 única instância
  compartilhada, um 2º drag iniciado antes do PATCH do 1º confirmar
  reusava essa mesma instância -- se o 2º PATCH assentasse antes do 1º,
  `isPending` virava `false` com o 1º ainda em voo, furando o guard do
  efeito acima bem nesse instante. `handleDragEnd` agora ignora um novo
  drag enquanto `reordenarMutation.isPending` for `true` (só 1 reorder em
  voo por vez). **Sem teste dedicado** pra esse guard nem pro anterior --
  simular um drag de verdade via `@dnd-kit` em jsdom (posições/
  `getBoundingClientRect` reais) não é viável com a infra de teste atual;
  nenhum teste desse arquivo simula um drag de ponta a ponta, só a função
  pura `calcularOrdemAposMover` e os efeitos colaterais de `criarMutation`.
  Também nessa revisão: `reordenarMutation` deixou de reenviar
  `opcao.rotulo` junto da `ordem` nova (`atualizarOpcaoProcesso` aceita
  `rotulo: string | undefined` agora) -- reenviar o rótulo atual podia
  sobrescrever uma edição de rótulo concorrente com um valor já
  desatualizado. **Limitação aceita:** sem checagem de unicidade
  de `ordem` (nunca existiu), bisecções repetidas entre os 2 mesmos vizinhos
  podem eventualmente empatar por precisão de ponto flutuante -- irrelevante
  na prática (dezenas de opções, não centenas de drags no mesmo par).
  `KeyboardSensor` (`@dnd-kit/core`, com `sortableKeyboardCoordinates` de
  `@dnd-kit/sortable`) foi adicionado ao lado do `PointerSensor` já
  existente, pra reordenar via teclado (acessibilidade).
  **Limitação conhecida e aceita, não corrigida (achado na revisão
  pré-deploy):** o teto de 100 é um corte silencioso -- se a lista GLOBAL
  de Fase/Situação (soma de todos os grupos da plataforma, inclusive
  opções desativadas, que nunca são removidas) um dia passar de 100 itens,
  os itens além do 100º somem da tela sem aviso nenhum (diferente do
  picker de Cliente/Subgrupo, que é por grupo e dificilmente chega perto
  de 100). Avaliado e decidido não corrigir agora: paginação real
  (Prev/Next, como Subgrupos/Clientes) quebraria o drag-and-drop entre
  páginas (só reordenaria dentro da página carregada, não a lista
  inteira); buscar todas as páginas em loop resolveria sem esse problema
  (o backend já lê a partição inteira por chamada de qualquer forma --
  `opcoes_processo_repository.listar_pagina_por_tipo`, sem ganho real em
  paginar por request), mas foi adiado por ora -- 100 fases/situações é
  uma lista grande pra uma taxonomia curada por poucos `super_admin`.
- **Editar nome de Subgrupo** (`SubgruposPage/EditarSubgrupoForm.tsx`,
  padrão Modal igual `EditarClienteForm`/`EditarOpcaoForm`): ícone ✎ por
  linha, visível só pra `admin`/`super_admin` (`papelAtende("admin")`,
  mesmo piso do ✕ Remover que já existia). `atualizarSubgrupo`
  (`services/api/subgrupos.ts`) chama `PATCH /subgrupos/{id}` -- endpoint
  implementado no backend na mesma sessão (ver `CONTEXT.md` da API,
  mesmo padrão de `PATCH /clientes/{id}`: `ConditionExpression=
  attribute_exists(...)` pra 404 em id inexistente/de outro grupo,
  checagem de nome duplicado excluindo o próprio subgrupo).
- Rótulo "(inativa)" de fase/situação desativada é exibido com a primeira
  letra maiúscula: "(Inativa)".
- Excluir um Cliente associado a algum processo (`cliente_ids`) dá `409` --
  sem tratamento especial no front, cai no mesmo toast de erro genérico
  (`toastErroMutation`) que qualquer outra `ApiError`, mostrando a
  mensagem que o backend manda.
- Link do e-mail de notificação (`?processo=&comunicacao=`) não abre mais
  um modal na aba Processos -- abre direto na aba **Histórico**, no item
  exato que gerou o e-mail (`utils/deepLink.ts` + `HistoricoPage`). Decisão
  trocada durante o desenvolvimento: fazia mais sentido levar pro registro
  da notificação em si do que pro processo genérico.
- **Busca + filtros de Processos** (`ProcessosPage`): o campo "Buscar" fica
  sempre visível e virou texto livre (número, apelido, objeto/assunto,
  próxima providência, observações), não mais só número. Ao lado, um botão
  "Filtros" abre/fecha um painel colapsável (`.filtros-painel`, toggle via
  classe `aberto` -- mesmo padrão de progressive disclosure já usado no
  modal de processo e nas sub-abas de Grupo) com Cliente/Fase/Situação
  (`Select`) e Data para verificar/Prazo final ("até", não data exata --
  `<input type="date">`). Os campos do painel ficam num **rascunho**
  separado do que está de fato aplicado -- só viram filtro real ao clicar
  "Aplicar filtros" (fecha o painel e dispara 1 fetch só, em vez de
  refazer a busca a cada campo trocado). Filtros aplicados viram **chips**
  removíveis individualmente abaixo do painel, e o botão "Filtros" ganha
  uma contagem (`Filtros (2)`). Mesmo padrão de busca (texto livre, nome/
  CPF-CNPJ/telefone/e-mail) na aba Clientes, sem o painel de filtros
  estruturados (não faz sentido lá, só tem os 4 campos de identificação).
- **`useDeferredValue` (React 18) em vez de debounce manual** nos 2 campos
  de busca -- existia um `useEffect`+`setTimeout` próprio antes; trocado a
  pedido do usuário por ser a forma nativa do React de adiar uma
  atualização de baixa prioridade, sem precisar gerenciar timer/cleanup
  na mão. Não faz o painel de Filtros (que não é digitação contínua, só
  troca de campo) -- só a busca por texto livre.
- **Tooltip de ajuda (`InfoTip`, ícone "i")** ao lado do label "Buscar" em
  Processos/Clientes, explicando em 1 frase simples o que o campo busca --
  troca um texto sempre visível (`.callout`, versão inicial, descartada)
  por uma explicação sob demanda. O ícone fica **fora** do `<label
  htmlFor>` de propósito: colocar o tooltip dentro do label faria o texto
  inteiro virar parte do nome acessível do campo pra leitor de tela (lido
  toda vez que o campo ganha foco) -- por isso `<label>` e `<InfoTip>`
  ficam como irmãos dentro de um `.field-label-row`, não aninhados.
- **Tags no card do processo** (`.docket-tags`, dentro de `ProcessosPage`):
  Fase atual, Situação atual e (se preenchidos) "Verificar dd/mm/aaaa"/
  "Prazo dd/mm/aaaa" aparecem como selos pequenos em maiúsculas, mesma
  paleta de cores dos badges já usados em Membros/Histórico. Só renderiza
  o bloco se pelo menos 1 desses 4 campos estiver preenchido.
- **Resolvido (achado 9): renovação de token concorrente vira mutex
  compartilhado** -- `services/api/client.ts` guarda uma única promise em
  módulo (`renovacaoEmAndamento`); vários 401 ao mesmo tempo esperam o
  mesmo `renovarToken()` em vez de disparar 1 chamada a `/refresh` por
  request que falhou (o backend rotaciona o refresh token a cada uso --
  chamadas paralelas descartariam umas às outras).
- **Resolvido (achado 16): logout/expiração se propaga entre abas** --
  `services/auth.ts` escuta o evento `storage` (dispara só nas OUTRAS
  abas) e chama `dispararAutenticacaoInvalida()` quando a chave do access
  token some do `localStorage`, reaproveitando a mesma ponte que
  `queryClient.ts` já usa pro 401. Também dispara quando `e.key === null`
  (revisão de consistência pós-implementação) -- é o sinal de
  `localStorage.clear()`, que `limparTokens()` não usa hoje (remove chave
  por chave), mas cobrir esse caso evita que um futuro refactor pra
  `.clear()` quebre essa propagação entre abas silenciosamente.
- **Resolvido (achado 15): retry do React Query só em erro que pode se
  resolver sozinho** -- `services/queryClient.ts`, `podeSerTransitorio(erro)`
  substitui a regra antiga: `ApiError` com status < 500 (400/401/403/404/
  409...) nunca é retentado (determinístico); erro de rede (não `ApiError`)
  ou 5xx continua até 3x.
- **Resolvido (achado 18): destaque de campo com erro (`field-error`/
  `campoInvalido`) removido** de `NovoClienteForm`, `EditarClienteForm`,
  `NovoProcessoForm` e `DetalheEditarProcesso` -- o toast com a mensagem
  específica do backend já é o único sinal de erro; não valia o custo do
  backend passar a apontar qual campo falhou só pra isso. A classe CSS
  `.field-error` continua existindo (usada por outros pontos), só a
  aplicação dela nesses 4 formulários foi removida.
- **Resolvido (achado 19): link de convite/redefinição expirado (410) não
  mais parece "senha errada"** -- `AceitarConvitePage`/`RedefinirSenhaPage`
  checam `err instanceof ApiError && err.status === 410` no catch do
  submit e trocam o formulário por um `.banner` dedicado ("link inválido
  ou já foi usado"), em vez de destacar os campos de senha. Exigiu
  `aceitarConvite`/`redefinirSenha` (`services/auth.ts`) passarem a
  lançar `ApiError` (com `.status`) em vez de `Error` puro.
- **Resolvido (achado 20): `EditarMembroForm` explica o Salvar
  desabilitado** -- texto de apoio ("Selecione ao menos 1 subgrupo para
  salvar", classe nova `.field-hint` em `index.css`) aparece quando
  `subgruposSelecionados.length === 0` -- baseado na mensagem de
  `SubgruposObrigatorios` no backend ("Selecione ao menos 1 subgrupo"), com
  "para salvar" adicionado pelo contexto do botão.
- **Resolvido (achado 17): máscara de telefone fixo (10 dígitos)** --
  `mascararTelefone` (`utils/mask.ts`) assumia sempre o corte de celular
  (prefixo de 5 dígitos: `XXXXX-XXXX`), errado pra fixo (`XXXX-XXXX`).
  Agora decide o corte pelo tamanho já digitado depois do DDD: até 8
  dígitos → prefixo de 4 (fixo); a partir do 9º → prefixo de 5 (celular) --
  mesmo "reflow ao digitar o 9º dígito" usado pela maioria das máscaras de
  telefone BR. Não havia teste cobrindo 10 dígitos, foi por isso que
  passou despercebido.

### Paginação: o contrato é do servidor, e ele MUDA

Duas telas ficaram defasadas quando o backend passou a paginar rotas que
antes devolviam tudo -- e nos dois casos o comentário do front afirmava o
contrário do que a API fazia:

- `GET /grupos/membros` virou paginada e o front chamava sem query nenhuma.
  A partir da 11ª pessoa o grupo ficava invisível, e como o total local era
  `pessoas.length`, a `Pagination` se escondia sozinha -- não havia página 2
  pra clicar.
- `GET /processos` passou a paginar a busca FILTRADA, e o front continuava
  descartando `pagina`/`tamanhoPagina` quando havia filtro.

Duas regras que saíram disso:

1. **Quem precisa do conjunto inteiro percorre as páginas.** Use
   `todasAsPaginas` (`services/api/paginacao.ts`) ou o laço de
   `useTarefasDoQuadro`. Pedir `tamanhoPagina: TETO_POR_PAGINA` **não** é
   "traz tudo" -- 100 é o máximo que a API aceita, e acima disso a lista vem
   cortada em silêncio.
2. **Chave de cache por FORMATO.** `qk.membros(params)` guarda uma página;
   `qk.todosOsMembros()` guarda o conjunto. Compartilhar chave entre dois
   formatos foi o que quebrou o arraste do Kanban -- ver abaixo.

### Rótulo de atendimento na Agenda: lote por id, não catálogo inteiro

A Agenda mostra o assunto do atendimento vinculado a uma tarefa. Antes ela
buscava **todos** os atendimentos para montar um mapa `id → assunto`. Isso
custava caro por um motivo que só aparece olhando o backend:
`atendimentos_repository.listar_pagina` relê **todos** os atendimentos de
**todos** os subgrupos visíveis a cada página pedida, e fatia em memória.
Percorrer o catálogo com `todasAsPaginas` lia a coleção uma vez por página.

Medido, com 8 subgrupos:

| atendimentos | requisições HTTP | Queries | itens lidos |
|---|---|---|---|
| 100 | 1 | 8 | 100 |
| 1.000 | 10 | 80 | **10.000** |
| 5.000 | 50 | 400 | **250.000** |

…para exibir cerca de dez assuntos.

Agora `useAssuntosDasTarefas` pede só os pares `(subgrupo, atendimento)` que
as tarefas **da tela** referenciam, via `GET /atendimentos/resumos`. O custo
passa a depender de quantos aparecem na tela, não de quantos o escritório
tem — a variável errada trocada pela certa.

**Por que lote e não `useQueries` com uma query por id.** As duas
alternativas desacoplam do tamanho do catálogo, mas com `useQueries` o
número de requisições cresce com o **período** que a pessoa escolhe na
Agenda: um trimestre viraria dezenas de chamadas paralelas, e o navegador
serializa em ~6 por host. Com lote, um dia e um trimestre custam uma
requisição.

O argumento a favor do `useQueries` — reaproveitar o cache da tela de
detalhe — não se sustenta: o detalhe devolve os registros do atendimento, o
resumo devolve só o assunto. São formas diferentes, e compartilhar chave
entre duas formas é o defeito recorrente deste projeto.

**Escopo.** O backend filtra por subgrupo visível **antes** de ir ao banco, e
par fora do escopo ou inexistente simplesmente não volta — responder erro
permitiria descobrir quais atendimentos existem comparando as respostas.

**Dois tetos, naturezas diferentes.** `MAXIMO_DE_RESUMOS = 500` é guarda de
entrada: acima disso é bug no front ou abuso. `CHAVES_POR_BATCH_GET = 100` é
limite físico do DynamoDB, e o repositório fatia internamente. Um é
contrato, o outro é plataforma.

### Catálogo completo NÃO leva `staleTime` — e a razão é medida, não estética

Uma auditoria apontou que `todasAsPaginas` sobre uma coleção que cresce sem
limite refaria a caminhada de páginas a cada montagem e a cada foco de
janela, e eu adicionei cinco minutos de validade **sem medir**. Depois medi,
em produção:

⚠️ **Clientes saiu desta lista em 25/08/2026** -- não há mais catálogo
completo de clientes. `useTodosOsClientes` foi removido; quem precisa de
cliente busca a primeira página (ver *Toda lista que pode crescer sem
limite*). Os que sobraram continuam caminhando as páginas de propósito:
subgrupo e opção de processo são cadastro de escritório, e a caminhada é uma
requisição.

| catálogo | itens | páginas |
|---|---|---|
| clientes (removido) | 2 | 1 |
| subgrupos | 8 | 1 |
| atendimentos | 1 | 1 |
| membros | 15 | 1 |
| opções (fases/situações) | 88 | 1 |

Tudo cabe em **uma** página. A "caminhada" que eu dizia estar economizando é
uma requisição — e o React Query já deduplica chamadas simultâneas da mesma
chave, então nem o caso de vários componentes montando juntos o `staleTime`
resolvia.

O custo, por outro lado, era real. O canal WebSocket só invalida
notificação; nada mais. A **única** coisa que trazia dado de outra pessoa
era o `refetchOnWindowFocus`, e o `staleTime` é exatamente o que o desliga.
O cenário concreto: a sócia cadastra um cliente, você volta para a aba, e o
select de "Novo processo" não o mostra por até cinco minutos — num sistema
de escritório compartilhado, isso faz a pessoa cadastrar de novo.

**Se um dia o volume justificar**, o ajuste certo não é `staleTime`: é parar
de caminhar todas as páginas só para rotular tarefa na Agenda, e buscar os
assuntos apenas dos ids que estão na tela. `staleTime` troca correção por
desempenho; a mudança de estratégia não troca nada.

`useCatalogos.test.ts` fixa a ausência, para que reintroduzir exija passar
pelo teste — e por esta seção.

### Prefixo de `queryKey` é contrato: dois formatos não dividem a mesma chave

O carimbo otimista do arraste fazia
`setQueriesData<Tarefa[]>({ queryKey: ["tarefas"] }, ...)`. Esse prefixo era
compartilhado por consultas que guardam **objeto**, não array -- a Área de
trabalho e o detalhe do processo. O `.map` lançava dentro do `onMutate`, e
quando o `onMutate` lança **o React Query nunca chama o `mutationFn`**: o
PATCH não saía e o cartão não mudava de coluna no servidor.

Ao mexer em `setQueriesData`/`getQueriesData` por prefixo, restrinja com
`predicate` ao formato esperado.

### Leitura de `localStorage` no render é congelada pelo React Compiler

O compilador está ligado (`vite.config.ts`). Uma chamada sem dependência
reativa -- `getApelido()` no corpo do componente -- é memoizada por todo o
*mount*, e o `AppShell` não desmonta ao navegar: o nome antigo ficava na
topbar a sessão inteira depois de editar o perfil.

Estado que muda em runtime vive no `SessaoContext` (`apelido`,
`trocarApelido`). `localStorage` continua sendo a persistência; o contexto é
quem faz a tela reagir.

### O modal de tarefa busca os próprios dados (25/08/2026)

`ModalDeTarefa` recebia `colunas` e `membros` **por prop**, vindos da página
-- que só conhece o subgrupo que está exibindo. Trocar o subgrupo dentro do
formulário não recarregava nenhum dos dois.

Resultado: o seletor continuava oferecendo as colunas do quadro anterior, e
salvar batia em `_validar_coluna` no servidor -- *"A coluna não pertence ao
quadro deste subgrupo"*. **Quem participa de mais de um subgrupo só conseguia
criar tarefa no que estivesse aberto na tela.** O seletor de subgrupo existia
e não servia pra nada; pior que não existir, porque prometia.

O modal passou a buscar quadro e membros **do subgrupo escolhido nele**,
pelas mesmas `queryKey` que as páginas já usam (`qk.quadro`,
`qk.membrosDoSubgrupo`) -- então o caso comum, criar no subgrupo aberto, sai
do cache sem requisição nova. `KanbanPage` e `AgendaPage` deixaram de passar
as props; a Agenda perdeu junto o `quadroDoModalQuery`, que existia só pra
isso.

**A coluna virou valor DERIVADO, não estado.** Guardada, ela ficava errada em
dois momentos: enquanto o quadro ainda vinha (o estado nascia vazio e nada o
preenchia depois, então o Salvar ficava travado sem dizer por quê) e depois
de trocar de subgrupo. Uma linha resolve os dois: se a coluna não está NESTE
quadro, vale a primeira dele.

**O mesmo defeito existia no Responsável**, por `_validar_responsavel`: a
lista vinha do GRUPO inteiro, e escolher alguém de fora do subgrupo dava
*"Responsável não é membro do subgrupo"* -- e esse aparecia mesmo sem trocar
de subgrupo. Agora vem de `GET /subgrupos/{id}/membros`, o mesmo recorte que
o servidor aplica.

⚠️ **Risco criado pela própria correção, fechado com teste:** recortar por
subgrupo faz sumir quem SAIU dele depois de já ter tarefas. Sem guarda,
abrir a tarefa mostraria "Sem responsável" e salvar gravaria `null` -- a
atribuição some sem ninguém mandar. O modal mantém a pessoa na lista mesmo
não sendo mais membro.

⚠️ **Regressão pega antes de subir:** a rota do subgrupo devolvia só
`{email, adicionado_em}`, então o seletor passou a mostrar `joao@x.com` no
lugar de "João Meireles". Resolvido **na API**, que passou a devolver
`apelido` -- em vez de o front pedir `GET /grupos/membros` só pra traduzir
e-mail em nome, volta que a aba de Membros do Subgrupo já fazia pelo mesmo
motivo.

**E `GET /subgrupos/{id}/membros` caiu de `manager` pra `user`** (recortado
por participação). Sem isso, quem tem papel `user` não conseguia atribuir
tarefa a ninguém, **nem a si mesmo** -- ficava fora de "minhas tarefas", dos
cartões da Área de trabalho e do lembrete de prazo. Detalhes no `CONTEXT.md`
da API.

**Verificado em Chrome com janela**, não só em jsdom: abrindo o quadro no
Trabalhista e trocando pro Cível, a coluna passa de "Triagem" pra "A Fazer"
e o `POST` sai com o par certo.

### Escape fecha a camada de cima, não o que está atrás (25/08/2026)

`Modal` fecha por um listener de `keydown` no `document`. O menu do
`react-select` e o calendário do `DatePicker` respondem à mesma tecla. Sem
coordenação, **um Escape com qualquer um deles aberto fechava os dois**: quem
só queria dispensar a lista perdia o formulário e o texto já digitado.

A interceptação fica em quem abre a camada, e não no `Modal`: cada um sabe se
está aberto, e o `Modal` não teria como reconhecer toda camada flutuante
(o menu do `Select` no modo `padrao` não carrega marca nenhuma).

- **`Select`/`MultiSelect`:** pelo `onKeyDown` do react-select, que roda
  ANTES do handler dele. `stopPropagation`, nunca `preventDefault` -- a lib
  desiste do próprio tratamento se o evento vier com `defaultPrevented`, e
  aí o modal fecharia e o menu ficaria aberto, o inverso exato do desejado.
  No modo `chip` o menu é controlado por nós, então além de barrar o evento
  é preciso fechá-lo à mão: quem o fechava era justamente o listener de
  `document` que acabou de ser barrado.
- **`SeletorData`:** a pergunta "está aberto?" vem do DOM
  (`SELETOR_CALENDARIO`, a marca que a própria lib escreve), não de estado.
  Tentei primeiro com estado alimentado por `onOpenChange` e no Escape ele
  ainda vinha `false` -- sondado em Chrome.

Verificado em Chrome nos três casos: a camada fecha, o modal fica, o texto
digitado permanece, e um **segundo** Escape fecha o modal -- o comportamento
normal continua de pé.

⚠️ **Eu tinha escrito nos comentários que "jsdom não pega".** Errado: pega os
dois casos, e a mutação prova. O defeito passou despercebido porque ninguém
tinha escrito o teste, não porque o ambiente não alcançava.

### Auditorias de 24/08/2026 — seis rodadas depois da primeira

Seis rodadas adicionais sobre o mesmo diff, com correção e verificação por
mutação a cada uma. A suíte foi de 501 para 534 testes.

**O padrão dominante:** em quatro das seis, o achado mais grave foi
regressão da correção da rodada anterior. Não é sinal de que auditar não
funciona — é de que cada correção é código novo, e código novo tem defeito.
O que muda entre as rodadas é a gravidade: começou em "renomear uma fase não
atualiza a tela" e "o cartão do cliente trunca em dez", terminou em mensagem
inconsistente entre leitura e escrita.

**A forma recorrente do defeito:** corrigir um lado e deixar o gêmeo aberto.
`TarefasVinculadas` tratava `isError` e `ProcessosDoCliente`, um arquivo ao
lado, não; `toastErroMutation` ganhou o ramo do 401 transitório e
`useToastOnQueryError` não.

**O erro mais caro não foi de código, foi de afirmação.** Escrevi num
comentário que `renovarToken` só limpava tokens em recusa do servidor. Não
verifiquei — ele limpava em qualquer resposta não-ok, inclusive o 502 de um
deploy. Outra guarda foi construída em cima dessa afirmação e não protegia o
caso que descrevia. Daí a varredura de comentários citando símbolo
inexistente no repo da API (`test_comentarios_citam_codigo_real.py`), que
cobre a metade mecânica do problema; a metade semântica continua dependendo
de ir conferir.

### Auditoria de 23-24/08/2026

Revisão completa do front (~19.900 linhas) em 6 frentes paralelas, junto com
a da API. Os defeitos e as decisões acima saíram dela. A suíte foi de 490
para 501 testes, cada correção com regressão verificada por mutação.

Três testes que eu tinha escrito passavam com o defeito de volta -- o da
paginação com filtro precisou esperar o debounce de 300ms antes de olhar a
tela. Vale desconfiar de teste que passa de primeira.

O projeto também ganhou **ESLint** (`eslint.config.js`, `yarn lint`): antes
só o `tsc --noEmit` rodava. A config é enxuta e focada no que pega bug --
`react-hooks/exhaustive-deps` e variável não usada como erro, sem regra de
estilo.

## Responsáveis, e o que a tela decidiu (26/08/2026)

### O status virou campo, e por isso a aba Detalhes existe

O `Select` de status do atendimento era um controle que **salvava sozinho**,
sem "Salvar", plantado no cabeçalho ao lado do botão de excluir -- enquanto o
assunto não tinha onde ser editado. Status é campo, e campo se edita em
formulário: a aba é o que tornou isso possível.

A ETIQUETA de status continua no cabeçalho, porque ela informa e é o que se
quer ver de relance ao abrir. Só o CONTROLE mudou de lugar.

⚠️ **Um PATCH só para os três campos.** Um por campo faria o servidor comparar
e notificar três vezes o que é uma edição só. E "Salvar" fica desabilitado
enquanto nada mudou -- senão salvar um formulário intocado reenvia a mesma
lista de responsáveis.

### 🔴 "Detalhes" é a SEGUNDA aba do atendimento

`abaValida` devolve `abas[0].id`, então a ordem da lista É a aba padrão. Pondo
Detalhes em primeiro -- como em processo e cliente --, **abrir um atendimento
passaria a mostrar o formulário em vez da conversa**.

A consistência com as telas irmãs é de _ter_ abas, não de qual vem primeiro; e
lá a primeira também é a que responde "o que é isto", que aqui é a conversa.

A prova é negativa e vale registrar: os testes existentes continuaram verdes
sem uma linha alterada, e a mutação (Detalhes em primeiro) derruba **quatro**
deles.

### Os painéis vão MONTADOS -- e isso muda como se testa

O de Registros obriga: `NovoRegistro` tem estado local, e desmontá-lo ao
trocar de aba jogaria fora a anotação que a pessoa acabou de escrever -- num
campo cujo conteúdo, depois de salvo, não se edita nem se apaga.

⚠️ **Consequência para os testes**: o conteúdo das três abas EXISTE no DOM o
tempo todo. `toBeInTheDocument` passa com a tela completamente quebrada; a
régua é **`toBeVisible`**. Escrevi a asserção errada na primeira versão do
teste do status, e ela passou.

### Quem já é responsável mas SAIU do subgrupo continua na lista

`GET /subgrupos/{id}/membros` não devolve quem saiu -- então, sem a união
explícita, abrir o item mostraria a lista sem essa pessoa e **salvar apagaria
a atribuição em silêncio**. É a mesma guarda que `ModalDeTarefa` e
`FormularioDocumento` já tinham.

E com o NOME, não o e-mail cru: `responsaveis_nomes` vem pareado por índice
com `responsaveis`, e o servidor resolve a lista INTEIRA (`apelidos_de` filtra
por grupo, não por subgrupo). É o caso em que a pessoa mais precisa
reconhecer de quem se trata.

⚠️ **O campo não passa `permitirLimpar`.** O X do `MultiSelect` esvazia sem
abrir o painel, e num campo de mínimo 1 isso leva direto a um 422 -- a pessoa
usaria um controle que o próprio formulário oferece para chegar num erro do
servidor.

### Trocar de subgrupo ZERA os responsáveis -- e não os clientes

O defeito que `ModalDeTarefa` já documenta: alguém do subgrupo antigo seguiria
escolhido e o salvamento falharia na validação do servidor, num campo que a
pessoa nem lembra de ter mexido.

⚠️ **Cliente NÃO é zerado junto**, e a diferença é o escopo: cliente é do
GRUPO (a validação dele não olha subgrupo), responsável é do SUBGRUPO.

⚠️ E o default **não** é reposto na tela. Quem cria vira responsável no
SERVIDOR, e só se for membro do subgrupo escolhido -- repor aqui exigiria
replicar essa régua no front, e ela já é a resposta que
`GET /subgrupos/{id}/membros` dá.

### "Sem responsável" é achável de propósito

Se o único responsável sai do subgrupo, o item fica órfão: o aviso passa a ir
para o subgrupo inteiro pelo fallback, e **ninguém entende por quê**. A
resposta não é mais um canal de aviso -- é a listagem deixar isso achável.
Custa uma opção na pílula e uma marca na linha, no lugar do traço que as
outras colunas vazias usam.

🔴 **Ele é um parâmetro PRÓPRIO (`sem_responsavel`), não `responsavel_id=""`.**
`montarQuery` descarta valor vazio, e no servidor `""` já significa "não
filtrar": pedido como string vazia, o filtro nem sairia do navegador e a tela
mostraria a lista inteira parecendo filtrada. Falha silenciosa, do tipo que
ninguém nota até contar as linhas.

⚠️ "Eu" é resolvido no FRONT (vira `getEmail()`), dentro de
`useFiltrosProcessos`. O servidor não precisa saber o que "eu" significa, e
traduzir em cada tela duplicaria a regra.

### Não oferecer o que a API vai negar

Duas funções puras nasceram disso, no molde de `podeDestruirDocumento`:

- **`podeListarPessoas()`** -- `GET /grupos/membros` tem piso `manager`, e é a
  ÚNICA rota de catálogo acima de `user`. A lista de pessoas some do filtro de
  quem é `user` **nas três telas** (Processos, Kanban e Agenda); as opções que
  não dependem dela ficam. Nas duas últimas o 403 já acontecia em produção.
- **`podeRemoverResponsavel(email)`** -- acrescentar e sair da própria lista
  são de qualquer membro; **tirar OUTRA pessoa é `manager`+**.

⚠️ **Esconder não é a proteção** -- quem manda é a rota. É para não oferecer o
que ela vai negar: um controle que existe e falha em 403 é pior que um
ausente, porque a pessoa tenta, espera, e recebe uma recusa que parece
defeito.

⚠️ E não cabe um helper comum para as três `podeXxx`: elas têm a mesma FORMA
("`manager`+ ou é seu") e regras diferentes -- uma compara `criado_por`, outra
exige `admin` como atalho, a terceira compara a sessão. Um helper precisaria
de um parâmetro por diferença e esconderia justamente o que cada tela decide.

### Os seis avisos novos no sino, e o alvo `documento`

As frases dizem que a pessoa passou a **RESPONDER**, não que recebeu uma
tarefa: o que muda é de quem é a responsabilidade, e é ela que decide quem
recebe os avisos daquele item daqui pra frente.

No aviso de SAÍDA a frase diz o que a pessoa **perde** ("tirou você dos
responsáveis"), não o que foi feito -- "removeu você da lista" soaria
administrativo e esconderia a consequência.

`documento_vinculado` fala no **singular** mesmo quando foram doze: o servidor
suprime os repetidos por janela em vez de agrupar. A contagem exata está na
aba para onde o aviso leva.

🔴 **Tipo e alvo desconhecidos degradam sem quebrar** -- `frasePrincipal` cai
no título cru e `destinoDaNotificacao` devolve `null` (a linha não vira link).
É isso que permite a API subir antes do front, e tem teste próprio.

⚠️ **A lista de tipos é espelhada à MÃO** entre `constants/notificacoes.ts` e
`NOTIFICACAO_*` da API, e **nenhum teste atravessa os dois runtimes**. Lacuna
conhecida, escrita aqui de propósito: a rede é a degradação graciosa acima.

## 4) Blocos de código essenciais

**Variáveis de ambiente:**

```
VITE_API_URL=<Function URL da AWS, sem barra no final>
VITE_WS_URL=<endpoint wss do API Gateway WebSocket, com o stage no fim>
```

Configurar tanto no `.env` local quanto no Vercel (Settings → Environment
Variables) — são independentes, precisam ser atualizadas nos dois lugares
se as URLs mudarem.

⚠️ **Variável do Vite entra no BUILD, não em runtime.** Adicionar no painel
do Vercel não muda o bundle que já está no ar: é preciso um build NOVO. E
"Redeploy" com *Use existing Build Cache* marcado (o padrão) reaproveita o
bundle e a variável continua de fora — desmarque, ou faça um push. O sinal
de que funcionou é o **hash do arquivo em `/assets/` mudar**; enquanto for o
mesmo nome, é o mesmo build. Perdido tempo com isso em 23/08/2026.

⚠️ **A CSP em `vercel.json` precisa liberar o `wss://` também.** O
`connect-src` cobre WebSocket, e ele NÃO herda a permissão do `https://` do
mesmo host — são esquemas diferentes. Sem a entrada
`wss://*.execute-api.sa-east-1.amazonaws.com`, o navegador bloqueia o canal
e a única pista é uma linha no console dizendo "The action has been
blocked". Achado testando em produção, depois de a variável já estar certa.

`VITE_WS_URL` é OPCIONAL: sem ela o sino continua correto, porque a
consulta é a fonte da verdade — o que se perde é só o tempo real (o aviso
passa a aparecer quando a aba ganha foco). Por isso o hook simplesmente não
abre a conexão quando ela falta, em vez de quebrar.

**Comandos:**

```bash
yarn install
yarn dev          # servidor local
yarn build        # roda tsc -b (type-check) + vite build
yarn typecheck    # só tsc -b, sem build
yarn test         # vitest, roda uma vez (CI)
yarn test:watch   # vitest, modo watch
```

**Decodificação de JWT no client** (só pra UI, autorização real sempre no
backend): o `papel` e `grupo_id` do usuário vêm decodificados do próprio
access token JWT salvo no `localStorage`, em `services/auth.ts`.

## 5) Tarefas pendentes

1. Confirmar que o front em produção (Vercel) está apontando pra URL certa
   da API — a Function URL da AWS mudou várias vezes durante o
   desenvolvimento/depuração do backend; se o backend for redeployado de um
   jeito que force recriação da Function URL, o `VITE_API_URL` do Vercel
   precisa ser atualizado manualmente de novo.
2. ~~Nenhum teste de componente/página~~ -- **resolvido**: 57 arquivos, 551
   testes, cobrindo páginas e componentes. `yarn test`.
3. Considerar travar `Access-Control-Allow-Origin` no backend pro domínio
   específico do Vercel, em vez de `"*"` (pendência do lado do backend, mas
   afeta o front se for feito).
4. ~~**Três telas baixam o escritório inteiro pra escrever um nome**~~ --
   **feito** em 25/08/2026. `autor_nome` vem na notificação e no registro de
   atendimento, resolvido pelo servidor; saíram as consultas de
   `SinoDeNotificacoes`, `AtendimentosPage` e `AtendimentoDetalhePage`.
   `/grupos/membros` ficou só onde a lista é o ASSUNTO da tela.

   **Conferido em Chrome** por `scripts/verificar-nome-do-autor.mjs`, cuja
   asserção principal é uma AUSÊNCIA: ele falha se `/grupos/membros` for
   pedido. Controle com o front anterior: 2 pedidos. Agora: zero.

   ⚠️ No controle a frase mostrava o apelido do mesmo jeito, porque o front
   antigo ignorava o campo novo e resolvia pela lista. **Um teste que olhasse
   só o nome na tela teria passado nos dois casos.** Texto original abaixo.

   ⚠️ Este item dizia "o sino baixa todos os membros **em toda tela**".
   Verificado, e é impreciso: `qk.todosOsMembros()` é chave COMPARTILHADA
   por seis consumidores, e `listarTodosOsMembrosDoGrupo` percorre as
   páginas com `TETO_POR_PAGINA = 100` -- num escritório de até 100 pessoas
   é UMA requisição, deduplicada entre as telas.

   O que é verdade, e justifica o item:

   - nenhuma dessas consultas define `staleTime`, então refaz a cada
     montagem de `AtendimentosPage`, `AtendimentoDetalhePage`,
     `SubgruposPage` e `MembrosPage`, e a cada foco de janela;
   - baixa o escritório INTEIRO pra nomear no máximo 50 autores, e cresce
     com o escritório;
   - 🔴 **todas têm `enabled: papelAtende("manager")`** -- quem é `user` vê
     e-mail cru, sempre. É o mesmo defeito que `responsavel_nome` tirou do
     cartão do Kanban.

   E não é só o sino: `nomeDoAutor` alimenta também `LinhaDeAtendimento` e
   `LinhaDoTempo`, sobre o `autor_id` dos registros de atendimento.

   **A saída:** `autor_nome` vindo do servidor, nas três. Some `membrosQuery`
   de `SinoDeNotificacoes`, `AtendimentosPage` e `AtendimentoDetalhePage`;
   `/grupos/membros` fica só onde é o assunto da tela (Membros e Subgrupos).

   ⚠️ **`autor_nome` é OPCIONAL no tipo.** `MensagemDoCanal.notificacao` é
   tipada como `Notificacao`, e o objeto que chega pelo canal WebSocket
   **não** tem o campo -- ele nasce do stream do DynamoDB, não da rota.
   Obrigatório faria o TypeScript afirmar o que é falso. Na prática não
   aparece: `aoChegar` é `invalidateQueries`, então o push é gatilho e a
   lista sempre vem da API.
5. ~~**A Agenda pede um quadro POR SUBGRUPO exibido, e trunca em 50**~~ —
   **feito** em 25/08/2026. `coluna_nome` e `esta_concluida` vêm na tarefa.
   `useQuadrosDosSubgrupos` (96 linhas) foi apagado, com a fiação das props
   por quatro níveis, o teto de 50 e o aviso "não foi possível carregar os
   quadros".

   **Reproduzido em Chrome, com 55 subgrupos semeados no ambiente local**
   (`scripts/verificar-agenda-sem-quadros.mjs`) — produção tem 7, então isto
   nunca apareceria lá:

   | | tarefas riscadas | pedidos de `/quadro` |
   |---|---|---|
   | front anterior | **50 de 55** — as de além do 50º apareciam pendentes | **50** |
   | front atual | 55 de 55 | **0** |

   ⚠️ **Dois testes saíram, e não em silêncio.** "O mesmo `coluna_id` em
   quadros diferentes não se confunde" MUDOU DE LADO — virou teste de API. E
   "NÃO mostra a lista antes dos quadros" perdeu o objeto: não há mais
   quadros a esperar, os campos chegam na mesma resposta. Os dois viraram um
   só, cuja asserção é uma AUSÊNCIA: a tela não voltou a pedir `/quadro`.

   ⚠️ `esta_concluida`, e **não** `concluida`: a tarefa também carrega
   `concluido_em`, um carimbo gravado que é ausente em toda tarefa concluída
   antes do arquivamento existir. O nome longo evita que alguém pegue o
   errado — e o errado falharia exatamente como a Agenda falhava.

   Texto original abaixo.

   ⚠️ Este item dizia que um grupo com mais de 50 subgrupos "veria só os 50
   primeiros". Verificado, e o efeito é pior: `useTarefasDaAgenda` traz as
   tarefas de **todos** os subgrupos visíveis, mas `useQuadrosDosSubgrupos`
   recebe `subgrupos.primeiraPagina` -- os 50 primeiros. A tarefa do 51º
   subgrupo aparece **sem nome de coluna e sem tachado: concluída exibida
   como pendente**. Não é "ver menos", é afirmar errado.

   Latente hoje (7 subgrupos em produção, conferidos em 25/08/2026), e o
   tipo de defeito que só aparece quando já incomoda.

   **A saída:** `GET /tarefas` traz `coluna_nome` e `concluida`. Somem as 96
   linhas do hook, a fiação das props por quatro níveis de componente, o teto
   de 50 e o aviso persistente de "não consegui carregar os quadros" -- e
   esse último é ganho estrutural, não corte: hoje existe um estado em que a
   lista chegou e os quadros não, e a tela **afirma o contrário do que é**.

   Some também uma decisão duplicada: `colunas_que_concluem`, na API, diz de
   si mesma ser o "ponto único" de "o que é concluída" -- mas
   `useQuadrosDosSubgrupos` decide de novo, por conta (`e_conclusao ||
   e_arquivado`). São dois hoje.

   **O que NÃO some:** `useConcluirTarefa` (do Workspace, não da Agenda)
   continua buscando o quadro pra achar a coluna de DESTINO, e o Kanban
   continua carregando o quadro pra desenhar coluna vazia. `qk.quadro()`
   mantém quatro consumidores.

   🔴 **ORDEM DE DEPLOY: API primeiro, sempre.** Com o front na frente, a
   Agenda leria `concluida` de uma API que ainda não manda -- `undefined`,
   falso, e toda tarefa concluída voltaria a aparecer como pendente. É o
   defeito alvo, recriado durante a janela e sem nada na tela indicando.
   Vale igual pro rollback.

   ⚠️ **Os stubs entram junto.** `scripts/stubsDaApi.mjs` devolve `autor`,
   `autor_id` e `coluna_id`; sem acrescentar os campos novos ali, a
   verificação visual em Chrome mostra nome vazio e parece defeito do
   código, não do stub.

---

## Abas nos dois detalhes, e o teor da movimentação com endereço (26/08/2026)

**O que mudou.** Detalhe do processo virou três abas (Detalhes / Tarefas /
Movimentações); detalhe do cliente, duas (Detalhes / Processos vinculados).
As listas das duas telas deixaram de ser texto morto: linha de tarefa abre o
`ModalDeTarefa`, linha de movimentação abre o teor, linha de processo do
cliente abre um resumo com "Abrir processo".

**Três decisões que valem mais que o layout:**

1. **A aba mora na URL** (`?aba=tarefas`), ao contrário de `GrupoPage` e
   `PerfilPage`, que guardam em estado local. A diferença é real: telas de
   detalhe são alcançadas por LINK -- do e-mail, do Kanban, da Agenda --, e
   um F5 que devolve pra primeira aba ali incomoda de verdade. `replace` na
   navegação: trocar de aba não é passo do histórico.

2. **Os painéis vão MONTADOS, só escondidos** (`display: none`). A aba de
   Detalhes das duas telas é um formulário com estado local; desmontar ao
   trocar de aba jogaria fora o que a pessoa acabou de digitar. Quem decide
   isso é **quem chama** -- `GrupoPage` continua montando condicional,
   porque lá cada aba é uma página com consultas próprias.

   ⚠️ `display: none`, nunca `opacity`/`visibility`: só o `display` tira o
   conteúdo do fluxo de foco. Verificado em Chrome com 40 `Tab` seguidos: o
   cursor só passeia dentro do painel ativo.

3. **A movimentação ganhou endereço** (`?comunicacao=900001`), a pedido do
   usuário -- "abrir a movimentação dentro do sistema e não fora dele".

   ⚠️ Houve, entre uma coisa e outra, um "Abrir o documento no tribunal"
   lendo o campo `link`. **Eu o adicionei sem que ninguém pedisse** -- notei
   que a API mandava o campo e nenhuma tela usava -- e o defendi como "único
   caminho pro documento oficial". Removido a pedido no mesmo dia: é porta
   pra FORA do sistema, e a justificativa tinha furo. Dos 71 links medidos,
   64 abriam, **6 devolviam 403** (pje.tst.jus.br) e **1 apontava pra
   `sessao-integracao-backend.prd.rede.tst`** -- host da rede interna do
   tribunal, vazado no dado do PJe, que nunca abriria de fora. Nesses 7 o
   botão prometia e falhava depois do clique.

   O campo `link` continua chegando da API e guardado no tipo. Os testes que
   asseguram sua AUSÊNCIA (em jsdom e em Chrome) existem pra que voltar a
   exibi-lo seja uma decisão, não um descuido.

   O resumo do processo no detalhe do cliente **não** ganhou URL, e é
   deliberado: a coisa que ele resume já tem uma, que é a tela do processo.

### O modal do teor virou tela de detalhe, e ganhou o caminho pro envio

O modal mostrava etiquetas soltas no topo (data · órgão) e o texto. Virou
rótulo e valor -- Tipo de comunicação, Disponibilizada em, Órgão, Teor --,
porque "TJMG" sozinho não diz se é o órgão, o tribunal ou o autor. Mesmo par
de leitura do detalhe do envio (`CampoDeLeitura`, que subiu pra
`components/` justamente por isso).

**"Ver o e-mail enviado" aparece só quando houve e-mail**, lendo `tem_envio`
da resposta de detalhes (campo novo da API, 26/08/2026). Leva ao Histórico
já naquele envio, pelo `state.deepLink` -- o mesmo caminho que `RotaRaiz`
usa pro link do e-mail, sem o desvio pela raiz.

🔴 **A maioria das movimentações NÃO tem e-mail, e isso não é falha.** O robô
grava o acervo inteiro do processo na primeira checagem e só notifica o que
está dentro da janela de 30 dias: publicação anterior ao cadastro nunca
gerou aviso. Medido sobre dado de produção: **9 de 73**. Oferecer o botão
sempre levaria, em 64 casos, a um Histórico que responde "não foi possível
localizar a notificação" -- que soa como falha do sistema.

⚠️ `tem_envio` ausente (resposta de API anterior a 26/08/2026) também não
oferece o botão: não saber não é motivo pra prometer. É o que torna o deploy
do front seguro mesmo sem a API -- mas a ORDEM continua sendo API primeiro,
senão o botão simplesmente não existe pra ninguém.

⚠️ **Sem "Fechar" no rodapé dos dois modais novos.** O X do cabeçalho já é
esse controle, e dois botões com o mesmo nome acessível no mesmo diálogo
fazem o leitor de tela anunciar a escolha duas vezes -- e quebram qualquer
busca por nome (foi exatamente assim que um teste começou a falhar:
"Found multiple elements with the role button and name Fechar").

⚠️ **`BotaoDeLink` não serve pra `href`** -- ele é `<button>` de propósito,
a própria docstring diz. Ficou registrado porque a lição sobrevive ao link
que a motivou: quando precisar de um endereço de verdade nesta base, é `<a>`,
com `rel="noopener noreferrer"` se abrir em outra aba.

⚠️ **O rodapé do modal só existe quando há ação.** Sem envio (e sem o link do
tribunal), `RodapeDeAcoes` vazio desenhava uma faixa cinza no pé do diálogo
sem nada dentro -- que lê como controle que sumiu, não como "não há ação
aqui". A checagem em Chrome CONTA botões em vez de procurar a classe:
`RodapeDeAcoes` é emotion, com nome embaralhado, e um seletor por classe
passaria sempre sem verificar nada.

**A lista de movimentações parou de despejar o teor.** Cada item trazia a
publicação inteira num bloco rolável de 200px -- cinco itens viravam cinco
áreas de rolagem dentro da rolagem da página. O teor foi pro modal, que tem
espaço pra ele.

**Compartilhados que subiram de lugar** (alcance mudou, destino muda):
`abaValida` e `PARAM_DA_ABA` foram pra `utils/abas.ts`, junto de `idDaAba`/
`idDoPainel`; `CampoDeLeitura` saiu de `HistoricoPage/components` pra
`components/`.

🔴 **Os testes que já existiam nestas duas telas passariam com as abas
completamente quebradas.** Com os painéis montados, o conteúdo das três abas
está no documento o tempo todo, e `findByText` acha texto escondido. A régua
virou `toBeVisible`, e o helper de painel chega nele pelo `aria-controls` da
aba -- painel escondido tem nome acessível VAZIO, então
`getByRole("tabpanel", { name })` nunca acha os inativos.

Cinco mutações confirmaram que cada teste novo consegue falhar: painel que
nunca esconde, `?comunicacao=` que não manda na aba, `abaValida` sem
fallback, painel de Detalhes desmontado, e "Verificado em" de volta pra
dentro da aba.

⚠️ **Um comentário meu foi desmentido por mutação.** Eu havia escrito que o
painel de processos do cliente não podia desmontar "porque a contagem dele é
o que trava a exclusão" -- é falso: a página tem o próprio
`processosQuery`. O comentário foi corrigido e o teste que afirmava isso,
removido.

🔴 **O Chrome achou um defeito que o jsdom não achava.** Chegando por
`?comunicacao=` sem `?aba=` e fechando o teor, a pessoa caía na aba
Detalhes -- fechar uma publicação expulsava quem estava lendo a lista. O
teste em jsdom conferia só a URL e dava "ok". Corrigido (fechar crava
`aba=movimentacoes`), e as duas verificações passaram a olhar a lista atrás
do modal.

**Onde os tipos das abas moram.** `AbaDoProcesso` e `AbaDoCliente` ficam em
`pages/<Pagina>/types.ts`, não em `constants.ts` -- a convenção do projeto
(`KanbanPage/types.ts`, `HistoricoPage/types.ts`). Os dois são DERIVADOS da
lista de abas (`(typeof ABAS_DO_PROCESSO)[number]["id"]`), e não uniões
escritas à mão: acrescentar uma aba passa a ser erro de compilação em todo
lugar que não a trata.

**Verificação:** `scripts/verificar-abas.mjs` (Chrome com janela, 35
checagens) contra `yarn offline` + `scripts/offline/semear_abas.py` na API.
O cenário semeia PARES de propósito -- movimentação com teor e sem, uma com
e-mail enviado e outra sem, tarefa em coluna que conclui e em coluna que
não, dois processos no mesmo cliente --, porque aba vazia passa por qualquer
defeito e um botão que aparece sempre passa em qualquer lista onde tudo é
igual.

⚠️ O `.env` do front aponta pra PRODUÇÃO. Subir `yarn dev` sem
`VITE_API_URL=http://localhost:8099` deixa a verificação "local" batendo na
API de verdade.

## Documentos: o arquivo não passa pela API (26/08/2026)

Telas novas: `/documentos` (listagem) e
`/documentos/:subgrupoId/:documentoId` (a tela do documento), mais a aba
**Documentos** nas três telas de detalhe.

### 🔴 O envio é de três passos, e o registro é o último

```
1. POST /subgrupos/{sg}/documentos/upload  → chave + formulário assinado
2. o NAVEGADOR posta o arquivo direto no armazenamento
3. POST /subgrupos/{sg}/documentos         → agora existe documento
```

O payload síncrono de um Lambda é 6 MB; o teto de um documento é 20. Pela
API, todo arquivo acima de 6 MB falharia com um erro de gateway que não
menciona tamanho.

⚠️ **`enviarArquivo` usa `fetch` cru, sem `Content-Type` nosso e sem
`Authorization`.** O `FormData` precisa que o NAVEGADOR escreva o
`multipart/form-data` com o `boundary` que ele mesmo gerou -- escrever o
cabeçalho à mão apaga o boundary e o armazenamento não separa os campos. E o
token do Argos não tem o que fazer num pedido que não é pra nós: quem
autoriza é a assinatura que já vai dentro de `campos`.

⚠️ **`campos` vai ANTES do arquivo no formulário.** Numa política de POST o
arquivo tem que ser o último campo: o armazenamento para de ler quando o
encontra, e qualquer campo depois dele é ignorado -- inclusive a assinatura.

⚠️ **O modal NÃO fecha em falha, e não limpa nada.** Um envio de 20 MB que
falha no fim custaria tudo de novo, inclusive a descrição digitada. É por
isso que o envio acontece com o modal aberto: a pessoa está ali, e tentar de
novo é um clique. Testado.

### 🔴 O CSP mudou, e o download NÃO precisou

`connect-src` de `front/vercel.json` ganhou
`https://argos-monitor-documentos-prod.s3.sa-east-1.amazonaws.com` -- o host
foi **medido**, não suposto (ver `api/CONTEXT.md`: o padrão do boto3 emite o
host global, e o `virtual` que a API fixa emite o regional).

- **O envio** é `fetch` pro armazenamento → bloqueado sem o host. O erro
  aparece como falha de CORS, que engana.
- **O download** é `window.location.assign` numa URL que já vem com
  `Content-Disposition: attachment` → **navegação de topo**, que não passa
  por `connect-src`. Buscar o blob por XHR pra forçar o nome exigiria o host
  aqui também, e não traria nada.

🔴 **`vercel.json` só vale em produção.** Isto passa 100% no `yarn offline` e
quebraria no deploy -- mesma categoria do IAM.

### 🔴 Quem pode DESTRUIR não é quem pode mexer

`podeDestruirDocumento` espelha `documentos_service._garantir_pode_destruir`:
`manager`+ destrói qualquer um, abaixo disso só quem adicionou.

A régua é mais apertada que a de tarefa e atendimento **porque o que se perde
é diferente**: lá some uma linha, aqui some o **arquivo**, e o bucket não tem
versionamento. Com o piso `user` seco que a feature nasceu, qualquer colega de
subgrupo destruía o arquivo de qualquer outro.

⚠️ **Vale pros DOIS botões, e o segundo é a porta irmã.** "Substituir" apaga o
objeto antigo do mesmo jeito -- e, ao contrário de "Excluir", **não passa por
diálogo de confirmação**. Esconder só um deixaria o caminho mais silencioso
aberto. Uma mutação que ignora a régua no `CartaoDoArquivo` mata o teste.

⚠️ **O que NÃO some**: "Baixar" e "Salvar". A trava é sobre destruir, não
sobre usar nem sobre mexer -- baixar é leitura, e corrigir um título é
reversível. Estender a trava a esses dois seria burocracia sem nada protegido
em troca.

⚠️ **`criado_por` vazio cai pro lado restritivo.** Sem o teste de vazio, um
`getEmail()` nulo comparado a `""` passaria -- mesma armadilha já escrita em
`podeExcluirSubgrupo`, e ela **sobreviveu à suíte da API inteira** até ganhar
teste próprio dos dois lados.

🔴 **Esconder o botão não é a proteção** -- quem manda é a rota, e ela recusa
com 403. É pra não oferecer o que a API vai negar: um botão que existe,
confirma num diálogo que promete apagar e volta 403 parece defeito do
sistema. A mensagem do servidor nomeia a ação que a pessoa tentou e dá duas
saídas, a mais rápida primeiro ("peça a essa pessoa ou a um gerente do
subgrupo").

### O modal só CRIA

Editar e excluir vivem na tela do documento, como em Processos e Clientes: a
linha da tabela é clicável (com `tabIndex` + Enter/Espaço, porque não há
outro caminho sem mouse) e leva pro detalhe. A listagem não tem lixeira nem
lápis.

⚠️ **`FormularioDocumento` recebe o documento JÁ CARREGADO**, e por isso é um
componente separado da página. Os campos nascem do `useState` inicializado
com o que veio -- técnica que exige o dado presente no primeiro render. Na
página, esse render acontece com a consulta pendente: o estado nasceria
vazio, nada o preencheria depois, e **salvar apagaria o documento inteiro**.

A alternativa era um `useEffect` copiando a resposta pro estado. Funciona, e
é exatamente o que o `react-hooks/set-state-in-effect` aponta -- render em
cascata a cada resposta. Montar só depois do dado chegar resolve os dois de
uma vez, e é o que `FormularioCliente` já fazia.

### 🔴 O 404 depois de excluir, que só o Chrome pegou

`qk.documento` é `["documentos", "detalhe", sg, id]` -- **começa com
`["documentos"]`**. Invalidar o prefixo cru ao excluir derrubava também a
consulta da própria tela, que ainda está montada naquele instante: ela
rebuscava o documento recém-apagado e tomava 404.

⚠️ **`removeQueries` não resolve, e piora** -- medido: tirar do cache uma
consulta com observador ativo faz o observador buscar de novo NA HORA, então
em vez de uma revalidação vinham duas. O que resolve é o `predicate`
deixando a entrada do detalhe intacta.

Invisível na suíte, porque lá nada revalida sozinho. Foi
`scripts/verificar-documentos.mjs` que acusou, pelo ouvinte de `response` que
coleta tudo acima de 400.

### `VinculoDaTarefa` virou `components/VinculoDeRegistro`

Subiu junto com `EtiquetaDeVinculo`, que estava pendurada dentro de
`ModalDeTarefa/` sendo um componente de alcance geral. As constantes saíram
de `constants/vinculoDaTarefa.ts` pra `vinculoDeRegistro.ts`, e o tipo
`VinculosDaTarefa` virou `VinculosDeRegistro`.

🔴 **E ele NÃO ganhou o slot de cliente que o plano previa.** Dois fatos
derrubaram a ideia na implementação:

1. **`CampoDeClientes` já resolve isso**, com busca própria, escolha múltipla
   e etiquetas -- e já serve Atendimentos e Processos. Um terceiro caminho
   pro mesmo dado seria a terceira resposta pra mesma pergunta, que é o
   estrago que `constants/limites.ts` documenta.
2. **A cardinalidade não bate.** Processo e atendimento são UM cada (escolher
   troca); cliente é LISTA (escolher empilha). Numa caixa só, a mesma ação
   teria dois comportamentos dependendo do tipo da linha clicada -- e nada na
   tela diria qual.

O padrão do sistema já era dois campos lado a lado: `NovoAtendimentoForm` põe
`CampoDeProcesso` e `CampoDeClientes` separados. Um teste em
`ModalDeTarefa/index.test.tsx` trava que a tela de tarefa não mudou.

### O formulário tem seletor de Subgrupo, que a referência não tem

Naquele sistema não existe subgrupo. Aqui ele é o **escopo de acesso**:
obrigatório, escolhido só na criação (faz parte da chave primária, e o
DynamoDB não altera chave), exatamente como em `ModalDeTarefa`. A dica diz o
que o campo DECIDE -- sem ela, ele parece classificação.

### `AtendimentoDetalhePage` ganhou abas

Era a linha do tempo direto, sem `Abas`, enquanto processo e cliente já se
dividiam assim. Documentos entrou como aba nas três, e uma tela sem abas ao
lado de duas com abas faria o mesmo conteúdo ser procurado em dois lugares
diferentes conforme a tela.

🔴 **Os painéis vão MONTADOS.** `NovoRegistro` tem estado local, e desmontá-lo
ao trocar de aba jogaria fora a anotação que a pessoa acabou de escrever --
num campo cujo conteúdo, depois de salvo, **não se edita nem se apaga**. Sem
teste isso seria invisível em revisão: a aba volta, o campo está vazio, e
parece que a pessoa não digitou. Coberto em jsdom e em Chrome.

### `CampoDeArquivo`: a recusa daqui é conveniência

Quem recusa de verdade é o armazenamento, pela política assinada -- é lá que
o teto não depende de nada que roda na máquina de quem envia. Esta serve pra
não fazer a pessoa esperar minutos de upload por uma negativa que já dava pra
dar na hora. Por isso ela **não chama `onMudar`**: se chamasse, o modal
montaria o envio de um arquivo que ele mesmo acabou de recusar.

⚠️ **Zero byte também é recusado.** A política do envio começa em 1 byte
justamente porque, com 0, nasceria um documento que baixa em branco -- sem
erro em lugar nenhum.

🔴 **O `<input type="file">` fica VISUALMENTE escondido, não `display: none`.**
É ele que carrega o rótulo, o foco de teclado e o diálogo nativo. Escondê-lo
de verdade tiraria o campo do Tab, e não há outro caminho pra escolher
arquivo sem mouse. Vale nos dois estados: com arquivo escolhido, clicar no
rótulo "Arquivo" troca o arquivo direto.

⚠️ **A remoção zera o `input.value`.** O navegador compara com o valor
anterior e não dispara `change` quando são iguais -- sem isso, o campo ficava
mudo justamente na correção mais provável (remover por engano e recolocar), e
parecia defeito do arquivo.

### `titulo` e `nome_arquivo` são coisas diferentes

`titulo` é como o documento aparece na lista; `nome_arquivo` é o nome com que
ele **baixa**, e não entra no `PATCH`. A dica do campo diz isso ANTES de a
diferença surpreender -- quem renomeia o título esperando renomear o arquivo
baixado só descobriria meses depois. O cartão do arquivo mostra o nome de
download por essa mesma razão.

### Verificação

`scripts/verificar-documentos.mjs` (Chrome com janela, 19 checagens) contra
`yarn offline` + `semear_abas.py` + `semear_documentos.py`.

O que só Chrome responde: o arquivo sai mesmo da máquina (em jsdom o `fetch`
é um dublê), o input escondido continua alcançável, o painel de aba escondido
sai do **foco**, e o download dispara sem trocar a página de baixo.

🔴 **As fixtures são GERADAS, não versionadas** -- inclusive a de 20 MB + 1
byte. `setInputFiles` aponta pra um caminho em disco, então sem arquivo o
roteiro não roda em máquina limpa; versionar poria binário no histórico pra
sempre.

🔴 **O caso negativo da permissão usa `colega@local.test`, não `chefe`.**
`escopo_subgrupo.subgrupos_visiveis` dá o grupo inteiro a `admin` pra cima, e
`chefe` é `super_admin` -- com ela, o documento do subgrupo alheio aparece de
propósito. O roteiro afirmava o contrário e ficava **verde**, porque
perguntava antes de a lista carregar. Corrigido o timing, ele acusou -- e o
defeito era do teste.

⚠️ **A lição**: um teste negativo que não espera o estado chegar não é um
teste fraco, é um teste que mente. Ele passa quando o sistema está quebrado e
quando está certo, indistinguivelmente. Todas as afirmações de ausência do
roteiro agora esperam uma linha conhecida aparecer primeiro.

## As cores de status, e o defeito que só a cor computada revelou (26/08/2026)

**"Em andamento" passou a ser âmbar e "Fechado", o azul da marca.** O
raciocínio inverte o que `theme/atendimento.ts` dizia -- *"o que está aberto
pede atenção, o fechado só precisa ser reconhecível"*: o âmbar vira o "pede
atenção" (atendimento aberto é trabalho em curso, que ainda vai voltar) e o
azul marca o resolvido. **O docstring foi reescrito junto** -- trocar o mapa e
deixar a explicação velha faria o arquivo explicar o oposto do que faz.

### 🔴 O problema não era só do amarelo

O plano dizia para consertar o `warn`. Medido, os **três** tons do semáforo
reprovam em AA para texto pequeno, em **todos** os fundos do sistema:

| | sobre o tint | sobre o cartão | sobre o canvas |
|---|---|---|---|
| `good` | 3,12 | 3,49 | 3,25 |
| `warn` | 3,00 | 3,35 | 3,12 |
| `bad` | 3,72 | 4,04 | 3,77 |

Todos passam em **3:1**, que é a régua de *elemento gráfico* — e é por isso
que a tarja de prioridade, o ponto do cartão e os ícones seguem usando a cor
cheia, e fazem certo. O que não pode é **texto**.

`badDark` nasceu sozinho quando a etiqueta de falha precisou. `warnDark`
(#995d00) e `goodDark` (#167953) vieram agora, ao descobrir que `Faixa`
pintava os **dois** tons em 13,5px/700 e ninguém tinha medido o verde. Os três
guardam o matiz e a saturação da cor cheia, só baixando a luminosidade — é o
que faz "âmbar escuro" continuar sendo âmbar.

Cada tom tem três papéis: `DEFAULT` (gráfico), `bg` (o tint) e `text` (a única
que passa em 4,5:1).

**Quem trocou para `.text`** — os quatro que pintam texto pequeno: `Faixa`
(os dois tons), `EtiquetaDePrazo` (o "hoje" — a linha do atrasado já usava
`bad.text`, **porta irmã aberta no mesmo ternário**), `LinhaDeColuna` do
Kanban, e `LinhaDoResumo` (mesmo caso: as duas metades do ternário discordavam
sobre a mesma régua).

**Quem NÃO trocou, e faz certo**: `ColunaDoQuadro` e `Toast/Aviso` (ícones),
`CORES_DA_PRIORIDADE` (tarja e ponto), e `MinhasAtividades` — cujo número é
**24px/800**, ou seja *texto grande* pelo WCAG, onde 3:1 basta.

### 🔴 Contraste certo com a cor errada — o defeito que passou em tudo

`status.warn.text` apontava para `{colors.warn.dark}`, que **não existia** na
camada de tokens crus: só o `bad` tinha `dark`. A referência não resolveu, a
cor caiu para o herdado, e a etiqueta "Em andamento" saiu com texto em `ink`
sobre o âmbar.

**Passava em contraste** — 14,81:1 — e parecia plausível na tela. O token
estava certo. O componente estava certo. A ligação entre os dois é que estava
rompida, e nenhum teste de unidade alcança isso.

Daí os dois guardas, que cobrem coisas diferentes:

- **`theme/contraste.test.ts`** afirma a matemática: cada `*Dark` passa em
  4,5:1, cada cor cheia fica **entre 3:1 e 4,5:1** (o par negativo, sem o qual
  alguém "simplificaria" o tema apagando os `*Dark`), e cada `*Dark` guarda o
  **matiz** da cor cheia — senão qualquer cinza escuro passaria e apagaria o
  significado da cor.
- **`scripts/verificar-cores.mjs`** afirma a cor **computada pelo Chrome**, por
  igualdade. "Escureceu um pouco" não serve: herdar o `ink` também escurece, e
  foi assim que o defeito passou.

⚠️ **O roteiro FALHA quando não tem o que medir**, em vez de imprimir "nada a
medir" e seguir verde. `semear_abas.py` ganhou uma tarefa com prazo **hoje** só
para a `EtiquetaDePrazo` sair do estado neutro — antes as duas nasciam com
`dia(5)` e a checagem se pulava sozinha, em silêncio.

## Quadro sem coluna nenhuma não pode ser tela em branco (26/08/2026)

`subgrupos_service.criar` semeia o quadro padrão junto, então o caminho normal
nunca chega lá. Mas é um estado **alcançável**: subgrupo gravado fora do
serviço, criação que falhou no meio, ou alguém que apagou as colunas uma a uma.

Foi o que aconteceu no ambiente local — `banco.py` gravava o subgrupo com
`put_item` direto e pulava o `semear_padrao`. Como a listagem é alfabética
("Civel g-alfa" antes de "Resumo"), era justamente ele que o Kanban abria por
padrão: **quadro em branco, sem colunas, sem mensagem, sem erro**, no primeiro
clique de quem subia o ambiente.

⚠️ **A mensagem muda com quem está olhando, porque a saída é outra.** Criar
coluna é `admin` no servidor:

- **`admin`+**: *"Este subgrupo ainda não tem quadro. Crie as colunas para
  começar a usar o kanban."* — com o botão **Editar quadro**.
- **abaixo disso**: *"O quadro deste subgrupo ainda não foi montado. Peça a um
  admin para criar as colunas."* — sem botão, que a API negaria.

Uma frase só ou mandaria o admin procurar outra pessoa, ou mandaria o `user`
para um botão que ele não tem.

⚠️ **"Nova tarefa" também some.** Sem coluna não há onde a tarefa cair: o modal
abriria, `colunaEscolhida` ficaria vazia e "Salvar" nasceria travado — um
formulário inteiro que não conclui.

## Endereço do cliente, e o botão de tarefa nos detalhes (27/08/2026)

Duas entregas independentes, e um defeito de permissão que estava no caminho.

### O passo 0: o formulário de cliente era editável para quem não pode salvar

`ClienteDetalhePage` renderizava `FormularioCliente` **sem guarda de papel
nenhuma**. `PATCH /clientes` é `manager` -- um `user` abria a ficha, via os
campos editáveis e o "Salvar" habilitado, digitava tudo e tomava **403** no
clique.

🔴 E o próprio arquivo enunciava a regra que quebrava: o docstring de
`FormularioCliente` explica que Excluir só aparece para `admin` porque
*"mostrar um botão que a API vai negar é pior que não mostrar"* -- três linhas
acima do Salvar que fazia exatamente isso.

**A forma escolhida foi `readOnly`, não `disabled` nem esconder**, e a razão é
medida: `GET /clientes` é `user`, então quem não pode gravar ainda tem direito
a **ver** o cadastro -- e a copiar dali o telefone ou o e-mail. Em Chrome, o
`opacity: 0.5` que o Chakra aplica no `disabled` deixa o valor em **3,26:1** de
contraste sobre o branco, abaixo dos 4,5:1 de texto normal. Travar a edição não
pode custar a leitura, que é a única coisa que sobra para quem está vendo.

🔴 **E `handleSubmit` confere também.** Campo `disabled` não participa do
formulário; `readOnly` participa -- esconder o botão virou aviso, não guarda.

⚠️ A régua tem **dois papéis diferentes** (editar é `manager`, excluir é
`admin`), e isso segue o backend. Só `/clientes` e `/subgrupos` divergem assim;
os outros sete recursos usam o mesmo papel para os dois verbos.

### `useCep` não tem debounce, e a razão é aritmética

A guarda é o **tamanho**: só consulta com 8 dígitos. Quem digita "30130010"
passa por sete valores incompletos, e os sete têm menos de 8 dígitos -- a
guarda os elimina sozinha, sem timer. **Um debounce não evitaria consulta
nenhuma**; só atrasaria em 300ms a única que importa.

⚠️ E `ESPERA_DA_BUSCA_MS` diz de si mesma que é dos **campos de busca**
(Clientes, Processos, vínculo de tarefa), compartilhada para que a mesma ação
não pareça mais lenta numa tela que na outra. CEP não é busca por texto: é
campo de tamanho fixo, que se sabe completo.

🔴 **A memória do último CEP é esquecida quando a consulta FALHA.** Sem isso a
mensagem "tente de novo" era mentira: com a memória intacta, redigitar o mesmo
CEP não disparava nada e não havia como tentar. E ela **não** é limpa quando o
campo fica incompleto -- limpar ali fazia apagar um dígito e redigitar o mesmo
consultar de novo, sobrescrevendo o que a pessoa tivesse corrigido à mão.

### A consulta passa pela nossa API porque o CSP obriga

O `connect-src` do `vercel.json` lista `'self'`, a Lambda URL, o WebSocket e o
bucket. **`viacep.com.br` não está lá** -- chamar o provedor direto do
navegador é bloqueado. Não é preferência de arquitetura: quem tentar
"simplificar" por ali bate num erro de CSP em produção.

⚠️ O roteiro em Chrome vigia isso, e a checagem é dos **provedores de CEP**,
não de "qualquer host externo": as fontes do Google saem em toda página e o CSP
as permite -- uma asserção de "nenhum host externo" acusa aquilo e não prova
nada sobre o CEP.

### O `Select` não é clearable, e a UF precisa da opção vazia

`CamposProcesso` já escreve isso, e por isso Fase e Situação montam
`[{value: "", label: "Nenhuma"}, ...]` à mão. Sem a opção explícita, **quem
escolhesse uma UF nunca voltaria ao vazio** -- um estado que a API aceita e a
tela não alcançaria.

⚠️ As 27 siglas em `constants/endereco.ts` são **espelhadas à mão** de
`api/src/shared/validacao.py`: não há canal para buscá-las
(`GET /configuracoes` é `admin` e é config do grupo, não catálogo). Mesmo
arranjo de `PRIMEIRA_PAGINA_DE_OPCOES`, com comentário cruzado nos dois lados.

### `CamposDeEndereco` mora em `components/`, e não dentro de uma página

Quem o usa são **duas** páginas. `CamposProcesso` -- de quem ele copia a forma
(objeto de valores + `mudarCampo` tipado) -- vive em `ProcessosPage` e é
importado por `ProcessoDetalhePage`, o que já é uma exceção à regra de
estrutura e não vale repetir.

⚠️ **Sem prefixo de `id`.** Uma auditoria chegou a exigir um, alegando colisão;
conferido, o argumento não se sustenta: `/clientes` e `/clientes/:id` são rotas
distintas e as duas telas nunca coexistem no documento -- e `CamposProcesso` já
é compartilhado com `id` fixo.

### O botão de tarefa vai no CABEÇALHO, e num grupo com o X

`ModalDeMovimentacao` já tem `RodapeDeAcoes` e seria o lugar óbvio -- mas o
rodapé dele é condicional de propósito (*"só quando há para onde ir;
`RodapeDeAcoes` vazio desenharia uma faixa cinza no pé do modal sem nada
dentro"*), e o botão lá o tornaria incondicional para todo mundo. Pior: sumiria
justamente na maioria das movimentações, que nunca geraram e-mail.

🔴 **A ação e o X vão num `Flex` próprio, não como irmãos do título.** Aquele
`Flex` é `justify="space-between"` com **dois** filhos (título e X), e um
terceiro faria a ação flutuar no MEIO do cabeçalho, longe do botão de fechar --
o oposto do que foi pedido. O X continua sendo o último: é o alvo que se
procura no canto.

### `subgrupos_notificados` tem TRÊS estados, não dois

O campo é `string[] | undefined`, e o próprio `types/index.ts` documenta o
gêmeo com a medição junto: *"26/08/2026 sobre dado de produção: 9 de 73.
Ausente em resposta de API anterior; quem lê trata `undefined` como 'não sei,
não oferece'"*.

Um `[0]` cru estouraria no ausente e escolheria errado no plural. Por isso o
botão só aparece com **exatamente um** subgrupo -- `ModalDeTarefa` exige
`subgrupoAtual` e semeia o seletor com ele, então não existe estado "nenhum
subgrupo" para oferecer.

### O que a verificação em Chrome pegou e os testes não

- **Só o CEP dizia "(opcional)"** e os outros seis não diziam nada, do lado de
  campos de contato que dizem um por um -- lia como se apenas o CEP fosse
  dispensável. O "(opcional)" subiu para o `RotuloDeSecao` do bloco.
- **Clicar em `#uf-cliente` não abre o painel**: o react-select põe esse id num
  input escondido de **1px** de altura. Quem abre é o controle visível.
- **Uma asserção que esperava para sempre**: das duas ocorrências do número
  mascarado com o modal aberto, a primeira em ordem de DOM é o `<h1>` da página
  atrás, **invisível sob o overlay**. `.first().waitFor({visible})` nunca
  resolve; a busca tem que ser dentro do `[role=dialog]` certo.

**A lição, repetida três vezes nesta entrega**: asserção logo depois de uma
ação assíncrona mede o relógio, não o código. `not.toHaveBeenCalled()` sem
espera é sempre verdadeiro, e um teste que nunca falhou não provou nada.

## Importar processos por OAB (27/08/2026)

Uma tela nova em Processos: buscar pela inscrição, conferir a lista, importar.

### Por que é TELA, e não modal

Três etapas, lista de até mil linhas e espera de dezenas de segundos. Um modal
viraria uma caixa com rolagem própria dentro da página — e fechar por engano
(Escape, clique fora) perderia uma busca que custou 25 segundos.

O botão fica ao lado de "+ Novo processo", e são **dois botões, não um menu**:
"Novo processo" é uso diário e "Importar por OAB" se procura com intenção;
esconder a segunda atrás de um clique a mais não ajudaria nenhuma das duas.

⚠️ **Só para `manager`+**, a mesma régua do servidor. É o princípio que
`FormularioCliente` já documenta: *mostrar um botão que a API vai negar é pior
que não mostrar*.

### 🔴 A guarda do responsável não-membro

Três regras que convivem sem atrito fora daqui:

1. `manager`+ **age** em qualquer subgrupo do grupo, sem participar dele;
2. `admin`+ **enxerga** subgrupo alheio no seletor;
3. o servidor só aceita como responsável quem for **membro**.

A tela tem seletor de subgrupo e pré-selecionaria quem importa. Junte as três
e o resultado é uma importação que falha com *"Responsável não é membro do
subgrupo"* — **depois** de a pessoa esperar a busca inteira.

Por isso a tela consulta os membros do subgrupo **escolhido** e, não sendo
membro, não pré-seleciona ninguém e diz por quê. Trocar de subgrupo revalida:
a consulta tem o subgrupo na chave.

### O período fica escondido

Quem tem uma inscrição de tamanho normal nunca precisa dele, e um campo a mais
é um campo a mais para ler antes de entender a tela. Aparece por um link — e
sozinho quando a busca esbarra no limite, porque aí a saída passa a ser
justamente ele.

⚠️ **Sem o período, o teto seria uma parede**: buscar de novo traria as mesmas
páginas, e os processos além delas ficariam inalcançáveis.

### Três estados que a tela não pode confundir

| | é o quê |
|---|---|
| **vazio** | o PJe respondeu e não achou nada — sucesso |
| **erro** | o serviço não respondeu, ou recusou por excesso |
| **acima do teto** | achou demais, trouxe o que coube — também sucesso |

🔴 Misturar "vazio" com "erro" mandaria a pessoa corrigir um número que está
certo, ou tentar de novo o que nunca vai funcionar.

⚠️ E o texto do vazio **não pode dizer "OAB não encontrada"**: o PJe devolve
zero e nada mais, e isso cobre três situações que não sabemos separar — OAB
inexistente, OAB sem processos, e OAB com processos mas sem comunicação
publicada.

### 🔴 A mensagem de interrupção não afirma que nada foi gravado

Um timeout no meio deixa os processos já criados no banco. Dizer "a importação
falhou" mandaria a pessoa procurar o que já está lá.

A frase admite a dúvida: *"parte dos processos pode ter sido cadastrada.
Buscar de novo cadastra só o que falta."* — e repetir é seguro, porque o
servidor pula o que já existe.

### O canal virou multi-assinante

`useCanalDeNotificacoes` nasceu com um consumidor só: `aoChegar: () => void`,
sem argumento, e descartando tudo que não é `tipo: "notificacao"`. A barra de
progresso precisa de `{feitos, total}`, que é **payload**, não gatilho.

Sem `utils/canalDeTempoReal`, a saída seria a tela abrir uma **segunda
conexão** — e o hook foi desenhado para uma (`useEffect(…, [])` abre um socket
por montagem).

🔴 **E a trava do sino vale MAIS agora.** O `if (corpo.tipo !== "notificacao")
return` continua onde estava: é o que impede uma barra que anda dezenas de
vezes de virar dezenas de linhas no sino. **Publicar é uma coisa, alimentar o
sino é outra** — quem alargar o canal de novo tem que passar por lá.

⚠️ Não existe assinante genérico, de propósito: um ouvinte "de tudo" desfaria
essa trava por fora.

### ⚠️ O hook ouve o canal desde a montagem, não ao clicar em "Importar"

A primeira mensagem de progresso (`feitos: 0`) sai antes de o `await` devolver
o controle. Assinar no clique perderia justamente ela — a barra começaria do
segundo pulso, ou de lugar nenhum numa importação curta.

E o progresso nasce em zero no próprio hook, para a barra existir mesmo com o
WebSocket fechado (aí ela fica indeterminada, em vez de ausente).

### ⚠️ A guarda de corrida da busca

Buscar, corrigir a OAB e buscar de novo pode fazer a primeira resposta chegar
depois — e a tela mostraria a lista da inscrição errada, sem nada indicando
isso. O hook descarta resposta de busca que não é a mais recente.

### O que o Chrome real pegou, e a suíte não

A barra ficava parada: a lambda `api` não tinha `WEBSOCKET_ENDPOINT`, então
`publicar` não sabia para onde mandar. Como publicar progresso é best-effort,
nada quebrava — a importação gravava tudo e respondia 201.

⚠️ **E quase escapou do Chrome também.** A barra some rápido demais no
ambiente local (45 processos gravam em menos de 1,5s), então olhar a tela não
bastava: foi preciso capturar os **quadros do WebSocket** com
`pg.on("websocket", …)`.

É o tipo de coisa que jsdom nunca veria, e que "abrir e olhar" também não.

## A prévia da importação, conferida contra o desenho (27/08/2026)

A tela subiu de manhã e o usuário achou o defeito na primeira busca real: três
processos que já existiam **em outros subgrupos** apareceram como novos. A
correção trouxe os quatro estados — e conferir a tela pronta contra o desenho,
no Chrome, trouxe o resto. Fica escrito o que só se vê olhando.

### Célula de tabela crua desalinha a coluna INTEIRA

`Tabela` põe `p="0 14px 10px"` no cabeçalho. Uma `Table.Cell` sem os
`13px 14px` de `.tbl td` fica com o padding padrão do Chakra, e o valor **não
nasce embaixo do próprio título** — sem `borderBottom`, a divisória também some
naquela coluna.

🔴 **É a SEGUNDA vez.** `LinhaProcesso` já registrava a primeira, na coluna de
prazo. Defeito que reaparece vira guarda:
`components/CelulaComSub/celulaDeTabela.test.ts` cobra a medida de toda
`Table.Cell` do repositório.

⚠️ **Guarda de FORMA, e o motivo importa**: o efeito é de CSS e o jsdom não
calcula estilo — `getComputedStyle` devolve vazio e o teste passaria com a
tabela torta. Quem VÊ é o Chrome; o guarda impede a regressão chegar lá.

### `Checkbox.Root` é um `<label>` — e sem `onCheckedChange` a caixa é inerte

O clique na caixa mexia só no estado interno do Chakra e **nunca chegava no
`alternar`**. O alvo mais óbvio da tela não fazia nada; só o resto da linha
respondia.

⚠️ **O jsdom não distingue esse caso**: ele clica no input escondido, e o mouse
acerta o quadrado visível (`data-part="control"`), que é filho do label. A prova
é do Chrome — 22 → 21 clicando na caixa, 21 → 20 clicando na linha.

⚠️ Com o handler, aparece o risco oposto: o clique no label sobe para a linha e
alterna de novo, anulando-se. Daí a guarda `closest("label")` no `onClick` da
linha.

### Célula vazia numa coluna "Situação" se lê como dado que faltou

🔴 **Reverti a decisão de não etiquetar o "novo".** O plano dizia que a ausência
bastava e que uma etiqueta em toda linha seria ruído. Na tela, a coluna em
branco parece falha de carregamento — a pessoa precisa ver que o sistema
**olhou** para aquela linha. São quatro pílulas.

### Os tokens de cor do Chakra NÃO são os nossos

`bg.warning`, `border.warning`, `fg.warning` e `fg.success` **existem** — no
tema padrão da lib, em laranja e verde da paleta dela. O semáforo do projeto é
`status.*`, e `theme/index.ts` documenta que só as variantes `.text` passam em
4,5:1.

⚠️ **Por isso o erro é silencioso**: o token resolve, a cor aparece, e só lado a
lado com o resto da tela se percebe que é de outra paleta. Ao pintar status,
conferir se o token é nosso.

### A paginação da prévia é só de EXIBIÇÃO

A busca inteira já está em memória. Quem decide o que será gravado é `marcados`,
que guarda **número de processo, não posição** — por isso "Marcar todos" alcança
as outras páginas e a marca sobrevive à virada.

🔴 É a armadilha clássica da lista paginada: o botão diz "todos" e marca só o
que está renderizado. Tem teste com esse nome.

### Um controle absoluto no canto disputa o clique com os rótulos

O X que fecha o cartão de período, posicionado com `position: absolute`, caía
por cima dos `<label>` de "De" e "Até" — `Campo` é `position: relative`, e são
várias caixas sobrepostas, então `zIndex` não resolveu. Ele foi para uma **faixa
própria** acima dos campos.

⚠️ **E a primeira medição do alvo estava errada**: amostrei os cantos da caixa,
que num botão `borderRadius: full` ficam **fora do círculo** — o hit-test
respeita o arredondamento. Medir botão redondo se faz por dentro da forma.

⚠️ Fechar **limpa as duas datas**, não só esconde a caixa: um período preenchido
atrás de um cartão fechado filtraria a busca sem nada na tela dizendo isso.

### `BotaoNu` herda a `line-height` do tema

O link do desenho tem 17px de altura; na tela dava 18,125px — 12,5px × 1,45 do
corpo, contra o `normal` que um `<button>` usa quando ninguém manda. `lineHeight:
"normal"` fecha a diferença.

⚠️ **E o desenho só se mede com o elemento VISÍVEL**: o botão vive numa tela
escondida da demo e media zero, o que faria a comparação "passar" por igualdade
com nada. A medida saiu de um clone posto no `body` da própria demo.

### Onde cada coisa mora, nesta tela

| o quê | onde |
|---|---|
| `EstadoDoAchado` | `types/index.ts` — vocabulário de mais de um dono |
| `estadoDoAchado`, `etiquetaDoAchado`, `concordar` | `utils/importacao.ts` |
| `ESTILO_DE_LINK`, `TONS_DO_CARTAO_DE_RESUMO`, `CORES_DA_ETIQUETA_DE_SITUACAO`, `COLUNAS_DA_PREVIA` | `pages/ProcessosPage/constants.ts` |
| `AvisoDaImportacao`, `CartaoDeResumo`, `EtiquetaDeSituacao` | pasta própria em `components/` da página |

⚠️ **Ao mudar de casa, o NOME muda junto**: fora do arquivo de origem, `Aviso`,
`Resumo`, `TONS` e `CORES` não dizem de que tela são.

### O responsável é OPCIONAL na importação — e o desenho diverge

⚠️ **O campo NÃO tem asterisco, e isso é deliberado.** O desenho põe um
`<span class="obrigatorio">*</span>` ali; a tela está de acordo com o SERVIDOR,
que nunca recusa lista vazia:

- vazia vira `[quem importa]` — **mas só se essa pessoa for membro** do
  subgrupo de destino;
- não sendo, os processos nascem **sem responsável**, e é assim de propósito:
  `manager`+ age em subgrupo que não participa, e um default incondicional
  faria o servidor pôr alguém que o próprio validador recusaria
  (`membros_service.responsaveis_na_criacao` explica o fluxo que isso
  quebraria).

🔴 Então **não "corrigir" a tela para exigir o campo** só porque o desenho o
marca: a tela promete o que a API cumpre. Exigir passaria a ser decisão de
produto, e teria de valer nos DOIS lados.

⚠️ A consequência de importar sem responsável já é visível na listagem: os
avisos vão para o subgrupo inteiro pelo fallback, e a coluna mostra
`Sem responsável` — que ali não é campo vazio, é marca de item órfão.

### ➡️ Frente registrada: o nome acessível das setas de página

`SetaPagina` põe "Página anterior" no `title`, mas o conteúdo do botão é o glifo
"‹" — e é ELE que vira o nome acessível. Um leitor de tela anuncia "‹". Vale
para todas as listas do sistema.

## Salvar processo não pode reenviar o que ninguém tocou (28/08/2026)

Um relato de produção -- *"ao atualizar, perdeu o vínculo"* -- levou a uma
causa de fundo que valia para qualquer campo da tela.

### O corpo do salvamento era completo, sempre

`corpoDosCamposDeProcesso` montava os nove campos com `|| []` e `|| ""`. O
"PATCH" era sobrescrita total: **campo que o formulário não carregasse era
apagado ao salvar.**

E havia um campo assim. `FormularioProcesso` semeava oito e esquecia
`responsaveis`, então:

- o campo abria **vazio** num processo que TEM responsável, escondendo quem
  responde;
- o salvamento mandava `responsaveis: []` -- que o servidor recusava com 400,
  tornando **impossível salvar** qualquer edição sem mexer no campo;
- quem escolhesse alguém só para passar do erro **substituía** quem estava lá.

🔴 A correção tem duas camadas de propósito. `corpoDosCamposDeProcesso` agora
**omite** o que é `undefined` -- rede de segurança que transforma "esqueci de
carregar" em nada, em vez de em apagamento. E `camposAlterados` manda só o que
mudou, que ataca a causa: sem ela, salvar o apelido devolvia por cima a
situação que outra pessoa tinha mudado enquanto a tela estava aberta.

⚠️ **`useRef` para o retrato do original**, não `useState`: ele não é para
renderizar, e não pode se refazer quando o processo é rebuscado no meio da
edição -- se refizesse, o "que mudou" passaria a comparar com o estado novo e
a edição em curso sumiria.

⚠️ Provado no Chrome, no cenário exato do relato: o corpo que sai agora é
`{"apelido":"Inventário","responsaveis":[]}` -- só o que mudou -- e volta 200.

### Renomear cliente rebusca processos e atendimentos

O nome do cliente naquelas telas é campo **derivado**: não vem do cache de
clientes, vem de `cliente_nomes`, resolvido pelo servidor DENTRO da resposta
delas. Invalidar só `["clientes"]` deixava as duas mostrando o nome velho até
o polling de 60s -- e em conexão lenta, mais.

➡️ **A regra geral**: ao invalidar depois de escrever, perguntar *quais outras
respostas carregam este dado derivado?*. Aqui são `["processos"]` e
`["atendimentos"]`; `responsaveis_nomes` e `subgrupo_nome` têm a mesma forma.

## Digitar para filtrar virou o padrão dos seletores (28/08/2026)

Requerimento do usuário: *"selects por padrão no sistema deve ser possível
digitar para pesquisar"*. `permitirBusca` era opcional e treze dos vinte e seis
usos ficavam sem. Agora o padrão é `true` nos dois componentes.

🔴 **Ligar isso apagou um contrato de acessibilidade, e só o teste mostrou.**
Com busca E desabilitado ao mesmo tempo, o `react-select` não renderiza input
nenhum -- some o `role="combobox"` de que teclado e leitor de tela dependem
para saber que existe um controle ali, esperando a lista. Daí
`isSearchable={buscaNoControle && !travado}`.

⚠️ Não se perde nada com isso: não há o que filtrar numa lista que ainda não
chegou.

⚠️ E o guarda que pegou já existia -- o teste "fica TRAVADO enquanto carrega",
cujo comentário dizia exatamente por que a asserção é o `combobox` desabilitado
e não "o menu não abre".

## Filtro por subgrupo, e a mutação que passou (28/08/2026)

⚠️ **"Escolha, não permissão" descreve o SERVIDOR, não a tela.** Pela interface
os dois são indistinguíveis: a pílula lista o que `GET /subgrupos` devolve (já
escopado) e os filtros daqui não vêm da URL -- então não existe caminho pela
tela que peça um subgrupo alheio. A distinção vale porque a rota é uma
superfície própria, alcançável por qualquer cliente autenticado, e lá o
parâmetro se SOMA ao alcance em vez de defini-lo.

A pílula some para quem tem UM subgrupo: ali ela não filtraria nada, e
controle sem efeito é pior que controle nenhum.

🔴 **O primeiro teste que escrevi para ele NÃO servia**, e a mutação provou:
ele afirmava sobre o que `listarProcessos` RECEBE, então apagar
`subgrupo_id: subgrupoId` do corpo da query passava batido. Quem prova que o
filtro chega ao servidor é o nível de `services/api` -- daí
`services/api/processos.test.ts`.

➡️ **A régua**: teste de tela prova que a tela pediu; só o teste do cliente
HTTP prova o que saiu no fio. Filtro novo precisa dos dois.

## Cadastrar cliente sem sair do formulário (28/08/2026)

Digitou um nome que não está no cadastro, aparece `+ Novo cliente “nome”` no
fim da lista. Só o NOME -- documento, telefone e endereço ficam para a tela do
cliente: pedi-los ali seria trocar um formulário por outro no meio do primeiro.

⚠️ **"Novo cliente", e não "Cadastrar"**: o modal de processo tem o próprio
botão "Cadastrar" (o que grava o processo), e dois controles com o mesmo nome
na mesma tela é ambiguidade. Foi a verificação em Chrome que pegou -- o seletor
do roteiro bateu em dois botões.

⚠️ Só para `manager`+, que é o piso da rota: não oferecer o que a API vai
negar, a mesma régua de `podeRemoverResponsavel`.

⚠️ **O campo vive em `components/`**, então Atendimentos ganhou o atalho junto.
É a mesma necessidade, e uma segunda cópia divergiria no primeiro ajuste.

⚠️ Ele importa `papelAtende` de `services`, e isso quebrou TRÊS arquivos de
teste que mockam esse módulo sem o export. Os mocks foram completados.

### 🔴 Componente de `components/` PODE ler a sessão -- decidido em 28/08/2026

A pergunta foi levantada e respondida com número: **33 arquivos de teste mockam
`services`, e 18 já listam `papelAtende`**. O preço não nasceu aqui -- é o
padrão da casa desde `podeRemoverResponsavel`, que lê `papelAtende` e
`getEmail` dentro de `components/`.

**A alternativa foi recusada.** Passar `podeCadastrar` por prop tiraria a
dependência do componente, mas moveria a régua para CADA chamador -- hoje três
(novo processo, editar processo, atendimentos), e cada tela nova repetiria. É a
duplicação que o próprio `podeRemoverResponsavel` argumenta contra: *"um helper
comum precisaria de parâmetro pra cada diferença e esconderia justamente o que
cada tela decide"*. Trocaria incômodo de teste por regra espalhada em produção.

⚠️ E o modo de falha é barulhento: o vitest diz o export que faltou, e uma
linha resolve.

➡️ **O gatilho para reabrir**: um QUARTO componente compartilhado lendo a
sessão. Aí vale um `test/mockDeServices.ts` com os padrões -- e não a prop.

⚠️ O que esse helper custaria, e por isso ele não vem antes do gatilho: hoje a
lista de mocks de cada teste MOSTRA de quais serviços aquela tela depende, e
isso já pegou defeito nesta sessão.

## O estado da listagem foi para a URL (28/08/2026)

Pedido: abrir um processo da página 2, com 30 por página, e VOLTAR caindo no
mesmo lugar. O estado vivia em `useState` da tela, e entrar no detalhe a
desmonta.

🔴 **A primeira implementação foi memória em módulo, e foi descartada.** Ela
atendia ao pedido em ~70 linhas. A pergunta *"o que o mercado usa?"* mudou a
decisão: a URL é o padrão do ecossistema (`useSearchParams`, search params do
TanStack Router, `searchParams` do Next), responde de graça a quatro perguntas
em vez de uma -- voltar, recarregar, compartilhar, enxergar o estado -- e já era
o idioma DESTE projeto, no detalhe do processo que guarda a aba aberta assim.

⚠️ **E eu tinha esticado um argumento contra.** Disse que "o projeto decidiu não
pôr filtros na URL"; relendo, o comentário justifica o ATALHO da Área de
trabalho passar filtros por `state` (*"é um atalho interno: não é URL pra
compartilhar"*), não a URL como lugar do estado de lista.

### 🔴 A regra que organiza tudo: `setSearchParams` NAVEGA na hora

Não é `useState`. Duas chamadas no mesmo manipulador partem da MESMA URL, e a
segunda apaga a primeira. Três defeitos desta migração são o mesmo defeito:

1. `setBusca(v); setPagina(1)` -- a busca sumia ao digitar;
2. `setTamanhoPagina(t); setPagina(1)` -- **a troca de tamanho parou de
   funcionar**, e a suíte estava VERDE: nenhum teste cobria isso numa tela real;
3. escolher cliente grava o id E o nome do rótulo -- a pílula ficava acesa sem
   filtrar nada.

➡️ Por isso existem duas peças: `useParametrosDaUrl` escreve VÁRIAS chaves numa
vez (é o mecanismo), e `useEstadoNaUrl` é a casca de um valor só. E por isso o
reset de página é propriedade do FILTRO (`tambemApaga`), não da tela.

### Quem decide o que some da URL é quem declarou o estado

⚠️ Houve uma versão com uma opção `padroes` no escritor múltiplo, e ela foi
**removida**: obrigava quem limpa os filtros a repetir os padrões já declarados,
e falhou duas vezes (Histórico e Atendimentos abriam com o filtro de volta).

Agora `useEstadoNaUrl` -- o único que conhece o padrão da sua chave -- escolhe
entre escrever e APAGAR; o escritor múltiplo só escreve o que recebe.

⚠️ Consequência aceita: "limpar filtros" escreve os valores neutros
(`?tipo=&falha=0`) em vez de apagar as chaves. Apagar devolveria o padrão -- e
nessas telas o padrão pode ser o filtro que veio da Área de trabalho.

### Dois defeitos de codec que só o teste mostrou

- **booleano só sabia escrever `true`.** Um filtro que ABRE ligado (o link "só
  com falha") não desligava: `false` sumia da URL, e o que some volta como o
  padrão -- que ali era `true`;
- **omitir "quando é vazio"** quebrava o filtro cujo padrão não é vazio: em
  Histórico a tela abre em "Movimentações", e escolher "Todos" voltava sozinho
  para "Movimentações".

### ⚠️ Chaves iguais em todas as telas, e a exceção

`?pagina=2` em Processos e em Clientes nunca colidem: cada tela é um endereço.
A tela de **Grupo** é a exceção -- suas sub-abas dividem UM endereço, então
trocar de aba limpa `pagina`, `tamanho` e `busca`. Sem isso, ir para a página 3
de Subgrupos e clicar em Membros abria Membros na página 3, vazia.

### ⚠️ Testes de tela agora precisam de `<Router>`

Medido: o React Router 7 **estoura** com dois `<Router>` aninhados, e dezesseis
arquivos já trazem o seu. Por isso não dá para pôr o roteador dentro de
`renderComProviders` -- nasceu `renderComRota(ui, rota)`, que também aceita a
rota inicial: `"/processos?pagina=2"` é como se testa que a URL manda na lista.

### URL torta não derruba a tela (28/08/2026)

A pergunta *"e se eu colocar números inválidos?"* achou quatro buracos. Medido
ANTES, com a URL editada à mão:

| URL | o que acontecia |
|---|---|
| `?pagina=abc` | ✅ caía na página 1 |
| `?pagina=-3`, `?pagina=1.5` | 🔴 422, e a tela dizia "Não foi possível carregar os processos" |
| `?tamanho=9999` | 🔴 422 (o servidor tem `le=100`) |
| `?pagina=999` | ⚠️ tabela vazia com a contagem dizendo 45 |

Um 422 lido como falha do sistema é pior que o parâmetro torto: a pessoa
conclui que o Argos está fora do ar.

🔴 **A faixa não mora no codec.** Tentei "inteiro >= 1" em
`lerParametroDaUrl` e quebrei o filtro `dias` do Histórico, cujo valor neutro
é 0. O codec garante que é INTEIRO; quem conhece o intervalo válido é quem
declara o estado -- `usePaginacaoDaLista` valida página (>= 1) e tamanho
(tem de estar entre as opções que o seletor oferece).

🔴 **Página fora da faixa volta para a primeira, e isso mora no `Pagination`.**
Não é só URL digitada: filtrar estando na página 3 encolhe o conjunto e produz
o mesmo estado. O componente já recebe página, total e o setter, e é a única
peça que as sete listagens dividem -- não precisou de hook nem de chamada por
tela.

⚠️ E as guardas `processos.length > 0 &&` saíram de volta do `<Pagination>`:
ele já se esconde sozinho quando não há o que paginar, e a guarda escondia
justamente o caso em que ele PRECISA aparecer -- lista vazia com total cheio,
onde a pessoa ficava presa sem botão.

⚠️ **Um teste meu passou por engano aqui.** `toHaveBeenLastCalledWith({pagina:
1})` casava com a consulta do TOTAL, que sempre pede a página 1 -- a mutação
que desligava a correção não o derrubava. O desempate é `tamanhoPagina` na
asserção.

## O sino ganhou um aviso, e a atribuição em massa virou clicável (28/08/2026)

### `itens_reatribuidos`

Quem herda o acervo de alguém que saiu do subgrupo recebe UMA linha, com a
conta do que recebeu. Título e detalhe vêm PRONTOS do servidor -- só ele sabe
o que foi transferido.

⚠️ **Chega sem `alvo_id` E sem `alvo_tipo`**, então não é clicável. Não é
esquecimento: são QUATRO listas (tarefas, atendimentos, processos,
documentos), e nenhum endereço isolado cobre as quatro. Mesmo tratamento de
`sessao_alterada`.

### ✅ A pendência da atribuição em massa foi fechada

`destinoDaNotificacao` tinha uma pendência escrita: *"201 processos atribuídos
a você"* deveria abrir a listagem filtrada por responsável, e não abria porque
esta função devolve uma STRING de rota e os filtros viajavam por `state` de
navegação.

🔴 **O obstáculo caiu quando o estado das listagens foi para a URL**, no mesmo
dia: `?responsavel=…` virou endereço. Agora a linha leva a
`/processos?responsavel=<quem recebeu>&subgrupo=<onde>`.

⚠️ O subgrupo entra junto: sem ele a lista traria os processos da pessoa em
TODOS os subgrupos -- mais do que o aviso prometeu.

⚠️ **`usuario_id` é o destinatário**, e é por ele que se filtra. Ler a sessão
dentro da função a tornaria dependente de estado global sem precisar.

⚠️ Medido em Chrome, entrando como quem recebeu: o clique leva a
`?responsavel=user%40local.test&subgrupo=sub-g-alfa` e a tabela mostra os 3
processos, de 42 do grupo. E funciona para quem é `user`, embora a pílula de
responsáveis não liste gente abaixo de `manager` -- o filtro vem da URL, não
da pílula.

➡️ **O teste que fixava a pendência caiu, e era para cair**: ele dizia "não é
clicável ENQUANTO o destino filtrado não existir", com o aviso de que quem
resolvesse o derrubaria. Foi assim que a pendência se anunciou fechada, em vez
de sobreviver mentindo.
