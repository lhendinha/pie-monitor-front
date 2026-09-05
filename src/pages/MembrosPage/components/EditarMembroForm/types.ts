import type { Membro, Grupo } from "../../../../types";

/** As props de `EditarMembroForm` que o formulário usa -- todas menos a
 * lista de grupos e a permissão de mover, que só a tela lê. */
export interface OpcoesDoFormularioDeMembro {
  membro: Membro;
  onAtualizado: () => void;
  onFechar: () => void;
}

export interface EditarMembroFormProps {
  membro: Membro;
  grupos: Grupo[];
  /** Só o operador da plataforma move gente entre grupos e cria
   * `super_admin`. Para `admin`, o campo Grupo fica travado no próprio e o
   * seletor de papel para em `admin`.
   *
   * ⚠️ Travar na tela é conveniência: o servidor recusa igual. */
  podeMoverEntreGrupos: boolean;
  onAtualizado: () => void;
  onFechar: () => void;
}
