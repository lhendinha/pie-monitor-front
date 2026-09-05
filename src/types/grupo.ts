/** Grupo, subgrupo, membros e inscrições avulsas. */
import type { Papel } from "./sessao";

export interface Subgrupo {
  subgrupo_id: string;
  grupo_id?: string;
  nome: string;
  criado_em?: string;
  /** E-mail de quem criou. É o que libera um `manager` a excluir o próprio
   * subgrupo -- ver `podeExcluirSubgrupo`. Vem vazio nos subgrupos criados
   * antes do campo existir, e ausente nas rotas que devolvem subgrupo
   * enxuto. */
  criado_por?: string;
  /** Contagens DERIVADAS, calculadas por `GET /subgrupos` só pra página
   * pedida -- a linha mostra "N membros · N colunas". Opcionais porque
   * outras rotas devolvem subgrupo sem elas (o seletor dos formulários,
   * por exemplo, que só precisa de id e nome). */
  membros?: number;
  colunas?: number;
}

/** O que existe dentro de um subgrupo -- o que impede excluí-lo.
 * `GET /subgrupos/{id}/conteudo`. */
export interface ConteudoDoSubgrupo {
  membros: number;
  processos: number;
  tarefas: number;
  atendimentos: number;
  /** Se excluir deixaria QUEM ESTÁ PERGUNTANDO sem subgrupo nenhum no grupo
   * -- o quinto impedimento, e o único que não é contagem.
   *
   * Vem do servidor porque a tela não tem como deduzir: ela só conhece a
   * listagem de subgrupos, que é escopada por participação pra
   * `user`/`manager` mas é o grupo INTEIRO pra `admin`+. O mesmo número
   * significa coisas diferentes conforme o papel. */
  ficaria_sem_subgrupo: boolean;
}

export interface Grupo {
  grupo_id: string;
  nome: string;
}

/** O erro da INSCRIÇÃO sozinha -- sem o período, que só a busca tem.
 *
 * ⚠️ Tipo próprio, e não `ErroDaBuscaPorOab` reaproveitado: aquele admite
 * `campo: "periodo"`, e quem trata o retorno de `erroDaInscricao` teria de
 * lidar com um caso que nunca acontece. Um `switch` exaustivo passaria a
 * exigir um ramo morto. */
export type ErroDeInscricao =
  | { campo: "numeroOab" | "ufOab"; mensagem: string }
  | null;

/** O registro editável de UMA pessoa -- `GET /grupos/membros/{email}`.
 *
 * 🔴 **Não é o `Membro` da listagem, e a diferença é deliberada.** A listagem
 * é `manager`+ e a projeção dela é fixa de propósito: publicar a inscrição
 * ali a mostraria na tela de Membros, que não pediu por ela. Este é `admin`+,
 * o mesmo piso de quem pode editar -- quem enxerga é quem pode mudar. */
export interface MembroEditavel {
  email: string;
  apelido: string | null;
  papel: Papel;
  grupo_id: string | null;
  numero_oab: string | null;
  uf_oab: string | null;
  importacao_automatica: boolean;
  subgrupos_destino: string[];
  /** Derivado, para o seletor de destino -- a MESMA lista que o campo de
   * Subgrupos usa. Pedi-la duas vezes faria a tela abrir com dois estados
   * possíveis do mesmo dado. */
  subgrupos: string[];
}

export interface Membro {
  email: string;
  apelido?: string;
  papel?: Papel;
  criado_em?: string;
  adicionado_em?: string;
  subgrupos?: string[];
  /** Nome de cada id em `subgrupos`, na mesma ordem -- derivado, o servidor
   * resolve pra página pedida (`membros_service.listar_pessoas_do_grupo`).
   *
   * 🔴 Vem junto porque a alternativa era a tela de Membros baixar o
   * catálogo inteiro de subgrupos só pra traduzir id em nome -- e até ele
   * chegar, a coluna ficava vazia, sugerindo que a pessoa não está em
   * subgrupo nenhum. */
  subgrupo_nomes?: string[];
}

