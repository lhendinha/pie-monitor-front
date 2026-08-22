import { Flex, Text } from "@chakra-ui/react";

import { Select } from "../Select";
import NumeroPagina from "./NumeroPagina";
import SetaPagina from "./SetaPagina";
import { numerosVisiveis } from "./numerosVisiveis";
import { TAMANHOS_PAGINA } from "../../types";

interface Props {
  pagina: number;
  totalPaginas: number;
  /** Total de itens, não da página. É o que decide se a barra aparece: com
   * menos itens que o menor tamanho possível, não há o que paginar nem o
   * que escolher. */
  total: number;
  tamanhoPagina: number;
  onMudarPagina: (pagina: number) => void;
  onMudarTamanho: (tamanho: number) => void;
  /** Opções do "Por página". O padrão serve às listagens; o detalhe do
   * processo usa passos menores porque cada item ali é alto. */
  tamanhos?: readonly number[];
}

/** Paginação real -- cada número é endereçável direto (o backend faz Query
 * por intervalo de sequência, não cursor sequencial), então dá pra pular
 * pra qualquer página sem ter visitado as anteriores.
 *
 * Medidas do artifact (`.pagination`). Com uma página só, a navegação some
 * mas o espaço dela fica: é o `justify="space-between"` que mantém o
 * seletor de tamanho encostado à direita, como lá.
 */
export default function Pagination({
  pagina,
  totalPaginas,
  total,
  tamanhoPagina,
  onMudarPagina,
  onMudarTamanho,
  tamanhos = TAMANHOS_PAGINA,
}: Props) {
  /** A barra some quando a lista não tem como ser paginada em tamanho
   * nenhum -- aí o "Por página" seria um controle sem efeito.
   *
   * ⚠️ O critério é o TOTAL, não o número de páginas. Com 30 itens em
   * "100 por página" cabe tudo numa página, mas o seletor precisa
   * continuar visível: é por ele que se volta pra 10. Escondendo por
   * `totalPaginas <= 1`, a pessoa ficava presa no tamanho que escolheu. */
  const menorTamanho = Math.min(...tamanhos);
  if (total <= menorTamanho) return null;

  return (
    <Flex align="center" justify="space-between" gap="16px" p="14px 16px 10px" wrap="wrap">
      {totalPaginas > 1 ? (
        <Flex align="center" gap="4px">
          <SetaPagina
            direcao="anterior"
            desabilitado={pagina <= 1}
            onClick={() => onMudarPagina(pagina - 1)}
          />
          <Flex align="center" gap="2px" mx="4px">
            {numerosVisiveis(pagina, totalPaginas).map((n, i) =>
              n === "..." ? (
                <Text key={`reticencias-${i}`} px="4px" fontSize="13px" color="fg.subtle">
                  …
                </Text>
              ) : (
                <NumeroPagina
                  key={n}
                  numero={n}
                  atual={n === pagina}
                  onClick={() => onMudarPagina(n)}
                />
              ),
            )}
          </Flex>
          <SetaPagina
            direcao="proxima"
            desabilitado={pagina >= totalPaginas}
            onClick={() => onMudarPagina(pagina + 1)}
          />
        </Flex>
      ) : (
        <div />
      )}

      <Flex align="center" gap="8px" fontSize="12.5px" color="fg.muted" fontWeight="600">
        <label htmlFor="tamanho-pagina">Por página</label>
        <Select
          id="tamanho-pagina"
          compacto
          largura="72px"
          opcoes={tamanhos.map((t) => ({ value: String(t), label: String(t) }))}
          valor={String(tamanhoPagina)}
          onMudar={(v) => onMudarTamanho(Number(v))}
        />
      </Flex>
    </Flex>
  );
}
