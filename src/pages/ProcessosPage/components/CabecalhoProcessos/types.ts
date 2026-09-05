import type { FiltrosProcessos, OpcaoProcesso, OpcoesBuscaveis, Subgrupo } from "../../../../types";

export interface CabecalhoProcessosProps {
  carregando: boolean;
  /** As listas dos CHIPS (clientes, fases, situações), que não são a mesma
   * espera do `carregando` acima -- aquele é a lista de processos. Sem
   * distinguir, os filtros abriam vazios afirmando que não há nenhuma
   * situação cadastrada. */
  carregandoCatalogos?: boolean;
  /** A tabela ainda não reflete o que está escrito na busca. */
  buscando?: boolean;
  total: number;
  /** Total do grupo, ignorando filtros -- é o "de Y" da contagem. Sem ele a
   * frase não diz de quanto o resultado foi recortado. */
  totalSemFiltro: number;
  busca: string;
  onBuscar: (valor: string) => void;
  filtros: FiltrosProcessos;
  onMudarFiltro: (parcial: Partial<FiltrosProcessos>) => void;
  /** A lista de clientes NÃO chega pronta: ela se completa por busca. Ver
   * `useClientesBuscaveis`. */
  clientes: OpcoesBuscaveis;
  pessoas: OpcoesBuscaveis;
  /** Se a lista de PESSOAS entra na pílula de responsável -- ver
   * `podeListarPessoas`. Quem é `user` fica com as opções fixas. */
  mostrarPessoas: boolean;
  fases: OpcaoProcesso[];
  situacoes: OpcaoProcesso[];
  /** Os subgrupos que esta pessoa VÊ -- a mesma lista que a tabela usa para
   * escrever o nome na coluna. Um grupo tem poucos (8 em produção), então
   * ela vem inteira e a pílula não precisa pedir nada. */
  subgrupos: Subgrupo[];
  /** Fase e situação vieram com a tela; se a busca delas falhou, o painel
   * precisa dizer isso em vez de oferecer "Nenhuma". */
  erroNasFases?: boolean;
  erroNasSituacoes?: boolean;
  onRecarregarFases?: () => void;
  onRecarregarSituacoes?: () => void;
  onNovoProcesso: () => void;
  /** 🔴 Só `manager`+ importa em massa. Um erro custa 1 processo no cadastro
   * individual e até 1.000 aqui, desfeitos um a um -- e mostrar um botão que
   * a API vai negar é pior que não mostrar. */
  onImportarPorOab?: () => void;
}
