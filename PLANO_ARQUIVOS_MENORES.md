# Plano: arquivos menores e prosa no padrão -- o front (v3, 05/09/2026)

Irmão do `api/PLANO_ARQUIVOS_MENORES.md`, executado e concluído em 04/09/2026.
O objetivo é o mesmo: **quebrar o que ficou grande sem mudar comportamento, e
deixar a prosa no padrão** (a decisão fica, o diário sai). O que muda é o que
o front É: React com TypeScript, testes em jsdom que já deram falso "passou",
e uma regra escrita de que interface se confere em Chrome de verdade.

Tudo aqui foi **medido em 05/09/2026** por `node scripts/medirArquivos.mjs src`
(a régua da Fase 0). Nada foi assumido a partir do plano da API.

## Por que existe

A pergunta era "tem arquivo grande no front?". A resposta medida é: **quase
não** -- e é bom saber disso antes de planejar um corte que não existe.

| medida | valor |
|---|---|
| arquivos de código em `src/` (fora testes) | 383 |
| linhas | 33.196 |
| linhas de prosa (comentário e JSDoc; linha vazia dentro de bloco não conta) | 10.444 (**31%**) |
| arquivos com mais de 500 linhas | **1** (`src/types/index.ts`, 1.360) |
| arquivos entre 301 e 500 linhas | 12 |
| arquivos com mais de 250 linhas de CÓDIGO (sem prosa e sem vazias) | **6** |
| arquivos com diário datado na prosa | **48** (66 linhas com data e sem "medi") |
| blocos de prosa (bloco `/* */` ou sequência de `//`) | 2.012; **20** com mais de um 🔴 |
| arquivos com docstring de módulo ou do export principal | 344 de 383 (faltam 39: barris, ícones, `main.tsx`) |

Então há três trabalhos, em tamanho decrescente:

1. **`types/index.ts`**: um arquivo só com 87 tipos de nove domínios, 1.360
   linhas das quais 682 são prosa. É o único caso de "arquivo grande" de
   verdade, e vira pacote por domínio -- o mesmo desenho da Fase 3 da API.
2. **Seis componentes** com mais de 250 linhas de código cada. Nenhum é
   "vários componentes num arquivo": cada um é UM componente com muito
   estado e muito JSX. O corte aqui é extrair hook ou subcomponente, e cada
   um se decide lendo o arquivo, na fase.
3. **A prosa**: 48 arquivos com diário, 20 blocos com dois ou três 🔴, e nenhum
   padrão escrito para o front. O padrão da API (seção 0b do `api/CONTEXT.md`)
   se traduz para as formas do TypeScript e entra no `CONTEXT.md` daqui.

## O que "sem mudar comportamento" significa aqui, e como se prova

Quatro provas, e nenhuma substitui a outra:

1. **A prova mecânica, por AST** -- em TODA fase que mover código. Um script
   (**scripts/conferirMovimentacao.mjs**, criado na Fase 0) usa o compilador
   do TypeScript (`typescript` 5.9.3, já instalado) para imprimir cada
   declaração de topo dos arquivos ANTES e DEPOIS **sem comentários** e com
   espaço normalizado, e compara por nome: função, componente, hook, `const`,
   `interface`, `type`. Sumiu, apareceu ou mudou é erro. Renomeio é
   normalizado como no irmão da API (`--renomeios`); `import` e reexport
   (`export ... from`) são ignorados, porque mudam por definição numa
   movimentação. Não há `--modulos`: no front a referência a um símbolo movido
   não ganha prefixo de módulo, só muda o `import`. Instrução anônima de topo é
   chaveada pelo conteúdo (o achado do grupo 5 da API já entra de nascença).
