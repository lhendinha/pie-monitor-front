# Diário de Acompanhamento — front-end do Argos

Front-end React + **TypeScript** (Vite) com login (JWT + refresh), gestão de **Grupos → Subgrupos → Processos**, membros por papel (`user`/`manager`/`admin`/`super_admin`), convites por e-mail e histórico de notificações — consumindo a API que já está rodando na AWS.

## Rodar contra a API local (fora da AWS)

Na pasta `api`, `yarn offline` sobe DynamoDB Local, as lambdas e o canal
WebSocket na sua máquina. Depois:

```bash
VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
  yarn dev --port 5174
```

⚠️ `VITE_WS_URL` junto: sem ele o front abre o canal no endereço de
**produção** a partir de uma tela local.

Contas semeadas, senha `Senha!Local1`: `movida@local.test` (admin) e
`chefe@local.test` (super_admin). **É por ali que se valida antes de subir** —
o `scripts/stubsDaApi.mjs` responde o que foi escrito nele, e serve para
telas de UI pura, não como prova de que a integração funciona.

## Por que não hospedar na AWS (S3 + CloudFront)?

Sua conta AWS foi criada depois da mudança de julho/2025 no modelo de free tier: contas nesse modelo novo ganham **$200 em créditos válidos só por 6 meses**, não um free tier permanente pra S3/CloudFront (diferente de Lambda/DynamoDB, que são "Always Free" de verdade). Pra garantir **$0 garantido**, esse projeto roda no **Vercel** — free tier permanente, deploy automático a cada push.

## Antes de usar: cadastre o primeiro usuário (bootstrap)

Esse front-end não tem tela de auto-cadastro (por design). O primeiro usuário de cada Grupo nasce via API, com a `x-api-key`:

```bash
curl -X POST https://SUA_URL.lambda-url.sa-east-1.on.aws/usuarios \
  -H "x-api-key: $PJE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "pedro",
    "password": "uma-senha-forte-aqui",
    "email": "pedro@exemplo.com",
    "nome_grupo": "Meu Escritório",
    "nome_subgrupo": "Cível"
  }'
```

Todo mundo mais entra por **convite** (sub-aba "Convidar", dentro de "Grupo", visível pra quem é `admin`) — a pessoa recebe um e-mail com um link `/convite/{token}`, válido por 24h.

## Rodando localmente

```bash
yarn install
cp .env.example .env
# edita o .env com a URL real da sua Function URL
yarn dev
```

Abre `http://localhost:5173` e loga com o usuário cadastrado acima.

Antes de commitar/dar push, vale rodar os três (o `yarn build` já faz o type-check automaticamente, mas dá pra rodar isolado):
```bash
yarn typecheck
yarn lint
yarn test
```

## Deploy no Vercel

