/** Atendimento e os registros que ele acumula. */
/* ⚠️ `PrioridadeDaTarefa` e `StatusDeAtendimento` são DERIVADOS da constante que os
   gera (`typeof PRIORIDADES[number]`) -- é o que impede a lista de palavras
   e o tipo de divergirem. Derivá-los aqui obriga `types` a importar de
   `constants`, e o import é `import type`: some na compilação, então não há
   ciclo em tempo de execução.

   Import do ARQUIVO, não do índice de `constants` -- o índice reexporta o
   pacote inteiro, e puxá-lo daqui ligaria `types` a tudo que mora lá. */
import type { STATUS_DE_ATENDIMENTO } from "../constants/atendimento";

/** Um registro da linha do tempo do atendimento.
 *
 * Append-only: não se edita nem se apaga. É registro de atendimento a
 * cliente, e reescrever o passado é justamente o que ele não pode
 * permitir -- o servidor não tem rota pra isso. */
export interface RegistroDeAtendimento {
  autor_id: string;
  /** Apelido de quem escreveu -- derivado, o servidor resolve pra o que está
   * devolvendo (`atendimentos_router._serializar`).
   *
   * 🔴 Vem junto porque a alternativa era a tela baixar TODAS as pessoas do
   * grupo só pra traduzir e-mail em apelido -- e essa lista só chegava pra
   * `manager` pra cima, então quem é `user` via e-mail cru pra sempre. Mesma
   * história de `responsavel_nome` em `Tarefa`.
   *
   * Ausente quando a pessoa não tem apelido, e também quando é de outro
   * grupo (um `super_admin` agindo fora do dele); aí o `autor_id` continua
   * sendo o rótulo, que ainda identifica. */
  autor_nome?: string | null;
  registrado_em: string;
  texto: string;
}

// Os status possíveis saíram pra `constants/atendimento.ts` -- é valor de
// runtime, e aqui é lugar de tipo.

export interface Atendimento {
  subgrupo_id: string;
  atendimento_id: string;
  assunto: string;
  status: string;
  criado_em: string;
  criado_por?: string;
  sequencia?: number;
  cliente_ids: string[];
  /** Nome de cada cliente, NA MESMA ORDEM de `cliente_ids`.
   *
   * 🔴 Campo derivado que o servidor resolve só pra página pedida. Antes a
   * tela baixava o catálogo INTEIRO de clientes pra traduzir id em nome --
   * com 5.000 clientes eram 50 requisições por abertura, e até a última
   * chegar a coluna mostrava o id cru e se corrigia sozinha na frente da
   * pessoa.
   *
   * Opcional porque nem toda rota o devolve (o vínculo da tarefa, por
   * exemplo, não precisa). Ausente, quem mostra cai no id. */
  cliente_nomes?: string[];
  /** Quem RESPONDE por este atendimento. Mesma forma e mesmas ressalvas de
   * `Processo.responsaveis` -- ver lá. */
  responsaveis?: string[];
  responsaveis_nomes?: string[];
  processo_numero?: string | null;
  /** A listagem devolve o atendimento inteiro, registros inclusos -- é de
   * onde sai a prévia do último registro em cada linha. */
  registros: RegistroDeAtendimento[];
}

/** O que o campo de vínculo da tarefa precisa. Continua separado de
 * `Atendimento` porque aquele campo só usa quatro chaves, e exigir a lista
 * de registros ali obrigaria a inventá-la em todo teste que monta um. */
/** O mínimo pra rotular uma tarefa vinculada: quem é o atendimento e qual o
 * assunto. Deliberadamente menor que `AtendimentoResumido` -- devolver o
 * atendimento inteiro criaria uma segunda forma competindo com a da tela de
 * detalhe, e "duas formas na mesma chave" é o defeito que este projeto
 * passou uma auditoria inteira fechando. */
export interface ResumoDeAtendimento {
  subgrupo_id: string;
  atendimento_id: string;
  assunto: string;
}

export interface AtendimentoResumido {
  subgrupo_id: string;
  atendimento_id: string;
  assunto: string;
  status: string;
}

/** Um item vinculável achado na busca.
 *
 * `rotulo` e `detalhe` são só pra tela; o que sai daqui pro servidor é o
 * `id`, no campo que o `tipo` indica.
 */
export interface Vinculo {
  tipo: "processo" | "atendimento";
  id: string;
  rotulo: string;
  detalhe?: string;
}

/** Os vínculos de uma tarefa: até um de cada tipo.
 *
 * Duas fatias, e não uma lista, porque é o formato do backend --
 * `processo_numero` e `atendimento_id` são campos independentes, um valor
 * cada. Escolher um processo novo TROCA o anterior; não empilha.
 */
/** Os dois slots do campo de vínculo. Um por tipo, nunca uma lista -- é
 * assim que o banco guarda (`processo_numero` e `atendimento_id`, um valor
 * cada).
 *
 * ⚠️ Chamava-se `VinculosDaTarefa` enquanto só a tarefa tinha o campo. O
 * documento usa o mesmo, e um nome que fala de um consumidor só é o convite
 * pra segunda cópia do tipo. */
export interface VinculosDeRegistro {
  processo: Vinculo | null;
  atendimento: Vinculo | null;
}

export type StatusDeAtendimento = (typeof STATUS_DE_ATENDIMENTO)[number];

// Os parâmetros e corpos das chamadas de API
//
// 🔴 Moram AQUI, e não dentro de `services/api/*.ts`: lá ficam só as funções
// que falam com a API. Eram 15 interfaces espalhadas por 12 arquivos, de
// quando o padrão era o contrário.
//
// ⚠️ Em camelCase, porque é o que a TELA monta -- quem traduz para os nomes
// da API (`tamanho_pagina`, `cpf_cnpj`) é o serviço, no ato da chamada.

export interface OpcoesListarAtendimentos {
  busca?: string;
  status?: string;
  /** Filtro de ESCOLHA, não de permissão: estreita o que a pessoa já vê.
   * Subgrupo fora do alcance devolve lista vazia, nunca o conteúdo dele. */
  subgrupoId?: string;
  pagina?: number;
  tamanhoPagina?: number;
}
