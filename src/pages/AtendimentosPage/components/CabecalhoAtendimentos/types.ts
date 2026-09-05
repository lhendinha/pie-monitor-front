import type { OpcaoDeSelect } from "../../../../types";

export interface CabecalhoAtendimentosProps {
  carregando: boolean;
  /** Quantos a página mostra, e quantos existem no total -- "Mostrando 3 de
   * 12 atendimentos", como no artifact. */
  mostrando: number;
  total: number;
  busca: string;
  onBuscar: (valor: string) => void;
  /** O que a lista mostra ainda não corresponde ao que está escrito no
   * campo -- espera entre teclas ou consulta em voo. */
  buscando?: boolean;
  status: string;
  onMudarStatus: (status: string) => void;
  /** 🔴 `primeiraPagina` de `useSubgruposBuscaveis`, NUNCA `opcoes`.
   *
   * `opcoes` encolhe conforme alguém digita na pílula, e o docstring de
   * `OpcoesBuscaveis` registra três defeitos que vieram exatamente disso --
   * inclusive um controle sumindo da tela porque a busca não achou nada.
   * Aqui isso faria o filtro de subgrupo desaparecer enquanto o modal de
   * criação estivesse sendo usado. */
  subgrupos: OpcaoDeSelect[];
  subgrupoId: string;
  onMudarSubgrupo: (subgrupoId: string) => void;
  onNovo: () => void;
}
