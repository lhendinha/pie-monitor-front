import { Flex, Text } from "@chakra-ui/react";

import {
  Botao,
  CartaoDeTabela,
  Esqueleto,
  Pagination,
  Tabela,
} from "../../../../components";
import { contar } from "../../../../utils";
import { COLUNAS_DE_CENTROS } from "../../constants";
import LinhaDoCatalogo from "../LinhaDoCatalogo";
import Celula from "../LinhaDoCatalogo/Celula";
import SubcabecalhoDaLista from "../SubcabecalhoDaLista";
import type { ListaDeCentrosProps } from "./types";

/** Recorte gerencial, transversal às categorias -- Cível, Trabalhista.
 *
 * ⚠️ **Igual às outras duas**: botão no subcabeçalho, clique na linha para
 * editar, olho para desativar. Ele já nasceu inline (um campo no topo do
 * cartão) e depois como linha nova em edição; com as três viradas TABELA e
 * as irmãs abrindo modal, dois gestos diferentes na mesma tela liam como
 * inacabado. A história está no `CONTEXT.md`.
 *
 * ⚠️ **Paginada como Contas**, e ao contrário de Categorias: aqui a ordem é
 * alfabética pura, e a quebra de página não separa nada que dependa de estar
 * junto. Ver `ConfiguracoesFinanceiras`.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ListaDeCentros({
  centros,
  carregando,
  paginacao,
  podeEscrever,
  onNovo,
  onEditar,
  onAlternarAtivo,
}: ListaDeCentrosProps) {
  return (
    <>
      <SubcabecalhoDaLista
        titulo="Centros de custo"
        contagem={`Mostrando ${centros.length} de ${contar(
          paginacao.total,
          "centro de custo",
          "centros de custo",
        )}`}
        acao={
          podeEscrever ? (
            <Botao onClick={onNovo}>+ Novo centro de custo</Botao>
          ) : undefined
        }
      />
      <CartaoDeTabela>
        {carregando ? (
          <Esqueleto linhas={4} />
        ) : (
          <>
            <Tabela colunas={COLUNAS_DE_CENTROS}>
              {centros.map((centro) => (
                <LinhaDoCatalogo
                  key={centro.centro_id}
                  nome={centro.nome}
                  ativo={centro.ativo}
                  onAbrir={podeEscrever ? () => onEditar(centro) : undefined}
                  onAlternarAtivo={
                    podeEscrever ? () => onAlternarAtivo(centro) : undefined
                  }
                >
                  <Celula>
                    <Flex align="center" gap="8px" minW="0">
                      <Text fontSize="13px" fontWeight="700" truncate>
                        {centro.nome}
                      </Text>
                      {!centro.ativo && (
                        <Text fontSize="12px" color="fg.muted">
                          (Inativo)
                        </Text>
                      )}
                    </Flex>
                  </Celula>
                </LinhaDoCatalogo>
              ))}
            </Tabela>
            <Pagination {...paginacao} />
          </>
        )}
      </CartaoDeTabela>
    </>
  );
}
