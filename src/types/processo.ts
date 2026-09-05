/** Processo, comunicação, opções, filtros e a importação por OAB. */

export interface Processo {
  subgrupo_id: string;
  numero_processo: string;
  apelido: string;
  criado_por?: string;
  grupo_id?: string;
  sequencia?: number;
  ultima_verificacao?: string | null;
  cliente_ids?: string[];
  /** Nome de cada cliente, NA MESMA ORDEM de `cliente_ids` -- derivado, o
   * servidor resolve pra página pedida (cai pro próprio id quando o cliente
   * não existe mais). Mesmo campo de `ComClientes`. */
  cliente_nomes?: string[];
  /** Quem RESPONDE por este item -- e, por isso, quem recebe os avisos dele.
   *
   * ⚠️ **OPCIONAL no tipo, embora o servidor sempre devolva.** `Processo` e
   * `Atendimento` aparecem em dezenas de objetos-literais nos testes, e nenhum
   * deles tem a ver com responsável: tipar como obrigatório quebraria todos de
   * uma vez. Opcional aqui, garantido no servidor. */
  responsaveis?: string[];
  /** Apelido de cada e-mail em `responsaveis`, NA MESMA ORDEM -- derivado,
   * resolvido pelo servidor pra página pedida. Cai pro próprio e-mail quando
   * a pessoa não tem apelido: sumir com a posição desalinharia os dois
   * arrays, que a tela lê pareados por índice. */
  responsaveis_nomes?: string[];
  objeto_assunto?: string | null;
  proxima_providencia?: string | null;
  data_verificar?: string | null;
  prazo_final?: string | null;
  observacoes?: string | null;
  fase_id?: string | null;
  situacao_id?: string | null;
  /** Resumo da comunicação mais recente, gravado pela lambda `check` junto
   * com `ultima_verificacao`. A coluna "Última movimentação" da tabela junta
   * os três: o tipo em cima, e embaixo a data em que o TRIBUNAL publicou
   * (`ultima_mov_data`) mais quando o ROBÔ olhou (`ultima_verificacao`).
   * Vem `null` em processo que ainda não teve nenhuma comunicação. */
  ultima_mov_tipo?: string | null;
  ultima_mov_data?: string | null;
}

/** Uma linha da prévia: o que a busca por OAB achou, antes de gravar nada.
 *
 * ⚠️ **`comunicacoes` é CONTAGEM, não conteúdo.** O texto fica no servidor --
 * 1.000 processos com o histórico junto são 19,6 MB, e o limite de resposta
 * da API é 6 MB. */
export interface ProcessoEncontrado {
  numero_processo: string;
  /** A classe processual, já normalizada pelo servidor. O PJe manda
   * `APELAçãO CíVEL`, com os acentos em minúscula. */
  apelido: string;
  /** A sigla do tribunal (`TJRS`, `TRF4`). Vazia quando o PJe não mandou.
   *
   * ⚠️ Vale a coluna própria porque uma OAB cruza justiças: medido em
   * produção, SEIS tribunais numa inscrição só (TJMG, TJRJ, TJSP, TRF2, TRF6,
   * SEEU) em 23 processos. */
  tribunal: string;
  comunicacoes: number;
  /** 🔴 Neste SUBGRUPO, e é o único dos três que impede importar -- só aqui o
   * servidor recusa. */
  ja_existe: boolean;
  /** Os NOMES dos outros subgrupos onde ele está **e que esta pessoa vê**.
   *
   * ⚠️ Nunca inclui o subgrupo de destino: para aquele existe `ja_existe`, e
   * repeti-lo aqui faria a tela dizer "já está em Destino, Civil" sobre o
   * subgrupo em que se está importando. */
  noutros_subgrupos: string[];
  /** Está em algum subgrupo que esta pessoa **não** vê.
   *
   * 🔴 Booleano, e é a proteção: uma contagem já diria quanto trabalho existe
   * fora do alcance dela. Isto responde "existe?" e nada mais.
   *
   * ⚠️ **Não é excludente com `noutros_subgrupos`** -- um processo pode estar
   * em Civil (visível) e em Criminal (não). Some a etiqueta, não o dado: o
   * cartão do resumo conta os dois casos.
   *
   * ⚠️ Sempre `false` para `admin`+, que enxerga todos os subgrupos do grupo. */
  em_outro_subgrupo: boolean;
  /** Este subgrupo já apagou este processo **de propósito**.
   *
   * 🔴 Existe porque, sem ele, o processo apareceria como **novo** -- ele não
   * está em subgrupo nenhum agora, que é exatamente a definição de novo. A
   * pessoa o reimportaria sem saber que já o tinha recusado.
   *
   * ⚠️ **Informa, não impede.** Quem a marca trava é a importação
   * AUTOMÁTICA, que age sozinha. Aqui há alguém olhando a tela, e o processo
   * continua marcável -- bloquear seria parede sem saída, já que não existe
   * tela para apagar a marca.
   *
   * ⚠️ **Só do subgrupo de DESTINO.** O que outro subgrupo recusou não diz
   * nada sobre importar para este, e contá-lo revelaria a decisão de uma
   * equipe que esta pessoa talvez nem enxergue. */
  removido_antes: boolean;
}

