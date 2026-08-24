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

`vitest` + `@testing-library/react` + `jsdom`. 501 testes em 51 arquivos, cobrindo páginas, componentes, `services/` (auth, client HTTP) e `utils/` (máscara CNJ, formatação de data, parse de deep link) — `src/test/setup.ts` fixa o timezone em `America/Sao_Paulo` pra testes de data não variarem por máquina.

## Segurança (headers)

`vercel.json` define Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e HSTS pra todo o app. O CSP libera `connect-src` só pra `https://*.lambda-url.sa-east-1.on.aws` (a API) e bloqueia `script-src`/`object-src` externos — se a Function URL mudar de subdomínio ou surgir uma dependência de terceiro nova (fonte, script), ajustar o CSP em `vercel.json` junto.

## Sobre o React Compiler

O projeto usa **React 18** (não 19), mas tem o [React Compiler](https://react.dev/learn/react-compiler) configurado mesmo assim — ele saiu de beta e ficou estável em outubro/2025, com suporte oficial a partir do React 17. Ele memoiza os componentes automaticamente durante o build (equivalente a espalhar `useMemo`/`useCallback`/`React.memo` manualmente pelo código), configurado em `vite.config.ts` com `target: "18"` + o pacote `react-compiler-runtime` (fornece o polyfill necessário pra rodar em versões anteriores à 19).

Pra conferir que está rodando de verdade, o bundle final (`yarn build`) contém chamadas a `useMemoCache` nos componentes compilados — isso só aparece se o compilador processou o código.

## Estrutura

```
src/
  types/
    index.ts                 -- tipos compartilhados (Papel, Processo, Cliente, OpcaoProcesso, Subgrupo, Membro, Comunicacao, AbaId, TelaAuth, AbaConfig, SubAbaId, SubAbaConfig, etc.)
  constants/
    roles.ts                  -- NOME_PAPEL, HIERARQUIA_PAPEIS (usado por services/ e pages/)
    index.ts                  -- reexporta tudo (importe de "../constants")
  vite-env.d.ts               -- tipos globais do Vite (import.meta.env)
  App.tsx                     -- shell raiz: roteamento simples, autenticação, abas, deep link do e-mail
  main.tsx                    -- ponto de entrada React

  services/
    index.ts                  -- reexporta tudo (importe de "../services")
    auth.ts                   -- login, refresh automático, decodifica papel/grupo do JWT
    auth.test.ts
    api/
      client.ts               -- núcleo HTTP compartilhado (chamar, ApiError, comGrupoAlvo)
      client.test.ts
      subgrupos.ts             -- listar (paginado) /criar/remover subgrupos
      membros.ts               -- listar/adicionar/remover membros
      processos.ts             -- listar/criar/remover processos + editar (todos os campos) + detalhes
      clientes.ts               -- listar (paginado) /criar/editar/remover clientes
      opcoesProcesso.ts         -- listar (paginado) /criar/editar/desativar/reativar fase e situação
      convites.ts              -- criar convite
      historico.ts             -- listar histórico de notificações (paginado ou por número)
      grupos.ts                -- listar todos os grupos da plataforma (super_admin)
      index.ts                 -- reexporta tudo (importe de "../services/api")

  utils/
    index.ts                  -- reexporta tudo (importe de "../utils")
    mask.ts, mask.test.ts       -- máscara CNJ do número de processo
    date.ts, date.test.ts       -- formatação de data/hora (formatarDataHora, formatarDataHoraAmPm, dataHojeExtenso)
    deepLink.ts, deepLink.test.ts -- parse de ?processo=&comunicacao= do link do e-mail

  components/
    index.ts                  -- reexporta tudo (importe de "../components")
    Modal/index.tsx             -- modal genérico reutilizável
    Skeleton/index.tsx, index.test.tsx -- placeholder de loading
    Toast/index.tsx, index.test.tsx    -- toasts de erro/sucesso (ToastProvider, useToast)
    Pagination/index.tsx         -- paginação com números endereçáveis (não cursor)
    Select/                       -- wrapper (react-select) pra valor único (Select.tsx) e múltiplo
                                     (MultiSelect.tsx, checkboxes); index.tsx só reexporta
    InfoTip/index.tsx             -- ícone "i" com tooltip -- explicação sob demanda ao lado de um
                                     label, em vez de texto sempre visível (usado nos campos de busca
                                     de Processos/Clientes)
    Icons/                         -- ícones SVG custom, 1 arquivo por ícone (IconeHistorico.tsx,
                                     IconeArrastar.tsx), index.tsx só reexporta

  pages/
    index.ts                    -- reexporta as páginas (importe de "./pages")
    LoginPage/index.tsx          -- tela de login (link "Esqueci minha senha")
    EsqueciSenhaPage/index.tsx   -- solicita link de recuperação por e-mail
    RedefinirSenhaPage/index.tsx -- define nova senha (/redefinir-senha/{token})
    AceitarConvitePage/index.tsx -- tela pública de aceite de convite (/convite/{token})
    ProcessosPage/
      index.tsx                  -- lista + busca + aciona modal de detalhe/edição, ao clicar na linha
      NovoProcessoForm.tsx        -- formulário de cadastro, no modal (privado da página)
      DetalheEditarProcesso.tsx   -- modal único de detalhe + edição de todos os campos (privado da página)
      CamposProcesso.tsx          -- campos compartilhados entre cadastro e edição (privado da página)
      DetalheProcesso.tsx         -- painel de histórico de comunicações (privado da página)
    ClientesPage/
      index.tsx                  -- lista paginada + botão "+ Novo Cliente" (modal)
      NovoClienteForm.tsx         -- formulário de criação, no modal (privado da página)
      EditarClienteForm.tsx       -- formulário de edição, no modal (privado da página)
    GrupoPage/
      index.tsx                  -- sub-navegação (Subgrupos/Membros/Convidar/Fases/Situações), cada sub-aba com seu próprio piso de papel
      OpcoesLista.tsx             -- lista de fase OU situação (busca tudo de uma vez, sem paginação), com criar/editar/desativar/reativar/reordenar (privado da página)
      EditarOpcaoForm.tsx         -- formulário de edição do rótulo de uma opção, no modal (privado da página) -- ordem não é mais editada aqui, é por drag and drop
      OpcaoRow.tsx                -- linha arrastável da lista (@dnd-kit), com handle IconeArrastar (privado da página)
    SubgruposPage/
      index.tsx                  -- lista paginada + criação + edição + exclusão de subgrupos (renderizado dentro de GrupoPage)
      EditarSubgrupoForm.tsx      -- formulário de edição do nome, no modal (admin/super_admin; privado da página)
    MembrosPage/
      index.tsx                  -- pessoas do grupo (renderizado dentro de GrupoPage)
      SubgrupoMembros.tsx         -- card de membros por subgrupo (privado da página)
      EditarMembroForm.tsx        -- edição de apelido/papel/grupo+subgrupos, no modal (super_admin; privado da página)
    ConvidarPage/index.tsx       -- formulário de convite (MultiSelect de subgrupos; renderizado dentro de GrupoPage)
    HistoricoPage/
      index.tsx                  -- lista paginada + resolve deep link do e-mail
      DetalheHistorico.tsx        -- modal com a comunicação exata que gerou o envio (privado da página)

  test/
    setup.ts                  -- setup global do vitest (jest-dom matchers, TZ fixo)

  index.css                  -- design tokens e estilos

vercel.json                  -- SPA fallback (necessário pro link de convite/redefinição funcionar) + security headers (CSP etc.)
vite.config.ts                -- config do Vite + React Compiler + vitest (environment: jsdom)
tsconfig.json                 -- config do TypeScript pro código do app
tsconfig.node.json          -- config do TypeScript pro vite.config.ts (roda em Node)
```
