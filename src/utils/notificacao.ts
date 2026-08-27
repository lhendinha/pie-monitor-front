import {
  ALVO_ATENDIMENTO,
  ALVO_DOCUMENTO,
  ALVO_PROCESSO,
  ALVO_TAREFA,
  TIPO_ATENDIMENTO_ATRIBUIDO,
  TIPO_ATENDIMENTO_DESATRIBUIDO,
  TIPO_ATENDIMENTO_STATUS,
  TIPO_DOCUMENTO_ATRIBUIDO,
  TIPO_DOCUMENTO_VINCULADO,
  TIPO_PROCESSO_ATRIBUIDO,
  TIPO_PROCESSO_DESATRIBUIDO,
  TIPO_LEMBRETE,
  TIPO_TAREFA_ATRIBUIDA,
  TIPO_SESSAO_ALTERADA,
  TIPO_TAREFA_MOVIDA,
} from "../constants";
import type { Notificacao } from "../types";

/** A frase que a notificação vira na tela.
 *
 * ⚠️ O AUTOR é opcional: o lembrete de prazo vem do robô, sem pessoa
 * agindo. Escrever "Alguém" ou deixar um espaço vazio seria pior que
 * montar a frase sem sujeito, então cada tipo cuida do seu caso.
 *
 * ⚠️ Tipo DESCONHECIDO cai no título cru em vez de sumir. Uma versão do
 * front mais antiga que o servidor vai encontrar tipos que não conhece, e
 * esconder o aviso seria a pior reação: a pessoa não saberia que existe.
 */
export function frasePrincipal(n: Notificacao): string {
  /* 🔴 O nome vem NA notificação (`autor_nome`), resolvido pelo servidor.
     Antes esta função recebia um tradutor, e quem o montava baixava TODAS as
     pessoas do grupo -- numa consulta com `enabled` de `manager` pra cima,
     então a frase de quem é `user` mostrava e-mail cru pra sempre.

     `?? n.autor` não é sobra: o campo é ausente quando a pessoa não tem
     apelido definido, e quando o autor é de outro grupo (um `super_admin`
     agindo fora do dele). Nos dois casos o e-mail ainda identifica. */
  const autor = n.autor ? (n.autor_nome ?? n.autor) : "";

  switch (n.tipo) {
    case TIPO_TAREFA_ATRIBUIDA:
      return autor ? `${autor} atribuiu uma tarefa a você` : "Uma tarefa foi atribuída a você";
    case TIPO_TAREFA_MOVIDA:
      return autor ? `${autor} moveu sua tarefa` : "Sua tarefa foi movida";
    case TIPO_ATENDIMENTO_STATUS:
      return autor ? `${autor} mudou o status de um atendimento` : "Um atendimento mudou de status";
    case TIPO_LEMBRETE:
      // Sem autor de propósito -- foi o robô. O motivo ("Vence hoje") já
      // diz tudo, e um sujeito inventado só atrapalharia.
      return n.detalhe || "Lembrete de prazo";

    /* --- "quem responde, recebe" ------------------------------------- */

    /* ⚠️ "passou a responder", e não "foi atribuído a você": o que muda com
       a régua nova é de quem é a RESPONSABILIDADE -- e é ela que decide quem
       recebe os avisos daquele item daqui pra frente. "Atribuiu" descreveria
       a mesma frase de tarefa, que é outra coisa (trabalho individual). */
    case TIPO_PROCESSO_ATRIBUIDO:
      return autor
        ? `${autor} colocou você como responsável por um processo`
        : "Você passou a responder por um processo";
    case TIPO_ATENDIMENTO_ATRIBUIDO:
      return autor
        ? `${autor} colocou você como responsável por um atendimento`
        : "Você passou a responder por um atendimento";
    case TIPO_DOCUMENTO_ATRIBUIDO:
      return autor
        ? `${autor} colocou você como responsável por um documento`
        : "Você passou a responder por um documento";

    /* ⚠️ A frase diz o que a pessoa PERDE, não o que foi feito: ela deixa de
       receber os avisos daquele processo, e é isso que precisa ficar claro --
       "removeu você da lista" soaria administrativo e esconderia a
       consequência. */
    case TIPO_PROCESSO_DESATRIBUIDO:
      return autor
        ? `${autor} tirou você dos responsáveis por um processo`
        : "Você não responde mais por um processo";
    case TIPO_ATENDIMENTO_DESATRIBUIDO:
      return autor
        ? `${autor} tirou você dos responsáveis por um atendimento`
        : "Você não responde mais por um atendimento";

    case TIPO_DOCUMENTO_VINCULADO:
      /* ⚠️ "um documento", no singular, mesmo quando foram doze: o servidor
         SUPRIME os repetidos por janela em vez de agrupar, então este aviso
         representa um ou vários. A contagem exata está na aba Documentos,
         que é pra onde ele leva. */
      return autor
        ? `${autor} anexou um documento`
        : "Um documento foi anexado";
    default:
      return n.titulo || "Notificação";
  }
}

/** O que aparece embaixo da frase: o objeto e, quando ajuda, o
 * complemento. */
export function detalheSecundario(n: Notificacao): string {
  /* ⚠️ Vazio de propósito: o título de `sessao_alterada` já É a frase
     inteira ("Você foi movido para o grupo X"), e o `default` desta função
     devolve o título -- sem esta linha, a MESMA frase apareceria duas vezes
     na linha do sino, como principal e como secundária. */
  if (n.tipo === TIPO_SESSAO_ALTERADA) return "";
  if (n.tipo === TIPO_LEMBRETE) return n.titulo;
  if (n.tipo === TIPO_TAREFA_MOVIDA && n.detalhe) return `${n.titulo} → ${n.detalhe}`;
  if (n.tipo === TIPO_ATENDIMENTO_STATUS && n.detalhe) return `${n.titulo} · ${n.detalhe}`;
  return n.titulo;
}

/** Pra onde o clique leva. `null` quando não há destino -- e aí a linha não
 * é clicável, em vez de levar a lugar nenhum. */
export function destinoDaNotificacao(n: Notificacao): string | null {
  if (!n.alvo_id) return null;
  switch (n.alvo_tipo) {
    case ALVO_TAREFA:
      return n.subgrupo_id ? `/tarefas/${n.subgrupo_id}/${n.alvo_id}` : null;
    case ALVO_ATENDIMENTO:
      return n.subgrupo_id ? `/atendimentos/${n.subgrupo_id}/${n.alvo_id}` : null;
    case ALVO_PROCESSO:
      return n.subgrupo_id ? `/processos/${n.subgrupo_id}/${n.alvo_id}` : null;
    case ALVO_DOCUMENTO:
      return n.subgrupo_id ? `/documentos/${n.subgrupo_id}/${n.alvo_id}` : null;
    default:
      return null;
  }
}