/** O que `POST /subgrupos/{id}/processos/buscar-por-oab` devolve. */
export interface PreviaDaImportacao {
  /** Identifica a busca guardada no servidor -- é o que a confirmação usa.
   * Opaco: o caminho é remontado lá com o grupo de quem pede. */
  id: string;
  total_encontrado: number;
  /** A busca parou por limite, e há mais processos que não vieram. Não é
   * erro: é o sinal de que a tela deve oferecer o período. */
  atingiu_o_teto: boolean;
  processos: ProcessoEncontrado[];
}

/** Em que situação um achado da busca está -- e é UMA, não várias.
 *
 * 🔴 Os quatro casos NÃO são exclusivos no dado: um processo pode estar no
 * destino **e** em Civil **e** num subgrupo invisível. Este tipo é o
 * resultado da precedência (ver `estadoDoAchado`), e existe para que a tela
 * decida etiqueta, cor e trava a partir de um valor só.
 *
 * ⚠️ Mora aqui, e não em `utils/importacao`: é o vocabulário que a página, a
 * etiqueta e os testes compartilham. Tipo com mais de um dono vai para
 * `types` -- a função que o produz é que fica no util.
 */
export type EstadoDoAchado = "aqui" | "noutro" | "em_outro" | "removido" | "novo";

/** O que impede a busca por OAB de sair, e onde pintar o erro.
 *
 * ⚠️ **Carrega o CAMPO, não só a frase.** A primeira versão da tela decidia
 * onde mostrar o erro por substring da mensagem ("contém OAB", "contém UF") --
 * e "Selecione a UF da OAB" contém as duas. Amarrar posição de erro ao texto
 * quebra no dia em que alguém melhora a frase.
 *
 * ⚠️ O nome diz **PorOab** porque aqui ele não tem o arquivo em volta para
 * dizer de que busca se trata -- `ErroDaBusca` era claro em
 * `utils/importacao` e fica vago no meio dos outros tipos.
 */
export type ErroDaBuscaPorOab =
  | { campo: "numeroOab" | "ufOab" | "periodo"; mensagem: string }
  | null;

/** O que `POST /subgrupos/{id}/processos/importar` devolve.
 *
 * 🔴 **`ja_existiam` NÃO é falha**: alguém cadastrou pela tela entre a prévia
 * e a confirmação. Somá-lo a `falharam` faria a tela acusar erro onde o
 * sistema funcionou como devia. */
export interface ResultadoDaImportacao {
  cadastrados: number;
  ja_existiam: number;
  /** Os NÚMEROS, não a contagem -- senão não há o que tentar de novo. */
  falharam: string[];
}

/** O progresso que chega pelo canal enquanto a importação grava.
 *
 * ⚠️ `feitos` conta o TENTADO, não o que deu certo: uma barra que só andasse
 * com sucesso ficaria parada numa importação com falhas, sugerindo
 * travamento. */
export interface ProgressoDaImportacao {
  tipo: "importacao_progresso";
  feitos: number;
  total: number;
}

export type TipoOpcaoProcesso = "fase" | "situacao";

export interface OpcaoProcesso {
  tipo: TipoOpcaoProcesso;
  opcao_id: string;
  rotulo: string;
  ordem: number;
  ativo: boolean;
  criado_em?: string;
}

/** Filtros estruturados do painel "Filtros" em ProcessosPage -- separado
 * de `FiltrosProcessos` (services/api/processos.ts), que já inclui `busca`
 * e usa nomes de campo iguais aos da query string. */
/** Filtros estruturados da tela de Processos.
 *
 * Fase e situação são LISTAS: a tela usa seleção múltipla (como o artifact)
 * e o backend aceita o parâmetro repetido -- "aguardando contestação OU
 * audiência" é pergunta de todo dia num escritório. Cliente segue único,
 * também como no artifact. */
