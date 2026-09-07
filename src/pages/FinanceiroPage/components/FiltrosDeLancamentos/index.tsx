import { Flex } from "@chakra-ui/react";

import { CampoDeBusca, MultiSelect, Select, SeletorDePeriodo } from "../../../../components";
import { PERIODOS_DE_DINHEIRO } from "../../../../constants";
import { comOpcoesEscolhidas } from "../../../../utils/opcoesEscolhidas";
import { OPCOES_DE_SITUACAO, OPCOES_DE_TIPO } from "../../constants";
import type { FiltrosDeLancamentosProps } from "./types";

/** A barra de filtros da lista de lançamentos.
 *
 * O PERÍODO vem primeiro porque é o recorte que mais muda: os três cards do
 * topo falam dele, e as outras pílulas estreitam dentro do período escolhido.
 *
 * 🔴 **O filtro de departamento pergunta pelo RATEIO**, não pelo subgrupo do
 * vínculo: "tem parcela para X". Com ele, cada linha mostra o pedaço e os
 * cards somam o pedaço -- senão a lista diria R$ 4.000 e o card R$ 10.000,
 * os dois na mesma tela.
 *
 * ⚠️ Múltiplo, como na Agenda e ao contrário do Kanban: ver "Cível e
 * Trabalhista no mesmo mês" é a pergunta natural de quem cuida do dinheiro.
 * Nenhum escolhido = todos, que é o que o servidor entende sem o parâmetro.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function FiltrosDeLancamentos({
  filtros, onMudar, contas, departamentos,
}: FiltrosDeLancamentosProps) {
  const opcoesDeDepartamento = comOpcoesEscolhidas(
    departamentos.opcoes,
    filtros.departamentoIds,
    filtros.departamentoNomes,
  );

  return (
    <Flex align="center" gap="8px" wrap="wrap" mb="12px">
      <SeletorDePeriodo
        periodoId={filtros.periodoId}
        intervaloPersonalizado={filtros.intervaloPersonalizado}
        blocos={PERIODOS_DE_DINHEIRO}
        onMudar={(periodoId, intervalo) =>
          onMudar({ periodoId, intervaloPersonalizado: intervalo })
        }
      />

      <Select
        variante="chip"
        placeholder="Todos os tipos"
        opcoes={OPCOES_DE_TIPO.filter((o) => o.id).map((o) => ({ value: o.id, label: o.rotulo }))}
        valor={filtros.tipo}
        onMudar={(tipo) => onMudar({ tipo: tipo ?? "" })}
        permitirLimpar
      />

      <Select
        variante="chip"
        placeholder="Todas as situações"
        opcoes={OPCOES_DE_SITUACAO.filter((o) => o.id).map((o) => ({ value: o.id, label: o.rotulo }))}
        valor={filtros.situacao}
        onMudar={(situacao) => onMudar({ situacao: situacao ?? "" })}
        permitirLimpar
      />

      <Select
        variante="chip"
        placeholder="Todas as contas"
        /* ⚠️ As INATIVAS entram: um lançamento antigo aponta para uma conta
           que foi desativada, e sem ela na lista não há como filtrar por ele
           -- o filtro esconderia justamente o que se quer achar. */
        opcoes={contas.map((c) => ({ value: c.conta_id, label: c.nome }))}
        valor={filtros.contaId}
        onMudar={(contaId) => onMudar({ contaId: contaId ?? "" })}
        permitirLimpar
      />

      <MultiSelect
        variante="chip"
        placeholder="Todos os departamentos"
        opcoes={opcoesDeDepartamento}
        selecionados={filtros.departamentoIds}
        onMudar={(departamentoIds) =>
          onMudar({
            departamentoIds,
            /* Guarda o NOME de cada escolhido: sem isso, um departamento
               fora da primeira página sumiria do próprio valor ao reabrir. */
            departamentoNomes: Object.fromEntries(
              departamentoIds.map((id) => [
                id,
                opcoesDeDepartamento.find((o) => o.value === id)?.label ?? id,
              ]),
            ),
          })
        }
        permitirLimpar
        carregando={departamentos.carregando}
        onBuscar={departamentos.buscar}
        placeholderBusca="Buscar departamento"
        erro={departamentos.erro}
        onTentarDeNovo={departamentos.tentarDeNovo}
      />

      <CampoDeBusca
        rotulo="Buscar lançamentos"
        /* ⚠️ Descrição, contraparte e número do documento -- verificado em
           `lancamentos_consulta._casa_com_a_busca`, não suposto. Prometer
           categoria ou conta faria a pessoa digitar o que está vendo na
           coluna e receber "nenhum lançamento"; e prometer MENOS do que o
           servidor faz esconderia um caminho que existe. */
        placeholder="Descrição, contraparte ou documento"
        valor={filtros.busca}
        onMudar={(busca) => onMudar({ busca })}
      />
    </Flex>
  );
}
