import { Flex, Text } from "@chakra-ui/react";

import { CartaoDeTabela, NomeEditavel, Tabela } from "../../../../components";
import { contar } from "../../../../utils";
import { COLUNAS_DE_CENTROS } from "../../constants";
import LinhaDoCatalogo from "../LinhaDoCatalogo";
import Celula from "../LinhaDoCatalogo/Celula";
import NovoCentroInline from "../NovoCentroInline";
import SubcabecalhoDaLista from "../SubcabecalhoDaLista";
import type { ListaDeCentrosProps } from "./types";

/** Recorte gerencial, transversal às categorias -- Cível, Trabalhista.
 *
 * ⚠️ É o único dos três sem modal: centro de custo é só um nome, e um modal
 * para um campo só é uma janela a mais entre a pessoa e o que ela quer.
 * Nasce inline, acima da tabela, e se renomeia NO LUGAR -- pelo mesmo
 * `NomeEditavel` das Fases, que já resolve o Enter, o Escape e o campo que
 * continua aberto quando o servidor recusa.
 *
 * ⚠️ Sem botão no subcabeçalho, e é por isso: o "+ Adicionar" está ao lado
 * do campo. Dois lugares para criar a mesma coisa seria a pergunta "qual dos
 * dois?" em toda visita.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ListaDeCentros({
  centros,
  podeEscrever,
  centroEmEdicao,
  salvando,
  onAdicionar,
  onIniciarEdicao,
  onRenomear,
  onCancelarEdicao,
  onAlternarAtivo,
}: ListaDeCentrosProps) {
  return (
    <>
      <SubcabecalhoDaLista
        titulo="Centros de custo"
        contagem={`Mostrando ${centros.length} de ${contar(
          centros.length,
          "centro de custo",
          "centros de custo",
        )}`}
      />
      {podeEscrever && (
        <NovoCentroInline salvando={salvando} onAdicionar={onAdicionar} />
      )}
      <CartaoDeTabela>
        <Tabela colunas={COLUNAS_DE_CENTROS}>
          {centros.map((centro) => (
            <LinhaDoCatalogo
              key={centro.centro_id}
              nome={centro.nome}
              ativo={centro.ativo}
              /* ⚠️ O clique na linha começa o rename AQUI, e não abre modal:
                 centro de custo não tem um. É o mesmo gesto do `NomeEditavel`,
                 só que com o alvo do tamanho da linha. */
              onAbrir={
                podeEscrever
                  ? () => onIniciarEdicao(centro.centro_id)
                  : undefined
              }
              onAlternarAtivo={
                podeEscrever ? () => onAlternarAtivo(centro) : undefined
              }
            >
              <Celula>
                <Flex align="center" gap="8px" minW="0">
                  <NomeEditavel
                    nome={centro.nome}
                    rotuloDoCampo={`Novo nome de ${centro.nome}`}
                    editando={centroEmEdicao === centro.centro_id}
                    podeRenomear={podeEscrever}
                    salvando={salvando && centroEmEdicao === centro.centro_id}
                    onIniciar={() => onIniciarEdicao(centro.centro_id)}
                    onConfirmar={(nome) => onRenomear(centro.centro_id, nome)}
                    onCancelar={onCancelarEdicao}
                  />
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
      </CartaoDeTabela>
    </>
  );
}
