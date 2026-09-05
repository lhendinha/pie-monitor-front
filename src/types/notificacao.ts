/** Sino, canal, toast e o resumo da área de trabalho. */
/* ⚠️ Tipo DERIVADO da constante (`typeof X[number]`), pra lista e tipo não
   divergirem. `import type` do ARQUIVO de `constants`, não do índice: o
   índice reexporta o pacote inteiro, e puxá-lo daqui ligaria `types` a tudo
   que mora lá. Some na compilação, então não há ciclo em tempo de execução. */
import type { ALVOS_DE_NOTIFICACAO, TIPOS_DE_NOTIFICACAO } from "../constants/notificacoes";

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

/** Um aviso in-app. Uma linha POR DESTINATÁRIO: "lida" é individual, e o
 * mesmo fato vira N linhas quando vai pro subgrupo. */
export interface Notificacao {
  usuario_id: string;
  notificacao_id: string;
  tipo: TipoDeNotificacao;
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
  /* ⚠️ `| ""` porque a API tem `alvo_tipo: str = ""` como DEFAULT: aviso
     sem destino (o `sessao_alterada`, por exemplo) chega com string vazia.
     Fechar só nos quatro faria o tipo mentir -- e o `destinoDaNotificacao`
     precisa justamente distinguir "não tem alvo" de "alvo que não conheço". */
  alvo_tipo: AlvoDeNotificacao | "";
  alvo_id: string;
}

/** O que o canal de tempo real manda. `tipo` distingue os formatos --
 * hoje só existe "notificacao", mas o campo evita que um formato novo
 * quebre quem já escuta. */
export interface MensagemDoCanal {
  tipo: string;
  notificacao?: Notificacao;
}

/** Um aviso na fila do `ToastProvider`. */
export interface ToastItem {
  id: number;
  tipo: "erro" | "sucesso";
  mensagem: string;
}

/** O que o servidor pode mandar em `Notificacao.tipo`.
 *
 * 🔴 Fechado de propósito: era `string`, e aí o `switch` de
 * `textoDaNotificacao` aceitava qualquer coisa -- tipo novo caía no
 * `default` e virava linha vazia no sino, sem aviso nenhum. */
export type TipoDeNotificacao = (typeof TIPOS_DE_NOTIFICACAO)[number];

/** O que o servidor pode mandar em `Notificacao.alvo_tipo`. Decide PRA ONDE
 * o clique leva (`destinoDaNotificacao`). */
export type AlvoDeNotificacao = (typeof ALVOS_DE_NOTIFICACAO)[number];
