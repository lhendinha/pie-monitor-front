import type { ReactNode } from "react";

export interface LinhaDoCatalogoProps {
  /** O que a pessoa lê primeiro -- o nome do item.
   *
   * ⚠️ `ReactNode` porque o centro de custo se renomeia NO LUGAR: ali entra
   * um `NomeEditavel`, que vira campo sem a linha mudar de forma. Os outros
   * dois mandam texto. */
  nome: ReactNode;
  /** O detalhe cinza na mesma linha: banco e agência da conta, "(Inativa)",
   * "agrupador de 3 categorias". Vem pronto de quem monta a lista, porque
   * cada uma das três tem um detalhe diferente. */
  detalhe?: ReactNode;
  /** À esquerda do nome: a bolinha de cor da categoria, ou o ícone. */
  marcador?: ReactNode;
  /** À direita, antes das ações: o saldo da conta ou a etiqueta de
   * natureza. */
  direita?: ReactNode;
  /** Categoria filha entra recuada, para a hierarquia ser visível sem
   * árvore. */
  filha?: boolean;
  ativo: boolean;
  /** Ausentes quando quem olha não pode escrever -- o piso de escrita no
   * catálogo é `admin`. */
  onEditar?: () => void;
  onAlternarAtivo?: () => void;
  /** Trava só ESTA linha enquanto a chamada dela corre, e não a lista
   * inteira. */
  ocupada?: boolean;
  /** "Renomear" nos três: o `PATCH` do catálogo aceita só o nome. */
  rotuloDeEditar?: string;
  /** O nome em TEXTO, para os `aria-label` das ações, quando `nome` é um
   * nó. Sem ele, "Renomear " ficaria sem objeto direto. */
  nomeParaRotulo?: string;
}
