import type { EnderecoDoCliente } from "../../types";

export interface CamposDeEnderecoProps {
  valores: EnderecoDoCliente;
  onMudar: (valores: EnderecoDoCliente) => void;
  /** Sufixo dos `id` dos campos. As duas telas de cliente nunca coexistem
   * (`/clientes` e `/clientes/:id` são rotas distintas), então isto não é
   * defesa contra colisão -- é só o que mantém os ids legíveis e iguais aos
   * dos campos vizinhos, que já usam `-edicao` numa e nada na outra. */
  sufixoDoId?: string;
  /** Trava tudo, sem esconder: quem não pode gravar ainda precisa LER o
   * endereço, e a consulta de CEP é `manager`+ de qualquer forma. */
  somenteLeitura?: boolean;
}