2. **A suíte** -- `yarn test` (vitest), hoje **1.191 testes em 104 arquivos**,
   com `yarn typecheck` (`tsc -b`) e `yarn lint` zerados antes e depois; e
   `yarn build` na fase que mexe em `types/`, porque é o `tsc -b && vite build`
   da Vercel que decide se o reexport compila. Teste
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
   página só mora em **pages/&lt;Página&gt;/hooks/**, arquivo solto -- precedente
   medido: sete páginas já têm `hooks/` (Agenda, ClienteDetalhe, Kanban,
   ProcessoDetalhe, Processos, Subgrupos, Workspace).
2. **Alcance decide o destino, e o nome muda junto com o lugar.**
3. **Componente de uma página só** mora em `pages/X/components/Nome/index.tsx`
   e não entra em `components/index.ts` (67 exports hoje). E não conta para o
   README: `contagensDoReadme.test.ts` conta PASTAS de `components/` e de `pages/`.
4. **Interface que não é as props sai do `index.tsx`** -- guardado por
   `tiposForaDoIndex.test.ts`.
5. **`contagensDoReadme.test.ts`** cobra os números da seção "Estrutura" do
   README (hoje 68 pastas em `components/`, 21 em `pages/`, e o README já
   diz isso). Fase que cria componente em `components/` atualiza o README no
   mesmo commit.
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

**Status: EXECUTADA em 05/09/2026** (branch `fase-0-regua-da-movimentacao`;
`scripts/conferirMovimentacao.mjs` com cinco testes -- movimentação com
renomeio e export novo dá `OK: 5`, o `+` trocado por `-` acusa `MUDOU`,
declaração que some acusa `SUMIU`, instrução anônima é chaveada pelo
conteúdo, repetição é `DUPLICADO`; `scripts/medirArquivos.mjs` com dois
testes, e os números da tabela deste plano refeitos por ele; o plano entrou em
`_todos_os_md()` do guarda da API, numa branch da API). Suíte: **1.198**
(1.191 + 7).

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
script que fica registrado no commit da Fase 0 (**scripts/medirArquivos.mjs**),
para a Fase 3 poder medir o depois com a mesma régua.

**Entra também**: este plano em `_todos_os_md()` de
`api/tests/test_docs_citam_codigo_real.py` (regra 11). ⚠️ Aquele guarda trata
como caminho qualquer crase que termine em `.ts`, `.tsx` ou `.mjs`, e confere
pelo NOME do arquivo em qualquer pasta dos dois repositórios: nome de arquivo
futuro neste plano vai em **negrito** até existir.

Sem deploy. Sem Chrome.

## Fase 1 -- `types/index.ts` vira pacote por domínio

**Status: EXECUTADA em 05/09/2026** (branch `fase-1-types-por-dominio`).
O que a execução decidiu, e o que ela achou de diferente do planejado:

- **O pacote tinha TRÊS arquivos, não dois**: `requisicoes.ts` (2 tipos, os
  corpos que as chamadas mandam) já existia ao lado de `respostas.ts` e a
  medição da v1 não o viu. Ficou onde está, e entrou na prova: `OK: 117
  declarações idênticas` (87 + 28 + 2), com as três cópias no `--antes` e
  os catorze arquivos de `src/types/` no `--depois`.
- **Arestas por AST** (só referência de tipo, sem comentário): `grupo ->
  sessao` (`Membro` e `MembroEditavel` citam `Papel`) e `ui -> sessao`
  (`ItemNavegacao` cita `Papel`). Nada mais. Os "ciclos" medidos por texto
  na v1 (`Processo` <-> `Atendimento`, `Notificacao` <-> `MensagemDoCanal`)
  eram menção em prosa, ou tipos no mesmo domínio. A tabela do corte valeu
  como estava, inclusive `ResumoDaAreaDeTrabalho` em **notificacao** e
  `ComClientes` em **cliente** (nenhum tipo de outro domínio o referencia).
- `respostas.ts` segue importando de `./index`; `requisicoes.ts` não importa
  de ninguém.
- **Prosa viajou colada, sem mudar** (regra 9), com uma exceção: as réguas
  de seção (`/* --- título --- */` e as linhas de `// ----`) não pertencem a
  tipo nenhum e saíram. O texto dos dois banners longos ("Tipos que estavam
  espalhados", "Os parâmetros e corpos das chamadas de API") ficou colado ao
  tipo que vinha depois dele -- `ComOrdem` em `ui.ts` e `OpcoesListarAtendimentos`
  em `atendimento.ts` -- e é trabalho da Fase 3 decidir o que dele vira
  história no `CONTEXT.md`. O comentário do `import type` de `constants/`
  agora aparece nos três arquivos que importam de lá (`tarefa.ts`,
  `atendimento.ts`, `notificacao.ts`): também Fase 3.
- ⚠️ **Cinco docstrings já estavam no lugar errado no arquivo antigo**, e
  foram movidos como estavam. Dois descrevem OUTRO tipo (o de `GET /me`
  está acima de `CamposDoMeuPerfil`, em `sessao.ts`; "Tarefa do Kanban" está
  acima de `ResumoDaAreaDeTrabalho`, em `notificacao.ts`) e três são
  docstring duplo, o velho seguido do novo (`FiltrosBuscaProcessos` em
  `processo.ts`; `AtendimentoResumido` e `VinculosDeRegistro` em
  `atendimento.ts`). A Fase 3 corrige; nesta fase corrigir seria mudar
  prosa fora da régua.
- Guarda **`tiposDoPacote.test.ts`** com quatro testes, provado por mutação:
  um `import type` que fecha ciclo, um `export` a menos e uma declaração
  dentro do índice fazem cada um o seu teste falhar. Suíte: **1.202** testes
  em 107 arquivos; `yarn typecheck`, `yarn lint`, `yarn build` verdes.
  Nenhum dos 161 importadores mudou.
- Fora de `types/`: a regra 1 da seção 3 do `CONTEXT.md` ganhou a exceção,
  as duas citações de lá e dois comentários (`constants/limites.ts`,
  `CartaoDoArquivo`) passaram a apontar o arquivo do domínio, e o README
  lista os arquivos.

### O que foi medido

87 tipos exportados (68 `interface`, 19 `type`) em cinco seções cujos títulos
**já não descrevem o conteúdo**: a seção "importação de processos por OAB"
tem 42 tipos, entre eles `Membro`, `Tarefa`, `Atendimento` e `Notificacao`.
**161 arquivos** importam de `src/types` (medido pelo `import ... from`
resolvido, não por texto: a primeira contagem, 194, somava os `./types`
locais de página). O pacote já existe em embrião: `types/` tem `index.ts` e
`respostas.ts` (28 exports, os envelopes da API), e `respostas.ts` importa de
`./index`.

Alcance dos mais importados (pastas de página ou componente com `import
type` deles): `Papel` 8, `CamposOpcionaisProcesso` 5, `EnderecoDoCliente` 5,
`OpcaoDeSelect` 5, `Tarefa` 5, `TipoOpcaoProcesso` 4, `IntervaloDeDatas` 4,
`Vinculo` 4. ⚠️ Contar por texto dava `Grupo` 14 e `Processo` 14 -- prosa
cita nome; só o import diz quem depende.

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
projeto está em 5.9; conferido com `tsc` sob `isolatedModules` e
`moduleResolution: bundler`). **Nenhum dos 161 importadores muda.**
`respostas.ts` continua onde está; pode seguir importando de `./index` (não
há ciclo: o índice só reexporta) ou passar aos domínios -- decisão da
execução, registrada.

