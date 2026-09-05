import type { ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

/** ⚠️ Estende `ButtonProps` porque o componente já faz spread de `...resto`
 * no `Button` -- a tipagem não declarava isso, então passar `onClick` (ou
 * qualquer atributo de botão) era erro de compilação num componente que
 * aceitava perfeitamente em runtime. */
export interface PilulaDeFiltroProps extends ButtonProps {
  /** Muda a cor: filtro escolhido fica em azul claro, como no artifact. */
  ativo: boolean;
  children: ReactNode;
}
