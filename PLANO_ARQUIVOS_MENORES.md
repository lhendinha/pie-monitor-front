# Plano: arquivos menores e prosa no padrão -- o front (v1, 05/09/2026)

Irmão do `api/PLANO_ARQUIVOS_MENORES.md`, executado e concluído em 04/09/2026.
O objetivo é o mesmo: **quebrar o que ficou grande sem mudar comportamento, e
deixar a prosa no padrão** (a decisão fica, o diário sai). O que muda é o que
o front É: React com TypeScript, testes em jsdom que já deram falso "passou",
e uma regra escrita de que interface se confere em Chrome de verdade.

Tudo aqui foi **medido em 05/09/2026** com os comandos indicados. Nada foi
assumido a partir do plano da API.

## Por que existe

A pergunta era "tem arquivo grande no front?". A resposta medida é: **quase
não** -- e é bom saber disso antes de planejar um corte que não existe.

| medida | valor |
|---|---|
| arquivos de código em `src/` (fora testes) | 383 |
| linhas | 33.196 |
| linhas de prosa (comentário e JSDoc) | 10.576 (**32%**) |
| arquivos com mais de 500 linhas | **1** (`src/types/index.ts`, 1.360) |
| arquivos entre 301 e 500 linhas | 12 |
| arquivos com mais de 250 linhas de CÓDIGO (sem prosa e sem vazias) | **6** |
| arquivos com diário datado na prosa | **42** (66 linhas com data e sem "medi") |
| blocos de prosa | 1.876; **20** com mais de um 🔴 |
| arquivos com docstring de módulo ou do export principal | 344 de 384 |

Então há três trabalhos, em tamanho decrescente:

1. **`types/index.ts`**: um arquivo só com 87 tipos de nove domínios, 1.360
   linhas das quais 682 são prosa. É o único caso de "arquivo grande" de
   verdade, e vira pacote por domínio -- o mesmo desenho da Fase 3 da API.
2. **Seis componentes** com mais de 250 linhas de código cada. Nenhum é
   "vários componentes num arquivo": cada um é UM componente com muito
   estado e muito JSX. O corte aqui é extrair hook ou subcomponente, e cada
   um se decide lendo o arquivo, na fase.
3. **A prosa**: 42 arquivos com diário, 20 blocos com dois ou três 🔴, e nenhum
   padrão escrito para o front. O padrão da API (seção 0b do `api/CONTEXT.md`)
   se traduz para as formas do TypeScript e entra no `CONTEXT.md` daqui.

## O que "sem mudar comportamento" significa aqui, e como se prova

Quatro provas, e nenhuma substitui a outra:

1. **A prova mecânica, por AST** -- em TODA fase que mover código. Um script
   (**scripts/conferirMovimentacao.mjs**, criado na Fase 0) usa o compilador
   do TypeScript (`typescript` 5.9.3, já instalado) para imprimir cada
   declaração de topo dos arquivos ANTES e DEPOIS **sem comentários** e com
   espaço normalizado, e compara por nome: função, componente, hook, `const`,
   `interface`, `type`. Sumiu, apareceu ou mudou é erro. Renomeio e troca de
   módulo são normalizados como no irmão da API (`--renomeios`, `--modulos`).
   Instrução anônima de topo é chaveada pelo conteúdo (o achado do grupo 5 da
   API já entra de nascença).
2. **A suíte** -- `yarn vitest run`, hoje **1.191 testes em 104 arquivos**,
   com `yarn tsc --noEmit` e `yarn eslint src` zerados antes e depois. Teste
   que cita um caminho que mudou é ajustado no MESMO commit da movimentação,
   e só o import: a asserção não muda.
3. **Chrome de verdade** -- nas fases que movem componente ou hook. A regra do
   projeto é que jsdom já deu falso "passou" e interface se confere em Chrome
   (`CONTEXT.md`, *"Cobrir não é o mesmo que passar"*). A bateria são os **17
   roteiros** `scripts/verificar-*.mjs` contra o `yarn offline` da API na
   porta 5174, de volume limpo e só com as sementes -- todos verdes desde
   04/09/2026. A fase que mexe numa tela roda ao menos os roteiros que a
   exercitam; a última roda a bateria inteira.
