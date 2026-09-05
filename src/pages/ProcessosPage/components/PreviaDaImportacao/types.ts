import type { PreviaDaImportacao as Previa } from "../../../../types";

export interface PreviaDaImportacaoProps {
  previa: Previa;
  subgrupoId: string;
  /** Quem está importando. É a pré-seleção do responsável -- e o único valor
   * seguro quando ela não é membro do subgrupo. */
  meuEmail: string;
  /** 🔴 Se quem importa NÃO é membro do subgrupo escolhido, o servidor recusa
   * pô-la como responsável (`Responsável não é membro do subgrupo`) -- e um
   * `manager`/`admin` age em subgrupo que não participa. Sem esta informação
   * a tela pré-selecionaria alguém que a API vai negar, e a importação
   * inteira falharia depois da busca. */
  souMembro: boolean;
  importando: boolean;
  progresso: { feitos: number; total: number } | null;
  onImportar: (numeros: string[], responsaveis: string[]) => void;
  onVoltar: () => void;
}