⚠️ A tabela é a MELHOR hipótese a partir do que foi medido. `ResumoDaAreaDeTrabalho`
em **notificacao**, por exemplo, é escolha discutível (é o resumo da home);
`ComClientes` em **cliente** ou em **processo** depende de quem o cita. A
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
2. Um arquivo por domínio, na ordem das folhas: **url**, **api**, **ui**,
   **sessao** (não dependem de ninguém), depois **cliente**, **tarefa**,
   **documento**, **notificacao**, **atendimento**, **grupo**, **processo**.
   Comentário viaja colado com o tipo (regra 9). Referência entre domínios
   vira `import type` explícito, na direção decidida.
3. `index.ts` vira os reexports.
4. A prova: `--antes` com as duas cópias de `/tmp`, `--depois` com todos os
   arquivos de `src/types/`, dá `OK: 115 declarações idênticas` (87 + 28;
   medido: não há `const` nem função de topo nos dois arquivos). `yarn
   typecheck`, `yarn lint`, `yarn build`, `yarn test`: verdes, **1.191 + os
   testes novos**.
5. README, `CONTEXT.md` (regra e as duas citações), guarda novo. Commit.
6. Sem Chrome: tipo não desenha nada. Merge após revisão; a Vercel publica;
   `verificar-deploy-em-producao.mjs` confere os rótulos e marcas das telas
   que ele cobre no build publicado -- é o que o projeto já usa depois de
   todo deploy, e não uma prova de igualdade da tela inteira.