1. Sobe esse projeto pra um repositório no GitHub
2. [vercel.com](https://vercel.com) → login com GitHub → **Add New → Project** → seleciona o repo
3. Em **Environment Variables**, adiciona `VITE_API_URL` com a URL da Function URL
4. **Deploy**

O Vercel detecta o `yarn.lock` automaticamente e usa Yarn como package manager do build — não precisa configurar nada a mais.

O arquivo `vercel.json` já está configurado com o *rewrite* necessário pra rotas client-side funcionarem (`/convite/{token}` precisa cair no `index.html` mesmo em acesso direto pelo link do e-mail — sem isso, clicar no link do convite daria 404).

## Telas

| tela | rota | o que responde |
|---|---|---|
| Área de trabalho | `/` | o que precisa de atenção hoje |
| Gestão kanban | `/kanban` | o quadro de tarefas do subgrupo |
| Agenda | `/agenda` | as tarefas por data |
| Atendimentos | `/atendimentos` | conversas registradas por cliente |
| Detalhe do atendimento | `/atendimentos/:subgrupoId/:atendimentoId` | **abas** Registros \| Detalhes \| Documentos |
| Processos | `/processos` | o acervo monitorado |
| Detalhe do processo | `/processos/:subgrupoId/:numero` | **abas** Detalhes \| Tarefas \| Movimentações \| Documentos |
| Clientes | `/clientes` | o cadastro |
| Detalhe do cliente | `/clientes/:clienteId` | **abas** Detalhes \| Processos vinculados \| Documentos |
| **Documentos** | `/documentos` | arquivos e links do escritório |
| **Detalhe do documento** | `/documentos/:subgrupoId/:documentoId` | onde se edita, baixa, substitui e exclui |
| Histórico | `/historico` | o que o robô enviou |
| Grupo | `/grupo` | **sub-abas** Subgrupos \| Membros \| Fases \| Situações \| Convidar \| Inscrições na OAB \| Configurações |
| Perfil | `/perfil` | **abas** Meus dados \| Inscrição na OAB |

⚠️ **No atendimento, "Detalhes" é a SEGUNDA aba** -- ao contrário de processo
e cliente, onde ela abre. A aba padrão é a primeira da lista, e pôr Detalhes
na frente faria abrir um atendimento mostrar o **formulário** em vez da
conversa. Quem abre um atendimento quer ler o que aconteceu. A consistência
com as telas irmãs é de _ter_ abas, não de qual vem primeiro.

⚠️ Toda tela de DETALHE guarda a aba na URL (`?aba=`), porque essas telas são
alcançadas por link -- do e-mail, do Kanban, da Agenda -- e um F5 que devolve
a pessoa pra primeira aba incomoda de verdade. As telas de gestão
(`/grupo`, `/perfil`) usam estado local de propósito.

### Editar membro: quem pode, e o que fica travado

| | `super_admin` | `admin` |
|---|---|---|
| Nome completo, Subgrupos | ✅ | ✅ |
| **OAB, UF, interruptor, destino** | ✅ | ✅ |
| Papel | até `super_admin` | até `admin` |
| **Grupo** | qualquer | 🔴 travado no próprio |

🔴 O modal lê `GET /grupos/membros/{email}` (`admin`+) em vez de usar a
listagem: aquela é `manager`+ e a projeção dela é fixa de propósito -- a
inscrição não aparece ali. Quem enxerga o detalhe é quem pode editá-lo.

⚠️ Travar campo na tela é conveniência; o servidor recusa igual.

### Perfil: duas abas, dois "Salvar"

| aba | o que tem | o que o Salvar dela grava |
|---|---|---|
| **Meus dados** | Nome completo, e-mail (travado), Alterar senha | só o nome |
| **Inscrição na OAB** | Número da OAB, UF, **interruptor de importação**, destino | a inscrição **e** o interruptor |

🔴 **Os dois num "Salvar" só, e não em dois botões** (Fase 1b): cadastrar a OAB
e ligar a importação é UMA intenção -- *"quero que o sistema traga meus
processos"* --, e o servidor aceita as duas coisas no mesmo PATCH. Separar
obrigaria a salvar duas vezes para um pedido só.

⚠️ **O interruptor fica travado sem inscrição**, e olha o CAMPO, não o que está
gravado: quem digita a OAB e liga no mesmo gesto não deve ser obrigado a salvar
antes. O motivo aparece na tela -- e são dois, com conselhos diferentes:
*cadastre a inscrição acima* (ela resolve ali) ou *você não participa de nenhum
subgrupo* (ela não resolve sozinha).

⚠️ **O seletor de destino só aparece com MAIS DE UM subgrupo.** Com um só o
destino é óbvio e um seletor de uma opção faz a pessoa procurar uma decisão que
não existe -- mas a regra vale por baixo, e o destino vai preenchido.

⚠️ **O `Switch` do Chakra v3 é um CHECKBOX, e assim fica.** Medido: forçar
`role="switch"` deixa o estado DESCONHECIDO, porque a ARIA exige `aria-checked`
junto e o Chakra não o emite. Um checkbox que anuncia "marcado" é usável; um
interruptor sem estado, não.

🔴 **A divisão torna ESTRUTURAL o que antes era lógica.** `PATCH /me` trata
campo ausente como "não mexer", então um formulário único tinha de escolher o
que mandar -- e mandar o nome numa troca de OAB o reescreveria. Separadas, uma
aba **não conhece os campos da outra**: não há como sobrescrever por engano.

⚠️ **A aba se chama "Meus dados", não "Perfil"**: a página já se chama "Meu
perfil", e repetir o nome logo abaixo do título não informa nada.

⚠️ **"Nome completo" é só o RÓTULO.** Atrás continua o campo `apelido`, sem
migração -- mesma régua de `pje-monitor` vs Argos: o nome novo vale onde a
**pessoa** lê. O "i" ao lado explica por que o nome precisa ser o completo (a
Fase 1b o compara com o que o tribunal devolve para a inscrição).

⚠️ **Deixar as duas partes da inscrição vazias APAGA a OAB.** É o único jeito
de remover uma cadastrada por engano, e é por isso que a opção "Nenhuma" existe
explicitamente no seletor de UF -- o `Select` não é clearable.

### Grupo › Inscrições na OAB: as OABs que não são de ninguém com conta

Piso `admin`, espelhando `GET`/`PATCH /grupos/configuracoes`. É o **único lugar
do sistema onde se cadastra inscrição de terceiro** -- sócio que não usa o
sistema, advogado que saiu, estagiário sem login. A inscrição de quem TEM conta
mora no perfil da pessoa, e o servidor recusa cadastrá-la aqui também.

🔴 **Estar na lista VIGIA; o interruptor é outra coisa.** Uma inscrição
desligada continua sendo varrida -- o que ela não faz é cadastrar processo novo
sozinha. Confundir os dois faz alguém desligar a importação achando que
economiza, e silenciar o monitoramento sem perceber.

| coluna | o que mostra |
|---|---|
| Inscrição | `148502/MG`, em mono. **Clicar abre o modal de edição** |
| Importação automática | o interruptor, com **Ligada / Desligada** escrito ao lado |
| Subgrupos de destino | as etiquetas, ou `—` quando não há |
| | a lixeira, que remove da lista |

🔴 **O interruptor da linha é ASSIMÉTRICO, e é de propósito.** Desligar grava
direto; **ligar abre o modal**. A razão é o servidor: ele ZERA
`subgrupos_destino` ao desligar e RECUSA ligar sem destino, então uma inscrição
desligada nunca tem destino guardado e "ligar" nunca é um gesto de um clique
só. Um interruptor que às vezes liga e às vezes precisa de mais informação é
pior que um que sempre abre onde a informação se dá.

🔴 **Cada mexida grava sozinha**, como Fases e Situações -- não há "Salvar" da
lista. A tela nunca mostra estado não salvo, e uma inscrição que o tribunal
recusa derruba só a própria adição em vez das 50.

🔴 **E toda gravação RELÊ a lista antes de montar o corpo.** O `PATCH`
substitui a lista inteira: quem manda a lista sem uma inscrição a está
removendo. Sem a releitura, um `admin` que abrisse a tela, esperasse um colega
cadastrar uma OAB e então mexesse em outra apagaria a do colega junto -- sem
erro, sem toast, sem nada na tela dizendo.

⚠️ **A inscrição repetida é barrada na TELA**, e não mandada ao servidor: lá
ela é ignorada em silêncio ("a primeira vence"), o `PATCH` responderia 200 com
a lista do mesmo tamanho, e a pessoa concluiria que a tela engoliu o cadastro.

⚠️ **Editando, número e UF ficam desabilitados com cadeado.** Trocá-los não
seria editar -- seria outra inscrição, com a antiga ficando na lista. Quem quer
trocar remove e cadastra.

⚠️ **A coluna de destinos resume de TRÊS em diante** ("4 subgrupos", com a
lista inteira no `title`), reusando o limiar de `utils/select.rotuloResumo` que
o `MultiSelect` do modal já aplica ao mesmo dado. O motivo é a altura da linha:
com 20 subgrupos, vinte etiquetas quebram em quatro fileiras e a coluna do
interruptor descola do que ela descreve.

⚠️ **Cadastrar leva para a página onde a nova ficou.** O servidor acrescenta no
FIM, então a 21ª cai na página 3 -- e quem estava na 1 adicionava, o modal
fechava, e a tela não mudava em nada. Só quando a lista CRESCEU: mandar a
pessoa para o fim depois de remover seria gratuito.

⚠️ **O contador `N de 50` aparece sempre**, e não só quando a lista enche. O
limite é carga contra um tribunal, não espaço em disco: cinquenta inscrições
são 150 consultas por dia, e quem descobre o teto só ao esbarrar nele já
planejou errado.

### Documentos

Cada documento é um **arquivo enviado** ou um **link**, vinculado a processo,
atendimento e/ou cliente. Quem enxerga é quem participa do **subgrupo** --
mesma régua de Tarefa e Atendimento.

🔴 **O arquivo vai direto do navegador pro armazenamento**, sem passar pela
API: o payload de um Lambda para em 6 MB e o teto de um documento é 20. São
três passos, e o registro é o último -- nada é gravado até o arquivo chegar.

🔴 **A listagem não tem lixeira nem lápis.** Clicar na linha abre a tela do
documento, e é lá que se edita e se exclui -- mesmo arranjo de Processos e
Clientes. O modal só CRIA.

🔴 **Excluir um documento destrói o arquivo**, e o bucket não tem
versionamento -- por isso as duas ações destrutivas pedem mais que as outras:

| ação | quem pode |
|---|---|
| ver, **baixar** | qualquer membro do subgrupo |
| **editar** (título, descrição, vínculo, responsável) | qualquer membro do subgrupo |
| **excluir** | quem adicionou, ou Gerente para cima |
| **substituir o arquivo** | quem adicionou, ou Gerente para cima |

Substituir entra na mesma régua porque apaga o arquivo antigo do mesmo jeito
-- e, ao contrário de excluir, nem passa por diálogo de confirmação. Quem não
pode não vê os botões.

## Responsáveis: quem responde, recebe

Processo e atendimento têm **responsáveis** (múltiplo, mínimo 1), e são eles
que recebem os avisos daquele item -- movimentação, prazo e mudança de status.
Sem responsável válido, o aviso volta a ir pro subgrupo inteiro.

Na tela isso aparece em quatro lugares:

- **campo** no cadastro e na edição das duas telas, pré-selecionado com quem
  está criando (o servidor decide o default; a tela só mostra o que ele faria);
- **coluna** "Responsável" em Processos -- a **sétima**, acrescentada: nada
  saiu. "Última movimentação" é o único lugar onde se percebe, para o acervo
  inteiro, que a verificação parou;
- **filtro** nas duas listagens: *todos / meus / cada pessoa / **sem
  responsável***;
- **Área de trabalho**: as duas linhas de prazo contam só os seus, e o clique
  abre a lista já filtrada por "eu".

🔴 **"Sem responsável" é achável de propósito.** Item órfão tem o aviso
alargado pro subgrupo pelo fallback, e sem um jeito de listar isso ninguém
entende por quê. Por isso ele é opção de filtro E marca na linha, em vez do
traço que as outras colunas vazias usam.

⚠️ **Quem pode tirar OUTRA pessoa da lista é `manager`+** -- acrescentar e sair
da própria são de qualquer membro. Ver `podeRemoverResponsavel`.

⚠️ No atendimento, o **status virou campo da aba Detalhes** e saiu do
cabeçalho, onde era um `Select` que salvava sozinho. A etiqueta continua lá,
porque informa.

## Endereço do cliente, com o CEP preenchendo o resto

O cadastro de cliente tem um bloco **Endereço (opcional)**, nas duas telas --
"Novo cliente" e a de detalhe. Digitar um CEP completo busca logradouro,
bairro, cidade e UF, e joga o foco no **Número**, que é o campo que a consulta
nunca traz.

- A busca **só dispara com 8 dígitos** -- não há espera entre teclas, porque
  não faz falta: os valores incompletos já não chegam a consultar.
- **Nenhum campo fica travado** depois: endereço que o provedor erra existe
  (imóvel novo, loteamento recente), e a pessoa precisa poder corrigir.
- **CEP não encontrado** avisa e deixa preencher à mão -- é caminho normal, não
  erro. Serviço fora do ar dá uma mensagem diferente, porque ali vale tentar de
  novo.
- O **Complemento não vem preenchido**, e isso é de propósito: o que os
  provedores chamam de complemento é a faixa de numeração do CEP ("até 99999999
  - lado ímpar"), não "sala 302".

⚠️ Editar cliente é `manager`+: quem está abaixo disso **vê** o cadastro, em
`readOnly`, sem o botão Salvar.

## Adicionar tarefa a partir de um detalhe

**Histórico → Detalhes do envio** e **Processo → Movimentações → Detalhes da
movimentação** têm um botão "Adicionar tarefa" no cabeçalho, que abre o
formulário **já vinculado** ao processo que está na tela. O modal de detalhe
continua aberto atrás: a pessoa estava lendo aquilo.

No Histórico o botão **não aparece** em três casos, e cada um por um motivo:

| caso | por quê |
|---|---|
| lembrete de tarefa | não tem processo nenhum -- o vínculo gravaria lixo |
| e-mail que notificou **vários** subgrupos | não há resposta certa, e escolher um faria a tarefa nascer no lugar errado |
| registro sem `subgrupos_notificados` | dado antigo; "não sei" não vira palpite |

Na movimentação isso não acontece: o subgrupo vem da URL, então é sempre o
certo.

## Papéis e o que cada um vê

4 abas no topo: Processos, Clientes, Histórico e **Grupo** -- essa última agrupa, como sub-navegação própria, Subgrupos, Membros, Fases, Situações, Convidar, Inscrições na OAB e Configurações. Cada sub-aba tem o seu piso de papel, e ele espelha o da rota que ela usa (`ABAS_DO_GRUPO`, em `constants/abasDoGrupo.ts`).

| Papel | Abas / sub-abas visíveis |
|---|---|
| `user` | Processos, Clientes, Histórico. **Não vê Grupo** -- a rota `/grupo` inteira exige `manager` |
| `manager` | + Grupo, com as sub-abas Subgrupos e Membros |
| `admin` | + Fases, Situações, Convidar, **Inscrições na OAB** e Configurações |
| `super_admin` | O mesmo de `admin` no próprio grupo. Na sub-aba Membros, também vê um ícone ✎ pra editar apelido/papel/grupo de qualquer pessoa da plataforma |

⚠️ **Fases e Situações são `admin`, não `super_admin`.** O catálogo passou a ser
por grupo e o piso das rotas desceu; enquanto esta tabela dizia o contrário,
ela descrevia uma permissão que não existe mais.

⚠️ **Filtro de PESSOA some para quem é `user`.** Ele se alimenta de
`GET /grupos/membros`, que tem piso `manager` -- oferecê-lo a um `user` daria
403 num controle que ele nunca poderia usar. As opções que não dependem
daquela rota ("Todas as pessoas", "Meus processos", "Sem responsável")
continuam para todo papel. Vale em Processos, Kanban e Agenda; ver
`podeListarPessoas`.

`admin`/`super_admin` também editam o **nome de um Subgrupo** (ícone ✎ na sub-aba Subgrupos, `PATCH /subgrupos/{id}`).

A ordem de **Fase**/**Situação** é definida arrastando as linhas (drag and drop, `@dnd-kit`) -- não existe mais um campo "Ordem" editável no formulário.

## Em que ordem as listas aparecem

🔴 **Quem ordena é o SERVIDOR, não a tela.** As listagens são paginadas: um
`sort` no front ordenaria só a página visível, e a lista passaria a mentir.

Desde 01/09/2026, o que se **procura** vem em ordem alfabética — Processos,
Clientes, Documentos, Atendimentos, Subgrupos e as duas listas de pessoas.
O que se **acompanha** mantém a ordem própria:

| lista | ordem |
|---|---|
| Histórico | o mais novo primeiro |
| Fases, Situações, colunas do Kanban | a que você arrasta |
| Prioridade | Baixa → Alta |
| Papel | user → super admin |
| Agenda e Tarefas | por data |

⚠️ **A ordem ignora acento**: "Ângela" aparece entre "Amanda" e "Bruno", não
no fim da lista. Sem esse cuidado o computador ordena por código, e todo nome
acentuado é empurrado para depois do "Z".

⚠️ **A busca não muda a ordem.** Digitar filtra a mesma lista, com o mesmo
critério — em Clientes isso corrigiu uma perda de verdade: a busca mostra no
máximo 50 resultados, e sem ordenação esses 50 eram sorteados.

## Sobre a autenticação

Login guarda um **access token JWT** (24h) + **refresh token** (30 dias) no `localStorage` — a `x-api-key` real nunca chega ao navegador. O `papel` e `grupo_id` também ficam decodificados do próprio JWT (client-side, só pra decidir o que mostrar na UI — a autorização de verdade sempre é validada de novo no backend). Quando o access token expira, `services/api/client.ts` renova sozinho via `/refresh` antes de desistir.

Esqueceu a senha? A tela de login tem um link "Esqueci minha senha" (`EsqueciSenhaPage`) que chama `POST /senha/esqueci` — resposta sempre genérica, não revela se o e-mail existe. O link do e-mail recebido leva pra `/redefinir-senha/{token}` (`RedefinirSenhaPage`), válido por 1h e uso único.

## Link do e-mail de notificação → aba Histórico

O e-mail de movimentação processual leva pra `/?processo={numero}&comunicacao={id}`. O `App.tsx` lê esses dois parâmetros no mount (`utils/deepLink.ts::parseDeepLinkHistorico` — só conta como deep link se os dois vierem juntos), limpa a URL na hora, abre direto na aba **Histórico** e repassa pra `HistoricoPage` buscar e abrir o item certo num modal — sem listar as outras notificações do processo.

## Notificações (toasts)

Erros e confirmações usam um sistema de toast (`components/Toast`, `useToast()` dentro de `<ToastProvider>` montado em `App.tsx`) — substitui o antigo `<div className="banner">` pra feedback pontual de ação (ex: "Não foi possível carregar", convite enviado). O `banner` continua existindo só pra estados persistentes de tela inteira (sessão expirada, senha redefinida com sucesso).

## Super_admin: editar pessoa de outro grupo

Na aba Membros, `super_admin` vê um ícone ✎ em cada pessoa de "Pessoas do grupo" (`MembrosPage/EditarMembroForm`). O modal deixa trocar apelido, papel (inclusive promover a `super_admin` ou rebaixar/mover um `super_admin` existente, mesmo a própria conta) e mover a pessoa pra outro grupo, sempre escolhendo também os subgrupos de destino (obrigatório, já que subgrupo pertence a exatamente 1 grupo — os vínculos antigos não fazem sentido no grupo novo).

## Rodando os testes

```bash
yarn test         # roda uma vez (CI)
yarn test:watch   # modo watch
```

`vitest` + `@testing-library/react` + `jsdom`. 702 testes em 66 arquivos, cobrindo páginas, componentes, `services/` (auth, client HTTP) e `utils/` (máscara CNJ, formatação de data, parse de deep link) — `src/test/setup.ts` fixa o timezone em `America/Sao_Paulo` pra testes de data não variarem por máquina.

## Filtros em pílula: primeira página + busca

Toda lista que pode crescer sem limite (cliente, subgrupo, pessoa) carrega a
**primeira página de 50** e se completa por digitação; as curtas e fechadas
(fase, situação) já vêm com a tela e filtram no navegador. Nenhuma delas pede
nada antes de a pílula ABRIR — exceto as duas que escolhem qual quadro a tela
mostra (Kanban e Agenda), que precisam de uma lista pra ter um padrão.

Todas têm três estados e um × que limpa sem abrir o painel. Nenhuma tem seta.

⚠️ **Mexeu numa pílula? Meça a digitação.** O travamento ao digitar já voltou
duas vezes, e nas duas só apareceu medindo:

```bash
yarn dev --port 5174           # numa aba
node scripts/medir-digitacao.mjs   # noutra
```

Acima de ~50ms por tecla a digitação "gruda". O que causa isso é sempre
trabalho proporcional ao tamanho da lista rodando a cada tecla — o
react-select desenha uma linha de DOM por opção, sem virtualização, e por
isso o filtro local tem teto de 50 (com o painel dizendo quantos ficaram de
fora).

## Verificar contra PRODUÇÃO (o único teste que prova o envio real)

```bash
node scripts/verificar-producao.mjs
```

Roda contra `https://argos-monitor.vercel.app` **e escreve dados de verdade**:
envia um PDF minúsculo, abre a tela do documento, dá F5, baixa, mede a cor do
âmbar novo e apaga o que criou. O documento carrega `VERIFICACAO AUTOMATICA`
no título, e a limpeza roda num `finally` — se algo sobrar, é esse nome que
se procura.

🔴 **É o único teste que prova o que nem o `yarn offline` nem o Chrome local
alcançam**: o envio atravessando o CSP do `vercel.json` e o CORS do bucket,
com IAM, SigV4 e a política do S3 valendo ao mesmo tempo. Cada um desses
falha *só* em produção, e o erro que aparece é sempre o mesmo — algo com cara
de CORS que manda quem investiga procurar no lugar errado.

### As credenciais

Ficam em **`.env.local`** (gitignorado), e o `.env.example` traz o formato:

```
PJE_TEST_EMAIL=...
PJE_TEST_SENHA=...
```

⚠️ **Sem prefixo `VITE_`, e isso não é descuido.** Tudo que começa com
`VITE_` é embutido no bundle e chega ao navegador de todo mundo — uma senha
ali seria pública. Estas duas são lidas pelo Node, direto do arquivo, e nunca
entram no build. O script também não imprime nenhuma das duas.

### 🔴 Se o login falhar, o script PARA

`auth_service` bloqueia a conta em **5 tentativas**, e um laço de retry
queimaria as cinco em segundos. Por isso: uma tentativa, e para.

E o login é feito **pela tela**, não por `fetch` montado à mão — quem monta o
corpo é o próprio front, que já sabe que o campo é `password` e não `senha`.
Uma sessão chegou a queimar três tentativas numa conta `super_admin`
justamente por montar esse payload por conta própria.

### O outro roteiro de produção: a carga histórica de ponta a ponta

```bash
cd ../api && .venv/bin/python scripts/e2e_grupo_de_teste.py criar
node scripts/verificar-carga-ponta-a-ponta.mjs
cd ../api && .venv/bin/python scripts/e2e_grupo_de_teste.py remover
```

🔴 **Responde uma pergunta que nenhum outro teste responde**: uma OAB cadastrada
pela aba "Inscrições na OAB" chega até a carga histórica? Cada elo tem prova
própria -- a tela em jsdom, a carga em `tests/test_carga_historica.py`, o
fatiamento contra o PJe --, e é justamente por isso que a EMENDA entre eles não
tinha nenhuma.

🔴 **Num grupo de teste descartável, e não num de cliente.** Provar isto num
grupo real criaria processos no sistema de quem paga por ele. O `criar` monta
grupo, dois subgrupos e um `admin`; o `remover` apaga tudo, **inclusive os
processos e o histórico de e-mail** que a carga gerou.

🔴 **Zero e-mails, e a garantia é de DESENHO, não de sorte.** O SES está fora do
sandbox, então endereço inventado quica e derruba a reputação do domínio. O
subgrupo de destino nasce **sem membros**, e `shared/destinatarios.py` faz
`responsaveis_validos(...) or list(membros)` -- com a lista vazia, ninguém
recebe. A afirmação `emails_com_destinatario === 0` está dentro do roteiro.

⚠️ **Este NÃO usa `PJE_TEST_*`.** A conta é a do grupo de teste, criada e
apagada pelo próprio roteiro -- então ele pode ser rodado quantas vezes for
preciso sem gastar tentativa de login de ninguém.

## Verificar contra a API de verdade, sem stub

Os outros scripts stubam a rede. Este não: ele dirige o front contra o
`src.api.app` rodando local, o que é o único jeito de exercitar a costura
entre os dois lados.

```bash
cd ../api && python scripts/api_local.py          # numa aba
VITE_API_URL=http://localhost:8099 yarn dev --port 5174   # noutra
node scripts/verificar-sessao.mjs
```

O caso que ele cobre: alguém é movida de escritório por um `super_admin`, e a
tela dela tem que se corrigir sozinha — sem digitar senha, sem F5. Sem a
verificação de sessão no servidor, ela continua vendo — e gravando — no
escritório antigo.

## Segurança (headers)

`vercel.json` define Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e HSTS pra todo o app. O CSP libera `connect-src` só pra `https://*.lambda-url.sa-east-1.on.aws` (a API) e bloqueia `script-src`/`object-src` externos — se a Function URL mudar de subdomínio ou surgir uma dependência de terceiro nova (fonte, script), ajustar o CSP em `vercel.json` junto.

## Sobre o React Compiler

O projeto usa **React 18** (não 19), mas tem o [React Compiler](https://react.dev/learn/react-compiler) configurado mesmo assim — ele saiu de beta e ficou estável em outubro/2025, com suporte oficial a partir do React 17. Ele memoiza os componentes automaticamente durante o build (equivalente a espalhar `useMemo`/`useCallback`/`React.memo` manualmente pelo código), configurado em `vite.config.ts` com `target: "18"` + o pacote `react-compiler-runtime` (fornece o polyfill necessário pra rodar em versões anteriores à 19).

Pra conferir que está rodando de verdade, o bundle final (`yarn build`) contém chamadas a `useMemoCache` nos componentes compilados — isso só aparece se o compilador processou o código.

## Estrutura

```
src/
  main.tsx                  -- ponto de entrada
  App.tsx                   -- só os provedores (Toast, Sessão, Router)
  routes/
    index.tsx               -- o mapa de rotas
    Rota*.tsx               -- rotas com casca própria (Login, Raiz, Tarefa, Histórico…)

  types/                    -- todo tipo de alcance global
    index.ts                -- domínio + os tipos compartilhados de UI
    respostas.ts            -- os envelopes que cada rota da API devolve
  constants/                -- arquivos soltos + index.ts que reexporta
    ambiente.ts             -- ÚNICO lugar que lê `import.meta.env`
    roles.ts, paginacao.ts, periodos.ts, select.ts, senha.ts, toast.ts…
  utils/                    -- arquivos soltos + index.ts
    mask.ts (CNJ), date.ts, calendario.ts, deepLink.ts, periodo.ts, plural.ts…
  services/
    auth.ts                 -- login, refresh automático, papel/grupo do JWT
    api/client.ts           -- núcleo HTTP (chamar, ApiError)
    api/<area>.ts           -- um arquivo por área (processos, tarefas, membros…)
                               🔴 SÓ as funções que chamam a API. Tipos vão pra
                               `types/`, auxiliares pra `utils/` -- ver abaixo.
    queryClient.ts, queryKeys.ts
  theme/                    -- tokens e paletas de design
  hooks/                    -- hooks usados por mais de uma página
  contexts/SessaoContext.tsx
  components/               -- 65 componentes gerais, cada um em pasta com seu index
  pages/                    -- 21 páginas, cada uma em pasta com index.tsx
  test/setup.ts             -- jest-dom + TZ fixo em America/Sao_Paulo

vercel.json                 -- SPA fallback (o link de convite/redefinição depende dele)
                               + security headers (CSP etc.)
scripts/                    -- verificação visual em Chrome DE VERDADE, com janela
  verificar-tela.mjs        -- abre uma tela com a API stubada
  medir-digitacao.mjs       -- custo POR TECLA nas pílulas com busca (ver abaixo)
  verificar-sessao.mjs      -- fluxo completo contra a API REAL (ver abaixo)
  medir-painel.mjs, comparar-painel.mjs, screenshot.mjs
vite.config.ts              -- Vite + React Compiler + vitest (jsdom)
eslint.config.js            -- config enxuta, focada no que pega bug
```

### 🔴 `services/api/` tem SÓ as chamadas de API

Nada de `interface`, `type` ou função auxiliar nesses arquivos: só
`criarCliente`, `listarProcessos`, `lerConfiguracoesDoGrupo`. Tipos vão para
`types/`, auxiliares de transformação para `utils/`.

✅ **Os 18 arquivos de `services/api/` seguem isto** (migrados em 27/08/2026).
Ao mexer num deles, mantenha assim: o que não for chamada de API sai.

⚠️ E ao mover algo pra `types/`, `utils/` ou `constants/`, **confira o nome**.
O que era claro dentro do arquivo de origem costuma ficar vago num barrel
compartilhado -- `RECURSO` virou `CAMINHO_POR_TIPO_DE_OPCAO`, `Envelope` virou
`EnvelopePaginado`, `DadosDeDocumento` virou `CamposDeDocumento`.


**Onde um arquivo novo mora**, em quatro regras:

1. Componente e página viram **pasta com `index.tsx`**. Constante, tipo,
   helper e hook são **arquivo solto**.
2. **Alcance decide.** Serve a mais de uma página? Sobe pra `types/`,
   `constants/`, `utils/` ou `hooks/`. É de uma página só? Fica na pasta
   dela (`constants.ts`, `types.ts`, helpers ao lado do `index.tsx`).
3. Componente de uma página só vive em
   `pages/AquelaPagina/components/NomeDele/index.tsx`.
4. O nome precisa fazer sentido **onde o arquivo mora** -- tipo que sobe pra
   `types/` em geral precisa de nome novo (`Intervalo` virou
   `IntervaloDeDatas` justamente por isso).

Exemplo de página completa:

```
AgendaPage/
  index.tsx  index.test.tsx
  constants.ts                 -- VISOES, DIAS_DA_LISTA, PONTOS_POR_CELULA
  types.ts                     -- VisaoDaAgenda, FiltrosDaAgenda (privados daqui)
  periodoDaAgenda.ts  periodoDaAgenda.test.ts
  tarefasPorDia.ts    tarefasPorDia.test.ts
  hooks/useTarefasDaAgenda.ts  hooks/useAssuntosDasTarefas.ts …
  components/VisaoPorMes/index.tsx  components/BarraDeDatas/index.tsx …
```

## O estado das listagens mora na URL (28/08/2026)

Página, tamanho de página, busca e filtros vão na query string:
`/processos?busca=posse&situacao=a&situacao=b&tamanho=30&pagina=2`.

Com isso, **voltar de um detalhe devolve a lista como ela estava** -- que era o
pedido -- e de quebra o F5 mantém, o botão do navegador funciona, e o endereço
pode ser mandado para alguém.

| chave | o que é |
|---|---|
| `pagina`, `tamanho` | paginação; ausentes valem 1 e 10 |
| `busca` | o termo digitado |
| `cliente`, `cliente_nome`, `subgrupo`, `responsavel` | filtros de valor único |
| `fase`, `situacao` | repetíveis (`?fase=a&fase=b`) |
| `verificar_ate`, `prazo_ate` | os filtros de data |
| `tipo`, `falha`, `dias` | os do Histórico |

⚠️ **O padrão não vai na URL**: `pagina=1` some, e voltar ao padrão APAGA a
chave em vez de escrevê-la. Endereço limpo é endereço legível.

⚠️ **Mudar filtro volta para a página 1**, na MESMA escrita -- pedir a página 2
do conjunto novo dá lista vazia sem motivo aparente.

⚠️ **As chaves são iguais em todas as telas**, e é de propósito: cada tela é um
endereço, então `?pagina=2` em Processos e em Clientes nunca se encontram. A
exceção é a tela de **Grupo**, cujas sub-abas dividem um endereço -- lá, trocar
de aba limpa o estado da lista.

## Três coisas que valem para a tela inteira (28/08/2026)

**Todo seletor filtra por digitação.** `permitirBusca` passou a ser `true` por
padrão em `Select` e `MultiSelect` -- listas curtas hoje crescem amanhã (fase,
situação, subgrupo e pessoa são cadastráveis). Desligue com
`permitirBusca={false}` só onde digitar não puder ajudar, e escreva o porquê.

⚠️ Um seletor TRAVADO (esperando a lista) não é pesquisável: o `react-select`
só renderiza o input quando `isSearchable`, e desabilitado ele não renderiza
nada -- sumiria o `combobox` de que teclado e leitor de tela dependem.

**Processos tem filtro por subgrupo.** Uma escolha só, ao lado das outras
pílulas. Ela SOME para quem tem um subgrupo: ali não filtraria nada.

⚠️ Ela RECORTA dentro do que a pessoa já vê -- e pela tela não dá para pedir
outra coisa: a lista da pílula vem de `GET /subgrupos`, que já é escopado, e os
filtros desta tela não vêm da URL. A garantia existe no SERVIDOR mesmo assim,
porque a rota é alcançável por qualquer cliente autenticado.

**Dá para cadastrar cliente sem sair do formulário.** Digitou um nome que não
está no cadastro, aparece "+ Novo cliente «nome»" no fim da lista. Só o nome:
documento, telefone e endereço ficam para a tela do cliente -- pedi-los ali
seria trocar um formulário por outro no meio do primeiro.

⚠️ O atalho só aparece para `manager`+, que é o piso da rota. E vale para
Atendimentos também, que usa o mesmo campo.

## Importar processos por OAB

Em **Processos**, o botão "Importar por OAB" (só para `manager`+) abre a tela
de importação em massa.

O fluxo tem três etapas, com uma decisão humana no meio:

1. **Buscar** — inscrição, UF e subgrupo de destino. O período é opcional e
   fica escondido atrás de um link: só é preciso quando a OAB tem processos
   demais para uma busca só.
2. **Conferir** — quatro cartões (encontrados, seriam cadastrados neste
   subgrupo, já estão neste subgrupo, também em outros) e a tabela com uma **Situação** por linha.
   A lista é **paginada**, como as outras do sistema.
3. **Importar** — grava os selecionados com o histórico que a busca já trouxe,
   e a barra de progresso anda pelo canal em tempo real.

### Os cinco estados da coluna "Situação"

| estado | etiqueta | vem marcado? | dá para marcar? |
|---|---|---|---|
| **neste subgrupo** | `JÁ CADASTRADO AQUI` (âmbar) | — | ❌ o servidor recusa |
| **em outro que você vê** | `JÁ ESTÁ EM CÍVEL` (cinza) | ✅ | ✅ |
| **em outro que você não vê** | `JÁ ACOMPANHADO POR OUTRO SUBGRUPO` (cinza) | ✅ | ✅ |
| **este subgrupo já apagou** | `REMOVIDO ANTES` (vermelho) | ❌ **não** | ✅ **sim** |
| em lugar nenhum | `NOVO` (verde) | ✅ | ✅ |

🔴 **Só o do próprio subgrupo trava** — importar nunca sobrescreve, e uma caixa
que não faz nada é pior que caixa nenhuma. Os outros são informação: o mesmo
processo acompanhado por duas equipes é caso real, e travar transformaria
informação em parede.

🔴 **`REMOVIDO ANTES` é o único que não vem pré-marcado**, e as duas colunas da
tabela acima são coisas diferentes: quem apagou um processo tomou uma decisão,
e o padrão da tela respeita. Vindo marcado, bastaria não reparar na etiqueta
para desfazer a própria exclusão — e numa lista de 500 ninguém repara em uma
linha. **Não é trava**: a caixa segue habilitada e o "Marcar todos" alcança o
processo; desmarcar é um clique, reimportar sem perceber não tem desfazer.

⚠️ Por isso o contador diz coisas como **"17 de 21 marcados"** com a lista
recém-aberta: os removidos contam no total disponível e mesmo assim não vêm
marcados.

⚠️ Os estados **não são exclusivos no dado** (um processo pode estar no destino
*e* em Cível *e* num subgrupo invisível). A linha mostra UMA etiqueta, pela
precedência acima; o cartão "também em outros subgrupos" conta os dois casos de
outro subgrupo, sem contar ninguém duas vezes.

🔴 **`REMOVIDO ANTES` fica acima de `NOVO` e abaixo de todos os outros** — é o
único que **não** é excludente com "novo": o processo não está em subgrupo
nenhum, e é justamente por isso que apareceria como novo sem a etiqueta. Mas se
ele está em algum subgrupo hoje, isso importa mais do que ter sido apagado.

⚠️ **"Marcar todos" age em todos**, não só na página visível: a marca é por
número de processo, não por posição, e sobrevive à virada de página.

⚠️ **A busca não cadastra nada.** É o único ponto em que ainda é barato
desfazer — 200 processos cadastrados por engano são 200 que alguém apaga um a
um.

O apelido de cada processo nasce da **classe processual** normalizada
("Execução Fiscal", "Procedimento Comum Cível"), porque o número já aparece na
linha de baixo.

### Verificar no ambiente local

O front precisa apontar para o `yarn offline` da API — o `.env` aponta para
produção:

```bash
cd api && yarn offline                                    # num terminal
VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
  yarn dev --port 5174 --strictPort                       # noutro
```

⚠️ **Sem `VITE_WS_URL` a barra de progresso não anda** — e nada acusa erro: o
sino continua funcionando pela consulta, e publicar progresso é best-effort.
