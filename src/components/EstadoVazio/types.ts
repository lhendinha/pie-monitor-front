import type { ReactNode } from "react";

export interface EstadoVazioProps {
  mensagem: string;
  /** Um botão pra sair do vazio -- "Limpar filtros", "Limpar busca". Só faz
   * sentido quando a lista está vazia POR causa de um filtro. */
  acao?: ReactNode;
}
