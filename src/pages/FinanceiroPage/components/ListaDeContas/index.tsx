import { Flex, Text } from "@chakra-ui/react";

import {
  Botao,
  CartaoDeTabela,
  Esqueleto,
  Etiqueta,
  Pagination,
  Tabela,
} from "../../../../components";
import { contar, formatarCentavos, formatarData } from "../../../../utils";
import { COLUNAS_DE_CONTAS } from "../../constants";
import LinhaDoCatalogo from "../LinhaDoCatalogo";
import Celula from "../LinhaDoCatalogo/Celula";
import SubcabecalhoDaLista from "../SubcabecalhoDaLista";
import type { ListaDeContasProps } from "./types";

/** ⚠️ A conta padrão ganha etiqueta, e não negrito: negrito numa linha de
 * lista lê como "atenção", e isto é um estado, não um aviso. */
const CORES_DA_PADRAO = { bg: "bg.brand.subtle", color: "brand.darker" };

/** As contas do escritório, com o saldo atual de cada uma.
 *
 * ⚠️ O saldo é o que a API MANTÉM a cada baixa, não um cálculo da tela: se
 * a tela somasse os lançamentos, dois lugares dariam respostas diferentes no
 * dia em que um deles esquecesse uma regra.
 *
 * ⚠️ **Paginada**, ao contrário de Categorias: a lista chega de
 * `GET /financeiro/contas`, uma página por vez, lida do índice estreito. A
 * barra some sozinha abaixo de 11 contas.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ListaDeContas({
  contas,
  carregando,
  paginacao,
  contaPadraoId,
  podeEscrever,
  onNova,
  onEditar,
  onAlternarAtivo,
}: ListaDeContasProps) {
  return (
    <>
      <SubcabecalhoDaLista
        titulo="Contas"
        contagem={`Mostrando ${contas.length} de ${contar(
          paginacao.total,
          "conta",
          "contas",
        )}`}
        acao={
          podeEscrever ? (
            <Botao onClick={onNova}>+ Nova conta</Botao>
          ) : undefined
        }
      />
      <CartaoDeTabela>
        {carregando ? (
          <Esqueleto linhas={4} />
        ) : (
          <>
            <Tabela colunas={COLUNAS_DE_CONTAS}>
              {contas.map((conta) => (
                <LinhaDoCatalogo
                  key={conta.conta_id}
                  nome={conta.nome}
                  ativo={conta.ativa}
                  onAbrir={podeEscrever ? () => onEditar(conta) : undefined}
                  onAlternarAtivo={
                    podeEscrever ? () => onAlternarAtivo(conta) : undefined
                  }
                >
                  <Celula>
                    <Flex align="center" gap="8px" minW="0">
                      <Text fontSize="13px" fontWeight="700" truncate>
                        {conta.nome}
                      </Text>
                      {conta.conta_id === contaPadraoId && (
                        <Flex
                          flexShrink="0"
                          title="Escolhida em Grupo › Configurações"
                        >
                          <Etiqueta cores={CORES_DA_PADRAO}>Padrão</Etiqueta>
                        </Flex>
                      )}
                    </Flex>
                  </Celula>
                  <Celula>
                    <Text fontSize="12px" color="fg.muted" truncate>
                      {detalheDaConta(conta)}
                    </Text>
                  </Celula>
                  <Celula>
                    {/* ⚠️ `mono` para os dígitos terem a mesma largura: mesmo à
                    esquerda, é o que deixa duas quantias comparáveis. */}
                    <Text
                      fontSize="13px"
                      fontWeight="700"
                      fontFamily="mono"
                      whiteSpace="nowrap"
                    >
                      R$ {formatarCentavos(conta.saldo_centavos)}
                    </Text>
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

/** Banco, agência e conta -- ou "dinheiro em espécie" quando não há nenhum
 * dos três, que é o caso do caixa do escritório. */
function detalheDaConta(conta: ListaDeContasProps["contas"][number]) {
  const partes = conta.banco
    ? [
        `Banco ${conta.banco}`,
        conta.agencia && `Ag. ${conta.agencia}`,
        conta.numero && `C/C ${conta.numero}`,
      ]
    : ["dinheiro em espécie"];
  const vivas = partes.filter(Boolean);
  const desde = conta.inicio ? `desde ${formatarData(conta.inicio)}` : "";
  return [...vivas, desde, conta.ativa ? "" : "(Inativa)"]
    .filter(Boolean)
    .join(" · ");
}
