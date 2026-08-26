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
const CLIENTES = [
  "Ângela Fontes",
  "Construtora Alfa",
  "Marina Duarte",
  "Rogério Lima",
  "Silveira & Associados",
  "Transportes Beta",
  "Zuleica Andrade",
];

/** Filtro por `busca` igual ao do servidor: sem acento, sem caixa.
 *
 * ⚠️ Stub que IGNORA `busca` faz a verificação visual passar com o filtro
 * quebrado -- a lista continuaria completa e parecendo certa. */
function filtrar(itens, url, campo) {
  const termo = (url?.searchParams.get("busca") || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!termo) return itens;
  return itens.filter((i) =>
    String(i[campo]).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(termo),
  );
}

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
      cliente_ids: ["cli-1"],
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
      cliente_ids: ["cli-3"],
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
      cliente_ids: ["cli-4"],
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

const ATENDIMENTOS = {
  atendimentos: [
    {
      subgrupo_id: "sg-civel",
      atendimento_id: "at-1",
      assunto: "Revisão do contrato de locação",
      status: "Em andamento",
      criado_em: "2026-08-10T09:00:00+00:00",
      cliente_ids: ["cli-1"],
      // ⚠️ Acompanha `cliente_ids` na ordem. A API passou a resolver o nome
      // na leitura (25/08/2026); stub sem isto mostraria o id cru e a
      // verificação visual passaria assim mesmo. Mesma razão do `autor_nome`
      // nos registros abaixo e nas notificações: a tela deixou de traduzir
      // e-mail em apelido por conta própria.
      cliente_nomes: ["Construtora Alfa"],
      processo_numero: "00002668720218130559",
      registros: [
        {
          autor_id: "ana@argos.local",
          autor_nome: "Ana Paula",
          registrado_em: "2026-08-10T09:00:00+00:00",
          texto: "Cliente procurou o escritório para revisar a cláusula de reajuste.",
        },
        {
          autor_id: "joao@argos.local",
          autor_nome: "João Ribeiro",
          registrado_em: "2026-08-12T14:30:00+00:00",
          texto: "Enviei a minuta revisada por e-mail. Aguardando retorno.",
        },
      ],
    },
    {
      subgrupo_id: "sg-civel",
      atendimento_id: "at-2",
      assunto: "Dúvida sobre execução de sentença",
      status: "Fechado",
      criado_em: "2026-07-28T11:00:00+00:00",
      cliente_ids: ["cli-2"],
      cliente_nomes: ["Marina Duarte"],
      processo_numero: null,
      registros: [
        {
          autor_id: "ana@argos.local",
          autor_nome: "Ana Paula",
          registrado_em: "2026-07-28T11:00:00+00:00",
          texto: "Explicado o prazo de cumprimento voluntário.",
        },
      ],
    },
  ],
  total: 2,
  total_paginas: 1,
};

const AGORA = new Date();
const hMenos = (h) => new Date(AGORA.getTime() - h * 3600_000).toISOString();

