import type { CategoriaFinanceira } from "../../../../types";
import type { DadosDaCategoria } from "../../../../types/requisicoes";

export interface ModalDeCategoriaProps {
  /** A categoria em edição, ou `undefined` para criar. */
  categoria?: CategoriaFinanceira;
  /** Todas as do catálogo -- é delas que sai a lista de agrupadores. */
  categorias: CategoriaFinanceira[];
  cores: string[];
  salvando: boolean;
  /** A mensagem que a API devolveu (409 de nome repetido, por exemplo). O
   * modal NÃO fecha enquanto ela existir. */
  erro?: string;
  /** `outra` diz se o modal continua aberto para o próximo cadastro. */
  onSalvar: (dados: DadosDaCategoria, outra: boolean) => void;
  onFechar: () => void;
}
