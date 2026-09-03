import { Flex, Text } from "@chakra-ui/react";
import { useEffect } from "react";

import { Select } from "../Select";
import NumeroPagina from "./NumeroPagina";
import SetaPagina from "./SetaPagina";
import { numerosVisiveis } from "./numerosVisiveis";
import { TAMANHOS_PAGINA } from "../../constants";

interface PaginationProps {
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

/** Paginação real -- cada número é endereçável direto, então dá pra pular pra
 * qualquer página sem ter visitado as anteriores.
 *
 * ⚠️ **O "como" mudou, e este texto afirmava o esquema errado até 02/09/2026.**
 * Ele dizia que "o backend faz Query por intervalo de sequência, não cursor
 * sequencial". Esse esquema foi ABANDONADO: ele dependia do contador
 * monotônico nunca decrementar, e com buracos por exclusão itens antigos
 * ficavam fora do range consultado em NENHUMA página, embora contados no
 * total. Hoje o servidor lê a partição inteira e fatia em memória -- exato, e
 * O(n) por página pedida. Ver `api/PLANO_PAGINACAO.md`.
 *
 * 🔴 O que este componente promete continua valendo, e é o que restringe o
 * remédio lá: números clicáveis e "X de Y" exigem posição e total EXATOS, o
 * que descarta cursor sequencial.
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
}: PaginationProps) {
  /** A barra some quando a lista não tem como ser paginada em tamanho
   * nenhum -- aí o "Por página" seria um controle sem efeito.
   *
   * ⚠️ O critério é o TOTAL, não o número de páginas. Com 30 itens em
   * "100 por página" cabe tudo numa página, mas o seletor precisa
   * continuar visível: é por ele que se volta pra 10. Escondendo por
   * `totalPaginas <= 1`, a pessoa ficava presa no tamanho que escolheu. */
  /** 🔴 Página que não existe volta para a primeira.
   *
   * Não é só URL digitada à mão (`?pagina=99` numa lista de 3 páginas): o
   * mesmo estado acontece por caminho legítimo -- filtrar estando na página 3
   * encolhe o conjunto, e a pessoa fica vendo uma tabela vazia enquanto a
   * contagem diz que há 45 itens.
   *
   * ⚠️ Mora AQUI, e não num hook por tela: este componente já recebe página,
   * total de páginas e o setter -- e é a única peça que todas as sete
   * listagens compartilham.
   *
   * ⚠️ Antes do `return null` de propósito: efeito depois de um retorno
   * antecipado não roda, e o caso a corrigir é justamente o de lista vazia.
   *
   * ⚠️ Só corrige com resposta na mão (`totalPaginas >= 1`): em voo o valor é
   * o da consulta anterior, e corrigir por ele devolveria a pessoa para a
   * página 1 no meio de uma navegação legítima. */
  useEffect(() => {
    if (totalPaginas >= 1 && pagina > totalPaginas) onMudarPagina(1);
  }, [pagina, totalPaginas, onMudarPagina]);

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
