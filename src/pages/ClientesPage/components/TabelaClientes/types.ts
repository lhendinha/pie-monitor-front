import type { Cliente } from "../../../../types";

export interface TabelaClientesProps {
  clientes: Cliente[];
  busca: string;
  onLimparBusca: () => void;
}
