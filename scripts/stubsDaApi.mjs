/** Respostas falsas da API pros scripts de screenshot.
 *
 * Antes esses scripts pediam um `TOKEN_DEMO` de verdade, o que significava
 * bater no login de PRODUÇÃO -- e cada tentativa errada consome uma das 5
 * do bloqueio de conta. Interceptando a rede, a tela renderiza com dado
 * conhecido e estável, que é o que uma comparação pixel a pixel precisa:
 * dado de produção muda e a foto de ontem deixa de servir de referência.
 */

const SITUACOES = [
  "Aguardando sentença",
  "Aguardando audiência",
  "Aguardando contestação",
  "Em recurso",
  "Suspenso",
  "Arquivado",
];
const FASES = ["Conhecimento (1º Grau)", "Recursal (2º Grau)", "Execução", "Cumprimento de sentença"];
const CLIENTES = ["Construtora Alfa", "Marina Duarte", "Transportes Beta", "Rogério Lima"];

function opcoes(rotulos, tipo) {
  return {
    opcoes: rotulos.map((rotulo, i) => ({
      opcao_id: `${tipo}-${i + 1}`,
      tipo,
      rotulo,
      ordem: i + 1,
      ativo: true,
    })),
    total: rotulos.length,
  };
}

const PROCESSOS = {
  processos: [
    {
      subgrupo_id: "sg-civel",
      numero_processo: "08012345620258050001",
      apelido: "Ação de cobrança — Alfa",
      cliente_nomes: ["Construtora Alfa"],
      subgrupo_nome: "Cível",
      fase_rotulo: "Conhecimento (1º Grau)",
      situacao_rotulo: "Aguardando sentença",
      prazo_final: "2026-09-01",
      ultima_mov_data: "2026-08-18",
      ultima_mov_tipo: "Conclusos para sentença",
    },
    {
      subgrupo_id: "sg-trab",
      numero_processo: "08076543220258050001",
      apelido: "Reclamação trabalhista — Beta",
      cliente_nomes: ["Transportes Beta"],
      subgrupo_nome: "Trabalhista",
      fase_rotulo: "Recursal (2º Grau)",
      situacao_rotulo: "Em recurso",
      prazo_final: "2026-09-14",
      ultima_mov_data: "2026-08-20",
      ultima_mov_tipo: "Recurso ordinário interposto",
    },
    {
      // Sem `prazo_final` de propósito: é a linha que revela desalinhamento
      // na última coluna, e foi assim que ela passou despercebida.
      subgrupo_id: "sg-civel",
      numero_processo: "08098765420258050001",
      apelido: "Execução fiscal — Rio Verde",
      cliente_nomes: ["Comércio Rio Verde ME"],
      subgrupo_nome: "Financeiro",
      fase_rotulo: "Execução",
      situacao_rotulo: "Arquivado definitivamente",
      ultima_mov_data: "2026-08-12",
      ultima_mov_tipo: "Arquivamento definitivo dos autos",
    },
  ],
  // Mais páginas do que itens de propósito: é o que faz a paginação
  // aparecer na verificação visual. Sem isso ela nunca é desenhada.
  total: 25,
  total_paginas: 3,
};

const RESPOSTAS = [
  [/\/situacoes/, () => opcoes(SITUACOES, "situacao")],
  [/\/fases/, () => opcoes(FASES, "fase")],
  [
    /\/clientes/,
    () => ({
      clientes: CLIENTES.map((nome, i) => ({ cliente_id: `cli-${i + 1}`, nome })),
      total: CLIENTES.length,
    }),
  ],
  // Precisa vir ANTES de `/processos`: o detalhe é `/processos/{n}/detalhes`.
  [
    /\/detalhes/,
    () => ({
      numero_processo: PROCESSOS.processos[0].numero_processo,
      processos: [{ ...PROCESSOS.processos[0], subgrupo_id: "sg-civel" }],
      // Sete de propósito: com cinco por página, a paginação aparece na
      // verificação visual.
      comunicacoes: Array.from({ length: 7 }, (_, i) => ({
        comunicacao_id: `c${i + 1}`,
        tipo_comunicacao: ["Intimação", "Despacho", "Sentença"][i % 3],
        data_disponibilizacao: `2026-08-${String(18 - i).padStart(2, "0")}`,
        nome_orgao: "TJMG · 2ª Vara Cível",
        texto: `<p>Movimentação ${i + 1}: fica a parte intimada a se manifestar no prazo legal.</p>`,
      })),
    }),
  ],
  [/\/processos/, () => PROCESSOS],
  [
    /\/tarefas/,
    () => ({
      tarefas: [
        { tarefa_id: "t1", subgrupo_id: "sg-civel", titulo: "Protocolar réplica", data: "2026-09-01", coluna_id: "c1", prioridade: "Alta" },
        { tarefa_id: "t2", subgrupo_id: "sg-civel", titulo: "Conferir prazo de contestação", data: "2026-09-05", coluna_id: "c1", prioridade: "Média" },
      ],
      total: 2,
    }),
  ],
  [
    /\/subgrupos|\/grupos/,
    () => ({
      grupos: [],
      // `membros`/`colunas` vêm da própria listagem (contagens derivadas):
      // a linha da tela de Grupo mostra "N membros · N colunas".
      subgrupos: [
        { subgrupo_id: "sg-civel", nome: "Cível", membros: 3, colunas: 3 },
        { subgrupo_id: "sg-trab", nome: "Trabalhista", membros: 1, colunas: 4 },
      ],
      total: 2,
      total_paginas: 1,
    }),
  ],
];

/** Registra os stubs num contexto do Playwright.
 *
 * ⚠️ Filtra por `resourceType`, e não só pela URL. `/processos` é ao mesmo
 * tempo uma rota da API e uma rota do react-router: casando só pelo
 * caminho, o próprio HTML da página era respondido com JSON e a tela
 * renderizava o payload cru.
 *
 * O que não casar com nada responde `{}` em vez de sair pra internet -- uma
 * chamada esquecida vira tela vazia, não um screenshot travado na rede.
 */
export async function instalarStubs(contexto) {
  await contexto.route("**/*", (rota) => {
    const requisicao = rota.request();
    if (requisicao.resourceType() !== "fetch" && requisicao.resourceType() !== "xhr") {
      return rota.fallback();
    }
    const caminho = new URL(requisicao.url()).pathname;
    const achado = RESPOSTAS.find(([padrao]) => padrao.test(caminho));
    return rota.fulfill({ json: achado ? achado[1]() : {} });
  });
}

/** Sessão falsa no localStorage. Como toda a rede é interceptada, o token
 * não precisa ser válido -- só precisa existir, porque `estaAutenticado()`
 * exige access + refresh + expiração. */
export async function fingirSessao(contexto) {
  await contexto.addInitScript(() => {
    localStorage.setItem("pje-monitor-access-token", "demo");
    localStorage.setItem("pje-monitor-refresh-token", "demo");
    localStorage.setItem("pje-monitor-expira-em", String(Date.now() + 3600_000));
    localStorage.setItem("pje-monitor-email", "ana@argos.local");
    localStorage.setItem("pje-monitor-apelido", "Ana Paula");
    localStorage.setItem("pje-monitor-papel", "admin");
    // Sem o grupo, a consulta de subgrupos nem sai -- e o modal de novo
    // processo abre no estado vazio ("crie um subgrupo primeiro").
    localStorage.setItem("pje-monitor-grupo-id", "grupo-demo");
  });
}