4. **Produção** -- o front publica da `main` pela Vercel, então a conferência
   vem DEPOIS do merge: `node scripts/verificar-deploy-em-producao.mjs` com
   a sessão gravada (`scripts/sessaoDeProducao.mjs`, um login pela tela no
   máximo). Fase que não muda comportamento não precisa de deploy próprio;
   ele acontece de qualquer forma no merge.

## As regras que valem para todas as fases

As do front que já existem, e que este plano NÃO reescreve:

1. **Componente e página viram pasta com `index.tsx`; constante, tipo,
   helper e hook são arquivo solto** (`CONTEXT.md`, seção 3). Hook de uma
   página só mora em `pages/AquelaPagina/hooks/useNome.ts` -- precedente
   medido: `AgendaPage/hooks`, `ClienteDetalhePage/hooks`, `KanbanPage/hooks`.
2. **Alcance decide o destino, e o nome muda junto com o lugar.**
3. **Componente de uma página só** mora em `pages/X/components/Nome/index.tsx`
   e não entra em `components/index.ts` (67 exports hoje).
4. **Interface que não é as props sai do `index.tsx`** -- guardado por
   `tiposForaDoIndex.test.ts`.
5. **`contagensDoReadme.test.ts`** cobra os números da seção "Estrutura" do
   README (hoje 69 pastas em `components/`, 22 em `pages/`). Fase que cria
   componente em `components/` atualiza o README no mesmo commit.
6. **`comentariosCitamCodigoReal.test.ts`** cobra nome citado em crase nos
   comentários do front; e **o guarda da API lê o README e o CONTEXT daqui**
   (`api/tests/test_docs_citam_codigo_real.py`). Nome que este plano apaga
   perde a crase no `.md` no mesmo commit; nome futuro vai em **negrito**.

E as que este plano acrescenta, traduzidas do irmão:

7. **Uma fase por branch, a partir da `main` atualizada**, com a suíte,
   `tsc` e `eslint` verdes em TODO commit. Merge só depois da revisão do
   diff, e a conferência de produção depois do merge.
8. **Quem chama, chama pelo nome que a pasta tem.** Componente extraído de
   uma página vive em `pages/X/components/`; hook extraído vive em
   `pages/X/hooks/` ou, se servir a mais de uma página, em `src/hooks/`.
9. **Comentário viaja com a definição.** JSDoc colado numa função move junto
   com ela; o texto não muda na fase de movimentação (a prosa é a Fase 3).
10. **Módulo novo nasce com**: JSDoc de topo no padrão da seção abaixo,
    imports, e nada mais que o que foi movido.
11. **Este plano é prosa que acompanha**: entra em `_todos_os_md()` do guarda
    da API na Fase 0, como o irmão.
12. **Mutação nunca é commitada.** "Mutação que o prova" é sempre manual e
    registrada no commit.

## Fase 0 -- a régua

**Entra**: **scripts/conferirMovimentacao.mjs** e o teste dele
(**scripts/conferirMovimentacao.test.ts**, rodado pelo vitest), no molde de
`api/scripts/conferir_movimentacao.py` e `api/tests/test_conferir_movimentacao.py`:
um caso sintético com função, componente e tipo movidos e renomeados que dá
`OK`; o par negativo com um `+` trocado por `-` que sai com código 1 e diz
QUAL declaração mudou; e o caso da instrução anônima de topo.

⚠️ O que o compilador do TypeScript oferece e o `ast` do Python não: JSX.
Declaração que contém JSX é impressa com `removeComments`, e o `{/* */}`
dentro do JSX é comentário para o compilador -- some da impressão. É isso
que faz a prova ignorar prosa em TSX; e é o que o teste sintético afirma
com um `{/* comentário */}` dentro de um componente movido.

**Medido antes de começar**: os números da tabela acima, gerados por um
script que fica registrado no commit da Fase 0 (`scripts/medirArquivos.mjs`),
para a Fase 3 poder medir o depois com a mesma régua.

Sem deploy. Sem Chrome.

## Fase 1 -- `types/index.ts` vira pacote por domínio

### O que foi medido