## Fase 2 -- os seis componentes com mais de 250 linhas de código

**Status: EXECUTADA em 05/09/2026** (branch `fase-2-componentes-grandes`,
um commit por componente, e um sétimo com as duas regras que a execução
fez o usuário escrever). O que cada leitura decidiu:

| componente | corte | antes -> depois (linhas) | prova |
|---|---|---|---|
| `ModalDeTarefa` | hook `useFormularioDeTarefa.ts` ao lado (estado, consultas, mutações, guarda de descarte) | 467 -> 281 + 285 | corpo movido com diff VAZIO contra o original; 11 testes iguais |
| `EditarMembroForm` | hook `useFormularioDeMembro.ts` ao lado | 490 -> 273 + 296 | diff vazio; 27 testes iguais |
| `PreviaDaImportacao` | dois componentes de página: `ResumoDaPrevia` (a grade de cartões) e `LinhaDaPrevia` (a linha da tabela); sem hook, o estado ficou | 408 -> 298 + 79 + 79 | 80 testes da página iguais |
| `KanbanPage` | `hooks/useArrastarTarefa.ts` (sensores, mutação otimista, fim do arraste) e `hooks/useTarefaDoLink.ts` (busca direta + abertura única) | 460 -> 352 + 96 + 50 | duas linhas diferem: `onSettled` e `setTarefaAberta` viraram parâmetro; 59 testes iguais |
| `ModalDeDocumento` | hook `useFormularioDeDocumento.ts` ao lado | 364 -> 240 + 210 | diff vazio; 22 testes iguais |
| `HistoricoPage` | `hooks/useLinkProfundoDoHistorico.ts`; o cabeçalho de filtros NÃO virou componente (seriam onze props para 36 linhas de JSX, e a página já tinha 244 de código) | 419 -> 373 + 67 | uma linha difere (`setItemAberto` virou parâmetro); 45 testes iguais |

Depois dos seis: **nenhum arquivo de `src/` passa de 250 linhas de código**
(eram 5 pelo medidor; a tabela deste plano contava 6 porque a HistoricoPage
tinha 244), e nove ficam entre 301 e 500 linhas totais, todos por prosa.

O que a execução achou, e o que o usuário decidiu no caminho:

- O pré-requisito da HistoricoPage virou `api/scripts/offline/semear_historico.py`
  (branch `semente-do-historico` da API): dois subgrupos, dois processos,
  cinco movimentações e um lembrete, na forma que o roteiro exige. O roteiro
  aponta a semente e entrou na bateria.
- `clientesIniciais` do `ModalDeDocumento` era objeto tipado inline nas
  props; o hook precisava nomeá-lo e virou `ClientesIniciaisDoDocumento` em
  `types/documento.ts`. O mesmo defeito existe em `progresso` de
  `PreviaDaImportacao` -- registrado nos achados, não corrigido aqui.
