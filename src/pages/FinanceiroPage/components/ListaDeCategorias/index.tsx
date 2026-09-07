import { Box } from "@chakra-ui/react";

import { Botao, CartaoDeTabela, Etiqueta } from "../../../../components";
import { NATUREZA_ENTRADA, NATUREZA_SAIDA } from "../../../../constants";
import { contar } from "../../../../utils";
import LinhaDoCatalogo from "../LinhaDoCatalogo";
import SubcabecalhoDaLista from "../SubcabecalhoDaLista";
import type { ListaDeCategoriasProps } from "./types";

/** ⚠️ Verde é entrada, vermelho é saída -- a mesma leitura do extrato, e a
 * mesma dos valores na lista de lançamentos. */
const CORES_DA_NATUREZA: Record<string, { bg: string; color: string }> = {
  [NATUREZA_ENTRADA]: { bg: "status.good.bg", color: "status.good.text" },
  [NATUREZA_SAIDA]: { bg: "status.bad.bg", color: "status.bad.text" },
};

/** Para onde o dinheiro vai.
 *
 * 🔴 A ordem vem do servidor, e não é alfabética pura: entradas primeiro, e
 * cada filha logo abaixo da mãe. Reordenar aqui quebraria a hierarquia --
 * "DAS" apareceria longe de "Impostos", e a lista deixaria de dizer quem
 * soma quem.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ListaDeCategorias({
  categorias,
  podeEscrever,
  onNova,
  onEditar,
  onAlternarAtivo,
}: ListaDeCategoriasProps) {
  /** ⚠️ Quantas filhas cada agrupadora tem -- o artefato escreve o número
   * ("agrupador de 3 categorias"), e ele sai do próprio catálogo, sem
   * leitura extra. */
  const filhasPorAgrupador = new Map<string, number>();
  for (const c of categorias) {
    if (c.agrupador_id) {
      filhasPorAgrupador.set(c.agrupador_id, (filhasPorAgrupador.get(c.agrupador_id) ?? 0) + 1);
    }
  }

  const agrupadoras = [...filhasPorAgrupador.keys()].length;

  return (
    <>
      <SubcabecalhoDaLista
        titulo="Categorias"
        contagem={`${contar(categorias.length, "categoria", "categorias")} · ${contar(
          agrupadoras,
          "agrupador",
          "agrupadores",
        )}`}
        acao={
          podeEscrever ? (
            <Botao onClick={onNova}>+ Nova categoria</Botao>
          ) : undefined
        }
      />
      <CartaoDeTabela>
        {categorias.map((categoria) => (
        <LinhaDoCatalogo
          key={categoria.categoria_id}
          nome={categoria.nome}
          ativo={categoria.ativa}
          filha={Boolean(categoria.agrupador_id)}
          detalhe={detalheDaCategoria(categoria, filhasPorAgrupador.get(categoria.categoria_id) ?? 0)}
          marcador={
            <Box
              w="12px"
              h="12px"
              flexShrink="0"
              borderRadius="3px"
              bg={categoria.cor}
              aria-hidden="true"
            />
          }
          direita={
            <Etiqueta
              cores={
                CORES_DA_NATUREZA[categoria.natureza] ?? CORES_DA_NATUREZA[NATUREZA_SAIDA]
              }
            >
              {categoria.natureza === NATUREZA_ENTRADA ? "Entrada" : "Saída"}
            </Etiqueta>
          }
          onEditar={podeEscrever ? () => onEditar(categoria) : undefined}
          onAlternarAtivo={podeEscrever ? () => onAlternarAtivo(categoria) : undefined}
        />
      ))}
      </CartaoDeTabela>
    </>
  );
}

/** ⚠️ "agrupador" precisa ser dito: a categoria agrupadora NÃO aceita
 * lançamento, só soma as filhas, e quem não souber disso vai procurá-la no
 * formulário e não achar.
 *
 * ⚠️ O plural sai de `contar`, e não de um `categorias` fixo: com uma filha
 * a frase era "agrupador de 1 categorias". Parêntese de plural e concordância
 * errada são a mesma coisa -- gíria de programador vazando para a interface. */
function detalheDaCategoria(
  categoria: ListaDeCategoriasProps["categorias"][number],
  quantasFilhas: number,
) {
  const agrupa = quantasFilhas > 0;
  return ["", agrupa ? `agrupador de ${contar(quantasFilhas, "categoria", "categorias")}` : "",
    categoria.ativa ? "" : "(Inativa)"]
    .filter((p, i) => i === 0 || p)
    .join(" · ")
    .trim();
}
