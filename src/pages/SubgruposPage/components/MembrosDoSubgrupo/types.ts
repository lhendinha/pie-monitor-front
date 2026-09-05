import type { Subgrupo } from "../../../../types";

export interface MembrosDoSubgrupoProps {
  subgrupo: Subgrupo;
  onFechar: () => void;
}
