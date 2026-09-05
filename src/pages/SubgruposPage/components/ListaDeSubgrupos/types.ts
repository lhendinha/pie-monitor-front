import type { Subgrupo } from "../../../../types";

export interface ListaDeSubgruposProps {
  subgrupos: Subgrupo[];
  podeEditar: boolean;
  /** Por LINHA, e não por papel: um manager exclui o subgrupo que ele mesmo
   * criou e nenhum outro, então a lixeira aparece em algumas linhas e não
   * em outras da mesma lista. */
  podeExcluir: (s: Subgrupo) => boolean;
  /** Qual linha está com o nome em edição -- só uma por vez. */
  renomeandoId: string | null;
  /** O rename da linha em edição já foi enviado. Como só uma edita por vez,
   * um booleano basta -- não precisa dizer qual. */
  renomeando?: boolean;
  /** O último rename foi recusado -- ver `NomeEditavel.falhou`. */
  renomeFalhou?: boolean;
  /** Sair do campo descartou um nome que já tinha sido recusado. */
  aoDesistirDoRecusado?: () => void;
  onIniciarRenome: (s: Subgrupo) => void;
  onRenomear: (s: Subgrupo, nome: string) => void;
  onCancelarRenome: () => void;
  onVerMembros: (s: Subgrupo) => void;
  onRemover: (s: Subgrupo) => void;
}