87 tipos exportados (68 `interface`, 19 `type`) em cinco seções cujos títulos
**já não descrevem o conteúdo**: a seção "importação de processos por OAB"
tem 42 tipos, entre eles `Membro`, `Tarefa`, `Atendimento` e `Notificacao`.
194 arquivos importam de `types`. O pacote já existe em embrião: `types/`
tem `index.ts` e `respostas.ts` (28 exports, os envelopes da API).

Alcance dos mais usados (pastas de página ou componente que os citam):
`Grupo` 14, `Processo` 14, `Subgrupo` 12, `Cliente` 9, `Tarefa` 8,
`Documento` 7, `Papel` 7, `Atendimento` 6.

Referências entre tipos (medidas por nome no texto da declaração, então
INCLUEM menções em comentário -- a Fase 0 refaz por AST): `Processo` cita
`Atendimento` e `ComClientes`; `Atendimento` cita `Processo`; `Notificacao`
cita `MensagemDoCanal` e vice-versa. Ou seja: **há ciclos**, e o corte por
domínio tem de decidir onde cada aresta fica. Ciclo entre `import type` não
quebra em runtime (tipo some na compilação), mas o guarda de arestas da
Fase 1 é o que impede o pacote de virar um novelo.

### O corte (proposta, a confirmar por AST na execução)

| arquivo novo em `src/types/` | o que leva | tipos (dos 87) |
|---|---|---|
| **sessao.ts** | quem entra e com que papel | `Papel`, `TokensResponse`, `JwtPayload`, `OpcoesRequisicao`, `MeuPerfil`, `CamposDoMeuPerfil`, `SubgrupoDoPerfil`, `AbaDoPerfil`, `SubAbaId`, `SubAbaConfig` |
| **grupo.ts** | grupo, subgrupo, membros, inscrições | `Grupo`, `Subgrupo`, `ConteudoDoSubgrupo`, `ConfiguracoesDoGrupo`, `InscricaoAvulsa`, `InscricaoAvulsaParaSalvar`, `Membro`, `MembroEditavel`, `OpcoesListarMembros`, `OpcoesListarSubgrupos`, `ErroDeInscricao` |
| **processo.ts** | processo, comunicação, opções, filtros, importação por OAB | `Processo`, `Comunicacao`, `HistoricoItem`, `TipoOpcaoProcesso`, `OpcaoProcesso`, `FiltrosProcessos`, `FiltrosBuscaProcessos`, `CamposOpcionaisProcesso`, `ProcessoEncontrado`, `PreviaDaImportacao`, `EstadoDoAchado`, `ErroDaBuscaPorOab`, `ResultadoDaImportacao`, `ProgressoDaImportacao`, `OpcoesListarProcessos`, `OpcoesListarFasesOuSituacoes`, `OpcoesListarHistorico`, `DeepLinkHistorico` |
| **cliente.ts** | cliente e endereço | `Cliente`, `EnderecoDoCliente`, `EnderecoDoCep`, `CamposCliente`, `OpcoesListarClientes`, `EstadoDoCep`, `ComClientes` |
| **tarefa.ts** | quadro e tarefa | `ColunaDoQuadro`, `Tarefa`, `NovaTarefa`, `PrioridadeDaTarefa`, `OpcoesListarTarefas`, `IntervaloDeDatas`, `DiaDoCalendario` |
| **atendimento.ts** | atendimento e registros | `Atendimento`, `AtendimentoResumido`, `ResumoDeAtendimento`, `RegistroDeAtendimento`, `StatusDeAtendimento`, `OpcoesListarAtendimentos`, `Vinculo`, `VinculosDeRegistro` |
| **documento.ts** | documento e envio | `Documento`, `CamposDeDocumento`, `FiltrosDeDocumentos`, `EnvioPreparado` |
| **notificacao.ts** | sino e canal | `Notificacao`, `TipoDeNotificacao`, `AlvoDeNotificacao`, `MensagemDoCanal`, `ToastItem`, `ResumoDaAreaDeTrabalho` |
| **ui.ts** | vocabulário de tela sem dono | `OpcaoDeSelect`, `FormaDaOpcaoDeSelect`, `OpcaoDeMenu`, `ItemNavegacao`, `VarianteBotao`, `Descarte`, `ValorDeFormulario`, `ComOrdem` |
| **api.ts** | a forma das chamadas | `RespostaCruaDaApi`, `EnvelopePaginado`, `OpcoesDePaginacao`, `ValorDeParametroDeQuery` |
| **url.ts** | estado de listagem na URL | `ValorDaUrl`, `MudarEstadoNaUrl`, `Alargado`, `OpcoesDoEstadoNaUrl` |

