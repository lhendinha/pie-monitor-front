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

Todo mundo mais entra por **convite** (aba "Convidar", visível pra quem é `admin`) — a pessoa recebe um e-mail com um link `/convite/{token}`, válido por 24h.

## Rodando localmente

```bash
yarn install
cp .env.example .env
# edita o .env com a URL real da sua Function URL
yarn dev
```

Abre `http://localhost:5173` e loga com o usuário cadastrado acima.

Antes de commitar/dar push, vale rodar o type-check (o `yarn build` já faz isso automaticamente, mas dá pra rodar isolado):
```bash
yarn typecheck
```

## Deploy no Vercel

1. Sobe esse projeto pra um repositório no GitHub
2. [vercel.com](https://vercel.com) → login com GitHub → **Add New → Project** → seleciona o repo
3. Em **Environment Variables**, adiciona `VITE_API_URL` com a URL da Function URL
4. **Deploy**

O Vercel detecta o `yarn.lock` automaticamente e usa Yarn como package manager do build — não precisa configurar nada a mais.

O arquivo `vercel.json` já está configurado com o *rewrite* necessário pra rotas client-side funcionarem (`/convite/{token}` precisa cair no `index.html` mesmo em acesso direto pelo link do e-mail — sem isso, clicar no link do convite daria 404).

## Papéis e o que cada um vê

| Papel | Abas visíveis |
|---|---|
| `user` | Processos, Subgrupos, Histórico |
| `manager` | + Membros |
| `admin` | + Convidar |
| `super_admin` | Todas — mas precisa preencher o campo **"Grupo alvo"** que aparece no topo da tela (ele não pertence a nenhum grupo, então toda ação exige dizer em qual grupo está agindo) |

## Sobre a autenticação

Login guarda um **access token JWT** (24h) + **refresh token** (30 dias) no `localStorage` — a `x-api-key` real nunca chega ao navegador. O `papel` e `grupo_id` também ficam decodificados do próprio JWT (client-side, só pra decidir o que mostrar na UI — a autorização de verdade sempre é validada de novo no backend). Quando o access token expira, `services/api/client.ts` renova sozinho via `/refresh` antes de desistir.

## Sobre o React Compiler

O projeto usa **React 18** (não 19), mas tem o [React Compiler](https://react.dev/learn/react-compiler) configurado mesmo assim — ele saiu de beta e ficou estável em outubro/2025, com suporte oficial a partir do React 17. Ele memoiza os componentes automaticamente durante o build (equivalente a espalhar `useMemo`/`useCallback`/`React.memo` manualmente pelo código), configurado em `vite.config.ts` com `target: "18"` + o pacote `react-compiler-runtime` (fornece o polyfill necessário pra rodar em versões anteriores à 19).

Pra conferir que está rodando de verdade, o bundle final (`yarn build`) contém chamadas a `useMemoCache` nos componentes compilados — isso só aparece se o compilador processou o código.

## Estrutura

```
src/
  types/
    index.ts                 -- tipos compartilhados (Papel, Processo, Subgrupo, Membro, etc.)
  constants/
    roles.ts                  -- NOME_PAPEL, HIERARQUIA_PAPEIS (usado por services/ e pages/)
    index.ts                  -- reexporta tudo (importe de "../constants")
  vite-env.d.ts               -- tipos globais do Vite (import.meta.env)
  App.tsx                     -- shell raiz: roteamento simples, autenticação, abas
  main.tsx                    -- ponto de entrada React

  services/
    index.ts                  -- reexporta tudo (importe de "../services")
    auth.ts                   -- login, refresh automático, decodifica papel/grupo do JWT
    api/
      client.ts               -- núcleo HTTP compartilhado (chamar, ApiError, comGrupoAlvo)
      subgrupos.ts             -- listar/criar/remover subgrupos
      membros.ts               -- listar/adicionar/remover membros
      processos.ts             -- listar/criar/remover processos + detalhes
      convites.ts              -- criar convite
      historico.ts             -- listar histórico de notificações
      index.ts                 -- reexporta tudo (importe de "../services/api")

  utils/
    index.ts                  -- reexporta tudo (importe de "../utils")
    mask.ts                    -- máscara CNJ do número de processo
    date.ts                    -- formatação de data/hora (formatarDataHora, dataHojeExtenso)

  components/
    index.ts                  -- reexporta tudo (importe de "../components")
    Modal/index.tsx             -- modal genérico reutilizável
    Skeleton/index.tsx           -- placeholder de loading

  pages/
    index.ts                    -- reexporta as páginas (importe de "./pages")
    LoginPage/index.tsx          -- tela de login
    AceitarConvitePage/index.tsx -- tela pública de aceite de convite (/convite/{token})
    ProcessosPage/
      index.tsx                  -- lista + aciona modal/detalhes
      NovoProcessoForm.tsx        -- formulário do modal (privado da página)
      DetalheProcesso.tsx         -- painel de histórico de comunicações (privado da página)
    SubgruposPage/index.tsx      -- lista + criação + exclusão de subgrupos
    MembrosPage/
      index.tsx                  -- pessoas do grupo
      SubgrupoMembros.tsx         -- card de membros por subgrupo (privado da página)
    ConvidarPage/index.tsx       -- formulário de convite
    HistoricoPage/index.tsx      -- histórico de e-mails de notificação

  index.css                  -- design tokens e estilos

vercel.json                  -- SPA fallback (necessário pro link de convite funcionar)
tsconfig.json                 -- config do TypeScript pro código do app
tsconfig.node.json          -- config do TypeScript pro vite.config.ts (roda em Node)
```
