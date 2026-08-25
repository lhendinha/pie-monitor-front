# Diário de Acompanhamento — front-end do PJe Monitor

Front-end React + **TypeScript** (Vite) com login (JWT + refresh), gestão de **Grupos → Subgrupos → Processos**, membros por papel (`user`/`manager`/`admin`/`super_admin`), convites por e-mail e histórico de notificações — consumindo a API que já está rodando na AWS.

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

## Papéis e o que cada um vê

4 abas no topo: Processos, Clientes, Histórico e **Grupo** -- essa última agrupa, como sub-navegação própria, Subgrupos/Membros/Convidar/Fases/Situações (cada sub-aba mantém o piso de papel de antes, só a organização visual mudou).

| Papel | Abas / sub-abas visíveis |
|---|---|
| `user` | Processos, Clientes, Histórico, Grupo (só a sub-aba Subgrupos) |
| `manager` | + sub-aba Membros (dentro de Grupo) |
| `admin` | + sub-aba Convidar (dentro de Grupo) |
| `super_admin` | Todas as sub-abas do próprio grupo, como um `admin`, mais **Fases** e **Situações** (2 sub-abas separadas) -- CRUD da lista global de opções de fase/situação de processo, valendo pra todos os grupos da plataforma, não só o próprio. Na sub-aba Membros, também vê um ícone ✎ pra editar apelido/papel/grupo de qualquer pessoa da plataforma. |

`admin`/`super_admin` também editam o **nome de um Subgrupo** (ícone ✎ na sub-aba Subgrupos, `PATCH /subgrupos/{id}`).

A ordem de **Fase**/**Situação** é definida arrastando as linhas (drag and drop, `@dnd-kit`) -- não existe mais um campo "Ordem" editável no formulário.

## Sobre a autenticação

Login guarda um **access token JWT** (24h) + **refresh token** (30 dias) no `localStorage` — a `x-api-key` real nunca chega ao navegador. O `papel` e `grupo_id` também ficam decodificados do próprio JWT (client-side, só pra decidir o que mostrar na UI — a autorização de verdade sempre é validada de novo no backend). Quando o access token expira, `services/api/client.ts` renova sozinho via `/refresh` antes de desistir.

Esqueceu a senha? A tela de login tem um link "Esqueci minha senha" (`EsqueciSenhaPage`) que chama `POST /senha/esqueci` — resposta sempre genérica, não revela se o e-mail existe. O link do e-mail recebido leva pra `/redefinir-senha/{token}` (`RedefinirSenhaPage`), válido por 1h e uso único.

## Link do e-mail de notificação → aba Histórico

O e-mail de movimentação processual leva pra `/?processo={numero}&comunicacao={id}`. O `App.tsx` lê esses dois parâmetros no mount (`utils/deepLink.ts::parseDeepLinkHistorico` — só conta como deep link se os dois vierem juntos), limpa a URL na hora, abre direto na aba **Histórico** e repassa pra `HistoricoPage` buscar e abrir o item certo num modal — sem listar as outras notificações do processo.

## Notificações (toasts)

Erros e confirmações usam um sistema de toast (`components/Toast`, `useToast()` dentro de `<ToastProvider>` montado em `App.tsx`) — substitui o antigo `<div className="banner">` pra feedback pontual de ação (ex: "Não foi possível carregar", convite enviado). O `banner` continua existindo só pra estados persistentes de tela inteira (sessão expirada, senha redefinida com sucesso).

## Super_admin: editar pessoa de outro grupo

Na aba Membros, `super_admin` vê um ícone ✎ em cada pessoa de "Pessoas do grupo" (`MembrosPage/EditarMembroForm.tsx`). O modal deixa trocar apelido, papel (inclusive promover a `super_admin` ou rebaixar/mover um `super_admin` existente, mesmo a própria conta) e mover a pessoa pra outro grupo, sempre escolhendo também os subgrupos de destino (obrigatório, já que subgrupo pertence a exatamente 1 grupo — os vínculos antigos não fazem sentido no grupo novo).

## Rodando os testes

```bash
yarn test         # roda uma vez (CI)
yarn test:watch   # modo watch
```

`vitest` + `@testing-library/react` + `jsdom`. 562 testes em 59 arquivos, cobrindo páginas, componentes, `services/` (auth, client HTTP) e `utils/` (máscara CNJ, formatação de data, parse de deep link) — `src/test/setup.ts` fixa o timezone em `America/Sao_Paulo` pra testes de data não variarem por máquina.

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
    queryClient.ts, queryKeys.ts
  theme/                    -- tokens e paletas de design
  hooks/                    -- hooks usados por mais de uma página
  contexts/SessaoContext.tsx
  components/               -- 55 componentes gerais, cada um em pasta com index.tsx
  pages/                    -- 19 páginas, cada uma em pasta com index.tsx
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