`index.ts` vira só reexport: `export type * from "./processo"` e assim por
diante (`isolatedModules` está ligado; `export type *` é TypeScript 5+, e o
projeto está em 5.9). **Nenhum dos 194 importadores muda.** `respostas.ts`
continua onde está e passa a importar dos arquivos de domínio.

⚠️ A tabela é a MELHOR hipótese a partir do que foi medido. `ResumoDaAreaDeTrabalho`
em `notificacao.ts`, por exemplo, é escolha discutível (é o resumo da home);
`ComClientes` em `cliente.ts` ou em `processo.ts` depende de quem o cita. A
execução lê cada tipo, decide, e registra a decisão na seção "O que foi
medido" desta fase, como o irmão fez.

### O que muda fora

- A regra 1 da seção 3 do `CONTEXT.md` ganha a exceção escrita: `types/` é
  a única pasta de tipos com índice, porque é reexport puro de um pacote --
  o mesmo desenho e a mesma justificativa da API (`domain/entities/`).
- README, seção "Estrutura": a linha de `types/` passa a listar os arquivos.
- `CONTEXT.md` daqui cita `types/index.ts` duas vezes (linhas 2285 e 2527);
  as duas apontam para o arquivo do domínio.

### Os guardas que entram

- **tiposForaDoIndex** continua igual (ele olha `index.tsx` de componente,
  não `types/`).
- Um guarda novo, **tiposDoPacote.test.ts**: (a) todo `export` de
  `types/index.ts` é `export type * from`; (b) o grafo de `import type` entre
  os arquivos de `types/` não tem ciclo -- medido por regex nos imports, que
  é o bastante para arquivos que só declaram tipo; (c) o número de tipos
  exportados pelo pacote é o mesmo de antes (**87**), afirmado por
  contagem, no molde de `test_serializacao_entidades` da API.

### Ordem de execução

1. Branch a partir da `main`; cópia de `types/index.ts` e `types/respostas.ts`
   para `/tmp` (o ANTES da prova).
2. Um arquivo por domínio, na ordem das folhas: `url.ts`, `api.ts`, `ui.ts`,
   `sessao.ts` (não dependem de ninguém), depois `cliente.ts`, `tarefa.ts`,
   `documento.ts`, `notificacao.ts`, `atendimento.ts`, `grupo.ts`,
   `processo.ts`. Comentário viaja colado com o tipo (regra 9). Referência
   entre domínios vira `import type` explícito, na direção decidida.
3. `index.ts` vira os reexports; `respostas.ts` troca `./index` pelos
   domínios.
4. `node scripts/conferirMovimentacao.mjs --antes /tmp/index.ts /tmp/respostas.ts --depois src/types/*.ts --modulos ...` dá `OK: 115 declarações idênticas`
   (87 + 28). `tsc`, `eslint`, `vitest`: verdes, **1.191 + os testes novos**.
5. README, `CONTEXT.md` (regra e as duas citações), guarda novo. Commit.
6. Sem Chrome: tipo não desenha nada. Merge após revisão; a Vercel publica;
   `verificar-deploy-em-producao.mjs` confirma que a tela é a mesma.

## Fase 2 -- os seis componentes com mais de 250 linhas de código

### O que foi medido

Linhas de código (sem prosa, sem vazias), linhas de JSX (do `return (` ao
fim), estado e funções internas de cada um:

| componente | código | JSX | `useState` | queries/mutations | funções internas | hooks já usados |
|---|---|---|---|---|---|---|
| `components/ModalDeTarefa` | 294 | 158 | 7 | 2 | 2 | descarte, subgrupos buscáveis, toast |
| `pages/MembrosPage/components/EditarMembroForm` | 291 | 211 | 8 | 1 | 2 | descarte, toast |
| `pages/ProcessosPage/components/PreviaDaImportacao` | 291 | **302** de 408 | 2 | 0 | 1 | nenhum |
| `pages/KanbanPage` | 283 | 158 | 2 | 1 | **5** | 8 |
| `components/ModalDeDocumento` | 267 | 148 | 6 | 1 | 2 | descarte, subgrupos buscáveis, toast |
| `pages/HistoricoPage` | 244 | 185 | 1 | 1 | 1 | 8 |

