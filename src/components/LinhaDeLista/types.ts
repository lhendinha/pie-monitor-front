import type { ReactNode } from "react";

export interface LinhaDeListaProps {
  /** Ícone que abre a linha, à esquerda de tudo. */
  icone?: ReactNode;
  /** Ações à direita (renomear, remover), empurradas pela margem
   * automática -- ficam coladas na borda mesmo com o conteúdo curto. */
  acoes?: ReactNode;
  children: ReactNode;
}
