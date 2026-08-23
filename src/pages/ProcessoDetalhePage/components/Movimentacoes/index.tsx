import { Box, Text } from "@chakra-ui/react";
import { useState } from "react";

import { ItemDeMovimentacao, Pagination } from "../../../../components";
import { formatarData } from "../../../../utils";
import { MOVIMENTACOES_POR_PAGINA, TAMANHOS_MOVIMENTACOES } from "../../constants/detalhe";
import type { Comunicacao } from "../../../../types";

interface MovimentacoesProps {
  comunicacoes: Comunicacao[];
}

/** O que o robô coletou no PJe para este processo.
 *
 * O Histórico mostra o mesmo dado para o grupo inteiro; aqui ele responde a
 * pergunta que se faz estando NO processo, sem obrigar a sair da tela e
 * filtrar.
 *
 * A paginação é no cliente porque `GET /processos/{n}/detalhes` devolve
 * tudo de uma vez -- o que ela resolve é a tela crescer sem fim num
 * processo antigo, não o tamanho da resposta.
 */
export default function Movimentacoes({ comunicacoes }: MovimentacoesProps) {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(MOVIMENTACOES_POR_PAGINA);

  if (comunicacoes.length === 0) {
    return (
      <Text fontSize="13px" color="fg.subtle">
        Nenhuma movimentação registrada ainda para este processo.
      </Text>
    );
  }

  const totalPaginas = Math.ceil(comunicacoes.length / tamanhoPagina);
  const inicio = (pagina - 1) * tamanhoPagina;
  const visiveis = comunicacoes.slice(inicio, inicio + tamanhoPagina);

  return (
    /* `m` negativo cancela o padding do cartão: os itens encostam nas bordas
       e as divisórias atravessam a largura toda, como no artifact -- lista
       dentro de cartão não é uma pilha de cartõezinhos. */
    <Box m="-16px -18px">
      {visiveis.map((c, i) => (
        <ItemDeMovimentacao
          key={`${c.comunicacao_id}-${inicio + i}`}
          titulo={c.tipo_comunicacao || "Comunicação"}
          meta={`${formatarData(c.data_disponibilizacao)} · ${c.nome_orgao}`}
          html={c.texto}
          ultimo={i === visiveis.length - 1}
        />
      ))}
      {/* A barra decide sozinha se aparece; aqui só a divisória depende
          disso, pra não sobrar uma linha solta no fim do cartão. */}
      {comunicacoes.length > Math.min(...TAMANHOS_MOVIMENTACOES) && (
        <Box borderTopWidth="1px" borderTopColor="border.subtle">
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={comunicacoes.length}
            tamanhoPagina={tamanhoPagina}
            tamanhos={TAMANHOS_MOVIMENTACOES}
            onMudarPagina={setPagina}
            onMudarTamanho={(t) => {
              setTamanhoPagina(t);
              setPagina(1);
            }}
          />
        </Box>
      )}
    </Box>
  );
}