A leitura que os números permitem, e que a execução confirma ou desfaz
lendo o arquivo:

- **PreviaDaImportacao** é quase só JSX (302 de 408 linhas): o corte natural
  é subcomponente de página (`pages/ProcessosPage/components/`), por exemplo
  a linha da tabela e a legenda dos cinco estados -- sem hook nenhum, porque
  o estado é pouco (2 `useState`, 3 `useMemo`).
- **ModalDeTarefa**, **ModalDeDocumento** e **EditarMembroForm** têm de 6 a 8
  `useState` e uma ou duas mutações: o corte natural é um hook de formulário
  ao lado do componente (`components/ModalDeTarefa/useFormularioDeTarefa.ts`,
  etc.), no precedente de `pages/ProcessosPage/hooks/useFiltrosProcessos.ts`,
  deixando o `index.tsx` com o JSX e o hook com o estado e as mutações.
- **KanbanPage** tem cinco funções internas e oito hooks: o corte é por
  responsabilidade (arrastar, criar coluna, mover cartão), cada uma virando
  hook em `pages/KanbanPage/hooks/` -- a pasta já existe com
  `useTarefasDoQuadro.ts`.
- **HistoricoPage** usa oito hooks e tem 185 linhas de JSX: o candidato é a
  mutação do link profundo (`historicoDoProcesso` + abrir o envio) virar
  `pages/HistoricoPage/hooks/useLinkProfundoDoHistorico.ts`, e o cabeçalho
  de filtros virar componente de página, como Atendimentos e Processos já
  fizeram (`CabecalhoAtendimentos`, `CabecalhoProcessos`).

⚠️ **Nenhum desses cortes está decidido.** Cada um tem uma seção "O que foi
medido" na execução, com o arquivo lido, e a decisão pode ser "não corta":
componente com 250 linhas de código e um assunto só é aceitável, e o irmão
da API deixou escrito que tamanho é sinal, não lei.

### Como se prova que um hook extraído é o mesmo código

A prova por AST compara declarações de topo. Um hook extraído de DENTRO de um
componente é código que era corpo de função e vira função nova: a prova
mecânica não alcança, e é o único caso deste plano em que isso acontece.
Aqui valem as outras três: os testes do componente (2 a 3 arquivos cada,
medido por grep), os roteiros em Chrome que passam pela tela
(`verificar-ponta-a-ponta`, `verificar-abas`, `verificar-documentos`,
`verificar-responsaveis`, `verificar-importar-por-oab`, `verificar-filtros-do-historico`,
`verificar-agenda-sem-quadros`), e a conferência de produção. Por isso esta
fase é a que mais custa e vem depois da Fase 1, que é mecânica.

### Ordem de execução

Um componente por commit, na ordem da tabela, cada um com: leitura e
decisão registrada; extração; teste do componente verde sem mudar asserção;
roteiro em Chrome da tela; `tsc`/`eslint`/`vitest`. README atualizado se
entrar pasta em `components/`. Merge após revisão; Vercel;
`verificar-deploy-em-producao.mjs` e o roteiro de produção da tela, quando
existir.

## O padrão de prosa (vale para todo código novo desde a Fase 1, e para o existente na Fase 3)

É a seção 0b do `api/CONTEXT.md` traduzida para as formas do TypeScript. Entra
no `CONTEXT.md` daqui como seção **0b** no primeiro commit da Fase 3.

### As formas, e o que cada uma é

| forma | onde | é o quê |
|---|---|---|
| `/** ... */` colado no `export default function` ou no primeiro export | todo arquivo | o **docstring de módulo**: a primeira linha diz o que o arquivo é |
| `/** ... */` colado numa função, hook ou constante exportada | quando ela pede | docstring da definição |
| `/* ... */` antes de uma instrução, ou `//` na linha | dentro do corpo | comentário de decisão local |
| `{/* ... */}` no JSX | entre elementos | idem, na árvore |

### Forma: três partes, nesta ordem, e nada mais