export interface FiltrosProcessos {
  clienteId: string;
  /** O NOME do cliente escolhido, guardado junto do id.
   *
   * 🔴 A pílula só carrega a primeira página de clientes, e o escolhido quase
   * nunca está nela -- sem o nome aqui, ela ficaria azul e sem texto, ou
   * mostrando o id cru. Rótulo é dado de exibição e não entra na consulta:
   * ele fica FORA do objeto que vira `queryKey` e query string
   * (`useFiltrosProcessos`), senão a mesma busca viraria duas entradas de
   * cache -- e `temFiltroAtivo` contaria um filtro que não filtra nada. */
  clienteNome: string;
  /** O subgrupo escolhido. Não precisa de nome guardado ao lado como o
   * cliente: a lista de subgrupos que a pessoa VÊ vem inteira para a tela
   * (são poucos -- 8 em produção), e o rótulo se resolve nela. */
  subgrupoId: string;
  faseIds: string[];
  situacaoIds: string[];
  dataVerificarAte: string;
  prazoFinalAte: string;
  /** E-mail de quem responde, ou `SEM_RESPONSAVEL` pros órfãos.
   *
   * 🔴 UM campo na tela, DOIS parâmetros na consulta. A pílula é uma escolha
   * só ("todos / eu / fulano / sem responsável"), mas "sem responsável" não
   * pode virar `responsavel_id=""`: `montarQuery` descarta vazio e o servidor
   * lê `""` como "não filtrar" -- o pedido nem sairia do navegador. A
   * tradução acontece em `useFiltrosProcessos`. */
  responsavelId: string;
}

export interface Comunicacao {
  numero_processo: string;
  comunicacao_id: number | string;
  data_disponibilizacao?: string;
  tipo_comunicacao?: string;
  nome_orgao?: string;
  texto?: string;
  /** Endereço do documento no site do tribunal.
   *
   * ⚠️ **Nenhuma tela mostra isto.** Houve um "Abrir o documento no
   * tribunal" no detalhe da movimentação, removido a pedido em 26/08/2026:
   * é porta pra fora do sistema, e em 7 dos 71 links medidos ela nem abria
   * (6 davam 403, e 1 apontava pra host da rede interna do TST, vazado no
   * dado do PJe). Fica no tipo porque continua chegando da API. */
  link?: string;
  /** Esta movimentação gerou e-mail -- derivado, o servidor resolve
   * (`processos_service.detalhes`).
   *
   * 🔴 Existe porque "ver o envio no Histórico" só faz sentido quando há
   * envio, e na maioria das vezes não há: na primeira checagem de um
   * processo o robô grava o acervo inteiro do PJe e só NOTIFICA o que está
   * dentro da janela de 30 dias. Publicação de 2024 num processo cadastrado
   * em 2026 nunca gerou e-mail -- e não podia ter gerado. Medido em
   * 26/08/2026 sobre dado de produção: 9 de 73.
   *
   * Ausente em resposta de API anterior a 26/08/2026; quem lê trata
   * `undefined` como "não sei, não oferece". */
  tem_envio?: boolean;
}

export interface HistoricoItem {
  numero_processo: string;
  enviado_em: string;
  assunto?: string;
  mensagem?: string;
  tipo_comunicacao?: string;
  nome_orgao?: string;
  subgrupos_notificados?: string[];
  destinatarios?: string[];
  /** Referência pra comunicação em GET /processos/{numero}/detalhes que
   * gerou essa notificação -- não carrega o texto, só o ID pra casar. */
  comunicacao_id?: number;
  /** `movimentacao` (novidade vinda do PJe) ou `lembrete` (aviso de prazo).
   * Registro antigo não tem o campo, e a leitura trata ausente como
   * `movimentacao` -- senão todo o histórico anterior sumiria do filtro. */
  tipo_envio?: "movimentacao" | "lembrete";
  /** O e-mail não saiu. Fica registrado pra dar o que investigar quando
   * alguém diz "não fui avisado" -- antes isso só existia no log. */
  falhou?: boolean;
  erro?: string;
  /** Lembrete de tarefa não tem processo: `numero_processo` guarda
   * `TAREFA#{id}` porque é chave de partição e o DynamoDB recusa string
   * vazia. Quem lê distingue por aqui, nunca decompondo aquele campo. */
  tarefa_id?: string;
  subgrupo_id?: string;
}

/** Os dois parâmetros do deep link de Histórico. Só conta como deep link se
 * vierem os DOIS -- o e-mail de movimentação manda juntos. */
