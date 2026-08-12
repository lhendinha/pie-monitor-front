# Diário de Acompanhamento — front-end do PJe Monitor

Front-end React (Vite) pra cadastrar/listar/remover processos monitorados, gerenciar e-mails notificados e ver o histórico de envios -- tudo com login (usuário/senha + JWT), consumindo a API que já está rodando na AWS.

## Por que não hospedar na AWS (S3 + CloudFront)?

Sua conta AWS foi criada em 07/01/2026 — depois da mudança de julho/2025 no modelo de free tier. Contas nesse modelo novo ganham **$200 em créditos válidos só por 6 meses**, não um free tier permanente pra S3/CloudFront (diferente de Lambda/DynamoDB/SNS, que são "Always Free" de verdade). Como sua conta já passou dos 6 meses, hospedar o front-end em S3 poderia gerar custo real sem aviso.

Pra garantir **$0 garantido**, esse projeto foi pensado pra rodar em uma plataforma com free tier permanente de verdade: **Vercel** (recomendado abaixo), Netlify ou GitHub Pages — todas gratuitas pra sempre em projetos pessoais.

## Antes de usar: cadastre um usuário

Esse front-end não tem tela de cadastro (por design -- ver `README.md` do backend). Cadastra o primeiro usuário direto via API, com a `x-api-key`:

```bash
curl -X POST https://SUA_URL.lambda-url.sa-east-1.on.aws/usuarios \
  -H "x-api-key: $PJE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "pedro", "password": "uma-senha-forte-aqui"}'
```

## Rodando localmente

```bash
npm install
cp .env.example .env
# edita o .env com a URL real da sua Function URL (a mesma do backend)
npm run dev
```

Abre `http://localhost:5173` e loga com o usuário/senha cadastrados acima.

## Deploy no Vercel (recomendado)

1. Sobe esse projeto pra um repositório no seu GitHub (ex: `pje-monitor-frontend`)
2. Vai em [vercel.com](https://vercel.com) → login com GitHub (gratuito, sem cartão)
3. **Add New → Project** → seleciona o repositório
4. Em **Environment Variables**, adiciona:
   - `VITE_API_URL` = a URL da sua Function URL (ex: `https://sluf66wurddjpssov4hqzzhflu0enbul.lambda-url.sa-east-1.on.aws`)
5. **Deploy**

Pronto — cada push na branch principal já refaz o deploy sozinho. O domínio gerado é algo como `pje-monitor-frontend.vercel.app`.

## Ajustar o CORS do backend

O `serverless.yml` do backend está com `allowedOrigins: "*"` (liberado geral) por decisão consciente durante o desenvolvimento. Assim que esse front-end tiver domínio fixo no Vercel, troca essa linha por ele:

```yaml
allowedOrigins:
  - "https://pje-monitor-frontend.vercel.app"
```

E faz `serverless deploy` de novo no backend.

## Sobre a autenticação (login + JWT)

Diferente da versão anterior (que guardava a `x-api-key` real no navegador), esse front-end agora **loga com usuário/senha** e guarda só um **access token JWT** (válido por 24h) + um **refresh token** (válido por 30 dias) no `localStorage`. A `x-api-key` de verdade nunca chega ao navegador -- ela só é usada por scripts/CLI e pra cadastrar usuários (`POST /usuarios`).

- O `api.js` injeta o access token em todo request (`Authorization: Bearer ...`).
- Quando o access token expira (24h), o `chamar()` em `api.js` tenta renovar automaticamente via `/refresh` antes de desistir -- o usuário não precisa logar de novo a cada 24h, só quando o refresh token (30 dias) também expirar.
- O refresh token é **rotacionado** a cada uso: o backend invalida o antigo e emite um novo par. Se alguém roubar um refresh token antigo já usado, ele não serve mais pra nada.
- `localStorage` ainda é acessível por quem tiver acesso físico/DevTools ao navegador -- é um risco aceitável pra uso pessoal, mas os tokens aqui têm blast radius bem menor que a `x-api-key` bruta (expiram, e não dão acesso a `/usuarios`).

## Estrutura

```
src/
  auth.js      -- login, refresh automático, tokens em localStorage
  api.js       -- chamadas fetch pra API, já autenticadas
  mask.js      -- máscara CNJ do número de processo
  App.jsx      -- telas: login + abas (processos / e-mails / histórico)
  index.css    -- design tokens e estilos
index.html
```