- 🔴 **Duas regras novas, dadas pelo usuário ao revisar os hooks** (regras 7
  e 8 da seção 3 do `CONTEXT.md`): arquivo de hook não declara tipo, e tem
  UM hook só. A varredura achou nove tipos em hooks (seis anteriores ao
  plano e os três `OpcoesDoFormulario*` desta fase) e quatro arquivos com
  mais de um hook. Todos movidos: os tipos para o `types.ts` da pasta ou
  para `src/types/` (o pacote passou de 88 para 92: `OpcoesBuscaveis`,
  `SubgrupoLembrado`, `EtapaDaImportacao`, `OpcoesDaConsultaDeCep`), com nome
  revisto quando o antigo só fazia sentido dentro do arquivo; o antigo
  useCatalogos virou `useTodosOsSubgrupos.ts`, `useOpcoesDeProcesso.ts` e
  `useTodosOsMembros.ts`; o antigo useOpcoesBuscaveis virou
  `useListaBuscavel.ts`, `useClientesBuscaveis.ts`, `useSubgruposBuscaveis.ts`,
  `usePessoasBuscaveis.ts`, `utils/opcoesEscolhidas.ts` e `utils/permissoes.ts`;
  `useNomesDeSubgruposVisiveis.ts` saiu de `useNomeDeSubgrupo.ts`;
  `impedimentosDoSubgrupo.ts` saiu do hook da SubgruposPage. Guarda novo
  **`hooksUmPorArquivo.test.ts`**, com a mutação embutida. Suíte: **1.206**
  testes em 108 arquivos; `tsc`, `eslint` e `build` verdes.
- **Bateria em Chrome de volume limpo (`yarn offline:limpar`), 05/09/2026**:
  as doze sementes do README da API e os 20 roteiros offline de
  `front/scripts/` -- todos passam. Três precisaram de conserto no PRÓPRIO
  roteiro, nenhum no sistema: `verificar-filtros-do-historico` media a altura
  das linhas na tela de abertura, onde os envios de `semear_resumo.py` (sem
  órgão nem tipo) medem 98px contra 118px -- passou a medir na lista
  filtrada pelo processo semeado; `verificar-ordenacao` esperava "Zuleica"
  na primeira página de 10, e com 16 processos no volume ela é a 12ª -- abre
  cada lista com `?tamanho=50`; `verificar-oab-no-perfil` recebia 400 do
  `PATCH /me` porque `verificar-nome-do-autor` roda a própria semente e
  devolve à conta o nome "Chefe Sousa" -- a semente do titular passa a vir
  depois dele, escrito no README da API. `verificar-tela.mjs` aponta a porta
  5173 (a do usuário) e fica fora da bateria.

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
  ao lado do componente (**components/ModalDeTarefa/useFormularioDeTarefa.ts**,
  e assim por diante), no precedente de `useFiltrosProcessos.ts` em
  `pages/ProcessosPage/hooks/`, deixando o `index.tsx` com o JSX e o hook com
  o estado e as mutações.
- **KanbanPage** tem cinco funções internas e oito hooks: o corte é por
  responsabilidade (arrastar, criar coluna, mover cartão), cada uma virando
  hook em `pages/KanbanPage/hooks/` -- a pasta já existe com
  `useTarefasDoQuadro.ts`.
- **HistoricoPage** usa oito hooks e tem 185 linhas de JSX: o candidato é a
  mutação do link profundo (`historicoDoProcesso` + abrir o envio) virar
  **pages/HistoricoPage/hooks/useLinkProfundoDoHistorico.ts**, e o cabeçalho
  de filtros virar componente de página, como Atendimentos e Processos já
  fizeram (`CabecalhoAtendimentos`, `CabecalhoProcessos`).
  ⚠️ **Pré-requisito medido**: o roteiro em Chrome desta tela,
  `verificar-filtros-do-historico.mjs`, NÃO roda de volume limpo -- o
  cabeçalho dele manda rodar uma semente que ficou num scratchpad e não está
  no repositório. Ele ficou fora da bateria de 04/09/2026 por isso. Antes de
  cortar a HistoricoPage, a semente vira `scripts/offline/` na API e o
  roteiro entra na bateria.

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
`verificar-responsaveis`, `verificar-importar-por-oab`,
`verificar-agenda-sem-quadros`, e `verificar-filtros-do-historico` depois do
pré-requisito acima), e a conferência de produção. Por isso esta fase é a
que mais custa e vem depois da Fase 1, que é mecânica.

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

