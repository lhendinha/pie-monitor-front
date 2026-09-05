import type { Cliente } from "../../../../types";

export interface FormularioClienteProps {
  cliente: Cliente;
  podeEditar: boolean;
  podeExcluir: boolean;
  onSalvo: () => void;
  onRemover: () => void;
}