export interface DeepLinkHistorico {
  processo: string;
  comunicacaoId: string;
}

/** Parâmetros de busca do `GET /processos`.
 *
 * Nome diferente de `FiltrosProcessos` de propósito: aquele é o ESTADO da
 * tela, este é o que vai na query string. Chamar os dois igual fazia o
 * import errado passar despercebido. */
export interface FiltrosBuscaProcessos {
  busca?: string;
  clienteId?: string;
  /** Um subgrupo só, e ele RECORTA dentro do que a pessoa já vê.
   *
   * ⚠️ Pela tela não dá para pedir outra coisa: a pílula lista o que
   * `GET /subgrupos` devolve, que já é escopado, e os filtros desta tela não
   * vêm da URL (chegam por `state` de navegação, atalho interno).
   *
   * 🔴 A garantia mora no SERVIDOR mesmo assim, e não é redundância: a rota é
   * alcançável por qualquer cliente autenticado, e lá `subgrupo_id` se SOMA a
   * `subgrupos_permitidos` em vez de substituí-lo. Ver
   * `test_filtrar_por_subgrupo_QUE_NAO_SE_VE_devolve_vazio`. */
  subgrupoId?: string;
  faseIds?: string[];
  situacaoIds?: string[];
  dataVerificarAte?: string;
  prazoFinalAte?: string;
  /** E-mail de quem responde. "eu" é resolvido no FRONT (vira `getEmail()`),
   * e o servidor reconhece o PRÓPRIO e-mail: "Meus processos" é a régua de
   * destinatário -- os que respondo, e os sem responsável de que eu receberia
   * o aviso (gestor do subgrupo; ou membro, quando não há gestor). É a mesma
   * conta do card da Área de trabalho, e por isso os dois batem. Outra pessoa
   * é filtro literal. */
  responsavelId?: string;
  /** Só os ÓRFÃOS -- os que caíram no fallback e avisam os gestores do
   * subgrupo (ou o subgrupo inteiro, se não há gestor).
   *
   * 🔴 Campo próprio, e não `responsavelId: ""`. `montarQuery` descarta valor
   * vazio, e no servidor `""` já é "não filtrar": pedido assim, o filtro nem
   * sairia do navegador e a tela mostraria tudo parecendo filtrada.
   *
   * ⚠️ Mutuamente exclusivo com `responsavelId` -- mandar os dois é erro de
   * front, e o servidor ignora este. */
  semResponsavel?: boolean;
}

/** Campos novos do processo, todos opcionais -- mesmo conjunto usado no
 * cadastro (`criarProcesso`) e na edição (`atualizarProcesso`). Nome
 * `Opcionais` de propósito: evita colidir com o componente `CamposProcesso`. */
export interface CamposOpcionaisProcesso {
  clienteIds?: string[];
  /** Quem responde pelo processo. Vai como `responsaveis` no corpo -- ver
   * `corpoDosCamposDeProcesso`. */
  responsaveis?: string[];
  objetoAssunto?: string;
  proximaProvidencia?: string;
  dataVerificar?: string;
  prazoFinal?: string;
  observacoes?: string;
  faseId?: string;
  situacaoId?: string;
}

export interface OpcoesListarHistorico {
  subgrupoId?: string;
  numeroProcesso?: string;
  /** "movimentacao" ou "lembrete". Vazio traz os dois. */
  tipoEnvio?: string;
  /** Só os envios que falharam. Cruza os DOIS tipos -- falha de lembrete é
   * falha igual. */
  apenasComFalha?: boolean;
  /** Recorta pelos últimos N dias. `0`/ausente = sem recorte.
   *
   * ⚠️ Manda DIAS, não uma data. Quem converte pra instante é o servidor,
   * com a mesma função que o resumo usa -- mandar data daqui abriria espaço
   * pra um dia de Brasília ser comparado com um instante em UTC, que é a
   * fresta de 3h que a API acabou de fechar. */
  dias?: number;
  pagina?: number;
  tamanhoPagina?: number;
}

/** Os parâmetros de `GET /fases` e `GET /situacoes` -- as duas rotas
 * compartilham o formato, e é por isso que há um tipo só.
 *
 * ⚠️ Chamava-se `OpcoesListarOpcoesProcesso`, que era trava-língua e ainda
 * escondia quais são os recursos de verdade. */
export interface OpcoesListarFasesOuSituacoes {
  pagina?: number;
  tamanhoPagina?: number;
}

export interface OpcoesListarProcessos extends FiltrosBuscaProcessos {
  pagina?: number;
  tamanhoPagina?: number;
}
