# Diário de Acompanhamento — front-end do PJe Monitor

Front-end React (Vite) com login (JWT + refresh), gestão de **Grupos → Subgrupos → Processos**, membros por papel (`user`/`manager`/`admin`/`super_admin`), convites por e-mail e histórico de notificações — consumindo a API que já está rodando na AWS.

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
npm install
cp .env.example .env
# edita o .env com a URL real da sua Function URL
npm run dev
```

Abre `http://localhost:5173` e loga com o usuário cadastrado acima.

## Deploy no Vercel

1. Sobe esse projeto pra um repositório no GitHub
2. [vercel.com](https://vercel.com) → login com GitHub → **Add New → Project** → seleciona o repo
3. Em **Environment Variables**, adiciona `VITE_API_URL` com a URL da Function URL
4. **Deploy**

O arquivo `vercel.json` já está configurado com o *rewrite* necessário pra rotas client-side funcionarem (`/convite/{token}` precisa cair no `index.html` mesmo em acesso direto pelo link do e-mail — sem isso, clicar no link do convite daria 404).

## Papéis e o que cada um vê

| Papel | Abas visíveis |
|---|---|
| `user` | Processos, Subgrupos, Histórico |
| `manager` | + Membros |
| `admin` | + Convidar |
| `super_admin` | Todas — mas precisa preencher o campo **"Grupo alvo"** que aparece no topo da tela (ele não pertence a nenhum grupo, então toda ação exige dizer em qual grupo está agindo) |

## Sobre a autenticação

Login guarda um **access token JWT** (24h) + **refresh token** (30 dias) no `localStorage` — a `x-api-key` real nunca chega ao navegador. O `papel` e `grupo_id` também ficam decodificados do próprio JWT (client-side, só pra decidir o que mostrar na UI — a autorização de verdade sempre é validada de novo no backend). Quando o access token expira, o `api.js` renova sozinho via `/refresh` antes de desistir.

## Estrutura

```
src/
  auth.js      -- login, refresh automático, decodifica papel/grupo do JWT
  api.js       -- chamadas fetch pra todas as rotas (grupos/subgrupos/membros/processos/convites/histórico)
  mask.js      -- máscara CNJ do número de processo
  App.jsx      -- login + tela de aceite de convite + abas (Processos/Subgrupos/Membros/Convidar/Histórico)
  index.css    -- design tokens e estilos
vercel.json    -- SPA fallback (necessário pro link de convite funcionar)
```
