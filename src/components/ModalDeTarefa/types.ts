import type { Tarefa, Vinculo } from "../../types";

/** As props de `ModalDeTarefa` que o formulário usa -- todas menos o nome
 * do subgrupo, que só a tela mostra. A explicação de cada uma está lá. */
export interface OpcoesDoFormularioDeTarefa {
  tarefa?: Tarefa | null;
  subgrupoAtual: string;
  colunaInicial?: string;
  vinculoInicial?: Vinculo | null;
  dataInicial?: string;
  onSalvo: () => void;
  onFechar: () => void;
}

export interface ModalDeTarefaProps {
  /** Ausente = criando. */
  tarefa?: Tarefa | null;
  /** Subgrupo em que o modal ABRE. Depois disso quem manda é o seletor:
   * ao criar, a pessoa pode escolher outro. */
  subgrupoAtual: string;
  /** O NOME do subgrupo atual, pra quando ele estiver fora da primeira
   * página: editando, este campo existe só pra DIZER a que subgrupo a tarefa
   * pertence, e sem o nome ele diria o id. */
  subgrupoAtualNome?: string;
  /** Coluna pré-escolhida, quando veio do "+ Nova atividade" de uma coluna. */
  colunaInicial?: string;
  /** Vínculo já preenchido ao CRIAR -- quando a tarefa nasce de dentro de
   * um processo ou atendimento que a pessoa já está olhando.
   *
   * Molde de `DocumentosVinculados`, que tem o mesmo par
   * `subgrupoInicial`/`vinculoInicial` pela mesma necessidade: uma segunda
   * forma aqui seria a porta irmã de sempre.
   *
   * ⚠️ Leva o RÓTULO junto, não só o id: `VinculoDeRegistro` mostra a
   * etiqueta do que foi vinculado, e um número CNJ cru não se confere de
   * relance.
   *
   * Ignorado ao EDITAR: ali o vínculo é o da tarefa. */
  vinculoInicial?: Vinculo | null;
  /** Data pré-escolhida ao CRIAR -- é o dia que a Agenda tem à vista.
   *
   * Sem isto a tarefa criada na Agenda nasceria com a data de hoje e
   * sumiria da tela em que foi criada, se a pessoa estivesse olhando outro
   * mês. Ignorada ao editar: ali a data é a da tarefa. */
  dataInicial?: string;
  onSalvo: () => void;
  onFechar: () => void;
}
