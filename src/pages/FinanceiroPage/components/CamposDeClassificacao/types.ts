import type { CatalogoFinanceiro, ParcelaParaEnviar } from "../../../../types";

export interface CamposDeClassificacaoProps {
  catalogo?: CatalogoFinanceiro;
  /** `entrada` ou `saida` -- decide quais categorias aparecem. */
  natureza: string;
  categoriaId: string;
  onCategoria: (id: string) => void;
  centroId: string;
  onCentro: (id: string) => void;
  rateio: ParcelaParaEnviar[];
  onRateio: (rateio: ParcelaParaEnviar[]) => void;
  /** O valor do lançamento: é contra ele que a soma do rateio tem de bater. */
  valorTotalCentavos: number | null;
  /** Alguém já apertou Salvar -- só a partir daí os erros aparecem. */
  tentou: boolean;
  semCategoria: boolean;
  semDepartamento: boolean;
  rateioNaoFecha: boolean;
}
