import type { CategoriaFinanceira } from "../../../../types";

export interface ListaDeCategoriasProps {
  categorias: CategoriaFinanceira[];
  podeEscrever: boolean;
  onNova: () => void;
  onEditar: (categoria: CategoriaFinanceira) => void;
  onAlternarAtivo: (categoria: CategoriaFinanceira) => void;
}
