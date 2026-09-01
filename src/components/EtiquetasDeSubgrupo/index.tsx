import { Flex, Text } from "@chakra-ui/react";

import Etiqueta from "../Etiqueta";

/** As cores da etiqueta de subgrupo (`.etq-neutra` do artifact).
 *
 * ⚠️ Constante e não literal no JSX, pela régua que tirou `CORES` de dentro
 * de `EtiquetaDeSituacao`: cor é contrato, e um literal solto no meio da
 * linha é onde a segunda cópia nasce. */
const CORES = {
  bg: "border.subtle",
  color: "fg.muted",
  borderColor: "border",
} as const;

/** Acima disto a célula mostra a CONTAGEM em vez dos nomes. */
const TETO_DE_NOMES = 2;

interface EtiquetasDeSubgrupoProps {
  /** Os nomes já resolvidos. Id cru é aceitável aqui -- é o que sobra quando
   * o subgrupo foi apagado, e mostrar algo é melhor que a etiqueta sumir. */
  nomes: string[];
}

/** Os subgrupos de uma linha de tabela: até dois mostra os nomes, de três em
 * diante mostra quantos são.
 *
 * 🔴 **A régua é a de `utils/select.rotuloResumo`**, que o `MultiSelect`
 * aplica ao mesmo dado. Nasceu na linha de inscrição da OAB e a coluna
 * "Subgrupo" de Membros passou a precisar da mesma coisa -- o comentário
 * original já dizia por que não duplicar: *duas maneiras de resumir a mesma
 * lista divergem no primeiro ajuste*. Por isso virou componente em vez de
 * segunda cópia.
 *
 * ⚠️ **O motivo do teto é a ALTURA DA LINHA.** Um grupo pode ter 20
 * subgrupos, e vinte etiquetas quebram em quatro fileiras: a linha cresce, as
 * vizinhas não, e as colunas descolam do que descrevem. Com o teto, a linha
 * tem sempre uma altura.
 *
 * ⚠️ **O `title` carrega a lista inteira**, então nada se perde: o que a
 * célula resume, o ponteiro devolve.
 */
export default function EtiquetasDeSubgrupo({ nomes }: EtiquetasDeSubgrupoProps) {
  /* O travessão, e não a célula vazia: numa coluna com nome, vazio se lê como
     dado que faltou, não como "nada a declarar". */
  if (nomes.length === 0) {
    return (
      <Text as="span" fontSize="12.5px" color="fg.subtle">
        —
      </Text>
    );
  }

  return (
    <Flex gap="6px" wrap="wrap" title={nomes.join(", ")}>
      {nomes.length <= TETO_DE_NOMES ? (
        nomes.map((nome) => (
          <Etiqueta key={nome} cores={CORES}>
            {nome}
          </Etiqueta>
        ))
      ) : (
        <Etiqueta cores={CORES}>{`${nomes.length} subgrupos`}</Etiqueta>
      )}
    </Flex>
  );
}
