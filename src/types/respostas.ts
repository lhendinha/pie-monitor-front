import type {
  Atendimento,
  AtendimentoResumido,
  Cliente,
  ColunaDoQuadro,
  Comunicacao,
  Grupo,
  HistoricoItem,
  Membro,
  OpcaoProcesso,
  Processo,
  Subgrupo,
  Tarefa,
} from "./index";

/** O que cada rota da API devolve, com nome.
 *
 * Antes cada tela escrevia o envelope à mão no genérico da consulta
 * (`useQuery<{ subgrupos: Subgrupo[] }>`). `{ subgrupos: Subgrupo[] }`
 * aparecia em sete arquivos, `{ membros: Membro[] }` em outros sete: sete
 * lugares pra corrigir quando a rota ganhasse um campo, e nenhum jeito de
 * saber que eram a mesma coisa.
 *
 * A chave do array repete o nome do recurso porque é assim que o backend
 * monta o envelope (`shared/paginacao.py`) -- não é escolha desta camada.
 */

/** Só a contagem, que é o que as telas leem do envelope.
 *
 * ⚠️ NÃO é o `EnvelopePaginacao` inteiro de propósito: o servidor manda
 * `pagina` e `tamanho_pagina` junto, mas quem pagina no front já sabe em
 * que página está -- é ele quem pediu. Exigir os quatro campos obrigaria
 * todo teste a inventar dois números que ninguém lê. */
export interface ContagemDaPagina {
  total: number;
  total_paginas: number;
}

// --- listagens simples (a rota devolve tudo) -------------------------------

export interface RespostaDeSubgrupos {
  subgrupos: Subgrupo[];
}

export interface RespostaDeMembros {
  membros: Membro[];
}

export interface RespostaDeClientes {
  clientes: Cliente[];
}

export interface RespostaDeProcessos {
  processos: Processo[];
}

export interface RespostaDeOpcoes {
  opcoes: OpcaoProcesso[];
}

export interface RespostaDeTarefas {
  tarefas: Tarefa[];
}

export interface RespostaDeAtendimentos {
  atendimentos: Atendimento[];
}

/** O campo de vínculo da tarefa pede o atendimento enxuto -- ver
 * `AtendimentoResumido`. */
export interface RespostaDeAtendimentosResumidos {
  atendimentos: AtendimentoResumido[];
}

export interface RespostaDeHistorico {
  historico: HistoricoItem[];
}

export interface RespostaDeGrupos {
  grupos: Grupo[];
}

/** `GET /subgrupos/{id}/quadro`. */
export interface RespostaDoQuadro {
  colunas: ColunaDoQuadro[];
}

// --- listagens paginadas ---------------------------------------------------

export interface RespostaDeSubgruposPaginada extends RespostaDeSubgrupos, ContagemDaPagina {}
export interface RespostaDeClientesPaginada extends RespostaDeClientes, ContagemDaPagina {}
export interface RespostaDeOpcoesPaginada extends RespostaDeOpcoes, ContagemDaPagina {}
export interface RespostaDeTarefasPaginada extends RespostaDeTarefas, ContagemDaPagina {}
export interface RespostaDeAtendimentosPaginada
  extends RespostaDeAtendimentos,
    ContagemDaPagina {}

export interface RespostaDeProcessosPaginada extends RespostaDeProcessos, ContagemDaPagina {}
export interface RespostaDeHistoricoPaginada extends RespostaDeHistorico, ContagemDaPagina {}

// --- respostas de uma coisa só ---------------------------------------------

/** `GET /processos/{numero}/detalhes`: as comunicações do processo e o
 * processo em si (a rota devolve uma lista de um, por simetria com as
 * outras). */
export interface RespostaDeDetalhesDoProcesso {
  comunicacoes: Comunicacao[];
  processos: Processo[];
}

/** Só a contagem, sem os itens -- usada pelos cartões de total, que não
 * mostram lista nenhuma. */
export interface RespostaDeTotal {
  total: number;
}

/** `GET /convites/{token}`: se o convite ainda vale. */
export interface RespostaDeConvite {
  valido: boolean;
}

/** As rotas que só confirmam a ação. */
export interface RespostaDeMensagem {
  mensagem: string;
}

/** Adicionar membro devolve o e-mail junto -- é ele que a tela mostra no
 * toast, e não dá pra assumir que é o que foi digitado (o servidor
 * normaliza). */
export interface RespostaDeMembroAdicionado extends RespostaDeMensagem {
  email: string;
}
