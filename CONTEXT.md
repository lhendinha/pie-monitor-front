# Contexto do projeto — PJe Monitor (Frontend)

> Este arquivo existe pra você (Claude) retomar o projeto numa sessão nova
> sem precisar que o usuário reexplique tudo do zero. Leia isso primeiro.
> Uma cópia equivalente (focada no backend) existe em `CONTEXT.md` no
> repositório `pje-monitor-aws (caminho interno: /Users/pedrohenriquesousaalmeida/Documents/Projects/PJE Monitor/api)`.

## 1) Objetivo do projeto

Front-end React + TypeScript pra um sistema que monitora processos
judiciais brasileiros via API do PJe, organizados em **Grupos → Subgrupos →
Processos**, com controle de acesso por papéis, convites por e-mail, e
notificação automática de movimentação processual. Consome uma API AWS já
em produção (Lambda + DynamoDB + SES).

## 2) Estado atual

Front reescrito em TypeScript, estrutura em camadas (`pages/`, `services/`,
`utils/`, `components/`, `constants/`), usando **Yarn** (não npm), deployado
no **Vercel** em `pie-monitor-front.vercel.app`. React Compiler configurado
e testado. Build (`yarn build`) passa limpo com type-check completo. Suite
de testes com `vitest` + `@testing-library/react` (`yarn test`): 56 arquivos,
544 testes, cobrindo `pages/` (26 arquivos), `components/` (11), `utils/`
(8), `services/` (7) e `hooks/` (3). O `yarn lint` roda ESLint com
`react-hooks` e passa sem erros.

⚠️ Este parágrafo dizia que a suíte cobria "`services/` e `utils/`" -- ficou
para trás de duas auditorias que encheram `pages/` e `components/` de
testes. `vercel.json` também define security headers (CSP,
HSTS, etc.) pra todo o app. Fluxo de recuperação de senha
(`EsqueciSenhaPage`/`RedefinirSenhaPage`), edição de apelido de processo, e
o link do e-mail de notificação abrindo direto na aba Histórico (deep link
via `?processo=&comunicacao=`) já implementados -- ver seção 3.

## 3) Decisões importantes já tomadas

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
  types/index.ts        -- inclui AbaId/TelaAuth/AbaConfig (abas de topo), SubAbaId/SubAbaConfig
                            (sub-abas de GrupoPage) e FiltrosEstruturadosProcessos (painel de
                            filtros de ProcessosPage), movidos/extraídos de dentro das páginas pra cá
  constants/roles.ts, paginacao.ts (TAMANHO_PAGINA_PADRAO, TAMANHO_PAGINA_PICKER), processos.ts
                            (INTERVALO_POLLING_PROCESSOS_MS, FILTROS_PROCESSOS_VAZIOS,
                            LABEL_FILTRO_PROCESSOS), select.ts (Z_INDEX_MENU_PORTAL etc.), index.ts
  services/
    auth.ts (+ auth.test.ts)
    api/ (client.ts [+ client.test.ts] + subgrupos.ts + membros.ts + processos.ts + convites.ts + historico.ts + grupos.ts + clientes.ts + opcoesProcesso.ts + index.ts)
    index.ts
  utils/mask.ts, date.ts, deepLink.ts, index.ts (+ *.test.ts pra cada um)
  components/
    Modal/index.tsx, Skeleton/index.tsx [+ index.test.tsx]
    Toast/index.tsx [+ index.test.tsx]     -- ToastProvider/useToast, substitui <div className="banner">
    Pagination/index.tsx                    -- números endereçáveis, não cursor
    Select/                                 -- wrapper (react-select) por trás de <Select> (valor
                                                único, Select.tsx) e <MultiSelect> (múltiplo,
                                                MultiSelect.tsx, dropdown fechado com checkboxes,
                                                OpcaoComCheckbox.tsx/ResumoSelecionados.tsx privados);
                                                index.tsx só reexporta. Substitui os <select> nativos
                                                e o <select multiple>
    InfoTip/index.tsx                       -- ícone "i" com tooltip -- explicação sob demanda ao
                                                lado de um label (busca de Processos/Clientes)
    Icons/                                  -- ícones SVG custom, 1 arquivo por ícone
                                                (IconeHistorico.tsx, IconeArrastar.tsx -- handle de
                                                drag and drop, estilo fa-bars), index.tsx só reexporta
    index.ts
  pages/
    LoginPage/index.tsx
    EsqueciSenhaPage/index.tsx, RedefinirSenhaPage/index.tsx
    AceitarConvitePage/index.tsx
    ProcessosPage/index.tsx (+ NovoProcessoForm.tsx, DetalheEditarProcesso.tsx, CamposProcesso.tsx,
                              DetalheProcesso.tsx -- privados, não exportados; EditarApelidoForm.tsx
                              descontinuado, apelido virou só mais um campo em DetalheEditarProcesso.
                              Busca ampla (texto livre) + painel de "Filtros" colapsável + chips
                              removíveis + tags de fase/situação/data no card -- ver "Decisões de UX")
    ClientesPage/index.tsx (+ NovoClienteForm.tsx, EditarClienteForm.tsx -- privados; criação por
                              modal "+ Novo Cliente", lista paginada igual Processos/Histórico, busca
                              por nome/CPF-CNPJ/telefone/e-mail que substitui a paginação enquanto ativa)
    GrupoPage/index.tsx (+ OpcoesLista.tsx, EditarOpcaoForm.tsx, OpcaoRow.tsx -- privados;
                          sub-navegação que agrupa Subgrupos/Membros/Convidar/Fases/Situações -- ver
                          "Decisões de UX". OpcoesProcessoPage/ antigo foi descontinuado,
                          OpcoesLista/EditarOpcaoForm mudaram de pasta pra cá. Ordem de Fase/Situação
                          agora é por drag and drop, OpcaoRow.tsx é a linha arrastável)
    SubgruposPage/index.tsx (+ EditarSubgrupoForm.tsx -- privado; renderizado como sub-aba dentro de
                              GrupoPage, não mais no topo)
    MembrosPage/index.tsx (+ SubgrupoMembros.tsx, EditarMembroForm.tsx -- privados; idem, sub-aba)
    ConvidarPage/index.tsx       -- idem, sub-aba
    HistoricoPage/index.tsx (+ DetalheHistorico.tsx -- privado)
    index.ts
  test/setup.ts        -- jest-dom matchers + TZ=America/Sao_Paulo fixo pros testes de data
  App.tsx, main.tsx
vercel.json          -- SPA fallback (OBRIGATÓRIO -- sem isso, /convite/{token} e /redefinir-senha/{token} dão 404) + security headers (CSP/HSTS/etc.)
```

Regra geral: **componentes/páginas** viram pasta com `index.tsx` dentro;
**utils/services/constants** são arquivos soltos + um `index.ts` no topo
reexportando tudo. Subcomponentes usados só por 1 página ficam como
arquivo-irmão dentro da pasta da página, sem entrar no `index.ts` público.

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

| catálogo | itens | páginas |
|---|---|---|
| clientes | 2 | 1 |
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
2. ~~Nenhum teste de componente/página~~ -- **resolvido**: 51 arquivos, 501
   testes, cobrindo páginas e componentes. `yarn test`.
3. Considerar travar `Access-Control-Allow-Origin` no backend pro domínio
   específico do Vercel, em vez de `"*"` (pendência do lado do backend, mas
   afeta o front se for feito).
