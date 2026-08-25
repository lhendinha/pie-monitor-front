import {
  ALVO_ATENDIMENTO,
  ALVO_PROCESSO,
  ALVO_TAREFA,
  TIPO_ATENDIMENTO_STATUS,
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
export function frasePrincipal(n: Notificacao, nomeDoAutor: (email: string) => string): string {
  const autor = n.autor ? nomeDoAutor(n.autor) : "";

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
    default:
      return null;
  }
}
