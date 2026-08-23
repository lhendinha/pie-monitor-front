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
de testes com `vitest` + `@testing-library/react` cobre `services/` e
`utils/` (`yarn test`). `vercel.json` também define security headers (CSP,
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
2. Testes cobrem `services/`/`utils/` (lógica pura); nenhum teste de
   componente/página ainda (`pages/`, `components/Toast`, `Select`,
   `Pagination` sem cobertura própria).
3. Considerar travar `Access-Control-Allow-Origin` no backend pro domínio
   específico do Vercel, em vez de `"*"` (pendência do lado do backend, mas
   afeta o front se for feito).
