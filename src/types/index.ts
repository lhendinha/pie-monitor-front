export type Papel = "user" | "manager" | "admin" | "super_admin";

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

export interface Cliente {
  grupo_id: string;
  cliente_id: string;
  nome: string;
  criado_por?: string;
  criado_em?: string;
  cpf_cnpj?: string | null;
  /** Quantos processos do grupo referenciam este cliente. Campo DERIVADO,
   * calculado pela API (22/08/2026) -- não está gravado no cliente. Conta
   * a linha de processo, então o mesmo número em dois subgrupos conta
   * duas vezes. */
  processos?: number;
  telefone?: string | null;
  email?: string | null;
  /** Endereço -- opcional inteiro, e PLANO como na API (um objeto aninhado
   * exigiria uma segunda semântica de PATCH). Ausente em cliente cadastrado
   * antes de 27/08/2026, e quem lê trata `null`/`undefined` como "não
   * informado". */
  cep?: string | null;
  logradouro?: string | null;
  /** TEXTO, nunca número: "S/N", "123-A" e "km 12" são endereços reais. */
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

/** O endereço como o formulário o carrega -- sempre string, nunca `null`.
 *
 * ⚠️ Separado do `Cliente` de propósito: lá os campos são opcionais porque
 * a API pode não mandá-los; aqui são obrigatórios porque um `<input>`
 * controlado com `value={undefined}` vira NÃO-controlado, e o React só
 * avisa disso no console. */
export interface EnderecoDoCliente {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** O que a rota `GET /cep/{cep}` devolve -- já traduzido pela nossa API, sem
 * o formato de provedor nenhum. */
export interface EnderecoDoCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** O que `POST`/`PATCH /clientes` recebe. Em camelCase porque é o que a tela
 * monta; quem traduz pros nomes da API é o serviço. */
export interface CamposCliente {
  nome: string;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
  /** Opcional inteiro -- cliente sem endereço é válido. */
  endereco?: EnderecoDoCliente;
}

/** Os parâmetros de `GET /clientes`.
 *
 * ⚠️ `busca` IGNORA `pagina`/`tamanhoPagina`: é uma consulta pontual, não
 * paginada -- mesmo corte que `clientes_router.py` usa do outro lado. */
export interface OpcoesListarClientes {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
}

/** O andamento da consulta de CEP, como a tela precisa vê-lo. */
export interface EstadoDoCep {
  buscando: boolean;
  /** Mensagem pra mostrar embaixo do campo, ou `undefined`. Distingue "não
   * encontrado" de "o serviço caiu": a primeira manda preencher à mão, a
   * segunda manda tentar de novo. */
  aviso?: string;
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

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
  expira_em: number;
  email: string;
  apelido?: string | null;
}

export interface JwtPayload {
  email?: string;
  grupo_id?: string | null;
  papel?: Papel;
  type?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/** Query string opcional + corpo opcional, usados nas chamadas de api.ts */
export interface OpcoesRequisicao {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  /** Array vira parâmetro repetido (`?fase_id=a&fase_id=b`), que é como o
   * FastAPI lê lista. Ver `montarQuery` em services/api/client.ts. */
  query?: Record<string, string | string[] | undefined>;
}

/** Abas de topo do App.tsx. "grupo" agrupa Subgrupos/Membros/Convidar/
 * Fases/Situações como sub-navegação (ver GrupoPage + SubAbaId). */


/** Sub-abas dentro de GrupoPage. */
export type SubAbaId =
  | "subgrupos"
  | "membros"
  | "convidar"
  | "fases"
  | "situacoes"
  | "configuracoes";

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
}

export interface SubAbaConfig {
  id: SubAbaId;
  label: string;
  minimo: Papel;
}

/** Tarefa do Kanban. Aqui só os campos que o detalhe do processo usa -- o
 * quadro completo entra na etapa dele. */
/** Contagens da Área de trabalho (`GET /resumo`). */
export interface ResumoDaAreaDeTrabalho {
  a_verificar_ate_hoje: number;
  prazo_final_em_7_dias: number;
  tarefas_atrasadas: number;
  tarefas_sem_responsavel: number;
  envios_com_falha: number;
  minhas_concluidas: number;
  minhas_atrasadas: number;
  minhas_a_concluir: number;
  processos_total: number;
  atendimentos_em_andamento: number;
  movimentacoes_7_dias: number;
}

/** Uma coluna do quadro Kanban de um subgrupo. */
export interface ColunaDoQuadro {
  subgrupo_id: string;
  coluna_id: string;
  nome: string;
  ordem: number;
  /** A coluna que marca conclusão. Só uma por quadro -- marcar outra
   * desmarca esta, no servidor. */
  e_conclusao: boolean;
  /** O destino do que já foi concluído há tempo demais pra ocupar espaço no
   * quadro. Tarefa arquivada CONTINUA CONCLUÍDA -- é concluída guardada,
   * não um terceiro estado.
   *
   * Coluna fixa: não se renomeia, não se move, não se exclui e não vira
   * conclusão. O servidor recusa as quatro coisas. */
  e_arquivado: boolean;
}

export interface Tarefa {
  subgrupo_id: string;
  tarefa_id: string;
  titulo: string;
  data: string;
  coluna_id: string;
  prioridade: string;
  responsavel_id?: string | null;
  /** Apelido de quem é responsável -- derivado, o servidor resolve pra
   * página pedida (`tarefas_router._com_nome_do_responsavel`).
   *
   * 🔴 Vem junto porque a alternativa era o cartão baixar TODAS as pessoas
   * do grupo só pra traduzir e-mail em apelido -- e essa lista só chegava
   * pra `manager` pra cima, então o cartão de quem é `user` mostrava e-mail
   * cru pra sempre. Ausente quando a pessoa não tem apelido; aí o e-mail
   * continua sendo o rótulo, que ainda identifica. */
  responsavel_nome?: string | null;
  /** Nome da coluna do quadro em que a tarefa está -- derivado, resolvido
   * pelo servidor (`tarefas_router._serializar_tarefas`).
   *
   * 🔴 A Agenda pedia UM QUADRO POR SUBGRUPO exibido só pra saber isto. E
   * pedia só pros 50 primeiros, enquanto a lista de tarefas trazia todos os
   * visíveis -- acima disso a tarefa vinha sem nome de coluna e sem tachado.
   *
   * `undefined`/`null` quando o quadro não conhece a coluna; quem exibe omite
   * o pedaço em vez de mostrar um id cru. */
  coluna_nome?: string | null;
  /** A tarefa está concluída? Derivado de estar numa coluna marcada como
   * conclusão OU como arquivado -- arquivada é concluída guardada.
   *
   * ⚠️ **`esta_concluida`, e não `concluida`**, e o nome é deliberado: a
   * tarefa também carrega `concluido_em`, um carimbo GRAVADO que é ausente
   * em toda tarefa concluída antes do arquivamento existir. Dois campos
   * parecidos, um confiável e outro não. Este é o confiável.
   *
   * A decisão mora num lugar só, no servidor (`ColunaQuadro.conclui`). Antes,
   * a Agenda decidia de novo por conta (`e_conclusao || e_arquivado`). */
  esta_concluida?: boolean;
  /** O vínculo da tarefa. Um OU o outro, nunca os dois -- é assim que o
   * backend grava, e o campo da tela reflete isso sendo um só. */
  processo_numero?: string | null;
  atendimento_id?: string | null;
}

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

/** Qualquer item ordenável: uma opção de Fase/Situação ou uma coluna do
 * quadro. `calcularOrdemAposMover` só precisa da `ordem`, e pedir a
 * entidade inteira prenderia o helper a uma delas. */
export interface ComOrdem {
  ordem: number;
}

/** Qualquer coisa que carregue ids de cliente -- processo ou atendimento.
 * Mesmo motivo do `ComOrdem`: o helper que resolve nomes só precisa dos
 * ids. */
export interface ComClientes {
  cliente_ids?: string[];
  /** Nome de cada cliente, NA MESMA ORDEM de `cliente_ids` -- campo derivado
   * que o servidor resolve pra página pedida. Ver `Atendimento`. */
  cliente_nomes?: string[];
}


/** Um aviso in-app. Uma linha POR DESTINATÁRIO: "lida" é individual, e o
 * mesmo fato vira N linhas quando vai pro subgrupo. */
export interface Notificacao {
  usuario_id: string;
  notificacao_id: string;
  tipo: string;
  criado_em: string;
  lida: boolean;
  /** Quem fez a ação. Vazio no lembrete de prazo -- ali não houve pessoa,
   * foi o robô, e a frase é escrita sem "Fulano". */
  autor: string;
  /** Apelido de `autor`, resolvido no servidor (`sino_service.listar`).
   *
   * ⚠️ **Opcional, e não por comodidade.** `MensagemDoCanal.notificacao` é
   * tipada com ESTE tipo, e o objeto que chega pelo canal WebSocket não tem
   * o campo -- ele nasce da imagem do Stream do DynamoDB, que guarda só o
   * que está na linha. Declarar obrigatório faria o TypeScript afirmar algo
   * falso sobre aquele objeto.
   *
   * Na prática não aparece: o push é GATILHO (o hook invalida e relê pela
   * rota), não payload pra desenhar. Ver `ws_canal_service._simplificar`.
   *
   * Ausente também quando não há autor (lembrete, sessão alterada) ou quando
   * a pessoa não tem apelido. */
  autor_nome?: string | null;
  titulo: string;
  /** Complemento: a coluna de destino, o status novo, o motivo do
   * lembrete. */
  detalhe: string;
  subgrupo_id: string;
  /** Pra onde o clique leva, em duas partes em vez de um campo por tipo de
   * recurso -- o mesmo `tipo` pode apontar pra coisas diferentes (o
   * `lembrete` vale pra tarefa E pra processo). */
  alvo_tipo: string;
  alvo_id: string;
}

/** O que o canal de tempo real manda. `tipo` distingue os formatos --
 * hoje só existe "notificacao", mas o campo evita que um formato novo
 * quebre quem já escuta. */
export interface MensagemDoCanal {
  tipo: string;
  notificacao?: Notificacao;
}

// ---------------------------------------------------------------------------
// Tipos que estavam espalhados
//
// Todos vinham declarados dentro do módulo que os usava primeiro --
// `utils/`, `constants/`, `theme/`, `components/`, `services/`. Enquanto o
// consumidor era um só isso não incomodava; quando passou a ser vários, o
// import cruzava a casa inteira (o `ToastItem` vivia num arquivo dentro de
// `components/Toast/` e era importado de dentro de `pages/`) e a resposta
// pra "onde declaro este tipo?" passou a depender de quem chegou primeiro,
// não do alcance dele.
//
// ⚠️ Tipo PRIVADO de uma página continua no `types.ts` dela -- o critério é
// alcance, não arquivo. O que mora aqui é o que atravessa fronteira.
// ---------------------------------------------------------------------------

/** Um item do menu lateral. `minimo` é o papel a partir do qual ele APARECE
 * -- não é permissão: a rota continua acessível por link direto, e quem
 * decide o que a pessoa pode fazer é sempre o backend. */
export interface ItemNavegacao {
  caminho: string;
  rotulo: string;
  /** Nome do ícone em `components/Icons` (sem o prefixo `Icone`). */
  icone: string;
  minimo?: Papel;
  /** Tela ainda não construída. O item fica FORA do menu enquanto for true --
   * item que leva a tela vazia é pior que item ausente. Some junto com a
   * etapa que entrega a tela; a lista já está na ordem final de propósito,
   * pra que a navegação não mude de forma a cada entrega. */
  pendente?: boolean;
}

/** Uma opção de menu de escolha única -- o filtro de período e a
 * `PilulaDeMenu` usam a mesma forma.
 *
 * Chamava-se `OpcaoDePeriodo` e vivia em `constants/periodos.ts`. O nome
 * descrevia o primeiro uso, não a forma, e por isso a `PilulaDeMenu` tinha
 * uma cópia local idêntica -- com o mesmo comentário sobre o zag, copiado
 * junto. Não confundir com `OpcaoDeSelect` (`{value, label}`), que é o que
 * o react-select consome. */
export interface OpcaoDeMenu {
  /** Não pode ser vazio: item de menu com `value=""` o zag não registra, e
   * a opção simplesmente não seleciona. */
  id: string;
  rotulo: string;
}

/** Um intervalo de datas, `aaaa-mm-dd` e inclusive nas duas pontas. */
export interface IntervaloDeDatas {
  de: string;
  ate: string;
}

/** Uma célula da grade de um mês. Os dias de fora do mês vêm MARCADOS
 * (`doMes: false`) em vez de omitidos -- a grade precisa começar no domingo
 * certo, e buraco no início desalinharia as colunas. */
export interface DiaDoCalendario {
  iso: string;
  dia: number;
  doMes: boolean;
}

/** Os dois parâmetros do deep link de Histórico. Só conta como deep link se
 * vierem os DOIS -- o e-mail de movimentação manda juntos. */
export interface DeepLinkHistorico {
  processo: string;
  comunicacaoId: string;
}

/** Um aviso na fila do `ToastProvider`. */
export interface ToastItem {
  id: number;
  tipo: "erro" | "sucesso";
  mensagem: string;
}

/** Uma opção de `Select`/`MultiSelect`. */
export interface OpcaoDeSelect {
  value: string;
  label: string;
}

/** Como cada opção do painel se desenha: caixa de seleção quando dá pra
 * escolher várias (situação, fase) e linha inteira clicável quando é uma só
 * (cliente). */
export type FormaDaOpcaoDeSelect = "caixa" | "linha";

/** As variantes de `.btn` do artifact que o sistema usa de fato. */
export type VarianteBotao = "primario" | "ghost" | "perigo" | "perigoContorno";

/** Parâmetros de busca do `GET /processos`.
 *
 * Nome diferente de `FiltrosProcessos` de propósito: aquele é o ESTADO da
 * tela, este é o que vai na query string. Chamar os dois igual fazia o
 * import errado passar despercebido. */
export interface FiltrosBuscaProcessos {
  busca?: string;
  clienteId?: string;
  faseIds?: string[];
  situacaoIds?: string[];
  dataVerificarAte?: string;
  prazoFinalAte?: string;
  /** E-mail de quem responde. "eu" é resolvido no FRONT (vira `getEmail()`):
   * o servidor não precisa saber o que "eu" significa. */
  responsavelId?: string;
  /** Só os ÓRFÃOS -- os que caíram no fallback e avisam o subgrupo inteiro.
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
   * `paraCorpoDeProcesso`. */
  responsaveis?: string[];
  objetoAssunto?: string;
  proximaProvidencia?: string;
  dataVerificar?: string;
  prazoFinal?: string;
  observacoes?: string;
  faseId?: string;
  situacaoId?: string;
}

/** Um documento: um arquivo guardado no armazenamento, ou um link.
 *
 * ⚠️ **`titulo` e `nome_arquivo` são coisas diferentes**, e a distinção é o
 * que impede uma surpresa silenciosa:
 *
 * - `titulo` é como o documento se chama NA LISTA. Nasce com o nome do
 *   arquivo, é digitado quando é link, e se edita nos dois casos.
 * - `nome_arquivo` é o nome com que o arquivo BAIXA (`Content-Disposition`),
 *   e **não** se edita. Fossem o mesmo campo, renomear o título mudaria o
 *   nome do arquivo baixado meses depois, sem ninguém ter pedido.
 *
 * ⚠️ `tipo` é STRING, não união fechada: o backend guarda assim de propósito,
 * pra o "documento padrão" entrar depois sem migração. Quem exibe usa
 * `rotuloDoTipo`, que devolve o valor cru pro que não conhece -- some com o
 * registro seria pior que rotular feio.
 */
export interface Documento {
  subgrupo_id: string;
  documento_id: string;
  grupo_id: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  /** Só em `arquivo`. */
  nome_arquivo?: string | null;
  chave_s3?: string | null;
  /** MEDIDO pelo armazenamento, não declarado pelo navegador. */
  tamanho_bytes?: number | null;
  /** DECLARADO pelo navegador -- ninguém abriu o arquivo pra conferir.
   * Nenhuma decisão da tela se apoia nele. */
  content_type?: string | null;
  /** Só em `link`. */
  url?: string | null;
  processo_numero?: string | null;
  atendimento_id?: string | null;
  cliente_ids?: string[] | null;
  /** Derivado, NA MESMA ORDEM de `cliente_ids` -- o servidor resolve pra
   * página pedida. Cai pro próprio id quando o cliente não é encontrado. */
  cliente_nomes?: string[] | null;
  responsavel_id?: string | null;
  /** Derivado: o apelido de quem responde. Mesma razão de
   * `Tarefa.responsavel_nome` -- a lista de pessoas do grupo só chega pra
   * `manager` pra cima, e sem isto quem é `user` veria e-mail cru. */
  responsavel_nome?: string | null;
  criado_por?: string | null;
  criado_em?: string;
  atualizado_em?: string | null;
  sequencia?: number;
}

/** O que `POST /subgrupos/{sg}/documentos/upload` devolve: a permissão de
 * gravar UM objeto, e onde.
 *
 * `campos` vai inteiro no formulário, sem ser lido nem reordenado -- ele é a
 * política assinada, e mexer em qualquer par derruba a assinatura. */
export interface EnvioPreparado {
  chave: string;
  url: string;
  campos: Record<string, string>;
}

/* ⚠️ `PrioridadeDaTarefa` e `StatusDeAtendimento` são DERIVADOS da constante que os
   gera (`typeof PRIORIDADES[number]`) -- é o que impede a lista de palavras
   e o tipo de divergirem. Derivá-los aqui obriga `types` a importar de
   `constants`, e o import é `import type`: some na compilação, então não há
   ciclo em tempo de execução.

   Import do ARQUIVO, não do índice de `constants` -- o índice reexporta o
   pacote inteiro, e puxá-lo daqui ligaria `types` a tudo que mora lá. */
import type { PRIORIDADES } from "../constants/prioridade";
import type { STATUS_DE_ATENDIMENTO } from "../constants/atendimento";

export type PrioridadeDaTarefa = (typeof PRIORIDADES)[number];
export type StatusDeAtendimento = (typeof STATUS_DE_ATENDIMENTO)[number];