const RESPOSTAS = [
  [
    /\/notificacoes/,
    () => ({
      notificacoes: [
        {
          usuario_id: "ana@argos.local", notificacao_id: "1787000000000003_a",
          tipo: "tarefa_atribuida", criado_em: hMenos(0.2), lida: false,
          autor: "joao@argos.local", autor_nome: "João Ribeiro", titulo: "Protocolar contestação", detalhe: "",
          subgrupo_id: "sg-civel", alvo_tipo: "tarefa", alvo_id: "t1",
        },
        {
          usuario_id: "ana@argos.local", notificacao_id: "1787000000000002_b",
          tipo: "tarefa_movida", criado_em: hMenos(3), lida: false,
          autor: "joao@argos.local", autor_nome: "João Ribeiro", titulo: "Preparar audiência", detalhe: "Fazendo",
          subgrupo_id: "sg-civel", alvo_tipo: "tarefa", alvo_id: "t4",
        },
        {
          usuario_id: "ana@argos.local", notificacao_id: "1787000000000001_c",
          // Lembrete vem do robô: sem autor, e portanto sem `autor_nome`.
          tipo: "lembrete", criado_em: hMenos(20), lida: true, autor: "",
          titulo: "Processo 0000266-87.2021.8.13.0559", detalhe: "Prazo final é amanhã",
          subgrupo_id: "sg-civel", alvo_tipo: "processo", alvo_id: "00002668720218130559",
        },
      ],
      nao_lidas: 2,
      limite: 50,
    }),
  ],
  // Antes de tudo: o caminho contém "/grupos", e um padrão mais largo
  // capturaria isto e devolveria a lista de grupos pra aba de Configurações.
  [
    /\/grupos\/configuracoes/,
    () => ({
      nome: "Silva Advogados",
      nome_tamanho_maximo: 120,
      dias_para_arquivar: 7,
      dias_para_arquivar_minimo: 1,
      dias_para_arquivar_maximo: 365,
      dias_para_arquivar_padrao: 7,
    }),
  ],
  [/\/situacoes/, () => opcoes(SITUACOES, "situacao")],
  [/\/fases/, () => opcoes(FASES, "fase")],
  [
    /\/clientes/,
    (url) => {
      const todos = CLIENTES.map((nome, i) => ({ cliente_id: `cli-${i + 1}`, nome }));
      const achados = filtrar(todos, url, "nome");
      return { clientes: achados, total: achados.length };
    },
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
  // Antes de /atendimentos: o caminho do detalhe contém os dois, e o padrão
  // da listagem casaria com ele devolvendo um envelope no lugar do item.
  [
    /\/subgrupos\/[^/]+\/atendimentos\/[^/]+$/,
    () => ATENDIMENTOS.atendimentos[0],
  ],
  [/\/atendimentos/, () => ATENDIMENTOS],
  [
    /\/tarefas/,
    () => ({
      // Datas relativas a hoje: a etiqueta de prazo mostra "Hoje",
      // "Amanhã" e "Ontem", e com data fixa a verificação visual só
      // mostraria data crua depois que a data passasse.
      tarefas: [
        { tarefa_id: "t1", subgrupo_id: "sg-civel", titulo: "Protocolar réplica", data: emDias(-2), coluna_id: "c1", coluna_nome: "A Fazer", esta_concluida: false, prioridade: "Alta", processo_numero: "00002668720218130559" },
        { tarefa_id: "t2", subgrupo_id: "sg-civel", titulo: "Conferir prazo de contestação", data: emDias(0), coluna_id: "c1", coluna_nome: "A Fazer", esta_concluida: false, prioridade: "Média" },
        { tarefa_id: "t3", subgrupo_id: "sg-civel", titulo: "Juntar procuração", data: emDias(1), coluna_id: "c1", coluna_nome: "A Fazer", esta_concluida: false, prioridade: "Baixa" },
        { tarefa_id: "t4", subgrupo_id: "sg-civel", titulo: "Preparar audiência", data: emDias(6), coluna_id: "c2", coluna_nome: "Concluído", esta_concluida: true, prioridade: "Alta", responsavel_id: "ana@argos.local" },
        { tarefa_id: "t5", subgrupo_id: "sg-civel", titulo: "Arquivar cópia assinada", data: emDias(3), coluna_id: "c3", coluna_nome: "A Fazer", esta_concluida: false, prioridade: "Baixa", responsavel_id: "joao@argos.local" },
      ],
      total: 5,
      total_paginas: 1,
    }),
  ],
  [
    /\/resumo/,
    () => ({
      a_verificar_ate_hoje: 3, prazo_final_em_7_dias: 5, tarefas_atrasadas: 2,
      tarefas_sem_responsavel: 4, envios_com_falha: 1,
      minhas_concluidas: 12, minhas_atrasadas: 2, minhas_a_concluir: 7,
      processos_total: 25, atendimentos_em_andamento: 3, movimentacoes_7_dias: 9,
    }),
  ],
  [
    /\/subgrupos\/[^/]+\/quadro/,
    () => ({
      colunas: [
        { subgrupo_id: "sg-civel", coluna_id: "c1", nome: "A Fazer", ordem: 1, e_conclusao: false },
        { subgrupo_id: "sg-civel", coluna_id: "c2", nome: "Fazendo", ordem: 2, e_conclusao: false },
        { subgrupo_id: "sg-civel", coluna_id: "c3", nome: "Concluído", ordem: 3, e_conclusao: true },
        // O quadro NÃO mostra esta; o modal de editar, sim.
        { subgrupo_id: "sg-civel", coluna_id: "c4", nome: "Arquivado", ordem: 4, e_conclusao: false, e_arquivado: true },
      ],
    }),
  ],
  [
    /\/historico/,
    () => ({
      historico: [
        { numero_processo: "00002668720218130559", enviado_em: "2026-08-22T14:02:13Z", assunto: "Nova movimentação", tipo_comunicacao: "Intimação", nome_orgao: "Vara Única de Carmo do Rio Claro", destinatarios: ["ana@argos.local"], comunicacao_id: "c1", tipo_envio: "movimentacao" },
        { numero_processo: "50004349620248130559", enviado_em: "2026-08-22T09:15:40Z", assunto: "Prazo em 2 dias", tipo_envio: "lembrete", destinatarios: ["joao@argos.local"], falhou: true, erro: "SMTP 550: caixa de entrada cheia" },
      ],
      total: 2,
      total_paginas: 1,
    }),
  ],
  [
    /\/grupos\/membros/,
    (url) => {
      // ⚠️ Com `subgrupo_nomes`: a rota passou a devolvê-lo (25/08/2026), pra
      // MembrosPage não precisar do catálogo de subgrupos só pra rotular.
      const todos = [
        { email: "ana@argos.local", apelido: "Ana Paula", papel: "admin", subgrupos: ["sg-civel"], subgrupo_nomes: ["Cível"] },
        { email: "joao@argos.local", apelido: "João Meireles", papel: "manager", subgrupos: ["sg-civel"], subgrupo_nomes: ["Cível"] },
        { email: "marina@argos.local", apelido: "Marina Duarte", papel: "user", subgrupos: ["sg-civel", "sg-trab"], subgrupo_nomes: ["Cível", "Trabalhista"] },
      ];
      const achados = filtrar(todos, url, "apelido");
      return { membros: achados, total: achados.length, total_paginas: 1 };
    },
  ],
  [
    // ⚠️ Com `apelido`: a rota passou a devolvê-lo (25/08/2026), pra tela não
    // precisar de `GET /grupos/membros` só pra traduzir e-mail em nome. Stub
    // sem apelido faria a verificação visual mostrar e-mail cru e passar.
    /\/subgrupos\/sg-civel\/membros/,
    () => ({
      membros: [
        { email: "ana@argos.local", apelido: "Ana Paula" },
        { email: "joao@argos.local", apelido: "João Meireles" },
        { email: "marina@argos.local", apelido: "Marina Duarte" },
      ],
    }),
  ],
  [
    /\/subgrupos\/[^/]+\/membros/,
    () => ({ membros: [] }),
  ],
  [
    /\/subgrupos\/sg-civel\/conteudo/,
    () => ({ membros: 3, processos: 6, tarefas: 11, atendimentos: 8 }),
  ],
  [
    /\/subgrupos\/[^/]+\/conteudo/,
    () => ({ membros: 0, processos: 0, tarefas: 0, atendimentos: 0 }),
  ],
  [
    /\/subgrupos|\/grupos/,
    (url) => {
      // `membros`/`colunas` vêm da própria listagem (contagens derivadas):
      // a linha da tela de Grupo mostra "N membros · N colunas".
      // Em ordem alfabética, como o servidor passou a devolver.
      const todos = [
        { subgrupo_id: "sg-civel", nome: "Cível", membros: 3, colunas: 3 },
        { subgrupo_id: "sg-fam", nome: "Família", membros: 2, colunas: 3 },
        { subgrupo_id: "sg-trab", nome: "Trabalhista", membros: 1, colunas: 4 },
      ];
      const achados = filtrar(todos, url, "nome");
      return { grupos: [], subgrupos: achados, total: achados.length, total_paginas: 1 };
    },
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
/** Data relativa a hoje, em `aaaa-mm-dd`. Local, nunca UTC. */
function emDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function instalarStubs(contexto) {
  await contexto.route("**/*", (rota) => {
    const requisicao = rota.request();
    if (requisicao.resourceType() !== "fetch" && requisicao.resourceType() !== "xhr") {
      return rota.fallback();
    }
    const caminho = new URL(requisicao.url()).pathname;
    const achado = RESPOSTAS.find(([padrao]) => padrao.test(caminho));
    /* A URL INTEIRA, não só o caminho: quem responde precisa da query pra
       honrar `busca` -- um stub que a ignora deixa a verificação visual
       passar com o filtro quebrado. */
    return rota.fulfill({ json: achado ? achado[1](new URL(requisicao.url())) : {} });
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