1. **Primeira linha**: o que é, numa frase, sem "Este componente...".
2. **A regra e o custo**: 🔴 para a decisão que quebra algo se for desfeita
   (**no máximo um por bloco** -- hoje 20 blocos têm dois ou três), ⚠️ para a
   armadilha que não quebra teste.
3. **O ponteiro** ➡️: o teste que cobre, ou a seção do `CONTEXT.md` com a
   história. Hoje o front tem 4 ➡️ contra 821 🔴 e 800 ⚠️.

### O que sai do código e vai para o `CONTEXT.md`

Data de decisão, "a primeira versão fazia X", "antes era assim", nome de
função que não existe mais. Fica só a data que acompanha um NÚMERO MEDIDO
("medido em 26/08/2026: card 0, lista 1"). O `CONTEXT.md` daqui já tem as
histórias datadas por seção; a Fase 3 acrescenta as que só o código conta,
sob o título *"Histórias que saíram dos comentários"*, por área.

## Fase 3 -- prosa: a decisão fica, o diário sai

### O que foi medido (05/09/2026)

**42 arquivos** têm data sem "medi" na prosa, 66 linhas. Os que concentram:
`types/index.ts` 5 (já tratado na Fase 1, regra 9: o texto viaja, e a Fase 3
o limpa nos arquivos de domínio), `utils/date.ts` 4, `HistoricoPage` 3,
`FormularioDaInscricao` 3, e mais dezoito com 1 ou 2. A prosa é 32% do
código; a API tinha 44%.

### O guarda que entra: **prosaSemDiario.test.ts**

Na raiz de `src/`, ao lado dos cinco guardas que já existem. Lê comentário
de bloco, de linha e de JSX com o mesmo extrator de
`comentariosCitamCodigoReal.test.ts` (`COMENTARIO_DE_BLOCO`,
`COMENTARIO_DE_LINHA`), e cobra: data só na mesma frase que "medi". É
parametrizado por arquivo com uma lista **JA_LIMPOS** que cresce a cada
grupo, e no último grupo vira `src/` inteiro -- exatamente o desenho do
`test_docstring_sem_diario.py` da API, com o par negativo do leitor (ao
menos um bloco por arquivo não vazio, e centenas na soma).

### Os grupos (um por branch)

1. **Os seis da Fase 2 e `types/`** -- que acabaram de ser lidos.
2. **Páginas**: os 22 `pages/*/index.tsx` e os componentes de página.
3. **`components/`**: as 69 pastas.
4. **`hooks/`, `utils/`, `services/`, `constants/`, `contexts/`, `routes/`, `theme/`** -- e a lista **JA_LIMPOS** dá lugar a `src/` inteiro.

Cada grupo: `git show main:` de cada arquivo em `/tmp`; reescrita bloco a
bloco; `conferirMovimentacao.mjs` dá `OK` (prosa não é declaração);
`eslint` sem aviso novo; a história que o `CONTEXT.md` não tinha entra ANTES
de sair do código; JA_LIMPOS cresce; suíte verde. Sem Chrome: prosa não
desenha. Merge após revisão.

## O que NÃO entra, e por quê

- **Nada visual.** Nenhuma tela, cor, texto de botão ou rota muda. A régua é
  a mesma da API: o usuário não percebe que houve refatoração.
- **Testes não mudam de asserção.** Só o import, quando o alvo mudou de
  arquivo.
- **`theme/index.ts` (371 linhas, 183 de código)**, `services/auth.ts` (176
  de código) e `utils/select.ts` (169) ficam: estão abaixo da linha, e cada
  um é um assunto só.
- **Renomear componentes** para "melhorar o nome": o guarda da API lê os
  `.md` daqui e cada rename custa citação nos dois repositórios. Só o nome
  que a mudança de lugar exige (regra 2).

## Estimativa, medida contra o irmão

A API levou um dia (04/09/2026) para 4 fases sobre 25 mil linhas com 44% de
prosa. Aqui são 33 mil linhas com 32% de prosa e UM arquivo grande de
verdade. A Fase 2 é a mais cara, porque cada corte exige leitura e Chrome.
Ordem: 0, 1, 2, 3 -- a 3 pode começar pelos grupos 2 a 4 enquanto a 2 espera
decisão, porque não se tocam.
