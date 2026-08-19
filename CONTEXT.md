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
  3 rotas cross-tenant do backend (ver `CONTEXT.md` do backend, seção
  "Modelo de domínio").

### Estrutura de pastas (decisão explícita do usuário)

```
src/
  types/index.ts
  constants/roles.ts, index.ts       -- NOME_PAPEL, HIERARQUIA_PAPEIS
  services/
    auth.ts (+ auth.test.ts)
    api/ (client.ts [+ client.test.ts] + subgrupos.ts + membros.ts + processos.ts + convites.ts + historico.ts + grupos.ts + index.ts)
    index.ts
  utils/mask.ts, date.ts, deepLink.ts, index.ts (+ *.test.ts pra cada um)
  components/
    Modal/index.tsx, Skeleton/index.tsx [+ index.test.tsx]
    Toast/index.tsx [+ index.test.tsx]     -- ToastProvider/useToast, substitui <div className="banner">
    Pagination/index.tsx                    -- números endereçáveis, não cursor
    Select/index.tsx                        -- wrapper único (react-select) por trás de <Select> (valor
                                                único) e <MultiSelect> (múltiplo, dropdown fechado com
                                                checkboxes); substitui os <select> nativos e o <select multiple>
    index.ts
  pages/
    LoginPage/index.tsx
    EsqueciSenhaPage/index.tsx, RedefinirSenhaPage/index.tsx
    AceitarConvitePage/index.tsx
    ProcessosPage/index.tsx (+ NovoProcessoForm.tsx, EditarApelidoForm.tsx, DetalheProcesso.tsx -- privados, não exportados)
    SubgruposPage/index.tsx
    MembrosPage/index.tsx (+ SubgrupoMembros.tsx, EditarMembroForm.tsx -- privados)
    ConvidarPage/index.tsx
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
  formulário inline. Edição de apelido (`EditarApelidoForm.tsx`) também é
  modal, aberto pelo ícone ✎ na listagem. `EditarMembroForm.tsx`
  (`MembrosPage`) segue o mesmo padrão (modal + ✎), mas visível só pra
  `super_admin` na lista "Pessoas do grupo" -- único ✎ do app com
  visibilidade condicionada a papel, os outros (`ProcessosPage`) aparecem
  pra qualquer nível que já acessa a página.
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
- Link do e-mail de notificação (`?processo=&comunicacao=`) não abre mais
  um modal na aba Processos -- abre direto na aba **Histórico**, no item
  exato que gerou o e-mail (`utils/deepLink.ts` + `HistoricoPage`). Decisão
  trocada durante o desenvolvimento: fazia mais sentido levar pro registro
  da notificação em si do que pro processo genérico.

## 4) Blocos de código essenciais

**Única variável de ambiente:**

```
VITE_API_URL=<Function URL da AWS, sem barra no final>
```

Configurar tanto no `.env` local quanto no Vercel (Settings → Environment
Variables) — são independentes, precisam ser atualizadas nos dois lugares
se a URL da API mudar.

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
