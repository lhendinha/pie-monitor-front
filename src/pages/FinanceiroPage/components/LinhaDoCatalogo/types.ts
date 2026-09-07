import type { ReactNode } from "react";

export interface LinhaDoCatalogoProps {
  /** O que a pessoa lê primeiro -- o nome do item. */
  nome: string;
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
  /** "Renomear" na categoria e no centro, que só têm nome; "Editar" na
   * conta, cujo modal mexe em banco, agência e número. */
  rotuloDeEditar?: string;
}
