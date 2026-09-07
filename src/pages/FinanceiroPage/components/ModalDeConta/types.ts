import type { ContaFinanceira } from "../../../../types";
import type { DadosDaConta } from "../../../../types/requisicoes";

export interface ModalDeContaProps {
  /** A conta em edição, ou `undefined` para criar. */
  conta?: ContaFinanceira;
  salvando: boolean;
  /** A mensagem que a API devolveu. O modal NÃO fecha enquanto ela existir. */
  erro?: string;
  /** Na edição só o nome vai -- é o que o `PATCH` aceita. */
  onSalvar: (dados: DadosDaConta) => void;
  onFechar: () => void;
}