/** Uma inscrição da lista do GRUPO, como o servidor a DEVOLVE.
 *
 * 🔴 "Avulsa" quer dizer que ela não é de ninguém com conta aqui -- sócio que
 * não usa o sistema, advogado que saiu, estagiário sem login. A inscrição de
 * quem TEM conta mora no perfil da pessoa, e o servidor recusa cadastrá-la
 * aqui também (`garantir_livres_para_as_avulsas`).
 *
 * ⚠️ **`inscricao` vem JUNTA (`"263/MG"`) e o PATCH pede SEPARADA.** A
 * assimetria é do servidor, não um descuido daqui: ele normaliza na entrada e
 * guarda a forma canônica. Quem reparte é `partesDaInscricao`, em
 * `utils/oab`. */
export interface InscricaoAvulsa {
  /** Já normalizada pelo servidor: `"263/MG"`. */
  inscricao: string;
  /** Ligado, o sistema CADASTRA os processos novos que o tribunal devolver.
   *
   * 🔴 Desligado NÃO é "ignorada": estar na lista já faz o sistema acompanhar
   * as movimentações dos processos que ela tem (`das_avulsas_do_grupo`, sem
   * filtro). O interruptor decide só a criação. */
  importacao_automatica: boolean;
  /** Onde os processos importados por esta inscrição nascem.
   *
   * ⚠️ **Lista, e aqui de verdade pode ter vários** -- ao contrário do perfil,
   * onde a pessoa escolhe onde os processos DELA nascem e a pergunta tem uma
   * resposta só. Vazia quando o interruptor está desligado: o servidor zera o
   * destino ao desligar, para não guardar estado que mente. */
  subgrupos_destino: string[];
}

/** A mesma inscrição como o `PATCH /grupos/configuracoes` a RECEBE.
 *
 * 🔴 Tipo separado, e não `Partial<InscricaoAvulsa>`: o que muda não é
 * opcionalidade, é a FORMA -- `inscricao: "263/MG"` na saída, `numero`/`uf` na
 * entrada. Um tipo só faria o compilador aceitar mandar o campo errado. */
export interface InscricaoAvulsaParaSalvar {
  numero: string;
  uf: string;
  importacao_automatica: boolean;
  subgrupos_destino: string[];
}

/** `GET /grupos/configuracoes` -- configurações do próprio grupo.
 *
 * Os limites vêm do servidor junto do valor: a tela valida antes de mandar,
 * e repetir os números aqui seria dois lugares pra manter em acordo. */
export interface ConfiguracoesDoGrupo {
  nome: string;
  dias_para_arquivar: number;
  dias_para_arquivar_minimo: number;
  dias_para_arquivar_maximo: number;
  dias_para_arquivar_padrao: number;
  nome_tamanho_maximo: number;
  oabs_avulsas: InscricaoAvulsa[];
  /** Quantas cabem na lista (`MAX_OABS_AVULSAS`, 50 hoje). Vem do servidor
   * pelo mesmo motivo dos limites acima: número repetido aqui é um segundo
   * lugar pra manter em acordo. */
  oabs_avulsas_maximo: number;
}

export interface OpcoesListarMembros {
  pagina?: number;
  tamanhoPagina?: number;
  /** Filtra no SERVIDOR, por apelido OU e-mail
   * (`membros_service.listar_pessoas_do_grupo`). Os dois porque nem todo
   * mundo tem apelido: buscar só por apelido esconderia quem acabou de ser
   * convidado, que é justamente quem se procura. */
  busca?: string;
}

export interface OpcoesListarSubgrupos {
  pagina?: number;
  tamanhoPagina?: number;
  /** Filtra por nome no SERVIDOR, sem acento e sem caixa
   * (`subgrupos_service.listar_pagina`). É o que permite a pílula trazer a
   * primeira página e completar por digitação, em vez de baixar a lista
   * inteira pra filtrar aqui. */
  busca?: string;
}