**48 arquivos** têm data sem "medi" na prosa, 66 linhas. Os que concentram:
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
2. **Páginas**: os 21 `pages/*/index.tsx`, com os componentes e hooks de página.
3. **`components/`**: as 68 pastas.
4. **`hooks/`, `utils/`, `services/`, `constants/`, `contexts/`, `routes/`, `theme/`** -- e a lista **JA_LIMPOS** dá lugar a `src/` inteiro, fora `*.test.*`, `*.d.ts` e `test/setup.ts`, que não são prosa do produto.

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

## Achados no caminho (fora deste plano)

- O README diz "702 testes em 66 arquivos" (linha 428); são 1.202 em 107 (Fase 1).
  `contagensDoReadme.test.ts` só cobre componentes e páginas. Ou o número vira guarda,
  ou sai do README -- a régua daquele guarda é que número em `.md` que só
  envelhece não fica.
- `progresso` de `PreviaDaImportacao` é objeto tipado inline nas props
  (`{ feitos, total }`); `ProgressoDaImportacao` em `types/processo.ts` tem os
  mesmos campos mais `tipo`. Nomear é trabalho de uma linha, fora deste plano.

## O que mudou de versão para versão, e por quê

**v2 (05/09/2026)**, depois da auditoria da v1 em quinze aspectos, cada um
remedido: 194 importadores eram 161 (texto contava os `./types` de página);
alcance por texto virou alcance por import; 69/22 pastas eram 68/21 (o
`index.ts` entrava na conta); 384 arquivos eram 383 (o `.d.ts`); 1.876 blocos
eram 2.013 (as sequências de `//` não entravam); os comandos passaram a ser
os do `package.json`; `--modulos` saiu da prova (não se aplica ao front);
`yarn build` entrou na Fase 1; o precedente de hooks de página era três e
são sete; nomes de arquivo futuros ficaram em negrito por causa do guarda da
API; `verificar-filtros-do-historico` ganhou o pré-requisito da semente; a
frase sobre `verificar-deploy-em-producao` deixou de prometer "a tela é a
mesma"; o guarda de prosa exclui testes, `.d.ts` e o setup. Conferido de
novo: os 87 tipos da tabela, sem falta nem repetição; `export type *`
compila sob as opções do projeto; o `printer` do TypeScript apaga o
`{/* */}` do JSX com `removeComments`.

**v5 (05/09/2026, Fase 2)**: a HistoricoPage tinha 244 linhas de código,
abaixo do sinal, e mesmo assim ganhou o hook do link (o corte era limpo);
o cabeçalho de filtros dela ficou. Duas regras novas do usuário entraram no
`CONTEXT.md` e num guarda, e a varredura delas mexeu em treze arquivos
fora dos seis componentes. A semente do Histórico saiu do achado e virou
script da API.

**v4 (05/09/2026, Fase 1)**: o pacote tinha `requisicoes.ts`, que a
medição não viu (a prova passou de 115 para 117); os ciclos "medidos por
texto" não existiam por AST; cinco docstrings fora do lugar no arquivo
antigo, registrados para a Fase 3.

**v3 (05/09/2026, Fase 0)**: os números passaram a vir de
`scripts/medirArquivos.mjs`, e três mudaram: prosa 10.576 -> 10.444 (a régua
provisória contava linha vazia dentro de bloco), diário em 42 -> 48 arquivos
(a provisória só via data em linha que COMEÇA com marcador de comentário),
blocos 2.013 -> 2.012. O guarda da API, ao ler este plano, acusou três
citações: um teste citado sem a extensão, dois nomes de arquivo futuro em
crase e um caminho de exemplo com placeholder. Corrigidas.

## Estimativa, medida contra o irmão

A API levou um dia (04/09/2026) para 4 fases sobre 25 mil linhas com 44% de
prosa. Aqui são 33 mil linhas com 32% de prosa e UM arquivo grande de
verdade. A Fase 2 é a mais cara, porque cada corte exige leitura e Chrome.
Ordem: 0, 1, 2, 3 -- a 3 pode começar pelos grupos 2 a 4 enquanto a 2 espera
decisão, porque não se tocam.
