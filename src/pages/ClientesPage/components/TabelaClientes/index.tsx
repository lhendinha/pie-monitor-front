import { Botao, EstadoVazio, Tabela } from "../../../../components";
import { COLUNAS_CLIENTES } from "../../constants/clientes";
import LinhaCliente from "../LinhaCliente";
import type { Cliente } from "../../../../types";

interface TabelaClientesProps {
  clientes: Cliente[];
  busca: string;
  onLimparBusca: () => void;
}

/** A tabela de clientes, nas 4 colunas do artifact. */
export default function TabelaClientes({ clientes, busca, onLimparBusca }: TabelaClientesProps) {
  return (
    <Tabela
      colunas={COLUNAS_CLIENTES}
      vazio={
        clientes.length === 0 && (
          <EstadoVazio
            /* Vazio por busca é diferente de vazio de verdade: sem
               distinguir, a pessoa acha que não cadastrou nada. */
            mensagem={busca ? `Nenhum cliente para “${busca}”.` : "Nenhum cliente cadastrado ainda."}
            acao={
              busca && (
                <Botao variante="ghost" onClick={onLimparBusca}>
                  Limpar busca
                </Botao>
              )
            }
          />
        )
      }
    >
      {clientes.map((c) => (
        <LinhaCliente key={c.cliente_id} cliente={c} />
      ))}
    </Tabela>
  );
}
